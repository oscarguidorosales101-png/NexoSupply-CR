import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { googleDriveService } from '../services/google-drive.service';
import { googleDriveOAuthService } from '../services/google-drive-oauth.service';
import { ragService } from '../services/rag.service';
import { vectorStoreService } from '../services/vector-store.service';
import { embeddingService } from '../services/embedding.service';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../errors/app-error';

export async function getEstadoConocimientoHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;

    // 1. Estado Google Drive Service Account
    const driveStatus = await googleDriveService.checkConnection();

    // 2. Estado Google Drive OAuth 2.0 (Escritura Personal)
    const oauthStatus = await googleDriveOAuthService.getStatus(empresaId);

    // 2. Métricas de la empresa en MySQL
    const totalCarpetas = await prisma.carpetaDrive.count({ where: { empresa_id: empresaId } });
    const totalDocumentos = await prisma.documentoDrive.count({ where: { empresa_id: empresaId } });
    const documentosIndexados = await prisma.documentoDrive.count({
      where: { empresa_id: empresaId, estado_indexacion: 'INDEXADO' },
    });
    const documentosPendientes = await prisma.documentoDrive.count({
      where: { empresa_id: empresaId, estado_indexacion: 'PENDIENTE' },
    });
    const documentosError = await prisma.documentoDrive.count({
      where: { empresa_id: empresaId, estado_indexacion: { in: ['ERROR', 'REQUIERE_OCR'] } },
    });
    const totalFragmentos = await prisma.fragmentoDocumental.count({ where: { empresa_id: empresaId } });

    // 3. Última sincronización
    const ultimaSync = await prisma.sincronizacionDrive.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { iniciado_en: 'desc' },
    });

    const resultado = {
      drive: {
        ...driveStatus,
        conectado: driveStatus.connected,
        serviceAccountEmail: driveStatus.clientEmail,
        rootFolderName: 'NexoSupply-Root',
        rootFolderUrl: 'https://drive.google.com/drive/folders/1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1',
      },
      oauth: oauthStatus,
      vectorStore: {
        motor: vectorStoreService.isQdrantActive()
          ? 'Qdrant Vector Database (Activo en http://localhost:6333)'
          : 'Qdrant Vector Database (Offline en http://localhost:6333)',
        qdrantActivo: vectorStoreService.isQdrantActive(),
        coleccion: 'nexosupply_documents',
        filtroEmpresaObligatorio: true,
      },
      embeddings: {
        proveedor: embeddingService.getProvider(),
        modelo: embeddingService.getModel(),
        dimension: embeddingService.getDimension(),
      },
      metricas: {
        totalCarpetas,
        totalDocumentos,
        documentosIndexados,
        documentosPendientes,
        documentosError,
        totalFragmentos,
      },
      ultimaSincronizacion: ultimaSync,
    };

    sendSuccess(res, resultado, 200);
  } catch (error) {
    next(error);
  }
}

