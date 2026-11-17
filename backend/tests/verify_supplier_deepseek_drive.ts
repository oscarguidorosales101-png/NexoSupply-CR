import { prisma } from '../src/config/database';
import { deepSeekDriveProveedoresService } from '../src/services/deepseek-drive-proveedores.service';
import { sendMensajeChatbot, createConversacion } from '../src/services/chatbot.service';
import { googleDriveOAuthService } from '../src/services/google-drive-oauth.service';

async function runSupplierVerificationSuite() {
  console.log('========================================================================');
  console.log('PRUEBAS OBLIGATORIAS: INTEGRACION DIRECTA CHATBOT + TXT DRIVE + DEEPSEEK');
  console.log('========================================================================\n');

  const empresaId = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
  const folderId = '1_0NgRdFII43x5oajUqTV2JcIybwYmI87'; // 02-Proveedores
  const userId = 'admin-user-001';

  // Obtener usuario administrador real de la empresa
  const adminMember = await prisma.membresiaEmpresa.findFirst({
    where: { empresa_id: empresaId, activa: true },
  });
  const effectiveUserId = adminMember?.usuario_id || userId;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASO] ${testName}`);
      if (detail) console.log(`         -> ${detail}`);
      passed++;
    } else {
      console.error(`  [FALLO] ${testName}`);
      if (detail) console.error(`          -> ${detail}`);
      failed++;
    }
  }

  // Crear conversación de prueba en MySQL
  const conv = await createConversacion(empresaId, effectiveUserId, 1, 'Auditoría Proveedores DeepSeek + Drive');
  const conversacionId = conv!.id;
  console.log(`Conversación creada para pruebas: ${conversacionId}\n`);

  // --- PRUEBA 0: Descarga física real desde Google Drive API ---
  console.log('--- 0. Verificación de Descarga Física Real desde Google Drive ---');
  try {
    deepSeekDriveProveedoresService.invalidateCache(empresaId);
    const docData = await deepSeekDriveProveedoresService.getSupplierDocumentContent(empresaId);
    assert(docData.content.length > 500, 'Descarga física real de informe_proveedores.txt exitosa', `Tamaño: ${docData.content.length} bytes, ID Drive: ${docData.fileId}`);
    assert(docData.content.includes('NEXOSUPPLY CR — INFORME DE PROVEEDORES'), 'Cabecera oficial del documento encontrada en el buffer descargado');
    assert(docData.fileId === '1bk3ZmZ_uzOIWBQUcwfakK6xpT2S89W8N', 'ID del archivo coincide exactamente con el archivo publicado en Google Drive');
  } catch (err: any) {
    assert(false, 'Descarga física desde Google Drive', err.message);
  }

  // --- PRUEBA 1: Pregunta por cantidad de proveedores ---
  console.log('\n--- 1. Pregunta por Cantidad de Proveedores ---');
  try {
    const q1 = '¿Cuántos proveedores tenemos registrados en el sistema y cuáles son las categorías principales?';
    const res1 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q1);
    const content1 = res1.mensaje.contenido;
    console.log(`Respuesta DeepSeek:\n${content1.split('\n---\n')[0]}\n`);

    assert(content1.includes('17'), 'DeepSeek identifica exactamente los 17 proveedores del documento');
    assert(content1.includes('Fuente Documental Directa') && content1.includes('informe_proveedores.txt'), 'Respuesta incluye cita formal al archivo informe_proveedores.txt de Google Drive');
    assert(content1.includes('Qdrant Excluido'), 'Cita confirma que Qdrant fue excluido del flujo');
  } catch (err: any) {
    assert(false, 'Pregunta por cantidad de proveedores', err.message);
  }

  // --- PRUEBA 2: Consulta de un proveedor existente ---
  console.log('\n--- 2. Consulta de un Proveedor Existente ---');
  try {
    const q2 = '¿Qué información tenemos registrada sobre el proveedor DisCaribe Distribuciones? Necesito sus términos de pago y contactos.';
    const res2 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q2);
    const content2 = res2.mensaje.contenido;
    console.log(`Respuesta DeepSeek:\n${content2.split('\n---\n')[0]}\n`);

    assert(content2.includes('DisCaribe') && (content2.includes('45') || content2.includes('crédito')), 'Identifica términos de pago de DisCaribe (45 días crédito)');
    assert(content2.includes('3-101-100001') || content2.includes('Ejecutivo'), 'Identifica cédula fiscal o contactos autorizados del proveedor');
  } catch (err: any) {
    assert(false, 'Consulta de proveedor existente', err.message);
  }

  // --- PRUEBA 3: Consulta de un proveedor inexistente ---
  console.log('\n--- 3. Consulta de un Proveedor Inexistente ---');
  try {
    const q3 = '¿Cuál es la dirección y contacto del proveedor "Distribuidora Ficticia de Marte S.A."?';
    const res3 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q3);
    const content3 = res3.mensaje.contenido;
    console.log(`Respuesta DeepSeek:\n${content3.split('\n---\n')[0]}\n`);

    const noEncontradoRule = content3.includes('No se encontró información suficiente sobre esta consulta en el documento de proveedores de Google Drive.');
    assert(noEncontradoRule, 'Responde con la frase reglamentaria exacta ante proveedor inexistente');
  } catch (err: any) {
    assert(false, 'Consulta de proveedor inexistente', err.message);
  }

  // --- PRUEBA 4: Pregunta por información no contenida en el TXT ---
  console.log('\n--- 4. Pregunta por Información No Contenida en el TXT ---');
  try {
    const q4 = '¿Cuál es la clave secreta bancaria y la cuenta IBAN en euros del proveedor SumiMed CR?';
    const res4 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q4);
    const content4 = res4.mensaje.contenido;
    console.log(`Respuesta DeepSeek:\n${content4.split('\n---\n')[0]}\n`);

    const noHallucination = content4.includes('No se encontró información suficiente sobre esta consulta en el documento de proveedores de Google Drive.');
    assert(noHallucination, 'No alucina ni inventa claves bancarias o IBAN ausentes del documento');
  } catch (err: any) {
    assert(false, 'Información no contenida en TXT', err.message);
  }

  // --- PRUEBA 5: Modificación del TXT en Google Drive y posterior consulta ---
  console.log('\n--- 5. Modificación del TXT en Google Drive y Posterior Consulta ---');
  try {
    // 1. Descargar contenido actual
    const originalDoc = await deepSeekDriveProveedoresService.getSupplierDocumentContent(empresaId);
    
    // 2. Modificar en Google Drive agregando una nota especial
    const modifiedContent = originalDoc.content + '\n[NOTA_AUDITORIA_DINAMICA]\nCodigoVerificacion: NEXO-TEST-MODIFICATION-9988\nObservacion: Este proveedor temporal Quantum Labs fue añadido para comprobar la reactividad dinámica de Google Drive.\n';
    
    const oauthClient = await googleDriveOAuthService.getAuthenticatedClient(empresaId);
    if (!oauthClient) throw new Error('Cliente OAuth no disponible para modificación');

    await oauthClient.files.update({
      fileId: originalDoc.fileId,
      media: {
        mimeType: 'text/plain',
        body: modifiedContent,
      },
    });

    // 3. Invalidar caché para forzar lectura inmediata de la nueva versión
    deepSeekDriveProveedoresService.invalidateCache(empresaId);

    // 4. Consultar sobre la nota agregada
    const q5 = '¿Qué indica la NOTA_AUDITORIA_DINAMICA en el informe de proveedores y cuál es su CodigoVerificacion?';
    const res5 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q5);
    const content5 = res5.mensaje.contenido;
    console.log(`Respuesta DeepSeek tras modificación en Drive:\n${content5.split('\n---\n')[0]}\n`);

    assert(content5.includes('NEXO-TEST-MODIFICATION-9988') || content5.includes('Quantum Labs'), 'DeepSeek detecta inmediatamente los cambios realizados físicamente en Google Drive');

    // 5. Restaurar el documento original en Google Drive para mantenerlo limpio
    await oauthClient.files.update({
      fileId: originalDoc.fileId,
      media: {
        mimeType: 'text/plain',
        body: originalDoc.content,
      },
    });
    deepSeekDriveProveedoresService.invalidateCache(empresaId);
    console.log('  [OK] Documento restaurado a su versión original en Google Drive.');
  } catch (err: any) {
    assert(false, 'Modificación de TXT y consulta posterior', err.message);
  }

  // --- PRUEBA 6: Google Drive Desconectado ---
  console.log('\n--- 6. Comportamiento ante Google Drive Desconectado ---');
  try {
    // Probar el método con una empresa inexistente o carpeta inaccesible
    const fakeEmpresaId = 'empresa-desconectada-uuid-999';
    const fakeRes = await deepSeekDriveProveedoresService.processSupplierQuery(fakeEmpresaId, '¿Cuántos proveedores hay?');
    console.log(`Respuesta simulando desconexión:\n${fakeRes.respuesta}\n`);

    assert(fakeRes.estado === 'ERROR', 'Estado del resultado es ERROR cuando Drive no está disponible');
    assert(fakeRes.respuesta.includes('No fue posible consultar el documento de proveedores en Google Drive'), 'Informa con veracidad técnica la indisponibilidad de Google Drive sin alucinar respuestas');
  } catch (err: any) {
    assert(false, 'Google Drive desconectado', err.message);
  }

  // --- PRUEBA 7: Qdrant apagado durante las consultas de proveedores ---
  console.log('\n--- 7. Verificación de Qdrant Apagado durante Consultas ---');
  try {
    // Comprobar que Qdrant está efectivamente apagado en localhost:6333
    let qdrantOnline = false;
    try {
      const qRes = await fetch('http://localhost:6333/healthz', { signal: AbortSignal.timeout(1000) });
      qdrantOnline = qRes.ok;
    } catch (e) {
      qdrantOnline = false;
    }

    assert(!qdrantOnline, 'Qdrant está efectivamente OFFLINE en localhost:6333');

    // Ejecutar consulta de proveedores para confirmar funcionamiento 100% autónomo
    const q7 = '¿Qué productos suministra el proveedor SumiMed CR Internacional?';
    const res7 = await sendMensajeChatbot(empresaId, effectiveUserId, conversacionId, q7);
    const content7 = res7.mensaje.contenido;
    console.log(`Respuesta con Qdrant Offline:\n${content7.split('\n---\n')[0]}\n`);

    assert(content7.includes('SumiMed') || content7.includes('Catálogo') || content7.includes('E1-PRD'), 'La consulta de proveedores responde exitosamente con Qdrant completamente apagado');
  } catch (err: any) {
    assert(false, 'Qdrant apagado durante consultas de proveedores', err.message);
  }

  // --- RESUMEN FINAL ---
  console.log('\n========================================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passed}/${passed + failed} PASADAS (${failed} FALLOS)`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSupplierVerificationSuite()
  .catch((err) => {
    console.error('Error fatal en suite de pruebas:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
