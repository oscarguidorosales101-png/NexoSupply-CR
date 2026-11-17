import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { chunkingService } from '../src/services/chunking.service';
import { embeddingService } from '../src/services/embedding.service';
import { vectorStoreService } from '../src/services/vector-store.service';

const prisma = new PrismaClient();
const EMPRESA_ID = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

interface DocSpec {
  nombre: string;
  carpetaId: string;
  driveFolderId: string;
  localPath: string;
  tipoMime: string;
}

const TXT_EXPORT_DIR = path.resolve(process.cwd(), 'drive_txt_export');
const DOCS_DIR = path.resolve(process.cwd(), '../docs');

const DOCUMENTS: DocSpec[] = [
  // 15 Archivos Operativos TXT
  { nombre: 'empresa.txt', carpetaId: `${EMPRESA_ID}-GENERAL`, driveFolderId: '1F1i7i5Kds1SrgFg_wLB0QarhEyGqy3e3', localPath: path.join(TXT_EXPORT_DIR, 'empresa.txt'), tipoMime: 'text/plain' },
  { nombre: 'proveedores.txt', carpetaId: `${EMPRESA_ID}-PROVEEDORES`, driveFolderId: '1_0NgRdFII43x5oajUqTV2JcIybwYmI87', localPath: path.join(TXT_EXPORT_DIR, 'proveedores.txt'), tipoMime: 'text/plain' },
  { nombre: 'productos.txt', carpetaId: `${EMPRESA_ID}-INVENTARIO`, driveFolderId: '1G275FrxTNM6mqWswpseLErf_FlEJJGVc', localPath: path.join(TXT_EXPORT_DIR, 'productos.txt'), tipoMime: 'text/plain' },
  { nombre: 'inventario.txt', carpetaId: `${EMPRESA_ID}-INVENTARIO`, driveFolderId: '1G275FrxTNM6mqWswpseLErf_FlEJJGVc', localPath: path.join(TXT_EXPORT_DIR, 'inventario.txt'), tipoMime: 'text/plain' },
  { nombre: 'almacenes.txt', carpetaId: `${EMPRESA_ID}-INVENTARIO`, driveFolderId: '1G275FrxTNM6mqWswpseLErf_FlEJJGVc', localPath: path.join(TXT_EXPORT_DIR, 'almacenes.txt'), tipoMime: 'text/plain' },
  { nombre: 'compras.txt', carpetaId: `${EMPRESA_ID}-COMPRAS`, driveFolderId: '1CZQTWYyvADn_smMaGZVfXiHT4zIZLOwT', localPath: path.join(TXT_EXPORT_DIR, 'compras.txt'), tipoMime: 'text/plain' },
  { nombre: 'ordenes_compra.txt', carpetaId: `${EMPRESA_ID}-COMPRAS`, driveFolderId: '1CZQTWYyvADn_smMaGZVfXiHT4zIZLOwT', localPath: path.join(TXT_EXPORT_DIR, 'ordenes_compra.txt'), tipoMime: 'text/plain' },
  { nombre: 'recepciones.txt', carpetaId: `${EMPRESA_ID}-LOGISTICA`, driveFolderId: '1UmVg-4ufxqP7cDioUrtUQt61bslvud4h', localPath: path.join(TXT_EXPORT_DIR, 'recepciones.txt'), tipoMime: 'text/plain' },
  { nombre: 'evaluaciones_proveedores.txt', carpetaId: `${EMPRESA_ID}-EVALUACIONES`, driveFolderId: '1CaQXEUITpke-I-pRAxzejto005G4Q_A4', localPath: path.join(TXT_EXPORT_DIR, 'evaluaciones_proveedores.txt'), tipoMime: 'text/plain' },
  { nombre: 'incidencias.txt', carpetaId: `${EMPRESA_ID}-EVALUACIONES`, driveFolderId: '1CaQXEUITpke-I-pRAxzejto005G4Q_A4', localPath: path.join(TXT_EXPORT_DIR, 'incidencias.txt'), tipoMime: 'text/plain' },
  { nombre: 'riesgos.txt', carpetaId: `${EMPRESA_ID}-RIESGOS`, driveFolderId: '1wDI8VISA02BYtheSzo_q2qh1DnFGvXVr', localPath: path.join(TXT_EXPORT_DIR, 'riesgos.txt'), tipoMime: 'text/plain' },
  { nombre: 'alertas.txt', carpetaId: `${EMPRESA_ID}-RIESGOS`, driveFolderId: '1wDI8VISA02BYtheSzo_q2qh1DnFGvXVr', localPath: path.join(TXT_EXPORT_DIR, 'alertas.txt'), tipoMime: 'text/plain' },
  { nombre: 'indicadores.txt', carpetaId: `${EMPRESA_ID}-REPORTES`, driveFolderId: '1K0zp3MqxzLkVtvobAzotF6ViYMlvAisj', localPath: path.join(TXT_EXPORT_DIR, 'indicadores.txt'), tipoMime: 'text/plain' },
  { nombre: 'procedimientos.txt', carpetaId: `${EMPRESA_ID}-POLITICAS`, driveFolderId: '1GcDScz5I5UUIpk6kcxfcHtjhH2a6Dyur', localPath: path.join(TXT_EXPORT_DIR, 'procedimientos.txt'), tipoMime: 'text/plain' },
  { nombre: 'politicas_internas.txt', carpetaId: `${EMPRESA_ID}-POLITICAS`, driveFolderId: '1GcDScz5I5UUIpk6kcxfcHtjhH2a6Dyur', localPath: path.join(TXT_EXPORT_DIR, 'politicas_internas.txt'), tipoMime: 'text/plain' },

  // Documentos Oficiales de Arquitectura y Especificación (docs/)
  { nombre: '01_idea_empresarial_y_propuesta_valor.md', carpetaId: 'f-docs-01', driveFolderId: '1_kpaX-KYxLzA0bgNdVVst_TrzLsAoosl', localPath: path.join(DOCS_DIR, '01-idea-empresarial/README.md'), tipoMime: 'text/markdown' },
  { nombre: '02_alcance_funcional_y_modulos.md', carpetaId: 'f-docs-02', driveFolderId: '16vi87Q1R9FLIOafrb568u22YmCLi3k6I', localPath: path.join(DOCS_DIR, '02-alcance-funcional/README.md'), tipoMime: 'text/markdown' },
  { nombre: '03_modelo_multiempresa_y_seguridad.md', carpetaId: 'f-docs-03', driveFolderId: '10a2cbFDuNIslJ8O0NqXgIUyVaTEO2C3i', localPath: path.join(DOCS_DIR, '03-modelo-multiempresa/README.md'), tipoMime: 'text/markdown' },
  { nombre: '04_modelo_de_procesos_y_flujos.md', carpetaId: 'f-docs-04', driveFolderId: '1cEMB6x6VUmeiNzwKOg0tzLIl884Hyn38', localPath: path.join(DOCS_DIR, '04-modelo-de-procesos/README.md'), tipoMime: 'text/markdown' },
  { nombre: '05_modelo_entidad_relacion.md', carpetaId: 'f-docs-05', driveFolderId: '10dHNGcxDwy44phzZ953HNRhKqvm8f56D', localPath: path.join(DOCS_DIR, '05-modelo-entidad-relacion/README.md'), tipoMime: 'text/markdown' },
  { nombre: '06_diccionario_de_datos.md', carpetaId: 'f-docs-06', driveFolderId: '1Nz7Z4vRi6j_-vhhiSl88X0huwYsDICV9', localPath: path.join(DOCS_DIR, '06-diccionario-de-datos/README.md'), tipoMime: 'text/markdown' },
  { nombre: '07_reglas_de_negocio.md', carpetaId: 'f-docs-07', driveFolderId: '1aecj1mArbqXg1VyCe0mYmglkMdrzcfyi', localPath: path.join(DOCS_DIR, '07-reglas-de-negocio/README.md'), tipoMime: 'text/markdown' },
  { nombre: '08_seguridad_permisos_y_auditoria.md', carpetaId: 'f-docs-08', driveFolderId: '1nApZGKVrjdJhoKXxzxYn4orJbznUaBHE', localPath: path.join(DOCS_DIR, '08-seguridad-y-permisos/README.md'), tipoMime: 'text/markdown' },
  { nombre: '09_indicadores_y_viabilidad_financiera.md', carpetaId: 'f-docs-09', driveFolderId: '1wY96GfVWc06NGJCR4Zii7BvW2xWaxSlX', localPath: path.join(DOCS_DIR, '09-indicadores-y-viabilidad/README.md'), tipoMime: 'text/markdown' },
  { nombre: '10_arquitectura_tecnologica.md', carpetaId: 'f-docs-10', driveFolderId: '1VLV1rzIHiqosmFHeD3JTKZJ7ToAkZPa9', localPath: path.join(DOCS_DIR, '10-arquitectura-tecnologica/README.md'), tipoMime: 'text/markdown' },
  { nombre: '11_catalogo_de_apis.md', carpetaId: 'f-admin-tecnica', driveFolderId: '1uqkvgMFCEeNkAxv6zIwVj7q3q1E-jaw0', localPath: path.join(DOCS_DIR, '11-catalogo-de-apis/README.md'), tipoMime: 'text/markdown' },
  { nombre: '12_informe_etapa_4_frontend.md', carpetaId: 'f-admin-tecnica', driveFolderId: '1uqkvgMFCEeNkAxv6zIwVj7q3q1E-jaw0', localPath: path.join(DOCS_DIR, '12-informe-etapa-4-frontend.md'), tipoMime: 'text/markdown' },
];

