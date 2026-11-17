import { prisma } from '../src/config/database';
import { googleDriveService } from '../src/services/google-drive.service';
import { documentExtractorService } from '../src/services/document-extractor.service';
import { chunkingService } from '../src/services/chunking.service';
import { embeddingService } from '../src/services/embedding.service';
import { vectorStoreService } from '../src/services/vector-store.service';
import { mysqlToDriveSyncService } from '../src/services/mysql-to-drive-sync.service';
import { ragService } from '../src/services/rag.service';

async function runRagDriveTests() {
  console.log('=============================================================');
  console.log('🧪 PRUEBAS DE GOOGLE DRIVE, RAG DOCUMENTAL Y AISLAMIENTO');
  console.log('=============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASO] ${testName}`);
      passed++;
    } else {
      console.error(`  [FALLO] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Google Drive API Connection & Service Account Check
    console.log('\n--- 1. Verificacion de Google Drive API y Credenciales ---');
    const driveStatus = await googleDriveService.checkConnection();
    console.log(`    Tipo credencial: ${driveStatus.tipoCredencial}`);
    console.log(`    Email de cuenta de servicio: ${driveStatus.clientEmail}`);
    console.log(`    Project ID: ${driveStatus.projectId}`);
    console.log(`    Estado de conexion: ${driveStatus.connected ? 'CONECTADO' : 'REQUIERE_CONFIG_CARPETA'}`);
    assert(driveStatus.clientEmail?.includes('gserviceaccount.com') || false, 'Cuenta de servicio de Google Cloud detectada e inicializada');

    // 2. Multi-tenant Enterprise Folder Hierarchy
    console.log('\n--- 2. Estructura de 10 Carpetas por Empresa ---');
    const empresa = await prisma.empresa.findFirst({
      where: { razon_social: { contains: 'Pacifico' } },
    });
    if (!empresa) throw new Error('Empresa Pacifico no encontrada');

    const carpetas = await googleDriveService.ensureEnterpriseFolders(empresa.id, 'Empresa-Pacifico');
    assert(carpetas.length === 10, 'Se aseguraron y persistieron las 10 carpetas estandar en MySQL/Drive');
    assert(carpetas.some((c) => c.nombre === '03-Productos-e-Inventario'), 'Carpeta 03-Productos-e-Inventario presente');
    assert(carpetas.some((c) => c.nombre === '04-Compras-y-Ordenes'), 'Carpeta 04-Compras-y-Ordenes presente');

    // 3. Document Extraction Tests
    console.log('\n--- 3. Extractores Documentales (PDF, DOCX, XLSX, CSV, TXT) ---');

    // PDF extraction
    const samplePdfs = await mysqlToDriveSyncService.generateOperationalPdfs(empresa.id);
    const invPdf = samplePdfs.find((p) => p.nombreArchivo === 'inventario_actual.pdf')!;
    const pdfExt = await documentExtractorService.extract(invPdf.buffer, 'application/pdf', 'inventario_actual.pdf');
    assert(pdfExt.estado === 'EXITOSO' && pdfExt.texto.includes('INVENTARIO'), 'Extractor PDF parsea contenido estructurado de reporte');

    // Scanned PDF detection
    const emptyPdfBuffer = Buffer.from('%PDF-1.4 ... empty scan dummy');
    const scannedExt = await documentExtractorService.extract(emptyPdfBuffer, 'application/pdf', 'escaneo_ciego.pdf');
    assert(scannedExt.estado === 'REQUIERE_OCR' || scannedExt.requiereOcr === true || scannedExt.estado === 'ERROR', 'Deteccion de documento escaneado/vacio sin falso positivo de procesamiento');

    // CSV extraction
    const csvBuffer = Buffer.from('SKU,Nombre,Cantidad,Precio\nMED-001,Guantes Nitrilo,250,5500\nMED-002,Jeringas 5ml,1200,850');
    const csvExt = await documentExtractorService.extract(csvBuffer, 'text/csv', 'productos.csv');
    assert(csvExt.texto.includes('Guantes Nitrilo') && csvExt.totalPaginasOFilas === 3, 'Extractor CSV formatea filas tabulares con cabeceras');

    // 4. Semantic Chunking with Controlled Overlap
    console.log('\n--- 4. Fragmentacion Semantica ---');
    const longText = `TITULO: DIRECTRIZ DE COMPRAS Y GESTION DE INVENTARIO\n\n` +
      `Seccion 1: Toda adquisicion superior a 500,000 colones requiere autorizacion formal del administrador.\n\n`.repeat(15) +
      `Seccion 2: Los quiebres de stock en insumos criticos deben ser notificados en menos de 2 horas a compras.\n\n`.repeat(15);

    const chunks = chunkingService.chunkText(longText, 100, 20);
    assert(chunks.length > 1, `Fragmentacion semantica genero ${chunks.length} fragmentos con solapamiento`);
    assert(chunks[0].tokensEstimados > 0 && chunks[0].numeroFragmento === 1, 'Metadatos de fragmento conservan numero y tokens estimados');

    // 5. Independent Embedding Provider
    console.log('\n--- 5. Motor de Embeddings Independiente ---');
    const emb1 = await embeddingService.generateEmbedding('Existencias de guantes de nitrilo en almacen central');
    const emb2 = await embeddingService.generateEmbedding('Stock disponible de guantes quirurgicos en bodega');
    const embDiff = await embeddingService.generateEmbedding('Politica disciplinaria de recursos humanos');

    assert(emb1.dimension === 384, 'Dimension vectorial de embeddings fijada en 384');
    assert(emb1.provider === 'local', 'Proveedor de embeddings independiente del modelo generativo');

    // Similitud semántica entre textos afines
    function dotProduct(a: number[], b: number[]) {
      return a.reduce((sum, v, i) => sum + v * b[i], 0);
    }
    const simAfin = dotProduct(emb1.vector, emb2.vector);
    const simDiferente = dotProduct(emb1.vector, embDiff.vector);
    assert(simAfin > simDiferente, `Similitud semantica afín (${simAfin.toFixed(3)}) supera a tema distante (${simDiferente.toFixed(3)})`);

    // 6. Vector Store & Strict Multi-Tenant Isolation
    console.log('\n--- 6. Base Vectorial y Filtro Obligatorio Multiempresa ---');
    const testDocId = `test-doc-${Date.now()}`;
    const pointEmpresaA: any = {
      id: `${testDocId}-1`,
      vector: emb1.vector,
      payload: {
        empresa_id: empresa.id,
        documento_id: testDocId,
        fragmento_id: `${testDocId}-1`,
        nombre_documento: 'inventario_pacifico.pdf',
        numero_fragmento: 1,
        contenido: 'El stock disponible de Guantes de Nitrilo en Almacen Central es de 45 unidades.',
      },
    };

    const pointEmpresaB: any = {
      id: `${testDocId}-2`,
      vector: emb1.vector, // Mismo vector pero de OTRA empresa
      payload: {
        empresa_id: 'empresa-competencia-999',
        documento_id: 'doc-secreto-beta',
        fragmento_id: 'frag-beta-1',
        nombre_documento: 'estrategia_confidencial_beta.pdf',
        numero_fragmento: 1,
        contenido: 'INFORMACION CONFIDENCIAL DE EMPRESA COMPETENCIA BETA: Precios mayoristas secretos.',
      },
    };

    await vectorStoreService.upsertVectors([pointEmpresaA, pointEmpresaB]);

    // Búsqueda para Empresa Pacífico
    const resultsPacifico = await vectorStoreService.searchSimilar(emb1.vector, empresa.id, 5, 0.2);
    assert(resultsPacifico.length > 0, 'Busqueda vectorial retorno fragmentos coincidentes para la empresa activa');
    assert(!resultsPacifico.some((r) => r.payload.empresa_id !== empresa.id), 'AISLAMIENTO HORIZONTAL: Ningun fragmento de Empresa Beta se filtro a Empresa Pacifico');

    // Intento de búsqueda sin empresa_id debe ser rechazado
    let securityBlocked = false;
    try {
      await vectorStoreService.searchSimilar(emb1.vector, '', 5);
    } catch {
      securityBlocked = true;
    }
    assert(securityBlocked, 'PROTECCION MULTIEMPRESA: Rechazo estricto de busquedas sin empresa_id');

    // 7. MySQL to Drive Operational Sync
    console.log('\n--- 7. Sincronizacion de Informacion Operativa MySQL -> Drive ---');
    const syncRes = await mysqlToDriveSyncService.syncToDrive(empresa.id);
    assert(syncRes.sincronizados >= 6, `Se generaron y sincronizaron ${syncRes.sincronizados} informes operacionales desde MySQL`);

    // 8. RAG Pipeline Indexing and Grounded Query
    console.log('\n--- 8. Pipeline RAG Completo e Indexacion ---');
    const indexResult = await ragService.syncAndIndexEnterprise(empresa.id);
    assert(indexResult.documentosProcesados > 0, `Pipeline RAG indexo exitosamente ${indexResult.documentosProcesados} documentos con ${indexResult.fragmentosGenerados} fragmentos`);

    // 9. Grounded RAG Query with Verifiable Citations
    console.log('\n--- 9. Consulta RAG Grounded con Citas Verificables ---');
    const ragAnswer = await ragService.queryRag(
      empresa.id,
      'user-admin-1',
      '¿Cual es el stock o inventario actual de los productos de nuestra empresa?'
    );

    assert(ragAnswer.estado === 'EXITOSO', 'Consulta RAG respondida con estado EXITOSO');
    assert(ragAnswer.fuentes.length > 0, `Respuesta incluye ${ragAnswer.fuentes.length} fuentes documentales verificables`);
    assert(ragAnswer.fuentes.some((f) => f.nombreDocumento.includes('.pdf')), 'Fuentes citan documentos oficiales de Drive (.pdf)');
    console.log(`    Extracto de respuesta fundamentada: "${ragAnswer.respuesta.slice(0, 120)}..."`);

    // 10. Query for unknown information returns insufficient evidence
    const unanswerable = await ragService.queryRag(
      empresa.id,
      'user-admin-1',
      '¿Cual fue la cotizacion de criptomonedas y Bitcoin en el año 2021?'
    );
    assert(unanswerable.estado === 'SIN_EVIDENCIA', 'Consulta sin respaldo documental retorna claramente SIN_EVIDENCIA sin alucinacion');

    // 11. Vector Deletion when Document is updated/deleted
    console.log('\n--- 10. Invalidacion de Vectores Obsoletos ---');
    await vectorStoreService.deleteVectorsByDocument(testDocId, empresa.id);
    const searchAfterDelete = await vectorStoreService.searchSimilar(emb1.vector, empresa.id, 5, 0.5);
    assert(!searchAfterDelete.some((r) => r.payload.documento_id === testDocId), 'Vectores obsoletos eliminados correctamente del indice activo');

    // Cleanup test vectors
    await vectorStoreService.deleteVectorsByDocument('doc-secreto-beta', 'empresa-competencia-999');

    console.log('\n=============================================================');
    console.log(`📊 RESUMEN DE PRUEBAS ETAPA 5: ${passed} Pasadas | ${failed} Fallidas`);
    console.log('=============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error fatal en suite de pruebas RAG/Drive:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRagDriveTests();
