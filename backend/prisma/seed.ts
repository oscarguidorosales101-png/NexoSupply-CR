import { PrismaClient, Moneda, ClasificacionProveedor, EstadoSolicitudCompra, EstadoOrdenCompra, EstadoRecepcion, TipoMovimientoInventario, CategoriaDesempeno, TipoRiesgo, NivelSeveridadAlerta } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Semilla Idempotente para NexoSupply CR ---');

  // 1. Permisos del Sistema
  const permisosData = [
    { codigo: 'empresas:configurar', modulo: 'EMPRESAS', descripcion: 'Configuración general de políticas empresariales' },
    { codigo: 'usuarios:gestionar', modulo: 'USUARIOS', descripcion: 'Administración de usuarios, roles y membresías' },
    { codigo: 'proveedores:crear_editar', modulo: 'PROVEEDORES', descripcion: 'Creación y actualización del catálogo de proveedores' },
    { codigo: 'productos:gestionar', modulo: 'PRODUCTOS', descripcion: 'Administración de productos, precios y categorías' },
    { codigo: 'solicitudes:crear', modulo: 'COMPRAS', descripcion: 'Creación de solicitudes de compra departamentales' },
    { codigo: 'solicitudes:aprobar', modulo: 'COMPRAS', descripcion: 'Aprobación o rechazo de solicitudes de compra' },
    { codigo: 'ordenes:emitir', modulo: 'COMPRAS', descripcion: 'Generación y emisión formal de órdenes de compra' },
    { codigo: 'recepciones:registrar', modulo: 'LOGISTICA', descripcion: 'Registro de recepciones físicas de mercancía en almacén' },
    { codigo: 'inventario:ajustar', modulo: 'INVENTARIO', descripcion: 'Ejecución de ajustes manuales de stock y kardex' },
    { codigo: 'simulaciones:ejecutar', modulo: 'CONTINUIDAD', descripcion: 'Ejecución de escenarios de simulación predictiva' },
    { codigo: 'reportes:gerenciales', modulo: 'REPORTES', descripcion: 'Acceso y visualización de indicadores ejecutivos' },
  ];

  for (const perm of permisosData) {
    await prisma.permiso.upsert({
      where: { codigo: perm.codigo },
      update: { modulo: perm.modulo, descripcion: perm.descripcion },
      create: perm,
    });
  }
  console.log('✓ Permisos del sistema verificados / sincronizados');

  // 2. Roles del Sistema
  const rolesSistema = [
    { codigo: 'ADMIN_EMPRESARIAL', nombre: 'Administrador Empresarial', descripcion: 'Control total de la organización', es_sistema: true },
    { codigo: 'GERENCIA', nombre: 'Gerencia General / Operaciones', descripcion: 'Aprobaciones de alto monto, KPIs y riesgos', es_sistema: true },
    { codigo: 'COMPRAS', nombre: 'Encargado de Compras y Proveedores', descripcion: 'Gestión de órdenes y catálogo de proveedores', es_sistema: true },
    { codigo: 'LOGISTICA', nombre: 'Encargado de Logística y Almacén', descripcion: 'Control de inventario, recepciones y existencias', es_sistema: true },
  ];

  const rolesMap: Record<string, string> = {};
  for (const r of rolesSistema) {
    let rolRecord = await prisma.rol.findFirst({
      where: { codigo: r.codigo, es_sistema: true },
    });
    if (!rolRecord) {
      rolRecord = await prisma.rol.create({
        data: {
          codigo: r.codigo,
          nombre: r.nombre,
          descripcion: r.descripcion,
          es_sistema: true,
          empresa_id: null,
        },
      });
    } else {
      rolRecord = await prisma.rol.update({
        where: { id: rolRecord.id },
        data: { nombre: r.nombre, descripcion: r.descripcion },
      });
    }
    rolesMap[r.codigo] = rolRecord.id;
  }
  console.log('✓ Roles predefinidos del sistema configurados');

  // 3. Empresa de Demostración: Distribuidora Central del Pacífico S.A.
  const empresaDemoId = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
  const empresaDemo = await prisma.empresa.upsert({
    where: { rfc_cedula: '3-101-789456' },
    update: {
      razon_social: 'Distribuidora Central del Pacífico S.A. [DEMO]',
      nombre_comercial: 'Distribuidora del Pacífico',
      email_contacto: 'contacto@pacificocr-demo.com',
      moneda_base: Moneda.CRC,
      activa: true,
      tema_visual: 'CORPORATE_BLUE',
    },
    create: {
      id: empresaDemoId,
      rfc_cedula: '3-101-789456',
      razon_social: 'Distribuidora Central del Pacífico S.A. [DEMO]',
      nombre_comercial: 'Distribuidora del Pacífico',
      email_contacto: 'contacto@pacificocr-demo.com',
      telefono: '+506 2440-1000',
      direccion: 'Parque Empresarial del Este, Bodega 14, Alajuela, Costa Rica',
      moneda_base: Moneda.CRC,
      tema_visual: 'CORPORATE_BLUE',
      activa: true,
    },
  });
  console.log(`✓ Empresa de referencia cargada: ${empresaDemo.razon_social}`);

  // 4. Parámetros de Configuración Empresarial
  await prisma.configuracionEmpresa.upsert({
    where: { empresa_id: empresaDemo.id },
    update: {
      monto_max_autoaprobacion: 750000.00,
      tolerancia_sobrentrega_porc: 5.00,
      dias_credito_default: 30,
    },
    create: {
      empresa_id: empresaDemo.id,
      monto_max_autoaprobacion: 750000.00,
      tolerancia_sobrentrega_porc: 5.00,
      dias_credito_default: 30,
      notificar_alertas_stock: true,
      notificar_retrasos: true,
    },
  });

  // 5. Usuarios de Demostración (Contraseñas hasheadas con bcrypt)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('DemoPacifico2026!', salt);

  const usuariosDemo = [
    { email: 'admin@pacificocr-demo.com', nombre: 'Carlos Quesada Gamboa', rolCodigo: 'ADMIN_EMPRESARIAL' },
    { email: 'gerencia@pacificocr-demo.com', nombre: 'Elena Vega Montero', rolCodigo: 'GERENCIA' },
    { email: 'compras@pacificocr-demo.com', nombre: 'Andrés Mora Solano', rolCodigo: 'COMPRAS' },
    { email: 'bodega@pacificocr-demo.com', nombre: 'Jorge Rodríguez Chaves', rolCodigo: 'LOGISTICA' },
  ];

  const usuariosMap: Record<string, string> = {};
  for (const u of usuariosDemo) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre_completo: u.nombre, activo: true },
      create: {
        email: u.email,
        password_hash: passwordHash,
        nombre_completo: u.nombre,
        activo: true,
      },
    });
    usuariosMap[u.email] = usuario.id;

    // Vincular Membresía a la Empresa de Demostración
    await prisma.membresiaEmpresa.upsert({
      where: { uk_usuario_empresa: { usuario_id: usuario.id, empresa_id: empresaDemo.id } },
      update: { rol_id: rolesMap[u.rolCodigo], activa: true },
      create: {
        usuario_id: usuario.id,
        empresa_id: empresaDemo.id,
        rol_id: rolesMap[u.rolCodigo],
        activa: true,
      },
    });
  }
  console.log('✓ Usuarios de prueba y membresías RBAC creados con éxito');

  // 6. Almacenes de la Empresa
  const almacenCentral = await prisma.almacen.upsert({
    where: { uk_almacen_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'ALM-CENTRAL' } },
    update: { nombre: 'Almacén Central Alajuela', es_principal: true, activo: true },
    create: {
      empresa_id: empresaDemo.id,
      codigo: 'ALM-CENTRAL',
      nombre: 'Almacén Central Alajuela',
      ubicacion: 'Radial Francisco J. Orlich, Alajuela',
      responsable: 'Jorge Rodríguez Chaves',
      es_principal: true,
      activo: true,
    },
  });

  const almacenPacifico = await prisma.almacen.upsert({
    where: { uk_almacen_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'ALM-PACIFICO' } },
    update: { nombre: 'Centro de Distribución Puntarenas', es_principal: false, activo: true },
    create: {
      empresa_id: empresaDemo.id,
      codigo: 'ALM-PACIFICO',
      nombre: 'Centro de Distribución Puntarenas',
      ubicacion: 'Zona Franca El Roble, Puntarenas',
      responsable: 'Mauricio Salas Barrantes',
      es_principal: false,
      activo: true,
    },
  });
  console.log('✓ Almacenes Central y Pacífico registrados');

  // 7. Unidades de Medida
  const uomUnd = await prisma.unidadMedida.upsert({
    where: { uk_unidad_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'UND' } },
    update: { nombre: 'Unidad', simbolo: 'und' },
    create: { empresa_id: empresaDemo.id, codigo: 'UND', nombre: 'Unidad', simbolo: 'und' },
  });

  const uomCaja = await prisma.unidadMedida.upsert({
    where: { uk_unidad_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'CJ' } },
    update: { nombre: 'Caja x 50 / 100', simbolo: 'cj' },
    create: { empresa_id: empresaDemo.id, codigo: 'CJ', nombre: 'Caja x 50 / 100', simbolo: 'cj' },
  });

  // 8. Categorías
  const catHosp = await prisma.categoria.upsert({
    where: { uk_categoria_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'CAT-HOSP' } },
    update: { nombre: 'Insumos Hospitalarios y Bioseguridad' },
    create: { empresa_id: empresaDemo.id, codigo: 'CAT-HOSP', nombre: 'Insumos Hospitalarios y Bioseguridad' },
  });

  const catFerr = await prisma.categoria.upsert({
    where: { uk_categoria_empresa_codigo: { empresa_id: empresaDemo.id, codigo: 'CAT-EMBALAJE' } },
    update: { nombre: 'Materiales de Embalaje y Logística' },
    create: { empresa_id: empresaDemo.id, codigo: 'CAT-EMBALAJE', nombre: 'Materiales de Embalaje y Logística' },
  });

  // 9. Proveedores de Demostración
  const provMedicos = await prisma.proveedor.upsert({
    where: { uk_proveedor_empresa_fiscal: { empresa_id: empresaDemo.id, identificador_fiscal: '3-101-112233' } },
    update: { nombre_legal: 'Suministros Médicos de Centroamérica S.A. [DEMO]', activo: true },
    create: {
      empresa_id: empresaDemo.id,
      identificador_fiscal: '3-101-112233',
      nombre_legal: 'Suministros Médicos de Centroamérica S.A. [DEMO]',
      nombre_fantasia: 'SumiMed CR',
      clasificacion: ClasificacionProveedor.A,
      terminos_pago_dias: 30,
      moneda_preferida: Moneda.USD,
      lead_time_promedio_dias: 5,
      email: 'pedidos@sumimed-demo.cr',
      telefono: '+506 2220-4500',
      direccion: 'La Uruca, San José',
      activo: true,
    },
  });

  const provIndustrial = await prisma.proveedor.upsert({
    where: { uk_proveedor_empresa_fiscal: { empresa_id: empresaDemo.id, identificador_fiscal: '3-102-445566' } },
    update: { nombre_legal: 'Distribuidora Industrial del Caribe Ltda. [DEMO]', activo: true },
    create: {
      empresa_id: empresaDemo.id,
      identificador_fiscal: '3-102-445566',
      nombre_legal: 'Distribuidora Industrial del Caribe Ltda. [DEMO]',
      nombre_fantasia: 'DisCaribe',
      clasificacion: ClasificacionProveedor.B,
      terminos_pago_dias: 45,
      moneda_preferida: Moneda.CRC,
      lead_time_promedio_dias: 10,
      email: 'ventas@discaribe-demo.cr',
      telefono: '+506 2798-1122',
      direccion: 'Moín, Limón',
      activo: true,
    },
  });

  // Contacto clave de proveedor
  await prisma.contactoProveedor.upsert({
    where: { id: 'c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
    update: { nombre: 'Lic. Mariela Solís Campos' },
    create: {
      id: 'c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      empresa_id: empresaDemo.id,
      proveedor_id: provMedicos.id,
      nombre: 'Lic. Mariela Solís Campos',
      cargo: 'Gerente de Cuentas Corporativas',
      email: 'msolis@sumimed-demo.cr',
      telefono: '+506 8899-3344',
      es_principal: true,
    },
  });

  // 10. Catálogo de Productos
  const prodGuantes = await prisma.producto.upsert({
    where: { uk_producto_empresa_sku: { empresa_id: empresaDemo.id, sku: 'MED-GUAN-01' } },
    update: { costo_promedio: 3200.0000, stock_minimo_global: 100.00 },
    create: {
      empresa_id: empresaDemo.id,
      sku: 'MED-GUAN-01',
      codigo_barras: '7441001230018',
      nombre: 'Guantes de Nitrilo Grado Médico Caja x 100',
      descripcion: 'Guantes descartables ambidiestros sin polvo, alta resistencia química y biológica',
      categoria_id: catHosp.id,
      unidad_medida_id: uomCaja.id,
      costo_promedio: 3200.0000,
      precio_referencia: 4500.00,
      stock_minimo_global: 100.00,
      stock_seguridad: 30.00,
      activo: true,
    },
  });

  const prodMascarillas = await prisma.producto.upsert({
    where: { uk_producto_empresa_sku: { empresa_id: empresaDemo.id, sku: 'MED-MASC-02' } },
    update: { costo_promedio: 1850.0000, stock_minimo_global: 80.00 },
    create: {
      empresa_id: empresaDemo.id,
      sku: 'MED-MASC-02',
      codigo_barras: '7441001230025',
      nombre: 'Mascarillas Quirúrgicas Triple Capa Caja x 50',
      descripcion: 'Mascarilla termosellada con elástico y ajuste nasal de polipropileno',
      categoria_id: catHosp.id,
      unidad_medida_id: uomCaja.id,
      costo_promedio: 1850.0000,
      precio_referencia: 2800.00,
      stock_minimo_global: 80.00,
      stock_seguridad: 25.00,
      activo: true,
    },
  });

  const prodCintas = await prisma.producto.upsert({
    where: { uk_producto_empresa_sku: { empresa_id: empresaDemo.id, sku: 'FER-CINT-01' } },
    update: { costo_promedio: 1150.0000, stock_minimo_global: 50.00 },
    create: {
      empresa_id: empresaDemo.id,
      sku: 'FER-CINT-01',
      codigo_barras: '7441001230032',
      nombre: 'Cinta de Embalaje Industrial 48mm x 100m Transparente',
      descripcion: 'Cinta adhesiva acrílica base solvente para sellado de cajas pesadas',
      categoria_id: catFerr.id,
      unidad_medida_id: uomUnd.id,
      costo_promedio: 1150.0000,
      precio_referencia: 1800.00,
      stock_minimo_global: 50.00,
      stock_seguridad: 15.00,
      activo: true,
    },
  });

  // 11. Relación Producto-Proveedor con precios negociados
  await prisma.productoProveedor.upsert({
    where: { uk_producto_proveedor: { empresa_id: empresaDemo.id, producto_id: prodGuantes.id, proveedor_id: provMedicos.id } },
    update: { precio_unitario_acordado: 3150.0000, dias_entrega_esperados: 4 },
    create: {
      empresa_id: empresaDemo.id,
      producto_id: prodGuantes.id,
      proveedor_id: provMedicos.id,
      codigo_producto_proveedor: 'SM-NIT-100',
      precio_unitario_acordado: 3150.0000,
      moneda: Moneda.CRC,
      dias_entrega_esperados: 4,
      es_preferido: true,
    },
  });

  await prisma.productoProveedor.upsert({
    where: { uk_producto_proveedor: { empresa_id: empresaDemo.id, producto_id: prodCintas.id, proveedor_id: provIndustrial.id } },
    update: { precio_unitario_acordado: 1100.0000, dias_entrega_esperados: 7 },
    create: {
      empresa_id: empresaDemo.id,
      producto_id: prodCintas.id,
      proveedor_id: provIndustrial.id,
      codigo_producto_proveedor: 'DC-TAPE-100',
      precio_unitario_acordado: 1100.0000,
      moneda: Moneda.CRC,
      dias_entrega_esperados: 7,
      es_preferido: true,
    },
  });

  // 12. Existencias Iniciales (InventarioStock) y Movimientos de Kardex
  const stockGuantes = await prisma.inventarioStock.upsert({
    where: { uk_inventario_empresa_alm_prod: { empresa_id: empresaDemo.id, almacen_id: almacenCentral.id, producto_id: prodGuantes.id } },
    update: { cantidad_actual: 350.00, stock_minimo: 100.00 },
    create: {
      empresa_id: empresaDemo.id,
      almacen_id: almacenCentral.id,
      producto_id: prodGuantes.id,
      cantidad_actual: 350.00,
      cantidad_reservada: 0.00,
      stock_minimo: 100.00,
      ubicacion_pasillo: 'Pasillo A-02 Nivel 3',
    },
  });

  const stockCintas = await prisma.inventarioStock.upsert({
    where: { uk_inventario_empresa_alm_prod: { empresa_id: empresaDemo.id, almacen_id: almacenCentral.id, producto_id: prodCintas.id } },
    update: { cantidad_actual: 45.00, stock_minimo: 50.00 }, // Genera estado bajo mínimo intencional para alertas
    create: {
      empresa_id: empresaDemo.id,
      almacen_id: almacenCentral.id,
      producto_id: prodCintas.id,
      cantidad_actual: 45.00,
      cantidad_reservada: 0.00,
      stock_minimo: 50.00,
      ubicacion_pasillo: 'Pasillo C-01 Nivel 1',
    },
  });

  // Registrar Movimiento de Kardex Idempotente
  const movimientoGuantes = await prisma.movimientoInventario.findFirst({
    where: { empresa_id: empresaDemo.id, producto_id: prodGuantes.id, referencia_tipo: 'INVENTARIO_INICIAL' },
  });
  if (!movimientoGuantes) {
    await prisma.movimientoInventario.create({
      data: {
        empresa_id: empresaDemo.id,
        almacen_id: almacenCentral.id,
        producto_id: prodGuantes.id,
        usuario_id: usuariosMap['admin@pacificocr-demo.com'],
        tipo_movimiento: TipoMovimientoInventario.ENTRADA_AJUSTE,
        cantidad: 350.00,
        costo_unitario: 3200.0000,
        stock_anterior: 0.00,
        stock_posterior: 350.00,
        referencia_tipo: 'INVENTARIO_INICIAL',
        motivo: 'Carga inicial de inventario auditado - Apertura fiscal 2026',
      },
    });
  }

  // 13. Solicitud de Compra de Demostración (Aprobada)
  const solicitudDemo = await prisma.solicitudCompra.upsert({
    where: { uk_solicitud_empresa_numero: { empresa_id: empresaDemo.id, numero_solicitud: 'SC-2026-0001' } },
    update: { estado: EstadoSolicitudCompra.CONVERTIDA_EN_ORDEN },
    create: {
      empresa_id: empresaDemo.id,
      solicitante_id: usuariosMap['compras@pacificocr-demo.com'],
      numero_solicitud: 'SC-2026-0001',
      justificacion: 'Reposición programada de insumos médicos de alta rotación para el Almacén Central',
      estado: EstadoSolicitudCompra.CONVERTIDA_EN_ORDEN,
      moneda: Moneda.CRC,
      total_estimado: 630000.00,
    },
  });

  // 14. Orden de Compra de Demostración (Parcialmente Recibida)
  const fechaPromesa = new Date();
  fechaPromesa.setDate(fechaPromesa.getDate() + 3);

  const ordenDemo = await prisma.ordenCompra.upsert({
    where: { uk_orden_empresa_numero: { empresa_id: empresaDemo.id, numero_orden: 'OC-2026-0001' } },
    update: { estado: EstadoOrdenCompra.PARCIALMENTE_RECIBIDA },
    create: {
      empresa_id: empresaDemo.id,
      solicitud_origen_id: solicitudDemo.id,
      proveedor_id: provMedicos.id,
      almacen_destino_id: almacenCentral.id,
      creada_por_id: usuariosMap['compras@pacificocr-demo.com'],
      numero_orden: 'OC-2026-0001',
      fecha_prometida_entrega: fechaPromesa,
      estado: EstadoOrdenCompra.PARCIALMENTE_RECIBIDA,
      moneda: Moneda.CRC,
      subtotal: 630000.00,
      impuestos: 81900.00,
      total: 711900.00,
      condiciones_pago: 'Crédito comercial 30 días factura electrónica',
      notas: 'Entrega prioritaria en rampa 2 con certificado de lote',
    },
  });

  const detalleOrden = await prisma.detalleOrdenCompra.findFirst({
    where: { orden_id: ordenDemo.id, producto_id: prodGuantes.id },
  });
  let detalleOrdenId = detalleOrden?.id;
  if (!detalleOrden) {
    const nuevoDetalle = await prisma.detalleOrdenCompra.create({
      data: {
        orden_id: ordenDemo.id,
        producto_id: prodGuantes.id,
        cantidad_ordenada: 200.00,
        cantidad_recibida: 120.00, // Recepción parcial
        precio_unitario: 3150.0000,
        impuesto_porcentaje: 13.00,
        subtotal: 630000.00,
      },
    });
    detalleOrdenId = nuevoDetalle.id;
  }

  // 15. Recepción Parcial en Bodega
  const recepcionDemo = await prisma.recepcionCompra.upsert({
    where: { uk_recepcion_empresa_numero: { empresa_id: empresaDemo.id, numero_recepcion: 'REC-2026-0001' } },
    update: { estado: EstadoRecepcion.CONFORME },
    create: {
      empresa_id: empresaDemo.id,
      orden_compra_id: ordenDemo.id,
      almacen_id: almacenCentral.id,
      recibido_por_id: usuariosMap['bodega@pacificocr-demo.com'],
      numero_recepcion: 'REC-2026-0001',
      numero_guia_factura: 'GUIA-SM-9021',
      observaciones: 'Primera entrega parcial de 120 cajas recibidas en perfecto estado.',
      estado: EstadoRecepcion.CONFORME,
    },
  });

  if (detalleOrdenId) {
    const detalleRec = await prisma.detalleRecepcionCompra.findFirst({
      where: { recepcion_id: recepcionDemo.id, detalle_orden_id: detalleOrdenId },
    });
    if (!detalleRec) {
      await prisma.detalleRecepcionCompra.create({
        data: {
          recepcion_id: recepcionDemo.id,
          detalle_orden_id: detalleOrdenId,
          producto_id: prodGuantes.id,
          cantidad_recibida: 120.00,
          costo_unitario_real: 3150.0000,
        },
      });
    }
  }

  // 16. Evaluación de Desempeño del Proveedor
  await prisma.evaluacionProveedor.upsert({
    where: { uk_evaluacion_empresa_prov_periodo: { empresa_id: empresaDemo.id, proveedor_id: provMedicos.id, periodo: '2026-11' } },
    update: { calificacion_global: 96.50, categoria_desempeno: CategoriaDesempeno.EXCELENTE },
    create: {
      empresa_id: empresaDemo.id,
      proveedor_id: provMedicos.id,
      periodo: '2026-11',
      ordenes_evaluadas: 4,
      indice_puntualidad: 98.00,
      indice_cumplimiento_cant: 95.00,
      indice_incidencias: 100.00,
      indice_precios: 94.00,
      calificacion_global: 96.50,
      categoria_desempeno: CategoriaDesempeno.EXCELENTE,
      observaciones: 'Desempeño sobresaliente en lead time y calidad de empaque durante el período.',
    },
  });

  // 17. Alerta de Riesgo Operativo (Stock Bajo Mínimo Real)
  const alertaStock = await prisma.alertaRiesgo.findFirst({
    where: { empresa_id: empresaDemo.id, recurso_id: prodCintas.id, tipo_riesgo: TipoRiesgo.STOCK_MINIMO },
  });
  if (!alertaStock) {
    await prisma.alertaRiesgo.create({
      data: {
        empresa_id: empresaDemo.id,
        tipo_riesgo: TipoRiesgo.STOCK_MINIMO,
        nivel_severidad: NivelSeveridadAlerta.ADVERTENCIA,
        titulo: 'Stock Crítico: Cinta de Embalaje Industrial',
        mensaje: 'La existencia actual (45.00 und) es inferior al stock mínimo configurado (50.00 und). Se recomienda emitir solicitud de reposición.',
        recurso_tipo: 'PRODUCTO',
        recurso_id: prodCintas.id,
        leida: false,
        resuelta: false,
      },
    });
  }

  console.log('--- Semilla de Datos Ejecutada y Verificada con Éxito ---');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
