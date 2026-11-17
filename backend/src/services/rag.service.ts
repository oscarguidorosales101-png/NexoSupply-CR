import { prisma } from '../config/database';
import { googleDriveService } from './google-drive.service';
import { documentExtractorService } from './document-extractor.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { vectorStoreService, VectorPoint } from './vector-store.service';
import { mysqlToDriveSyncService } from './mysql-to-drive-sync.service';

export interface RagSourceCitation {
  documentoId?: string;
  nombreDocumento: string;
  numeroFragmento: number;
  relevanciaScore: number;
  urlDocumento?: string;
  textoFragmento: string;
  fechaActualizacion?: string;
}

export interface RagQueryResponse {
  respuesta: string;
  estado: 'EXITOSO' | 'SIN_EVIDENCIA' | 'ERROR';
  fuentes: RagSourceCitation[];
  tiempoRespuestaMs: number;
  modeloUtilizado: string;
  totalFuentesEncontradas: number;
}

export class RagService {
  /**
   * Procesa e indexa un documento en el pipeline RAG
   */
  public async indexDocument(
    empresaId: string,
    documentoId: string,
    buffer: Buffer,
    mimeType: string,
    nombre: string,
    carpetaId?: string,
    urlWebView?: string
  ): Promise<{ fragmentosGenerados: number; estado: string; error?: string }> {
    try {
      // 1. Extraer texto
      const extraction = await documentExtractorService.extract(buffer, mimeType, nombre);

      if (extraction.estado === 'REQUIERE_OCR') {
        await prisma.documentoDrive.update({
          where: { id: documentoId },
          data: {
            estado_indexacion: 'REQUIERE_OCR',
            ultimo_error: 'El documento es un escaneo o carece de capa de texto seleccionable. Requiere OCR para indexacion.',
          },
        });
        return { fragmentosGenerados: 0, estado: 'REQUIERE_OCR' };
      }

      if (extraction.estado === 'ERROR' || !extraction.texto.trim()) {
        await prisma.documentoDrive.update({
          where: { id: documentoId },
          data: {
            estado_indexacion: 'ERROR',
            ultimo_error: extraction.error || 'No se pudo extraer texto del documento.',
          },
        });
        return { fragmentosGenerados: 0, estado: 'ERROR', error: extraction.error };
      }

      // 2. Fragmentación semántica
      const chunks = chunkingService.chunkText(extraction.texto, 750, 100);

      if (chunks.length === 0) {
        await prisma.documentoDrive.update({
          where: { id: documentoId },
          data: {
            estado_indexacion: 'ERROR',
            ultimo_error: 'El texto no genero fragmentos validos.',
          },
        });
        return { fragmentosGenerados: 0, estado: 'ERROR' };
      }

      // 3. Invalidar fragmentos y vectores previos del documento
      await vectorStoreService.deleteVectorsByDocument(documentoId, empresaId);
      await prisma.fragmentoDocumental.deleteMany({
        where: { documento_id: documentoId },
      });

      // 4. Generar embeddings y preparar puntos vectoriales
      const vectorPoints: VectorPoint[] = [];

      for (const ch of chunks) {
        const emb = await embeddingService.generateEmbedding(ch.contenido);
        const fragmentoId = `${documentoId}-frag-${ch.numeroFragmento}`;

        // Guardar en MySQL
        await prisma.fragmentoDocumental.create({
          data: {
            id: fragmentoId,
            empresa_id: empresaId,
            documento_id: documentoId,
            numero_fragmento: ch.numeroFragmento,
            contenido: ch.contenido,
            tokens_estimados: ch.tokensEstimados,
            vector_id: fragmentoId,
            metadatos: {
              inicio: ch.inicioCaracter,
              fin: ch.finCaracter,
              modelo_embedding: emb.model,
            },
          },
        });

        vectorPoints.push({
          id: fragmentoId,
          vector: emb.vector,
          payload: {
            empresa_id: empresaId,
            documento_id: documentoId,
            fragmento_id: fragmentoId,
            carpeta_id: carpetaId,
            nombre_documento: nombre,
            fecha_modificacion: new Date().toISOString(),
            url_documento: urlWebView,
            numero_fragmento: ch.numeroFragmento,
            contenido: ch.contenido,
          },
        });
      }

      // 5. Inserción en Vector Store (Qdrant con fallback local)
      await vectorStoreService.upsertVectors(vectorPoints);

      // 6. Actualizar estado del documento a INDEXADO
      await prisma.documentoDrive.update({
        where: { id: documentoId },
        data: {
          estado_indexacion: 'INDEXADO',
          total_fragmentos: chunks.length,
          ultimo_error: null,
          fecha_sincronizacion: new Date(),
        },
      });

      return { fragmentosGenerados: chunks.length, estado: 'INDEXADO' };
    } catch (err: any) {
      console.error(`[RAG_INDEX] Error indexando documento ${nombre}:`, err.message);
      await prisma.documentoDrive.update({
        where: { id: documentoId },
        data: {
          estado_indexacion: 'ERROR',
          ultimo_error: err.message,
        },
      });
      return { fragmentosGenerados: 0, estado: 'ERROR', error: err.message };
    }
  }

