import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import { env } from '../config/env';
import { prisma } from '../config/database';

export interface DriveConnectionStatus {
  connected: boolean;
  tipoCredencial: string;
  projectId?: string;
  clientEmail?: string;
  rootFolderId?: string;
  rootFolderConfigurada: boolean;
  mensaje: string;
  error?: string;
}

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private clientEmail: string = '';
  private projectId: string = '';
  private credentialPath: string = '';
  private isInitialized = false;

  constructor() {
    this.resolveCredentials();
  }

  private resolveCredentials(): void {
    // Buscar el archivo de credenciales en ubicaciones conocidas
    const possiblePaths = [
      env.GOOGLE_APPLICATION_CREDENTIALS,
      path.resolve(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS),
      path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json'),
      path.resolve(__dirname, '../../../nexosupply-cr-209e6cfebcda (1).json'),
      path.resolve(__dirname, '../../../../nexosupply-cr-209e6cfebcda (1).json'),
    ];

    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        this.credentialPath = p;
        break;
      }
    }

    if (this.credentialPath) {
      try {
        const fileContent = fs.readFileSync(this.credentialPath, 'utf8');
        const creds = JSON.parse(fileContent);
        this.clientEmail = creds.client_email || '';
        this.projectId = creds.project_id || '';

        const auth = new google.auth.GoogleAuth({
          keyFile: this.credentialPath,
          scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.metadata',
          ],
        });

        this.driveClient = google.drive({ version: 'v3', auth });
        this.isInitialized = true;
      } catch (err: any) {
        console.error('[DRIVE] Error al cargar credenciales de Google Cloud:', err.message);
        this.isInitialized = false;
      }
    }
  }

  public getClientEmail(): string {
    return this.clientEmail;
  }

  public getProjectId(): string {
    return this.projectId;
  }

  public isReady(): boolean {
    return this.isInitialized && this.driveClient !== null;
  }

  public async checkConnection(): Promise<DriveConnectionStatus> {
    if (!this.driveClient) {
      return {
        connected: false,
        tipoCredencial: 'service_account',
        clientEmail: this.clientEmail,
        projectId: this.projectId,
        rootFolderConfigurada: false,
        mensaje: 'No se pudo inicializar el cliente de Google Drive. Compruebe la ruta del archivo de credenciales.',
        error: 'CLIENT_NOT_INITIALIZED',
      };
    }

    try {
      // Intentar una consulta básica a Drive API para validar autenticación
      const res = await this.driveClient.about.get({
        fields: 'user, storageQuota',
      });

      const rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined;

      return {
        connected: true,
        tipoCredencial: 'service_account',
        projectId: this.projectId,
        clientEmail: this.clientEmail || res.data.user?.emailAddress || undefined,
        rootFolderId,
        rootFolderConfigurada: Boolean(rootFolderId),
        mensaje: 'Conexión autenticada exitosamente con Google Drive API v3 mediante Cuenta de Servicio.',
      };
    } catch (error: any) {
      return {
        connected: false,
        tipoCredencial: 'service_account',
        projectId: this.projectId,
        clientEmail: this.clientEmail,
        rootFolderConfigurada: Boolean(env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
        mensaje: 'Fallo al autenticar contra Google Drive API. Verifique permisos y cuota del proyecto.',
        error: error.message,
      };
    }
  }

  /**
   * Crea o asegura una carpeta en Google Drive
   */
  public async getOrCreateFolder(nombre: string, parentId?: string): Promise<{ id: string; name: string }> {
    if (!this.driveClient) throw new Error('Google Drive API no está inicializada');

    let query = `mimeType='application/vnd.google-apps.folder' and name='${nombre}' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    try {
      const searchRes = await this.driveClient.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        const found = searchRes.data.files[0];
        return { id: found.id!, name: found.name! };
      }

      // Si no existe, crearla
      const fileMetadata: drive_v3.Schema$File = {
        name: nombre,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const createRes = await this.driveClient.files.create({
        requestBody: fileMetadata,
        fields: 'id, name',
      });

      return { id: createRes.data.id!, name: createRes.data.name! };
    } catch (err: any) {
      console.error(`[DRIVE] Error creando/buscando carpeta '${nombre}':`, err.message);
      throw err;
    }
  }

  /**
   * Inicializa la estructura estándar de 10 carpetas para una empresa en Google Drive y MySQL
   */
  public async ensureEnterpriseFolders(empresaId: string, codigoEmpresa: string): Promise<any[]> {
    const carpetasEstandar = [
      { num: '01', nombre: '01-Informacion-General', cat: 'GENERAL' },
      { num: '02', nombre: '02-Proveedores', cat: 'PROVEEDORES' },
      { num: '03', nombre: '03-Productos-e-Inventario', cat: 'INVENTARIO' },
      { num: '04', nombre: '04-Compras-y-Ordenes', cat: 'COMPRAS' },
      { num: '05', nombre: '05-Recepciones-y-Logistica', cat: 'LOGISTICA' },
      { num: '06', nombre: '06-Evaluaciones-e-Incidencias', cat: 'EVALUACIONES' },
      { num: '07', nombre: '07-Riesgos-y-Alertas', cat: 'RIESGOS' },
      { num: '08', nombre: '08-Reportes-e-Indicadores', cat: 'REPORTES' },
      { num: '09', nombre: '09-Procedimientos-y-Politicas', cat: 'POLITICAS' },
      { num: '10', nombre: '10-Historico', cat: 'HISTORICO' },
    ];

    let rootDriveId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined;
    let empresaFolderDriveId: string | undefined;

    // Si hay conexión con Drive activa, intentar crear la jerarquía física
    if (this.driveClient) {
      try {
        const rootFolder = await this.getOrCreateFolder('NexoSupply-Knowledge', rootDriveId);
        const empresaFolder = await this.getOrCreateFolder(codigoEmpresa, rootFolder.id);
        empresaFolderDriveId = empresaFolder.id;
      } catch (err) {
        console.warn(`[DRIVE] No se pudo crear la carpeta raíz en Drive (${codigoEmpresa}):`, (err as any).message);
      }
    }

    const resultadoCarpetas = [];

    for (const c of carpetasEstandar) {
      let subFolderId: string | undefined;
      if (this.driveClient && empresaFolderDriveId) {
        try {
          const sub = await this.getOrCreateFolder(c.nombre, empresaFolderDriveId);
          subFolderId = sub.id;
        } catch (err) {
          console.warn(`[DRIVE] Advertencia creando subcarpeta ${c.nombre}:`, (err as any).message);
        }
      }

      // Sincronizar en MySQL
      const carpetaDb = await prisma.carpetaDrive.upsert({
        where: {
          id: `${empresaId}-${c.cat}`,
        },
        update: {
          nombre: c.nombre,
          drive_folder_id: subFolderId,
          ruta_relativa: `NexoSupply-Knowledge/${codigoEmpresa}/${c.nombre}`,
        },
        create: {
          id: `${empresaId}-${c.cat}`,
          empresa_id: empresaId,
          drive_folder_id: subFolderId,
          nombre: c.nombre,
          categoria: c.cat,
          ruta_relativa: `NexoSupply-Knowledge/${codigoEmpresa}/${c.nombre}`,
          activa: true,
        },
      });

      resultadoCarpetas.push(carpetaDb);
    }

    return resultadoCarpetas;
  }

  /**
   * Lista archivos de una carpeta en Google Drive
   */
  public async listFolderFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    if (!this.driveClient) return [];

    try {
      const res = await this.driveClient.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime, version, md5Checksum)',
        pageSize: 100,
      });

      return res.data.files || [];
    } catch (err: any) {
      console.error(`[DRIVE] Error listando archivos de carpeta ${folderId}:`, err.message);
      return [];
    }
  }

  /**
   * Descarga o exporta un archivo desde Google Drive a Buffer
   */
  public async downloadOrExportFile(fileId: string, mimeType: string): Promise<{ buffer: Buffer; exportMimeType: string }> {
    if (!this.driveClient) throw new Error('Google Drive no inicializado');

    // Google Docs: exportar a texto plano
    if (mimeType === 'application/vnd.google-apps.document') {
      const res = await this.driveClient.files.export(
        { fileId, mimeType: 'text/plain' },
        { responseType: 'arraybuffer' }
      );
      return { buffer: Buffer.from(res.data as ArrayBuffer), exportMimeType: 'text/plain' };
    }

    // Google Sheets: exportar a CSV
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const res = await this.driveClient.files.export(
        { fileId, mimeType: 'text/csv' },
        { responseType: 'arraybuffer' }
      );
      return { buffer: Buffer.from(res.data as ArrayBuffer), exportMimeType: 'text/csv' };
    }

    // Archivo binario estándar (PDF, DOCX, XLSX, CSV, TXT)
    const res = await this.driveClient.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return { buffer: Buffer.from(res.data as ArrayBuffer), exportMimeType: mimeType };
  }

  /**
   * Sube o actualiza un archivo generado en una carpeta de Google Drive
   */
  public async uploadOrUpdateFile(
    folderId: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
  ): Promise<{ id: string; name: string; webViewLink?: string }> {
    if (!this.driveClient) throw new Error('Google Drive no inicializado');

    // Comprobar si ya existe un archivo con ese nombre en la carpeta
    const existing = await this.driveClient.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
      fields: 'files(id, name)',
    });

    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    if (existing.data.files && existing.data.files.length > 0) {
      const existingId = existing.data.files[0].id!;
      const updateRes = await this.driveClient.files.update({
        fileId: existingId,
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink',
      });
      return {
        id: updateRes.data.id!,
        name: updateRes.data.name!,
        webViewLink: updateRes.data.webViewLink || undefined,
      };
    }

    const createRes = await this.driveClient.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: bufferStream,
      },
      fields: 'id, name, webViewLink',
    });

    return {
      id: createRes.data.id!,
      name: createRes.data.name!,
      webViewLink: createRes.data.webViewLink || undefined,
    };
  }

  /**
   * Obtiene cambios incrementales de Google Drive mediante Changes API
   */
  public async getIncrementalChanges(pageToken?: string): Promise<{
    changes: drive_v3.Schema$Change[];
    newStartPageToken?: string;
  }> {
    if (!this.driveClient) return { changes: [] };

    try {
      let currentPageToken = pageToken;
      if (!currentPageToken) {
        const startTokenRes = await this.driveClient.changes.getStartPageToken();
        currentPageToken = startTokenRes.data.startPageToken || undefined;
      }

      if (!currentPageToken) return { changes: [] };

      const res = await this.driveClient.changes.list({
        pageToken: currentPageToken,
        fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, trashed, parents, modifiedTime))',
      });

      return {
        changes: res.data.changes || [],
        newStartPageToken: res.data.newStartPageToken || res.data.nextPageToken || undefined,
      };
    } catch (err: any) {
      console.error('[DRIVE] Error consultando Changes API:', err.message);
      return { changes: [] };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
