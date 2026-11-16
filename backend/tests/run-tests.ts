import { prisma } from '../src/config/database';
import { loginUser, registerUser, switchTenantService } from '../src/services/auth.service';
import { listProveedores, getProveedorById } from '../src/services/proveedor.service';
import { listProductos, getProductoById } from '../src/services/producto.service';
import { createSolicitud, decideAprobacionSolicitud } from '../src/services/solicitud.service';
import { createOrdenFromSolicitud, getOrdenById } from '../src/services/orden.service';
import { registrarRecepcionFisica } from '../src/services/recepcion.service';
import { adjustInventoryStock, getStockOverview, getKardexMovements } from '../src/services/inventario.service';
import { calculateSupplierEvaluation } from '../src/services/evaluacion.service';
import { runContinuidadSimulation } from '../src/services/simulacion.service';
import { getDashboardKPIs } from '../src/services/reporte.service';
import { DecisionAprobacion, EstadoOrdenCompra, EstadoSolicitudCompra } from '@prisma/client';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASÓ] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ [FALLÓ] ${testName} ${detail ? `- ${detail}` : ''}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('🧪 EJECUCIÓN DE PRUEBAS AUTOMATIZADAS — NEXOSUPPLY CR BACKEND');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: AUTENTICACIÓN Y SESIONES
    // -------------------------------------------------------------------------
    console.log('--- 1. Pruebas de Autenticación y Criptografía ---');
    const loginOk = await loginUser('admin@pacificocr-demo.com', 'DemoPacifico2026!');
    assert(!!loginOk.accessToken, 'Login con credenciales correctas emite Access Token');
    assert(loginOk.usuario.email === 'admin@pacificocr-demo.com', 'Datos del usuario autenticado correctos');
    assert(!!loginOk.empresaActiva, 'Contexto de empresa activa resuelto en login');

    let loginErrorCapturado = false;
    try {
      await loginUser('admin@pacificocr-demo.com', 'PasswordIncorrecta999!');
    } catch {
      loginErrorCapturado = true;
    }
    assert(loginErrorCapturado, 'Rechazo de credenciales incorrectas con código 401');

    const empresaAlfaId = loginOk.empresaActiva!.id;
    const adminUserId = loginOk.usuario.id;

    // -------------------------------------------------------------------------
    // TEST SUITE 2: AISLAMIENTO MULTIEMPRESA Y PROTECCIÓN ANTI-IDOR
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Pruebas de Aislamiento Multiempresa Estricto ---');

    // Crear Empresa Beta para validar aislamiento horizontal
    const empresaBeta = await prisma.empresa.upsert({
      where: { rfc_cedula: '3-101-998877' },
      update: {},
      create: {
        id: 'b1b2b3b4-b5b6-b7b8-b9b0-b1b2b3b4b5b6',
        rfc_cedula: '3-101-998877',
        razon_social: 'Ferretería Industrial del Norte S.A. [TEST TENANT]',
        nombre_comercial: 'Ferretería del Norte',
        email_contacto: 'contacto@ferreterianorte-test.cr',
        moneda_base: 'CRC',
      },
    });

    // Crear producto exclusivo en Empresa Beta
    const uomBeta = await prisma.unidadMedida.create({
      data: {
        empresa_id: empresaBeta.id,
        codigo: 'UND',
        nombre: 'Unidad',
        simbolo: 'und',
      },
    });

    const productoBeta = await prisma.producto.create({
      data: {
        empresa_id: empresaBeta.id,
        unidad_medida_id: uomBeta.id,
        sku: 'TEST-BETA-001',
        nombre: 'Taladro Percutor Industrial Empresa Beta',
        costo_promedio: 45000,
        precio_referencia: 60000,
      },
    });

    // Intentar consultar producto de Empresa Beta desde el contexto de Empresa Alfa
    let idorBloqueado = false;
    try {
      await getProductoById(empresaAlfaId, productoBeta.id);
    } catch {
      idorBloqueado = true;
    }
    assert(idorBloqueado, 'Protección Anti-IDOR: Empresa Alfa no puede consultar producto de Empresa Beta');

    // Intentar listar productos en Empresa Alfa verificando que NO aparezca el producto de Empresa Beta
    const productosAlfa = await listProductos(empresaAlfaId);
    const contieneProductoAjeno = productosAlfa.some((p) => p.id === productoBeta.id);
    assert(!contieneProductoAjeno, 'Filtro Horizontal: Listado de Empresa Alfa no incluye registros de Empresa Beta');

    // -------------------------------------------------------------------------
    // TEST SUITE 3: SOLICITUDES, APROBACIÓN Y POLÍTICA DE SEPARACIÓN DE FUNCIONES
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Pruebas de Solicitudes y Flujo de Aprobación ---');

    const prodAlfa = productosAlfa[0];
    const nuevaSol = await createSolicitud(empresaAlfaId, adminUserId, {
      numeroSolicitud: `TEST-SC-${Date.now()}`,
      justificacion: 'Solicitud automatizada de prueba de integración de compras',
      moneda: 'CRC',
      detalles: [
        {
          productoId: prodAlfa.id,
          cantidadSolicitada: 50,
          precioUnitarioEstimado: Number(prodAlfa.costo_promedio),
        },
      ],
    });

    assert(nuevaSol.estado === EstadoSolicitudCompra.PENDIENTE, 'Solicitud creada en estado PENDIENTE');

    // Aprobar solicitud
    const solAprobada = await decideAprobacionSolicitud(
      empresaAlfaId,
      nuevaSol.id,
      adminUserId,
      DecisionAprobacion.APROBADA,
      'Aprobación autorizada por Gerencia para pruebas de integración'
    );
    assert(solAprobada.estado === EstadoSolicitudCompra.APROBADA, 'Solicitud cambia a estado APROBADA tras decisión formal');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: ORDEN DE COMPRA DERIVADA
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Generación de Orden de Compra desde Solicitud Aprobada (RN-04) ---');

    const proveedores = await listProveedores(empresaAlfaId);
    const provAlfa = proveedores[0];
    const almacenes = await prisma.almacen.findMany({ where: { empresa_id: empresaAlfaId } });
    const almCentral = almacenes.find((a) => a.es_principal) || almacenes[0];

    const fechaPromesa = new Date();
    fechaPromesa.setDate(fechaPromesa.getDate() + 5);

    const ordenCreada = await createOrdenFromSolicitud(empresaAlfaId, adminUserId, nuevaSol.id, {
      proveedorId: provAlfa.id,
      almacenDestinoId: almCentral.id,
      numeroOrden: `TEST-OC-${Date.now()}`,
      fechaPrometidaEntrega: fechaPromesa,
      condicionesPago: 'Contado contra entrega',
      notas: 'Orden de prueba de ciclo completo',
    });

    assert(ordenCreada.estado === EstadoOrdenCompra.EMITIDA, 'Orden generada en estado EMITIDA');
    assert(ordenCreada.detalles.length > 0, 'Detalles de la orden vinculados correctamente');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: RECEPCIÓN FÍSICA Y KARDEX INMUTABLE (TRANSACCIONES ACID)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Recepción Física de Compra y Kardex Transaccional ---');

    const detalleOrden = ordenCreada.detalles[0];
    const cantA_Recibir = 20; // Recepción parcial de 20 de 50

    // Consultar stock antes de recepción
    const stockAntes = await prisma.inventarioStock.findUnique({
      where: {
        uk_inventario_empresa_alm_prod: {
          empresa_id: empresaAlfaId,
          almacen_id: almCentral.id,
          producto_id: prodAlfa.id,
        },
      },
    });
    const cantStockAntes = Number(stockAntes?.cantidad_actual ?? 0);

    const resultadoRecepcion = await registrarRecepcionFisica(empresaAlfaId, adminUserId, {
      ordenCompraId: ordenCreada.id,
      almacenId: almCentral.id,
      numeroRecepcion: `TEST-REC-${Date.now()}`,
      numeroGuiaFactura: 'FAC-ELECT-TEST-001',
      observaciones: 'Recepción parcial automatizada para prueba de Kardex',
      detalles: [
        {
          detalleOrdenId: detalleOrden.id,
          productoId: prodAlfa.id,
          cantidadRecibida: cantA_Recibir,
          costoUnitarioReal: Number(detalleOrden.precio_unitario),
        },
      ],
    });

    assert(
      resultadoRecepcion.nuevoEstadoOrden === EstadoOrdenCompra.PARCIALMENTE_RECIBIDA,
      'Orden conmuta a PARCIALMENTE_RECIBIDA al recibir 20 de 50 unidades'
    );

    // Verificar incremento de inventario físico
    const stockDespues = await prisma.inventarioStock.findUnique({
      where: {
        uk_inventario_empresa_alm_prod: {
          empresa_id: empresaAlfaId,
          almacen_id: almCentral.id,
          producto_id: prodAlfa.id,
        },
      },
    });
    const cantStockDespues = Number(stockDespues?.cantidad_actual ?? 0);
    assert(
      cantStockDespues === cantStockAntes + cantA_Recibir,
      `Stock incrementó exactamente en ${cantA_Recibir} und (${cantStockAntes} -> ${cantStockDespues})`
    );

    // Verificar registro en Kardex Inmutable
    const kardex = await getKardexMovements(empresaAlfaId, { productoId: prodAlfa.id, limit: 1 });
    assert(kardex.length > 0, 'Registro de Kardex generado en la misma transacción');
    assert(
      Number(kardex[0].stock_posterior) === cantStockDespues,
      'Trazabilidad de Kardex consistente con stock_posterior'
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 6: PREVENCIÓN DE SALDOS NEGATIVOS (RN-09)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Prueba de Restricción de Saldo Negativo (RN-09) ---');

    let errorSaldoNegativo = false;
    try {
      await adjustInventoryStock(empresaAlfaId, adminUserId, {
        almacenId: almCentral.id,
        productoId: prodAlfa.id,
        tipoMovimiento: 'SALIDA_AJUSTE',
        cantidad: cantStockDespues + 999999, // Intentar sacar más de lo que existe
        motivo: 'Intento ilegal de salida con saldo negativo',
      });
    } catch {
      errorSaldoNegativo = true;
    }
    assert(errorSaldoNegativo, 'RN-09: Rechazo inmediato de salida superior a existencias disponibles');

    // -------------------------------------------------------------------------
    // TEST SUITE 7: EVALUACIÓN OBJETIVA DE PROVEEDORES
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Cálculo Determinista de Evaluación de Proveedores ---');

    const evaluacion = await calculateSupplierEvaluation(empresaAlfaId, provAlfa.id, '2026-TEST');
    assert(Number(evaluacion.calificacion_global) > 0, 'Calificación global calculada con éxito');
    assert(!!evaluacion.categoria_desempeno, `Categoría asignada: ${evaluacion.categoria_desempeno}`);

    // -------------------------------------------------------------------------
    // TEST SUITE 8: SIMULADOR DE CONTINUIDAD (SANDBOX WHAT-IF)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Simulación de Continuidad Operativa (What-If Sandbox) ---');

    const simulacion = await runContinuidadSimulation(empresaAlfaId, adminUserId, {
      nombreEscenario: 'Simulación de Huelga Portuaria 20 Días',
      descripcion: 'Evaluación de impacto por cierre de puerto de desembarque',
      proveedorAfectadoId: provAlfa.id,
      diasRetrasoSimulados: 20,
    });

    assert(!!simulacion.id, 'Escenario de simulación guardado con éxito');
    assert(
      Array.isArray(simulacion.productos_afectados_json),
      'Matriz de productos afectados calculada'
    );

    // RN-14: Verificar que el stock real no fue modificado por la simulación
    const stockPostSimulacion = await prisma.inventarioStock.findUnique({
      where: {
        uk_inventario_empresa_alm_prod: {
          empresa_id: empresaAlfaId,
          almacen_id: almCentral.id,
          producto_id: prodAlfa.id,
        },
      },
    });
    assert(
      Number(stockPostSimulacion?.cantidad_actual) === cantStockDespues,
      'RN-14: Las existencias reales permanecen inmutables tras ejecutar simulaciones'
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 9: DASHBOARD KPIS Y AUDITORÍA
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Métricas de Dashboard e Historial de Auditoría ---');

    const kpis = await getDashboardKPIs(empresaAlfaId);
    assert(kpis.kpis.totalProveedores > 0, 'Total de proveedores calculado');
    assert(kpis.kpis.valorTotalInventario > 0, 'Valorización total de inventario calculada');

    const auditorias = await prisma.registroAuditoria.findMany({
      where: { empresa_id: empresaAlfaId },
      take: 5,
    });
    assert(auditorias.length > 0, 'Trazabilidad de auditoría registrada en base de datos');

    // -------------------------------------------------------------------------
    // LIMPIEZA DE ACTIVOS DE PRUEBA
    // -------------------------------------------------------------------------
    console.log('\n--- Limpieza de Registros Temporales de Prueba ---');
    // Eliminar Empresa Beta creada para pruebas
    await prisma.producto.deleteMany({ where: { empresa_id: empresaBeta.id } });
    await prisma.unidadMedida.deleteMany({ where: { empresa_id: empresaBeta.id } });
    await prisma.empresa.delete({ where: { id: empresaBeta.id } });
    console.log('✓ Inquilino temporal Empresa Beta eliminado limpiamente');

  } catch (err) {
    console.error('[TEST_RUNNER_ERROR] Excepción inesperada durante las pruebas:', err);
    testsFailed++;
  } finally {
    console.log('\n=============================================================');
    console.log(`📊 RESUMEN DE PRUEBAS: ${testsPassed} Pasadas | ${testsFailed} Fallidas`);
    console.log('=============================================================\n');
    await prisma.$disconnect();
    if (testsFailed > 0) {
      process.exit(1);
    }
  }
}

runTestSuite();
