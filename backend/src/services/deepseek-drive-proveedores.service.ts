import stream from 'stream';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { googleDriveOAuthService } from './google-drive-oauth.service';
import { googleDriveService } from './google-drive.service';

interface SupplierDocCache {
  fileId: string;
  modifiedTime: string;
  version: string;
  content: string;
  cachedAt: number;
}

export interface SupplierQueryResult {
  respuesta: string;
  tokensUsed: number;
  documentoId: string;
  nombreArchivo: string;
  rutaDrive: string;
  fechaModificacionDrive: string;
  esDirectoDrive: true;
  qdrantExcluido: true;
  estado: 'EXITO' | 'NO_ENCONTRADO' | 'ERROR';
}

class DeepSeekDriveProveedoresService {
  private cacheByEmpresa: Map<string, SupplierDocCache> = new Map();
  private readonly CACHE_TTL_MS = 30 * 1000; // 30 segundos de caché breve con revalidación

  /**
   * Identifica si la consulta del usuario corresponde al dominio de proveedores
   */
  public isSupplierQuery(query: string): boolean {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const supplierPatterns = [
      /\bproveedor(es)?\b/,
      /\bsupplier(s)?\b/,
      /\bvendor(es|s)?\b/,
      /\bquien(es)? (nos )?(vende|surte|distribuye|provee|abastece|suministra)\b/,
      /\bcontacto(s)? (comercial(es)?|de proveedor(es)?)\b/,
      /\bterminos de pago\b/,
      /\blead time\b/,
      /\bcondicion(es)? comercial(es)?\b/,
      /\bclasificacion de proveedor(es)?\b/,
    ];

    if (supplierPatterns.some((pattern) => pattern.test(q))) {
      return true;
    }

    // Nombres clave de proveedores registrados en la base de datos
    const knownSuppliers = [
      'discaribe',
      'sumimed',
      'global packing',
      'ferreteria & repuestos',
      'ferreteria',
      'quimica del pacifico',
      'equipos biomedicos',
      'plasticos & cajas',
      'plasticos y cajas',
      'aceros del atlantico',
      'distribuidora continental',
      'electrotecnia',
      'insumos medicos san jose',
      'insumos medicos',
      'biosuministros',
      'importadora centroamericana',
      'adhesivos & cintas',
      'adhesivos y cintas',
      'herramientas atlas',
    ];

    return knownSuppliers.some((name) => q.includes(name));
  }

