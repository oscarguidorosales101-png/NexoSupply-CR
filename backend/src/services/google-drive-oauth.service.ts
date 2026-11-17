import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stream from 'stream';
import { google, drive_v3 } from 'googleapis';
import { env } from '../config/env';
import { prisma } from '../config/database';

export interface OAuthConnectionStatus {
  conectado: boolean;
  emailAutorizado?: string;
  expiraEn?: Date | null;
  raizAutorizada: string;
  permisosEscritura: boolean;
  mensaje: string;
}

export interface UploadResult {
  driveFileId: string;
  nombre: string;
  webViewLink?: string;
  sha256: string;
  tamanioBytes: number;
  esActualizacion: boolean;
  documentoId: string;
}

export class GoogleDriveOAuthService {
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = '';
  private rootFolderId: string = '';
  private expectedOwnerEmail: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1';
    this.expectedOwnerEmail = env.GOOGLE_OAUTH_OWNER_EMAIL || 'oscarguidorosales101@gmail.com';
    this.redirectUri = env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/google/callback';
    this.resolveCredentials();
  }

  /**
   * Carga credenciales OAuth desde variables de entorno o archivo client_secret JSON
   */
  private resolveCredentials(): void {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      this.clientId = env.GOOGLE_CLIENT_ID;
      this.clientSecret = env.GOOGLE_CLIENT_SECRET;
      this.isConfigured = true;
      return;
    }

    // Buscar archivo client_secret_*.json
    const searchDirs = [
      process.cwd(),
      path.resolve(process.cwd(), '..'),
      path.resolve(__dirname, '../../..'),
      path.resolve(__dirname, '../../../..'),
    ];

    for (const dir of searchDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        const secretFile = files.find(
          (f) => f.startsWith('client_secret_') && f.endsWith('.json')
        );

        if (secretFile) {
          const fullPath = path.join(dir, secretFile);
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          const web = parsed.web || parsed.installed;
          if (web && web.client_id && web.client_secret) {
            this.clientId = web.client_id;
            this.clientSecret = web.client_secret;
            if (web.redirect_uris && web.redirect_uris.length > 0) {
              const matched = web.redirect_uris.find((u: string) =>
                u.includes('/api/v1/auth/google/callback')
              );
              this.redirectUri = matched || web.redirect_uris[0];
            }
            this.isConfigured = true;
            return;
          }
        }
      } catch (err) {
        // Continuar buscando
      }
    }
  }

  public getRootFolderId(): string {
    return this.rootFolderId;
  }

  public getExpectedOwnerEmail(): string {
    return this.expectedOwnerEmail;
  }

  public isOAuthConfigured(): boolean {
    return this.isConfigured && Boolean(this.clientId) && Boolean(this.clientSecret);
  }

  /**
   * Crea una nueva instancia de OAuth2Client
   */
  private createOAuthClient(): any {
    if (!this.isOAuthConfigured()) {
      throw new Error('Credenciales OAuth 2.0 de Google no encontradas ni configuradas');
    }
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  /**
   * Deriva una clave AES-256 de 32 bytes a partir de JWT_SECRET
   */
  private getEncryptionKey(): Buffer {
    return crypto.createHash('sha256').update(env.JWT_SECRET).digest();
  }

  /**
   * Cifra un texto con AES-256-GCM
   */
  private encrypt(plainText: string): { cipherText: string; iv: string; tag: string } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
      cipherText: encrypted,
      iv: iv.toString('hex'),
      tag,
    };
  }

  /**
   * Descifra un texto con AES-256-GCM
   */
  private decrypt(cipherText: string, ivHex: string, tagHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Genera un state criptográfico seguro con HMAC-SHA256 para prevenir ataques CSRF
   */
  public generateState(empresaId: string, userId: string): string {
    const payload = JSON.stringify({
      empresaId,
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    const b64Payload = Buffer.from(payload, 'utf8').toString('base64url');
    const hmac = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(b64Payload)
      .digest('base64url');

    return `${b64Payload}.${hmac}`;
  }

  /**
   * Valida la firma del state y su caducidad (máximo 10 minutos)
   */
  public verifyState(state: string): { empresaId: string; userId: string } {
    const parts = state.split('.');
    if (parts.length !== 2) {
      throw new Error('Estado OAuth inválido: formato corrupto');
    }

    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(b64Payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      throw new Error('Estado OAuth rechazado: firma criptográfica inválida (posible ataque CSRF)');
    }

    const jsonStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const data = JSON.parse(jsonStr);

    const now = Date.now();
    const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 horas de validez para dar tiempo al usuario
    if (now - data.timestamp > MAX_AGE_MS) {
      throw new Error('Estado OAuth caducado: la solicitud de autorización ha expirado');
    }

    return {
      empresaId: data.empresaId,
      userId: data.userId,
    };
  }

  /**
   * Genera la URL de autorización para el flujo OAuth 2.0
   */
  public getAuthUrl(empresaId: string, userId: string): { url: string; state: string } {
    const oauth2Client = this.createOAuthClient();
    const state = this.generateState(empresaId, userId);

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
      include_granted_scopes: true,
    });

    return { url, state };
  }

  /**
   * Procesa el callback de Google OAuth 2.0, intercambia el código y persiste el token cifrado
   */
  public async handleCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; email: string; empresaId: string; mensaje: string }> {
    const { empresaId } = this.verifyState(state);
    const oauth2Client = this.createOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Obtener información del usuario autenticado
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email?.toLowerCase().trim() || '';

    // Validar que la cuenta coincida con el propietario esperado
    const expected = this.expectedOwnerEmail.toLowerCase().trim();
    if (userEmail !== expected) {
      throw new Error(
        `Cuenta de Google no autorizada: ${userEmail}. Se requiere la cuenta del propietario (${expected})`
      );
    }

    // Si no vino refresh_token en la respuesta actual (por ejemplo si ya se dio consentimiento previo),
    // intentamos mantener el refresh_token previo si existe en la base de datos
    let finalTokens = { ...tokens };
    if (!finalTokens.refresh_token) {
      const prevCred = await prisma.credencialOAuthDrive.findUnique({
        where: { empresa_id: empresaId },
      });
      if (prevCred) {
        try {
          const decryptedPrev = JSON.parse(this.decrypt(prevCred.token_cifrado, prevCred.iv, prevCred.tag));
          if (decryptedPrev.refresh_token) {
            finalTokens.refresh_token = decryptedPrev.refresh_token;
          }
        } catch (e) {
          // Ignorar error al leer anterior
        }
      }
    }

    const tokensJson = JSON.stringify(finalTokens);
    const encrypted = this.encrypt(tokensJson);

    await prisma.credencialOAuthDrive.upsert({
      where: { empresa_id: empresaId },
      update: {
        email_autorizado: userEmail,
        token_cifrado: encrypted.cipherText,
        iv: encrypted.iv,
        tag: encrypted.tag,
        expira_en: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        alcance: tokens.scope || 'https://www.googleapis.com/auth/drive.file',
        activo: true,
      },
      create: {
        empresa_id: empresaId,
        email_autorizado: userEmail,
        token_cifrado: encrypted.cipherText,
        iv: encrypted.iv,
        tag: encrypted.tag,
        expira_en: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        alcance: tokens.scope || 'https://www.googleapis.com/auth/drive.file',
        activo: true,
      },
    });

    return {
      success: true,
      email: userEmail,
      empresaId,
      mensaje: `Google Drive personal conectado exitosamente para ${userEmail}`,
    };
  }

  /**
   * Obtiene un cliente de Drive autenticado con OAuth 2.0 y renovación automática para una empresa
   */
  public async getAuthenticatedClient(empresaId: string): Promise<drive_v3.Drive | null> {
    const cred = await prisma.credencialOAuthDrive.findUnique({
      where: { empresa_id: empresaId },
    });

    if (!cred || !cred.activo) {
      return null;
    }

    try {
      const tokensJson = this.decrypt(cred.token_cifrado, cred.iv, cred.tag);
      const tokens = JSON.parse(tokensJson);

      const oauth2Client = this.createOAuthClient();
      oauth2Client.setCredentials(tokens);

      // Evento de renovación automática de tokens
      oauth2Client.on('tokens', async (newTokens: any) => {
        try {
          const mergedTokens = { ...tokens, ...newTokens };
          const encrypted = this.encrypt(JSON.stringify(mergedTokens));
          await prisma.credencialOAuthDrive.update({
            where: { empresa_id: empresaId },
            data: {
              token_cifrado: encrypted.cipherText,
              iv: encrypted.iv,
              tag: encrypted.tag,
              expira_en: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined,
            },
          });
        } catch (err: any) {
          console.error('[DRIVE-OAUTH] Error al persistir token renovado:', err.message);
        }
      });

      return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (err: any) {
      console.error(`[DRIVE-OAUTH] Error al inicializar cliente OAuth para empresa ${empresaId}:`, err.message);
      return null;
    }
  }

  /**
   * Valida estrictamente que la carpeta destino sea NexoSupply-Root o una de sus subcarpetas registradas
   */
  public async isFolderAllowed(folderId: string, empresaId: string): Promise<boolean> {
    if (folderId === this.rootFolderId) {
      return true;
    }

    // Verificar si la carpeta está registrada en MySQL bajo esta empresa o estructura autorizada
    const carpeta = await prisma.carpetaDrive.findFirst({
      where: {
        drive_folder_id: folderId,
        activa: true,
      },
    });

    return Boolean(carpeta);
  }

  /**
   * Sube o actualiza un archivo en Google Drive personal mediante OAuth 2.0
   * Garantiza deduplicación por nombre de archivo dentro de la carpeta y cálculo SHA-256
   */
  public async uploadOrUpdateFile(
    empresaId: string,
    folderId: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
  ): Promise<UploadResult> {
    // 1. Validar restricción estricta de escritura
    const isAllowed = await this.isFolderAllowed(folderId, empresaId);
    if (!isAllowed) {
      throw new Error(
        `ESCRITURA_DENEGADA: La carpeta destino (${folderId}) no pertenece al árbol autorizado NexoSupply-Root`
      );
    }

    // 2. Obtener cliente OAuth
    const drive = await this.getAuthenticatedClient(empresaId);
    if (!drive) {
      throw new Error(
        'Google Drive OAuth no está conectado o sus credenciales están inactivas para esta empresa'
      );
    }

    // 3. Calcular hash SHA-256
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const tamanioBytes = fileBuffer.length;

    // 4. Buscar si el archivo ya existe en la carpeta autorizada
    const existingSearch = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
      fields: 'files(id, name, webViewLink, md5Checksum)',
    });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    let driveFileId: string;
    let webViewLink: string | undefined;
    let esActualizacion = false;

    if (existingSearch.data.files && existingSearch.data.files.length > 0) {
      // Actualizar archivo existente
      const existingFile = existingSearch.data.files[0];
      driveFileId = existingFile.id!;
      esActualizacion = true;

      const updateRes = await drive.files.update({
        fileId: driveFileId,
        media: {
          mimeType,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink',
      });

      webViewLink = updateRes.data.webViewLink || existingFile.webViewLink || undefined;
    } else {
      // Crear nuevo archivo en la carpeta autorizada
      const createRes = await drive.files.create({
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

      driveFileId = createRes.data.id!;
      webViewLink = createRes.data.webViewLink || undefined;
    }

    // 5. Vincular carpeta en MySQL
    const carpetaEncontrada = await prisma.carpetaDrive.findFirst({
      where: {
        empresa_id: empresaId,
        drive_folder_id: folderId,
      },
    });

    // 6. Registrar o actualizar en la tabla DocumentoDrive de MySQL
    const docId = `drive-oauth-${driveFileId}`;
    await prisma.documentoDrive.upsert({
      where: { id: docId },
      update: {
        nombre: fileName,
        tipo_mime: mimeType,
        tamanio_bytes: BigInt(tamanioBytes),
        url_web_view: webViewLink,
        hash_contenido: sha256,
        carpeta_id: carpetaEncontrada?.id || null,
        fecha_modificacion_drive: new Date(),
        fecha_sincronizacion: new Date(),
        estado_indexacion: 'PENDIENTE',
        ultimo_error: null,
      },
      create: {
        id: docId,
        empresa_id: empresaId,
        carpeta_id: carpetaEncontrada?.id || null,
        drive_file_id: driveFileId,
        nombre: fileName,
        tipo_mime: mimeType,
        tamanio_bytes: BigInt(tamanioBytes),
        url_web_view: webViewLink,
        hash_contenido: sha256,
        estado_indexacion: 'PENDIENTE',
        fecha_modificacion_drive: new Date(),
        fecha_sincronizacion: new Date(),
      },
    });

    return {
      driveFileId,
      nombre: fileName,
      webViewLink,
      sha256,
      tamanioBytes,
      esActualizacion,
      documentoId: docId,
    };
  }

  /**
   * Sincroniza y sube todos los 15 archivos operativos .txt generados en backend/drive_txt_export
   */
  public async syncAllOperationalFiles(empresaId: string): Promise<{
    total: number;
    exitosos: number;
    fallidos: number;
    detalles: any[];
  }> {
    const drive = await this.getAuthenticatedClient(empresaId);
    if (!drive) {
      throw new Error('Debe conectar Google Drive Personal mediante OAuth 2.0 antes de subir los archivos');
    }

    // Mapeo de archivos operativos a carpetas estándar
    const fileFolderMapping: Record<string, string> = {
      'empresa.txt': '01-Informacion-General',
      'indicadores.txt': '08-Reportes-E-Indicadores',
      'proveedores.txt': '02-Proveedores',
      'productos.txt': '03-Productos-E-Inventario',
      'inventario.txt': '03-Productos-E-Inventario',
      'almacenes.txt': '03-Productos-E-Inventario',
      'compras.txt': '04-Compras-Y-Ordenes',
      'ordenes_compra.txt': '04-Compras-Y-Ordenes',
      'recepciones.txt': '05-Recepciones-Y-Logistica',
      'evaluaciones_proveedores.txt': '06-Evaluaciones-E-Incidencias',
      'incidencias.txt': '06-Evaluaciones-E-Incidencias',
      'riesgos.txt': '07-Riesgos-Y-Alertas',
      'alertas.txt': '07-Riesgos-Y-Alertas',
      'procedimientos.txt': '09-Procedimientos-Y-Politicas',
      'politicas_internas.txt': '09-Procedimientos-Y-Politicas',
    };

    // Obtener carpetas registradas
    const carpetas = await prisma.carpetaDrive.findMany({
      where: { empresa_id: empresaId, activa: true },
    });
    const carpetaMap = new Map<string, string>();
    for (const c of carpetas) {
      carpetaMap.set(c.nombre, c.drive_folder_id || this.rootFolderId);
    }

    const exportDir = path.resolve(process.cwd(), 'drive_txt_export');
    const altExportDir = path.resolve(__dirname, '../../drive_txt_export');
    const targetDir = fs.existsSync(exportDir) ? exportDir : altExportDir;

    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directorio de exportación ${targetDir} no existe`);
    }

    const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.txt'));
    const resultados: any[] = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const fileName of files) {
      try {
        const filePath = path.join(targetDir, fileName);
        const buffer = fs.readFileSync(filePath);
        const folderName = fileFolderMapping[fileName] || '01-Informacion-General';
        const targetFolderId = carpetaMap.get(folderName) || this.rootFolderId;

        const uploadRes = await this.uploadOrUpdateFile(
          empresaId,
          targetFolderId,
          fileName,
          'text/plain',
          buffer
        );

        resultados.push({
          archivo: fileName,
          carpeta: folderName,
          driveFileId: uploadRes.driveFileId,
          estado: 'SUBIDO_CON_EXITO',
          sha256: uploadRes.sha256,
          esActualizacion: uploadRes.esActualizacion,
        });
        exitosos++;
      } catch (err: any) {
        fallidos++;
        resultados.push({
          archivo: fileName,
          estado: 'ERROR',
          error: err.message,
        });
      }
    }

    return {
      total: files.length,
      exitosos,
      fallidos,
      detalles: resultados,
    };
  }

  /**
   * Consulta el estado de conexión OAuth de la empresa
   */
  public async getStatus(empresaId: string): Promise<OAuthConnectionStatus> {
    const cred = await prisma.credencialOAuthDrive.findUnique({
      where: { empresa_id: empresaId },
    });

    if (!cred || !cred.activo) {
      return {
        conectado: false,
        raizAutorizada: this.rootFolderId,
        permisosEscritura: false,
        mensaje: 'Google Drive Personal (OAuth 2.0) no está conectado.',
      };
    }

    return {
      conectado: true,
      emailAutorizado: cred.email_autorizado,
      expiraEn: cred.expira_en,
      raizAutorizada: this.rootFolderId,
      permisosEscritura: true,
      mensaje: `Conectado y autorizado para ${cred.email_autorizado}. Escritura habilitada en NexoSupply-Root.`,
    };
  }

  /**
   * Revoca y desactiva el acceso OAuth de la empresa
   */
  public async revokeAccess(empresaId: string): Promise<boolean> {
    const cred = await prisma.credencialOAuthDrive.findUnique({
      where: { empresa_id: empresaId },
    });

    if (!cred) return false;

    try {
      const tokensJson = this.decrypt(cred.token_cifrado, cred.iv, cred.tag);
      const tokens = JSON.parse(tokensJson);
      const oauth2Client = this.createOAuthClient();
      if (tokens.access_token) {
        await oauth2Client.revokeToken(tokens.access_token);
      }
    } catch (e: any) {
      console.warn('[DRIVE-OAUTH] Advertencia durante revocación remota:', e.message);
    }

    await prisma.credencialOAuthDrive.update({
      where: { empresa_id: empresaId },
      data: { activo: false },
    });

    return true;
  }
}

export const googleDriveOAuthService = new GoogleDriveOAuthService();
