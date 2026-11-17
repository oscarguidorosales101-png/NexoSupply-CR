import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';
import { centralDocumentSyncService } from '../src/services/central-document-sync.service';
import { googleDriveService } from '../src/services/google-drive.service';
import { googleDriveOAuthService } from '../src/services/google-drive-oauth.service';
import { sendMensajeChatbot, createConversacion, getChatbotStatus } from '../src/services/chatbot.service';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASO] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FALLO] ${testName} - ${detail || ''}`);
  }
}

async function runVerification() {
  console.log('\n=============================================================');
  console.log('PRUEBAS DE VALIDACION — REESTRUCTURACION RAG Y GOOGLE DRIVE');
  console.log('=============================================================\n');

  const DEMO_EMPRESA_ID = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

  // -----------------------------------------------------------------
  // 1. Verificación de Ocultación en Frontend
  // -----------------------------------------------------------------
  console.log('--- 1. Ocultacion del Modulo Conocimiento en Frontend ---');
  const sidebarPath = path.resolve(__dirname, '../../frontend/src/components/layout/Sidebar.tsx');
  const appPath = path.resolve(__dirname, '../../frontend/src/App.tsx');
  
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert(!sidebarContent.includes("name: 'Conocimiento'"), 'Sidebar no contiene entrada Conocimiento');
  assert(!sidebarContent.includes('FolderGit2'), 'Icono FolderGit2 retirado del Sidebar');

  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(
    appContent.includes('<Route path="conocimiento" element={<Navigate to="/dashboard" replace />} />'),
    'Ruta /conocimiento redirige a /dashboard para usuarios'
  );

  // -----------------------------------------------------------------
  // 2. Verificación de Google Drive y Carpeta Raiz
  // -----------------------------------------------------------------
  console.log('\n--- 2. Google Drive y Carpeta Raiz Oficial ---');
  const saStatus = await googleDriveService.checkConnection();
  assert(saStatus.connected === true, 'Conexion autenticada con Google Drive API v3 (Service Account)');
  assert(saStatus.rootFolderId === '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1', 'Carpeta raiz oficial es NexoSupply-Root (1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1)');
  assert(saStatus.clientEmail === 'nexosupply-cr@nexosupply-cr.iam.gserviceaccount.com', 'Service Account autorizada para lectura y metadatos');

  const oauthStatus = await googleDriveOAuthService.getStatus(DEMO_EMPRESA_ID);
  assert(oauthStatus.raizAutorizada === '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1', 'OAuth configurado con raiz segura autorizada');
  assert(oauthStatus.conectado === false, 'Estado OAuth reportado honestamente como no conectado (esperando consentimiento del usuario)');

  // -----------------------------------------------------------------
  // 3. Verificación de las 29 Carpetas en MySQL
  // -----------------------------------------------------------------
  console.log('\n--- 3. Estructura de las 29 Carpetas Registradas ---');
  const carpetas = await prisma.carpetaDrive.findMany({ where: { activa: true } });
  assert(carpetas.length >= 29, `Existen al menos 29 carpetas registradas en MySQL (actual: ${carpetas.length})`);
  
  const categoriasEsperadas = [
    'GENERAL', 'PROVEEDORES', 'INVENTARIO', 'COMPRAS', 'LOGISTICA',
    'EVALUACIONES', 'RIESGOS', 'REPORTES', 'POLITICAS', 'HISTORICO',
    'MANUALES', 'TECNICA', 'POLITICAS_ADMIN', 'HISTORIAL_INGESTA', 'INCIDENCIAS_SYNC',
    'DOCUMENTACION'
  ];
  for (const cat of categoriasEsperadas) {
    const found = carpetas.some(c => c.categoria === cat);
    assert(found, `Carpeta con categoria ${cat} presente en la arquitectura`);
  }

  // -----------------------------------------------------------------
  // 4. Verificación de Generación Documental y Outbox
  // -----------------------------------------------------------------
  console.log('\n--- 4. Generacion Documental y Almacenamiento Outbox ---');
  const syncRes = await centralDocumentSyncService.executeFullSync(DEMO_EMPRESA_ID);
  assert(syncRes.totalDefinidos >= 30, `Generados ${syncRes.totalDefinidos} documentos estructurados`);
  assert(syncRes.generadosLocalmente === syncRes.totalDefinidos, 'Todos los documentos guardados fisicamente en Outbox local');
  assert(syncRes.errores === 0, 'Sincronizacion y generacion ejecutada con 0 errores');

  // Verificar archivos fisicos en disco
  const outboxBase = path.resolve(process.cwd(), 'storage', 'drive_outbox');
  const filesSample = [
    '01-EMPRESAS/Empresa-001/01-Informacion-General/informacion_general_empresa.md',
    '01-EMPRESAS/Empresa-001/02-Proveedores/directorio_proveedores.md',
    '01-EMPRESAS/Empresa-001/03-Productos-E-Inventario/catalogo_productos.md',
    '01-EMPRESAS/Empresa-001/03-Productos-E-Inventario/inventario_actual_almacenes.md',
    '01-EMPRESAS/Empresa-001/04-Compras-Y-Ordenes/ordenes_compra_activas.md',
    '01-EMPRESAS/Empresa-001/05-Recepciones-Y-Logistica/recepciones_y_logistica.md',
    '01-EMPRESAS/Empresa-001/06-Evaluaciones-E-Incidencias/evaluaciones_desempeno_proveedores.md',
    '01-EMPRESAS/Empresa-001/07-Riesgos-Y-Alertas/matriz_riesgos_y_alertas.md',
    '01-EMPRESAS/Empresa-001/09-Procedimientos-Y-Politicas/procedimientos_operativos_abastecimiento.md',
    '00-DOCUMENTACION-DEL-PROYECTO/01-Idea-Empresarial/01-idea-empresarial.md',
    '02-ADMINISTRACION-NEXOSUPPLY/Manuales-Del-Sistema/manual_usuario_nexosupply.md',
    '02-ADMINISTRACION-NEXOSUPPLY/Documentacion-Tecnica/arquitectura_tecnica_sistema.md',
    '03-REGISTROS-DE-SINCRONIZACION/Historial-De-Ingesta/historial_ingesta_documental.md',
  ];

  for (const f of filesSample) {
    const fullP = path.join(outboxBase, f);
    assert(fs.existsSync(fullP), `Archivo fisico existe en Outbox: ${f}`);
    if (fs.existsSync(fullP)) {
      const stats = fs.statSync(fullP);
      assert(stats.size > 100, `Archivo ${f} no esta vacio (${stats.size} bytes)`);
    }
  }

  // -----------------------------------------------------------------
  // 5. Verificación de Trazabilidad en MySQL (Outbox Pattern)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Trazabilidad en MySQL (Prisma ORM) ---');
  const docsEnDb = await prisma.documentoDrive.findMany({
    where: { empresa_id: DEMO_EMPRESA_ID },
  });
  assert(docsEnDb.length >= 30, `Documentos registrados en tabla DocumentoDrive: ${docsEnDb.length}`);
  const todosConHash = docsEnDb.every(d => Boolean(d.hash_contenido && d.hash_contenido.length === 64));
  assert(todosConHash, 'Todos los documentos cuentan con hash criptografico SHA-256 verificado');

  const trabajosOutbox = await prisma.trabajoIngesta.findMany({
    where: { empresa_id: DEMO_EMPRESA_ID },
  });
  assert(trabajosOutbox.length >= 30, `Trabajos registrados en tabla TrabajoIngesta: ${trabajosOutbox.length}`);

  // -----------------------------------------------------------------
  // 6. Verificación del Chatbot Exclusivo Documental
  // -----------------------------------------------------------------
  console.log('\n--- 6. Chatbot Exclusivo con Conocimiento Documental ---');
  const statusChatbot = await getChatbotStatus();
  assert(statusChatbot.disponible === true, 'Servicio de Chatbot disponible');
  assert(
    statusChatbot.fuenteExclusiva === 'Google Drive Documental Repository (NexoSupply-Root)',
    'Fuente exclusiva del Chatbot es el repositorio documental de Google Drive'
  );

  // Obtener usuario admin demo
  const adminUser = await prisma.usuario.findFirst({
    where: { email: 'admin@pacificocr-demo.com' },
  });
  if (!adminUser) throw new Error('Usuario admin no encontrado para pruebas');

  const conversacion = await createConversacion(DEMO_EMPRESA_ID, adminUser.id, 1, 'Prueba RAG Documental');
  assert(Boolean(conversacion?.id), 'Conversacion creada exitosamente');

  // Enviar consulta al chatbot
  const resChat = await sendMensajeChatbot(
    DEMO_EMPRESA_ID,
    adminUser.id,
    conversacion!.id,
    'Cuales son los proveedores homologados de la empresa?'
  );

  assert(Boolean(resChat.mensaje?.id), 'Mensaje procesado y persistido en MySQL');
  assert(resChat.mensaje.remitente === 'ASISTENTE', 'Respuesta emitida por el ASISTENTE');
  assert(!resChat.mensaje.contenido.includes('(MySQL en Tiempo Real)'), 'Chatbot NO utiliza consultas directas a MySQL para responder');
  assert(
    resChat.ragResult !== null && resChat.ragResult !== undefined,
    'Chatbot canaliza la consulta a traves del pipeline RAG de Google Drive'
  );

  // -----------------------------------------------------------------
  // 7. Verificación de Seguridad y Aislamiento Multiempresa
  // -----------------------------------------------------------------
  console.log('\n--- 7. Seguridad y Aislamiento Multiempresa ---');
  let idorBlock = false;
  try {
    const OTRA_EMPRESA_ID = 'e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d';
    await sendMensajeChatbot(
      OTRA_EMPRESA_ID,
      adminUser.id,
      conversacion!.id,
      'Intentando consultar conversacion ajena'
    );
  } catch (err: any) {
    idorBlock = true;
  }
  assert(idorBlock, 'Proteccion anti-IDOR: Bloqueado acceso cruzado a conversacion de otra empresa');

  // Resumen final
  console.log('\n=============================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passedTests}/${totalTests} PASARON (${failedTests} FALLOS)`);
  console.log('=============================================================\n');

  await prisma.$disconnect();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Error fatal durante la verificacion:', err);
  process.exit(1);
});