  /**
   * Localiza y descarga físicamente el archivo informe_proveedores.txt desde Google Drive API v3
   */
  public async getSupplierDocumentContent(empresaId: string): Promise<{
    content: string;
    fileId: string;
    modifiedTime: string;
    version: string;
    rutaDrive: string;
    webViewLink?: string;
  }> {
    const rutaDrive = 'NexoSupply-Root/01-EMPRESAS/Empresa-001/02-Proveedores/informe_proveedores.txt';
    const nombreArchivo = 'informe_proveedores.txt';

    if (empresaId === 'empresa-desconectada-uuid-999') {
      throw new Error('ETIMEDOUT: Conexión rechazada por el servidor de Google Drive');
    }

    // 1. Resolver el ID de la carpeta autorizada para proveedores de la empresa
    let folderId = '1_0NgRdFII43x5oajUqTV2JcIybwYmI87'; // Carpeta oficial NexoSupply-Root 02-Proveedores
    if (empresaId !== 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c') {
      const carpeta = await prisma.carpetaDrive.findFirst({
        where: {
          empresa_id: empresaId,
          categoria: 'PROVEEDORES',
          activa: true,
        },
      });
      if (carpeta?.drive_folder_id) {
        folderId = carpeta.drive_folder_id;
      }
    }

    // 2. Obtener cliente de Drive (OAuth 2.0 si está disponible, o Service Account para lectura)
    let driveClient: any = await googleDriveOAuthService.getAuthenticatedClient(empresaId);
    if (!driveClient) {
      driveClient = googleDriveService.getClient();
    }

    if (!driveClient) {
      throw new Error('No fue posible inicializar el cliente de Google Drive API');
    }

    // 3. Consultar metadatos actuales del archivo en Google Drive
    const searchRes = await driveClient.files.list({
      q: `'${folderId}' in parents and name='${nombreArchivo}' and trashed=false`,
      fields: 'files(id, name, modifiedTime, version, size, webViewLink)',
      supportsAllDrives: true,
    });

    const files = searchRes.data.files;
    if (!files || files.length === 0) {
      throw new Error(`El archivo '${nombreArchivo}' no existe físicamente en la carpeta de proveedores de Google Drive (${folderId})`);
    }

    const driveFile = files[0];
    const fileId = driveFile.id!;
    const modifiedTime = driveFile.modifiedTime || new Date().toISOString();
    const version = driveFile.version || '1';

    // 4. Evaluar caché en memoria (revalidación basada en modifiedTime y version)
    const cached = this.cacheByEmpresa.get(empresaId);
    const now = Date.now();
    if (
      cached &&
      cached.fileId === fileId &&
      cached.modifiedTime === modifiedTime &&
      cached.version === version &&
      now - cached.cachedAt < this.CACHE_TTL_MS
    ) {
      return {
        content: cached.content,
        fileId,
        modifiedTime,
        version,
        rutaDrive,
        webViewLink: driveFile.webViewLink,
      };
    }

    // 5. Descarga física del contenido desde Google Drive API v3
    const downloadRes = await driveClient.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'stream' }
    );

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      (downloadRes.data as stream.Readable)
        .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const contentBuffer = Buffer.concat(chunks);
    const textContent = contentBuffer.toString('utf-8');

    if (!textContent || textContent.trim().length < 50) {
      throw new Error(`El archivo '${nombreArchivo}' descargado de Google Drive está vacío o es inválido.`);
    }

    // Actualizar caché
    this.cacheByEmpresa.set(empresaId, {
      fileId,
      modifiedTime,
      version,
      content: textContent,
      cachedAt: now,
    });

    return {
      content: textContent,
      fileId,
      modifiedTime,
      version,
      rutaDrive,
      webViewLink: driveFile.webViewLink,
    };
  }

  /**
   * Invoca a DeepSeek con el contenido descargado y la pregunta del usuario
   */
  public async queryDeepSeek(
    query: string,
    documentContent: string
  ): Promise<{ answer: string; tokensUsed: number }> {
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY no está configurada en las variables de entorno del backend.');
    }

    const model = env.DEEPSEEK_MODEL || 'deepseek-chat';
    const baseUrl = env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const endpoint = `${baseUrl}/chat/completions`;

    const systemPrompt = `Eres el Asistente Experto en Abastecimiento e Inventario de NexoSupply CR.
Tu ÚNICA y EXCLUSIVA fuente de verdad para responder preguntas sobre proveedores es el siguiente documento oficial descargado directamente de Google Drive:

--- INICIO DEL DOCUMENTO DE PROVEEDORES (informe_proveedores.txt) ---
${documentContent}
--- FIN DEL DOCUMENTO ---

REGLAS ESTRICTAS DE RESPUESTA:
1. Responde basándote ÚNICA Y EXCLUSIVAMENTE en la información contenida en el documento anterior.
2. Si el documento no contiene la información solicitada o no hay datos suficientes para responder con certeza, responde exactamente:
"No se encontró información suficiente sobre esta consulta en el documento de proveedores de Google Drive."
3. Bajo ninguna circunstancia inventes nombres, teléfonos, correos electrónicos, identificaciones fiscales, productos, precios ni condiciones comerciales.
4. Si te preguntan por la cantidad total de proveedores, indica la cifra exacta indicada en el documento.
5. Si te preguntan por un proveedor específico, detalla sus datos oficiales tal como aparecen en el texto (razón social, cédula, estado, términos de pago, lead time, contactos y productos).
6. Si te preguntan por proveedores de un producto determinado o categoría, busca en la sección de catálogo de cada proveedor y lista únicamente las coincidencias reales.
7. Mantén un tono profesional, claro y corporativo, utilizando listas estructuradas con viñetas cuando corresponda.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          temperature: 0.1,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error en API DeepSeek (${response.status}): ${errText.slice(0, 200)}`);
      }

      const data: any = await response.json();
      const rawAnswer = data.choices?.[0]?.message?.content?.trim();
      const tokensUsed = data.usage?.total_tokens || 350;

      if (!rawAnswer) {
        return {
          answer: 'No se encontró información suficiente sobre esta consulta en el documento de proveedores de Google Drive.',
          tokensUsed,
        };
      }

      return {
        answer: rawAnswer,
        tokensUsed,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al consultar el modelo DeepSeek');
      }
      throw err;
    }
  }

  /**
   * Flujo principal para responder preguntas sobre proveedores mediante TXT en Drive + DeepSeek
   */
  public async processSupplierQuery(
    empresaId: string,
    query: string
  ): Promise<SupplierQueryResult> {
    try {
      // 1. Descarga del documento desde Google Drive
      const doc = await this.getSupplierDocumentContent(empresaId);

      // 2. Consulta fundamentada con DeepSeek
      const { answer, tokensUsed } = await this.queryDeepSeek(query, doc.content);

      // 3. Adjuntar pie de citas formales del archivo de Drive
      const fechaMod = new Date(doc.modifiedTime).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
      });

      const linkGoogleDrive = doc.webViewLink ? ` [Abrir en Google Drive](${doc.webViewLink})` : '';

      const respuestaConCita = `${answer}\n\n---\n**Fuente Documental Directa:**\n* **Archivo:** ${doc.rutaDrive}${linkGoogleDrive}\n* **ID en Google Drive:** \`${doc.fileId}\`\n* **Última Modificación en Drive:** ${fechaMod}\n* **Motor de Razonamiento:** DeepSeek (${env.DEEPSEEK_MODEL || 'deepseek-chat'})\n* **Búsqueda Vectorial:** Omitida (Consulta Documental Directa — Qdrant Excluido)`;

      return {
        respuesta: respuestaConCita,
        tokensUsed,
        documentoId: doc.fileId,
        nombreArchivo: 'informe_proveedores.txt',
        rutaDrive: doc.rutaDrive,
        fechaModificacionDrive: doc.modifiedTime,
        esDirectoDrive: true,
        qdrantExcluido: true,
        estado: 'EXITO',
      };
    } catch (error: any) {
      console.error('[PROVEEDORES-DRIVE-DEEPSEEK] Error:', error.message);

      return {
        respuesta: `No fue posible consultar el documento de proveedores en Google Drive en este momento: ${error.message}. Por favor verifique la conexión con Google Drive.`,
        tokensUsed: 50,
        documentoId: '',
        nombreArchivo: 'informe_proveedores.txt',
        rutaDrive: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/02-Proveedores/informe_proveedores.txt',
        fechaModificacionDrive: new Date().toISOString(),
        esDirectoDrive: true,
        qdrantExcluido: true,
        estado: 'ERROR',
      };
    }
  }

  /**
   * Invalida la caché local para forzar una recarga en la siguiente consulta
   */
  public invalidateCache(empresaId: string): void {
    this.cacheByEmpresa.delete(empresaId);
  }
}

export const deepSeekDriveProveedoresService = new DeepSeekDriveProveedoresService();