async function indexAll() {
  console.log('--- Iniciando Indexación RAG Completa con Embeddings Densos Reales ---');
  let totalDocs = 0;
  let totalFrags = 0;

  for (const doc of DOCUMENTS) {
    if (!fs.existsSync(doc.localPath)) {
      console.warn(`[SKIP] Archivo no encontrado en disco: ${doc.localPath}`);
      continue;
    }

    const content = fs.readFileSync(doc.localPath, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const docId = `doc-${doc.nombre.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const webViewLink = `https://drive.google.com/drive/folders/${doc.driveFolderId}`;

    // 1. Guardar/actualizar DocumentoDrive en MySQL
    await prisma.documentoDrive.upsert({
      where: { id: docId },
      update: {
        carpeta_id: doc.carpetaId,
        nombre: doc.nombre,
        tipo_mime: doc.tipoMime,
        tamanio_bytes: BigInt(Buffer.byteLength(content)),
        url_web_view: webViewLink,
        hash_contenido: hash,
        estado_indexacion: 'INDEXANDO',
        fecha_modificacion_drive: new Date(),
        fecha_sincronizacion: new Date(),
      },
      create: {
        id: docId,
        empresa_id: EMPRESA_ID,
        carpeta_id: doc.carpetaId,
        drive_file_id: doc.driveFolderId,
        nombre: doc.nombre,
        tipo_mime: doc.tipoMime,
        tamanio_bytes: BigInt(Buffer.byteLength(content)),
        url_web_view: webViewLink,
        hash_contenido: hash,
        estado_indexacion: 'INDEXANDO',
        fecha_modificacion_drive: new Date(),
        fecha_sincronizacion: new Date(),
      },
    });

    // 2. Fragmentación semántica
    const chunks = chunkingService.chunkText(content, 750, 100);

    // 3. Limpiar fragmentos anteriores
    await prisma.fragmentoDocumental.deleteMany({
      where: { documento_id: docId },
    });

    // 4. Generar embeddings densos reales e insertar fragmentos
    const points = [];
    for (const ch of chunks) {
      const fragmentoId = `${docId}-frag-${ch.numeroFragmento}`;
      const emb = await embeddingService.generateEmbedding(ch.contenido);

      await prisma.fragmentoDocumental.create({
        data: {
          id: fragmentoId,
          empresa_id: EMPRESA_ID,
          documento_id: docId,
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

      points.push({
        id: fragmentoId,
        vector: emb.vector,
        payload: {
          empresa_id: EMPRESA_ID,
          documento_id: docId,
          fragmento_id: fragmentoId,
          carpeta_id: doc.carpetaId,
          nombre_documento: doc.nombre,
          fecha_modificacion: new Date().toISOString(),
          url_documento: webViewLink,
          numero_fragmento: ch.numeroFragmento,
          contenido: ch.contenido,
        },
      });
      totalFrags++;
    }

    // 5. Intentar persistir en Qdrant (si está activo)
    try {
      if (vectorStoreService.isQdrantActive()) {
        await vectorStoreService.upsertVectors(points);
      }
    } catch (e: any) {
      console.warn(`[QDRANT] Servidor offline, omitiendo persistencia externa: ${e.message}`);
    }

    // 6. Marcar como INDEXADO
    await prisma.documentoDrive.update({
      where: { id: docId },
      data: {
        estado_indexacion: 'INDEXADO',
        total_fragmentos: chunks.length,
        ultimo_error: null,
      },
    });

    totalDocs++;
    console.log(`[INDEXADO] ${doc.nombre} -> ${chunks.length} fragmentos`);
  }

  // 7. Registrar Sincronización en MySQL
  await prisma.sincronizacionDrive.create({
    data: {
      empresa_id: EMPRESA_ID,
      tipo: 'MANUAL',
      estado: 'COMPLETADA',
      archivos_detectados: totalDocs,
      archivos_procesados: totalDocs,
      archivos_fallidos: 0,
      fragmentos_generados: totalFrags,
      mensaje_resultado: `Sincronización RAG completada. ${totalDocs} documentos y ${totalFrags} fragmentos densos (MiniLM-L6) indexados.`,
      finalizado_en: new Date(),
    },
  });

  console.log(`\n========================================================`);
  console.log(`INDEXACIÓN COMPLETA: ${totalDocs} documentos, ${totalFrags} fragmentos`);
  console.log(`========================================================`);
}

indexAll().finally(() => prisma.$disconnect());
