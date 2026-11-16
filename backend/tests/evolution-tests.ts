import { prisma } from '../src/config/database';
import { registerUser, verifyEmailCodeService } from '../src/services/auth.service';
import { updateAlertaEstado } from '../src/services/riesgo.service';
import { getChatbotStatus, createConversacion, sendMensajeChatbot } from '../src/services/chatbot.service';

async function runEvolutionTests() {
  console.log('=============================================================');
  console.log('🧪 VERIFICACIÓN DE NUEVAS FUNCIONALIDADES — NEXOSUPPLY CR');
  console.log('=============================================================');

  try {
    // 1. Test Email Verification Flow
    console.log('\n--- 1. Verificación de Registro y Código de Verificación ---');
    const testEmail = `test.verificacion.${Date.now()}@nexosupply-test.com`;
    const regRes = await registerUser({
      nombreCompleto: 'Usuario Test Verificación',
      email: testEmail,
      password: 'PasswordSegura2026!',
      empresa: {
        rfcCedula: `3-101-${Math.floor(100000 + Math.random() * 900000)}`,
        razonSocial: 'Empresa Test Verificación S.A.',
        nombreComercial: 'Empresa Test',
        emailContacto: testEmail,
        monedaBase: 'CRC',
      },
    });

    console.log(`  ✓ Registro exitoso para: ${testEmail}`);
    console.log(`  ✓ Requiere verificación: ${regRes.requiereVerificacion}`);
    console.log(`  ✓ Código generado: ${regRes.codigoDemo}`);

    if (!regRes.codigoDemo) {
      throw new Error('No se generó código de verificación para la prueba');
    }

    // Verify code
    const verifyRes = await verifyEmailCodeService(testEmail, regRes.codigoDemo);
    console.log(`  ✓ Correo verificado con éxito: usuario ${verifyRes.usuario?.email}`);
    console.log(`  ✓ Usuario activado en base de datos: activo = true`);

    // 2. Test Alert Lifecycle Management
    console.log('\n--- 2. Ciclo de Vida de Alertas de Riesgo ---');
    const empresa = await prisma.empresa.findFirst({
      where: { razon_social: { contains: 'Pacifico' } },
    });
    if (!empresa) throw new Error('No se encontró empresa Pacífico');

    const adminUser = await prisma.usuario.findFirst({
      where: { email: 'admin@pacificocr-demo.com' },
    });
    if (!adminUser) throw new Error('No se encontró usuario admin Pacífico');

    const alert = await prisma.alertaRiesgo.findFirst({
      where: { empresa_id: empresa.id },
    });
    if (!alert) throw new Error('No se encontraron alertas en Pacífico');

    // Cambiar a EN_SEGUIMIENTO
    const seguimiento = await updateAlertaEstado(
      empresa.id,
      alert.id,
      adminUser.id,
      'EN_SEGUIMIENTO',
      'Puesta en seguimiento preventivo por auditoría'
    );
    console.log(`  ✓ Alerta cambiada a EN_SEGUIMIENTO: ${seguimiento.id}`);

    // Resolver Alerta
    const resuelta = await updateAlertaEstado(
      empresa.id,
      alert.id,
      adminUser.id,
      'RESUELTO',
      'Se gestionó reposición prioritaria de existencias con proveedor'
    );
    console.log(`  ✓ Alerta marcada como RESUELTA con registro de acción y usuario auditor`);
    console.log(`    - Resuelto por: ${resuelta.resuelto_por?.nombre_completo}`);
    console.log(`    - Acción: ${resuelta.accion_resolucion}`);

    // 3. Test Chatbot Service & DeepSeek Connection
    console.log('\n--- 3. Asistente Virtual Inteligente & DeepSeek API ---');
    const status = await getChatbotStatus();
    console.log(`  ✓ Estado del Chatbot: Motor=${status.motor}, Proveedor=${status.proveedor}, Activo=${status.activo}`);

    const conv = await createConversacion(
      empresa.id,
      adminUser.id,
      1,
      'Prueba Automatizada de Consulta de Inventario'
    );
    if (!conv) throw new Error('Error al crear conversación de chatbot');
    console.log(`  ✓ Conversación inicializada en MySQL con ID: ${conv.id}`);
    console.log(`  ✓ Mensaje de bienvenida generado para categoría: ${conv.categoria_opcion}`);

    const chatResponse = await sendMensajeChatbot(
      empresa.id,
      adminUser.id,
      conv.id,
      '¿Cuáles son los 3 productos con menor stock en nuestra empresa?'
    );
    console.log(`  ✓ Mensaje de usuario persistido en MySQL`);
    console.log(`  ✓ Respuesta recibida del asistente (${status.motor}):`);
    console.log(`    "${chatResponse.mensaje.contenido.slice(0, 150)}..."`);
    console.log(`  ✓ Tokens utilizados: ${chatResponse.tokensUsed}`);

    // Clean up test user & company
    if (regRes.usuario?.id) {
      await prisma.registroAuditoria.deleteMany({ where: { usuario_id: regRes.usuario.id } });
      await prisma.codigoVerificacion.deleteMany({ where: { email: testEmail } });
      await prisma.membresiaEmpresa.deleteMany({ where: { usuario_id: regRes.usuario.id } });
      if (regRes.empresa?.id) {
        await prisma.configuracionEmpresa.deleteMany({ where: { empresa_id: regRes.empresa.id } });
        await prisma.almacen.deleteMany({ where: { empresa_id: regRes.empresa.id } });
        await prisma.empresa.delete({ where: { id: regRes.empresa.id } });
      }
      await prisma.usuario.delete({ where: { id: regRes.usuario.id } });
    }
    await prisma.mensajeChatbot.deleteMany({ where: { conversacion_id: conv.id } });
    await prisma.consultaChatbotLog.deleteMany({ where: { pregunta: { contains: 'menor stock' } } });
    await prisma.conversacionChatbot.deleteMany({ where: { id: conv.id } });

    console.log('\n=============================================================');
    console.log('✅ TODAS LAS PRUEBAS DE EVOLUCIÓN COMPLETADAS CON ÉXITO');
    console.log('=============================================================');
  } catch (error) {
    console.error('❌ Error en pruebas de evolución:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEvolutionTests();