export async function listCarpetasHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const carpetas = await prisma.carpetaDrive.findMany({
      where: { empresa_id: empresaId },
      include: {
        _count: {
          select: { documentos: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    sendSuccess(res, carpetas, 200);
  } catch (error) {
    next(error);
  }
}

export async function listDocumentosHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const estado = req.query.estado as string;
    const carpetaId = req.query.carpetaId as string;

    const where: any = { empresa_id: empresaId };
    if (estado && estado !== 'TODOS') {
      where.estado_indexacion = estado;
    }
    if (carpetaId) {
      where.carpeta_id = carpetaId;
    }

    const documentos = await prisma.documentoDrive.findMany({
      where,
      include: {
        carpeta: { select: { nombre: true, categoria: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Formatear BigInt tamanio_bytes a número o string para JSON
    const docsSerialized = documentos.map((d) => ({
      ...d,
      tamanio_bytes: d.tamanio_bytes ? Number(d.tamanio_bytes) : 0,
    }));

    sendSuccess(res, docsSerialized, 200);
  } catch (error) {
    next(error);
  }
}

export async function ejecutarSincronizacionManualHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const resultado = await ragService.syncAndIndexEnterprise(empresaId);
    sendSuccess(res, resultado, 200);
  } catch (error) {
    next(error);
  }
}

export async function reintentarDocumentoHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const documentoId = req.params.id as string;

    const doc = await prisma.documentoDrive.findFirst({
      where: { id: documentoId, empresa_id: empresaId },
    });

    if (!doc) {
      throw new NotFoundError('Documento no encontrado');
    }

    // Ejecutar reindexación
    await ragService.syncAndIndexEnterprise(empresaId);
    sendSuccess(res, { mensaje: 'Reintento de indexacion procesado exitosamente' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function listHistorialSincronizacionesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const historial = await prisma.sincronizacionDrive.findMany({
      where: { empresa_id: empresaId },
      orderBy: { iniciado_en: 'desc' },
      take: 20,
    });

    sendSuccess(res, historial, 200);
  } catch (error) {
    next(error);
  }
}

export async function getOAuthStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const status = await googleDriveOAuthService.getStatus(empresaId);
    sendSuccess(res, status, 200);
  } catch (error) {
    next(error);
  }
}

export async function getOAuthAuthUrlHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const userId = req.user!.id;
    const data = googleDriveOAuthService.getAuthUrl(empresaId, userId);
    sendSuccess(res, data, 200);
  } catch (error) {
    next(error);
  }
}

export async function revokeOAuthAccessHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    await googleDriveOAuthService.revokeAccess(empresaId);
    sendSuccess(res, { mensaje: 'Acceso OAuth revocado exitosamente' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function uploadTestOAuthFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const now = new Date();
    const fileName = `test_oauth_verification_${Date.now()}.txt`;
    const content = `NexoSupply CR - Verificacion OAuth 2.0 Google Drive
Empresa ID: ${empresaId}
Fecha: ${now.toISOString()}
Carpeta raiz autorizada: NexoSupply-Root (ID: ${googleDriveOAuthService.getRootFolderId()})
Propietario autorizado: ${googleDriveOAuthService.getExpectedOwnerEmail()}
Estado: Conexion y permisos de escritura en Mi Unidad confirmados exitosamente.`;
    const buffer = Buffer.from(content, 'utf8');

    const result = await googleDriveOAuthService.uploadOrUpdateFile(
      empresaId,
      googleDriveOAuthService.getRootFolderId(),
      fileName,
      'text/plain',
      buffer
    );

    // Indexar en RAG
    await ragService.indexDocument(
      empresaId,
      result.documentoId,
      buffer,
      'text/plain',
      fileName,
      undefined,
      result.webViewLink
    );

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function syncOperationalFilesOAuthHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const empresaId = req.tenant!.id;
    const uploadSummary = await googleDriveOAuthService.syncAllOperationalFiles(empresaId);

    // Indexar en RAG los documentos subidos
    const exportDir = path.resolve(process.cwd(), 'drive_txt_export');
    const altExportDir = path.resolve(__dirname, '../../drive_txt_export');
    const targetDir = fs.existsSync(exportDir) ? exportDir : altExportDir;

    let indexados = 0;
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.txt'));
      for (const fileName of files) {
        const doc = await prisma.documentoDrive.findFirst({
          where: { empresa_id: empresaId, nombre: fileName },
        });
        if (doc) {
          const buf = fs.readFileSync(path.join(targetDir, fileName));
          await ragService.indexDocument(
            empresaId,
            doc.id,
            buf,
            'text/plain',
            doc.nombre,
            doc.carpeta_id || undefined,
            doc.url_web_view || undefined
          );
          indexados++;
        }
      }
    }

    sendSuccess(
      res,
      {
        ...uploadSummary,
        documentosIndexadosEnRag: indexados,
      },
      200
    );
  } catch (error) {
    next(error);
  }
}
