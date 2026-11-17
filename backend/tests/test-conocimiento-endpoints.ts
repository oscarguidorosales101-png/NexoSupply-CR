import { prisma } from '../src/config/database';
import { googleDriveService } from '../src/services/google-drive.service';
import { googleDriveOAuthService } from '../src/services/google-drive-oauth.service';
import { vectorStoreService } from '../src/services/vector-store.service';
import { embeddingService } from '../src/services/embedding.service';

async function testConocimientoData() {
  console.log('--- Probando consultas de datos de Conocimiento ---');
  const empresaId = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

  // 1. Estado
  const driveStatus = await googleDriveService.checkConnection();
  const oauthStatus = await googleDriveOAuthService.getStatus(empresaId);
  const totalCarpetas = await prisma.carpetaDrive.count({ where: { empresa_id: empresaId } });
  const totalDocumentos = await prisma.documentoDrive.count({ where: { empresa_id: empresaId } });
  const totalFragmentos = await prisma.fragmentoDocumental.count({ where: { empresa_id: empresaId } });

  const estadoPayload = {
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
      totalFragmentos,
    },
  };

  console.log('[OK] Estado payload generado con exito:');
  console.log('     Drive conectado:', estadoPayload.drive.conectado);
  console.log('     OAuth conectado:', estadoPayload.oauth.conectado);
  console.log('     Qdrant activo:', estadoPayload.vectorStore.qdrantActivo);
  console.log('     Total carpetas:', totalCarpetas);
  console.log('     Total documentos:', totalDocumentos);
  console.log('     Total fragmentos:', totalFragmentos);

  // 2. Carpetas
  const carpetas = await prisma.carpetaDrive.findMany({
    where: { empresa_id: empresaId },
    include: { _count: { select: { documentos: true } } },
    orderBy: { nombre: 'asc' },
  });
  console.log(`[OK] Carpetas recuperadas: ${carpetas.length} (Es array: ${Array.isArray(carpetas)})`);

  // 3. Documentos
  const documentos = await prisma.documentoDrive.findMany({
    where: { empresa_id: empresaId },
    include: { carpeta: { select: { nombre: true, categoria: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  console.log(`[OK] Documentos recuperados: ${documentos.length} (Es array: ${Array.isArray(documentos)})`);

  // 4. Sincronizaciones
  const historial = await prisma.sincronizacionDrive.findMany({
    where: { empresa_id: empresaId },
    orderBy: { iniciado_en: 'desc' },
    take: 20,
  });
  console.log(`[OK] Historial recuperado: ${historial.length} (Es array: ${Array.isArray(historial)})`);

  await prisma.$disconnect();
}

testConocimientoData().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
