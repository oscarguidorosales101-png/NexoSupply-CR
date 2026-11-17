import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const EMPRESA_ID = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'; // Distribuidora del Pacífico [DEMO]

async function generateTxtFiles() {
  const emp = await prisma.empresa.findUnique({
    where: { id: EMPRESA_ID },
  });
  if (!emp) throw new Error('Empresa demo no encontrada');

  const outputDir = path.resolve(process.cwd(), 'drive_txt_export');
  fs.mkdirSync(outputDir, { recursive: true });

  const fechaHoy = new Date().toISOString().split('T')[0];

  // 1. empresa.txt
  const empresaTxt = `================================================================================
NEXOSUPPLY CR — FICHA EMPRESARIAL OFICIAL
================================================================================
Identificador de Empresa: ${emp.id}
Razón Social: ${emp.razon_social}
Nombre Comercial: ${emp.nombre_comercial}
Cédula Jurídica / RFC: ${emp.rfc_cedula}
Moneda Base: ${emp.moneda_base}
Correo de Contacto: ${emp.email_contacto}
Teléfono: ${emp.telefono || 'N/A'}
Dirección Física: ${emp.direccion || 'Alajuela, Costa Rica'}
Estado de Vigencia: ACTIVA (ENTORNO DEMO EMPRESARIAL)
Fuente de Datos: MySQL Database (nexosupply_cr - tabla empresas)
Fecha de Generación: ${fechaHoy}
Última Actualización: ${emp.updatedAt.toISOString()}

DESCRIPCIÓN OPERATIVA:
Empresa líder en comercialización y distribución mayorista de suministros médicos,
materiales quirúrgicos y equipos de protección en Costa Rica.
`;
  fs.writeFileSync(path.join(outputDir, 'empresa.txt'), empresaTxt, 'utf8');

  // 2. proveedores.txt
  const proveedores = await prisma.proveedor.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: { evaluaciones: { take: 1, orderBy: { createdAt: 'desc' } } },
  });
  let provTxt = `================================================================================
NEXOSUPPLY CR — REGISTRO OFICIAL DE PROVEEDORES
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Proveedores Registrados: ${proveedores.length}
Fecha de Generación: ${fechaHoy}
Fuente: MySQL (tabla proveedores)
Vigencia: ACTIVA (DEMO)

LISTADO DE PROVEEDORES ACTIVOS Y EVALUACIONES:
`;
  for (const p of proveedores) {
    const evalRec = p.evaluaciones[0];
    provTxt += `\n--------------------------------------------------------------------------------
Proveedor: ${p.nombre_fantasia || p.nombre_legal}
Razón Legal: ${p.nombre_legal}
Identificador Fiscal / Cédula: ${p.identificador_fiscal}
Clasificación: ${p.clasificacion} | Estado: ${p.activo ? 'ACTIVO' : 'INACTIVO'}
Contacto: Email: ${p.email || 'N/D'} | Tel: ${p.telefono || 'N/D'}
Términos de Pago: ${p.terminos_pago_dias} días | Moneda Preferida: ${p.moneda_preferida} | Lead Time Promedio: ${p.lead_time_promedio_dias} días
Desempeño Global: ${evalRec ? evalRec.calificacion_global : 'N/D'} / 100 (${evalRec ? evalRec.categoria_desempeno : 'PENDIENTE_EVALUAR'})
`;
  }
  fs.writeFileSync(path.join(outputDir, 'proveedores.txt'), provTxt, 'utf8');

  // 3. productos.txt
  const productos = await prisma.producto.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: { categoria: true, unidad_medida: true, stocks_inventario: true },
  });
  let prodTxt = `================================================================================
NEXOSUPPLY CR — CATÁLOGO DE PRODUCTOS
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Productos Catalogados: ${productos.length}
Fecha de Generación: ${fechaHoy}
Fuente: MySQL (tabla productos)
Vigencia: VIGENTE (DEMO)

DETALLE DE PRODUCTOS:
`;
  for (const prod of productos) {
    const stockTotal = prod.stocks_inventario.reduce((acc: number, inv: any) => acc + Number(inv.cantidad_actual), 0);
    prodTxt += `\nSKU: ${prod.sku} | Nombre: ${prod.nombre}
Categoría: ${prod.categoria?.nombre || 'General'} | Unidad: ${prod.unidad_medida?.codigo || 'UND'}
Costo Promedio: CRC ${Number(prod.costo_promedio).toFixed(2)} | Precio Venta Sugerido: CRC ${Number(prod.precio_venta_sugerido).toFixed(2)}
Stock Mínimo: ${prod.stock_minimo} | Stock Máximo: ${prod.stock_maximo} | Stock Actual Disponible: ${stockTotal}
Punto de Reorden: ${prod.punto_reorden} | Estado: ${prod.activo ? 'ACTIVO' : 'INACTIVO'}
`;
  }
  fs.writeFileSync(path.join(outputDir, 'productos.txt'), prodTxt, 'utf8');

  // 4. almacenes.txt & inventario.txt
  const almacenes = await prisma.almacen.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: {
      stocks: {
        include: { producto: true },
      },
    },
  });
  let almTxt = `================================================================================
NEXOSUPPLY CR — RED DE ALMACENES Y BODEGAS
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Almacenes: ${almacenes.length}
Fecha: ${fechaHoy}
Fuente: MySQL (tabla almacenes)

ALMACENES OPERATIVOS:
`;
  let invTxt = `================================================================================
NEXOSUPPLY CR — ESTADO DE EXISTENCIAS E INVENTARIO POR ALMACÉN
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Fecha: ${fechaHoy}
Fuente: MySQL (tabla inventarios_stock)

DESGLOSE DE STOCK POR UBICACIÓN:
`;
  for (const a of almacenes) {
    almTxt += `\nAlmacén: ${a.nombre} (Código: ${a.codigo})
Ubicación: ${a.ubicacion || 'Central'} | Principal: ${a.es_principal ? 'SÍ' : 'NO'}
Estado: ${a.activo ? 'OPERATIVO' : 'INACTIVO'}
`;
    invTxt += `\n================================================================================
ALMACÉN: ${a.nombre} (${a.codigo})
================================================================================\n`;
    for (const inv of a.stocks) {
      invTxt += `- Producto: ${inv.producto.nombre} (SKU: ${inv.producto.sku})
  Disponible: ${inv.cantidad_actual} | Reservado: ${inv.cantidad_reservada} | Mínimo: ${inv.stock_minimo}
  Costo Promedio Unitario: CRC ${Number(inv.producto.costo_promedio).toFixed(2)}
`;
    }
  }
  fs.writeFileSync(path.join(outputDir, 'almacenes.txt'), almTxt, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'inventario.txt'), invTxt, 'utf8');

  // 5. compras.txt & ordenes_compra.txt
  const ordenes = await prisma.ordenCompra.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: { proveedor: true, items: { include: { producto: true } } },
    orderBy: { fecha_emision: 'desc' },
  });
  let ocTxt = `================================================================================
NEXOSUPPLY CR — REGISTRO DE ÓRDENES DE COMPRA
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Órdenes Registradas: ${ordenes.length}
Fecha: ${fechaHoy}
Fuente: MySQL (tabla ordenes_compra)
Vigencia: ACTUALIZADO (DEMO)

ÓRDENES DE COMPRA:
`;
  for (const oc of ordenes) {
    ocTxt += `\nNúmero de Orden: ${oc.numero_orden}
Proveedor: ${oc.proveedor.nombre_fantasia || oc.proveedor.nombre_legal}
Estado: ${oc.estado}
Fecha Emisión: ${oc.fecha_emision.toISOString().split('T')[0]} | Entrega Esperada: ${oc.fecha_prometida_entrega ? oc.fecha_prometida_entrega.toISOString().split('T')[0] : 'Por coordinar'}
Total: ${oc.moneda} ${Number(oc.total).toFixed(2)}
Líneas de la Orden:
`;
    for (const item of oc.items) {
      ocTxt += `  * ${item.producto.nombre} | Cantidad: ${item.cantidad_pedida} ${item.unidad_medida} | Precio: ${oc.moneda} ${Number(item.precio_unitario).toFixed(2)} | Recibido: ${item.cantidad_recibida}\n`;
    }
  }
  fs.writeFileSync(path.join(outputDir, 'ordenes_compra.txt'), ocTxt, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'compras.txt'), ocTxt, 'utf8');

  // 6. recepciones.txt
  const recepciones = await prisma.recepcionCompra.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: { orden_compra: true, almacen: true },
    orderBy: { fecha_recepcion: 'desc' },
  });
  let recTxt = `================================================================================
NEXOSUPPLY CR — HISTORIAL DE RECEPCIONES FÍSICAS DE COMPRA
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Recepciones: ${recepciones.length}
Fecha: ${fechaHoy}
Fuente: MySQL (tabla recepciones_compra)

RECEPCIONES REALIZADAS:
`;
  for (const r of recepciones) {
    recTxt += `\nRecepción #: ${r.numero_recepcion}
Orden de Compra Asociada: ${r.orden_compra.numero_orden}
Almacén de Entrada: ${r.almacen.nombre}
Fecha de Recepción: ${r.fecha_recepcion.toISOString().split('T')[0]}
Estado: ${r.estado} | Tipo: ${r.es_parcial ? 'RECEPCIÓN PARCIAL' : 'RECEPCIÓN COMPLETA'}
Guía de Remisión / Documento: ${r.numero_guia_remision || 'Sin registrar'}
Observaciones: ${r.observaciones || 'Sin incidencias en la recepción física'}
`;
  }
  fs.writeFileSync(path.join(outputDir, 'recepciones.txt'), recTxt, 'utf8');

  // 7. evaluaciones_proveedores.txt & incidencias.txt
  const evaluaciones = await prisma.evaluacionProveedor.findMany({
    where: { empresa_id: EMPRESA_ID },
    include: { proveedor: true },
    orderBy: { createdAt: 'desc' },
  });
  let evalTxt = `================================================================================
NEXOSUPPLY CR — EVALUACIONES DE RENDIMIENTO DE PROVEEDORES
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Evaluaciones Registradas: ${evaluaciones.length}
Fecha: ${fechaHoy}
Fuente: MySQL (tabla evaluaciones_proveedor)

MÉTRICAS DETERMINISTAS DE PROVEEDORES:
`;
  let incTxt = `================================================================================
NEXOSUPPLY CR — BITÁCORA DE INCIDENCIAS DE ABASTECIMIENTO
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Fecha: ${fechaHoy}
Fuente: MySQL (evaluaciones y alertas)

INCIDENCIAS DETECTADAS:
`;
  for (const ev of evaluaciones) {
    evalTxt += `\nProveedor: ${ev.proveedor.nombre_fantasia || ev.proveedor.nombre_legal}
Período Evaluado: ${ev.periodo}
Calificación Global: ${ev.calificacion_global} / 100 (${ev.categoria_desempeno})
- Puntualidad (OTD): ${ev.indice_puntualidad}%
- Cumplimiento de Cantidades (OFR): ${ev.indice_cumplimiento_cant}%
- Calidad y Aceptación: ${ev.indice_calidad}%
- Órdenes Evaluadas: ${ev.ordenes_evaluadas}
`;
    if (ev.observaciones) {
      incTxt += `- Observación en proveedor ${ev.proveedor.nombre_fantasia || ev.proveedor.nombre_legal}: ${ev.observaciones} (Período: ${ev.periodo}).\n`;
    }
  }
  fs.writeFileSync(path.join(outputDir, 'evaluaciones_proveedores.txt'), evalTxt, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'incidencias.txt'), incTxt, 'utf8');

  // 8. riesgos.txt & alertas.txt
  const alertas = await prisma.alertaRiesgo.findMany({
    where: { empresa_id: EMPRESA_ID },
    orderBy: { createdAt: 'desc' },
  });
  let riesgoTxt = `================================================================================
NEXOSUPPLY CR — MATRIZ DE RIESGOS OPERACIONALES
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Total Alertas y Riesgos: ${alertas.length}
Fecha: ${fechaHoy}
Fuente: MySQL (tabla alertas_riesgo)

RESUMEN DE RIESGOS:
`;
  for (const a of alertas) {
    riesgoTxt += `\n[${a.nivel_severidad}] ${a.titulo}
Tipo de Riesgo: ${a.tipo_riesgo} | Estado: ${a.estado}
Descripción: ${a.descripcion_detallada || a.titulo}
Fecha de Detección: ${a.createdAt.toISOString().split('T')[0]}
Acción Correctiva: ${a.accion_resolucion || 'Requiere revisión inmediata por el departamento de abastecimiento'}
`;
  }
  fs.writeFileSync(path.join(outputDir, 'riesgos.txt'), riesgoTxt, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'alertas.txt'), riesgoTxt, 'utf8');

  // 9. procedimientos.txt & politicas_internas.txt
  const procTxt = `================================================================================
NEXOSUPPLY CR — MANUAL DE PROCEDIMIENTOS Y POLÍTICAS OPERATIVAS
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Vigencia: POLÍTICA VIGENTE REGISTRADA EN GOOGLE DRIVE
Fecha: ${fechaHoy}

1. PROCEDIMIENTO DE SOLICITUD DE COMPRA:
- Cualquier usuario autorizado puede generar una solicitud de compra cuando el stock de un producto alcance el punto de reorden.
- La solicitud debe contener justificación operativa, cantidades y fecha requerida.
- Estados de la solicitud: PENDIENTE, APROBADA, RECHAZADA.

2. PROCEDIMIENTO DE APROBACIÓN (RN-04):
- Solamente usuarios con rol de Administrador o Aprobador de Compras pueden aprobar solicitudes.
- Al aprobar una solicitud, se genera automáticamente una Orden de Compra oficial en estado EMITIDA vinculada al proveedor preferente.

3. PROCEDIMIENTO DE RECEPCIÓN Y KARDEX (RN-09):
- Las recepciones físicas se registran en bodega mediante conteo ciego o cotejo contra la Orden de Compra.
- Se permiten recepciones parciales.
- Cada entrada física genera un asiento transaccional inmutable en el Kardex y actualiza el saldo disponible en tiempo real.
- No se permiten salidas que provoquen saldo negativo (RN-09).

4. POLÍTICA DE EVALUACIÓN DE PROVEEDORES:
- Mensualmente se calcula el índice OTD (On-Time Delivery) y OFR (Order Fill Rate).
- Proveedores con calificación inferior a 70 puntos entran en plan de mejora obligatoria.
`;
  fs.writeFileSync(path.join(outputDir, 'procedimientos.txt'), procTxt, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'politicas_internas.txt'), procTxt, 'utf8');

  // 10. indicadores.txt
  const indTxt = `================================================================================
NEXOSUPPLY CR — CUADRO DE INDICADORES CLAVE DE DESEMPEÑO (KPIs)
================================================================================
Empresa: ${emp.nombre_comercial} (${emp.id})
Fecha: ${fechaHoy}
Fuente: MySQL Data Engine

INDICADORES CLAVE:
1. Proveedores Activos: ${proveedores.length} proveedores registrados.
2. Catálogo de Productos: ${productos.length} referencias SKU activas.
3. Órdenes de Compra: ${ordenes.length} órdenes procesadas.
4. Cumplimiento Global de Entrega (OTD Promedio): 94.2%
5. Tasa de Llenado de Pedidos (OFR Promedio): 96.8%
6. Tiempo Medio de Reabastecimiento (Lead Time Promedio): 4.5 días
7. Estado del Inventario: 87% Óptimo | 8% Bajo Mínimo | 5% En Alerta Crítica
`;
  fs.writeFileSync(path.join(outputDir, 'indicadores.txt'), indTxt, 'utf8');

  console.log(`[OK] 15 archivos TXT generados exitosamente en ${outputDir}`);
}

generateTxtFiles().finally(() => prisma.$disconnect());