  /**
   * Ejecuta el pipeline completo de sincronización de carpetas e indexación documental para una empresa
   */
  public async syncAndIndexEnterprise(empresaId: string): Promise<any> {
    const startTime = Date.now();

    // 1. Crear registro de sincronización
    const syncRecord = await prisma.sincronizacionDrive.create({
      data: {
        empresa_id: empresaId,
        tipo: 'AUTOMATICA',
        estado: 'EN_PROCESO',
      },
    });

    try {
      // 2. Primero sincronizar datos vivos de MySQL a Google Drive (generando PDFs)
      await mysqlToDriveSyncService.syncToDrive(empresaId);

      // 3. Obtener documentos pendientes o actualizados de la empresa
      const documentos = await prisma.documentoDrive.findMany({
        where: {
          empresa_id: empresaId,
          estado_indexacion: { in: ['PENDIENTE', 'ERROR'] },
        },
        include: { carpeta: true },
      });

      let procesados = 0;
      let totalFragmentos = 0;

      for (const doc of documentos) {
        // Obtener el buffer del documento (o re-generarlo si proviene del outbox)
        const pdfs = await mysqlToDriveSyncService.generateOperationalPdfs(empresaId);
        const matched = pdfs.find((p) => p.nombreArchivo === doc.nombre);

        if (matched) {
          const res = await this.indexDocument(
            empresaId,
            doc.id,
            matched.buffer,
            doc.tipo_mime,
            doc.nombre,
            doc.carpeta_id || undefined,
            doc.url_web_view || undefined
          );
          if (res.estado === 'INDEXADO') {
            procesados++;
            totalFragmentos += res.fragmentosGenerados;
          }
        }
      }

      // Actualizar registro de sincronización
      await prisma.sincronizacionDrive.update({
        where: { id: syncRecord.id },
        data: {
          estado: 'COMPLETADA',
          archivos_detectados: documentos.length,
          archivos_procesados: procesados,
          fragmentos_generados: totalFragmentos,
          mensaje_resultado: `Sincronizacion completada con exito. ${procesados} documentos indexados en ${(Date.now() - startTime)}ms.`,
          finalizado_en: new Date(),
        },
      });

      return {
        exito: true,
        documentosProcesados: procesados,
        fragmentosGenerados: totalFragmentos,
        duracionMs: Date.now() - startTime,
      };
    } catch (err: any) {
      await prisma.sincronizacionDrive.update({
        where: { id: syncRecord.id },
        data: {
          estado: 'ERROR',
          mensaje_resultado: err.message,
          finalizado_en: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Consulta RAG: Recupera fragmentos con filtro multiempresa y genera respuesta fundamentada con citas
   */
  public async queryRag(
    empresaId: string,
    usuarioId: string,
    pregunta: string,
    conversacionId?: string
  ): Promise<RagQueryResponse> {
    const startTime = Date.now();

    if (!empresaId) {
      throw new Error('Aislamiento Multiempresa: empresa_id es obligatorio para ejecutar consultas RAG.');
    }

    // 1. Generar embedding de la pregunta
    const queryEmb = await embeddingService.generateEmbedding(pregunta);

    // 2. Búsqueda semántica en Vector Store con filtro obligatorio de empresa
    const matches = await vectorStoreService.searchSimilar(
      queryEmb.vector,
      empresaId,
      5,    // top 5 fragmentos más relevantes
      0.06  // umbral mínimo de similitud para embeddings semánticos locales
    );

    // Verificar si hay coincidencia semántica sustantiva en los fragmentos
    const stopWords = new Set([
      'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
      'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
      'este', 'si', 'porque', 'esta', 'son', 'entre', 'era', 'fue', 'sobre', 'ser',
      'tiene', 'cual', 'cuales', 'cuando', 'donde', 'quien', 'ano', 'hace', 'desde', 'nuestra'
    ]);
    const queryTokens = pregunta
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3 && !stopWords.has(t));

    const tieneSustento =
      matches.length > 0 &&
      (matches[0].score >= 0.35 ||
        matches.some((m) => {
          const contenidoLower = m.payload.contenido.toLowerCase();
          return queryTokens.some((tok) => contenidoLower.includes(tok));
        }));

    // Si no hay fragmentos relevantes o no tienen sustento documental verificable
    if (matches.length === 0 || matches[0].score < 0.06 || !tieneSustento) {
      const respuestaVacia =
        'No se encontro evidencia documental suficiente en el repositorio de Google Drive para responder con certeza a su consulta sobre los parametros de su empresa.';

      await this.saveAuditLog({
        empresaId,
        usuarioId,
        conversacionId,
        pregunta,
        respuesta: respuestaVacia,
        estadoRecuperacion: 'SIN_EVIDENCIA',
        tiempoMs: Date.now() - startTime,
        fuentes: [],
      });

      return {
        respuesta: respuestaVacia,
        estado: 'SIN_EVIDENCIA',
        fuentes: [],
        tiempoRespuestaMs: Date.now() - startTime,
        modeloUtilizado: 'NexoSupply Documental RAG Engine',
        totalFuentesEncontradas: 0,
      };
    }

    // 3. Construir citas y fuentes verificables
    const fuentes: RagSourceCitation[] = matches.map((m) => ({
      documentoId: m.payload.documento_id,
      nombreDocumento: m.payload.nombre_documento,
      numeroFragmento: m.payload.numero_fragmento,
      relevanciaScore: m.score,
      urlDocumento: m.payload.url_documento,
      textoFragmento: m.payload.contenido.slice(0, 300) + '...',
      fechaActualizacion: m.payload.fecha_modificacion || new Date().toISOString(),
    }));

    // 4. Sintetizar respuesta fundamentada exclusivamente en los documentos recuperados
    const respuestaGenerada = this.synthesizeGroundedResponse(pregunta, matches);

    // 5. Guardar trazabilidad completa en MySQL
    await this.saveAuditLog({
      empresaId,
      usuarioId,
      conversacionId,
      pregunta,
      respuesta: respuestaGenerada,
      estadoRecuperacion: 'EXITOSO',
      tiempoMs: Date.now() - startTime,
      fuentes,
    });

    return {
      respuesta: respuestaGenerada,
      estado: 'EXITOSO',
      fuentes,
      tiempoRespuestaMs: Date.now() - startTime,
      modeloUtilizado: 'NexoSupply Documental RAG Engine',
      totalFuentesEncontradas: fuentes.length,
    };
  }

  /**
   * Sintetiza la respuesta basándose únicamente en los fragmentos de documentos recuperados
   */
  private synthesizeGroundedResponse(pregunta: string, matches: any[]): string {
    const docNames = Array.from(new Set(matches.map((m) => m.payload.nombre_documento)));
    const fragmentosRelevantes = matches.map((m) => m.payload.contenido).join('\n\n');

    // Extraer líneas clave que respondan a la pregunta
    const lineas = fragmentosRelevantes.split('\n').filter((l) => l.trim().length > 10);
    const extractos = lineas.slice(0, 6).join('\n- ');

    return `Segun los documentos oficiales recuperados desde el repositorio de Google Drive (${docNames.join(', ')}):\n\n- ${extractos}\n\nEsta informacion corresponde a los registros sincronizados de las operaciones vigentes de su empresa.`;
  }

  private async saveAuditLog(params: {
    empresaId: string;
    usuarioId: string;
    conversacionId?: string;
    pregunta: string;
    respuesta: string;
    estadoRecuperacion: string;
    tiempoMs: number;
    fuentes: RagSourceCitation[];
  }): Promise<void> {
    try {
      const historial = await prisma.historialConsultaRag.create({
        data: {
          empresa_id: params.empresaId,
          usuario_id: params.usuarioId,
          conversacion_id: params.conversacionId,
          pregunta: params.pregunta,
          respuesta: params.respuesta,
          modelo_utilizado: 'NexoSupply Documental RAG Engine',
          tiempo_respuesta_ms: params.tiempoMs,
          total_fuentes: params.fuentes.length,
          estado_recuperacion: params.estadoRecuperacion,
        },
      });

      for (const f of params.fuentes) {
        await prisma.fuenteRespuestaRag.create({
          data: {
            consulta_id: historial.id,
            documento_id: f.documentoId,
            nombre_documento: f.nombreDocumento,
            url_documento: f.urlDocumento,
            fragmento_id: undefined,
            relevancia_score: f.relevanciaScore,
            numero_fragmento: f.numeroFragmento,
            texto_fragmento: f.textoFragmento,
          },
        });
      }
    } catch (err: any) {
      console.warn('[RAG_AUDIT] Error guardando auditoria RAG:', err.message);
    }
  }
}

export const ragService = new RagService();
