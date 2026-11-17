import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { googleDriveService } from '../services/google-drive.service';
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

    // 1. Estado Google Drive
    const driveStatus = await googleDriveService.checkConnection();

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
      drive: driveStatus,
      vectorStore: {
        motor: vectorStoreService.isQdrantActive() ? 'Qdrant Vector Database' : 'Motor Vectorial Local en Memoria/MySQL',
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
