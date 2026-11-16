import {
  PrismaClient,
  Moneda,
  ClasificacionProveedor,
  EstadoSolicitudCompra,
  EstadoOrdenCompra,
  EstadoRecepcion,
  TipoMovimientoInventario,
  CategoriaDesempeno,
  TipoRiesgo,
  NivelSeveridadAlerta,
  TipoIncidencia,
  SeveridadIncidencia,
  DecisionAprobacion,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🚀 INICIANDO SEMILLA DE ALTO VOLUMEN IDEMPOTENTE PARA NEXOSUPPLY CR');
  console.log('================================================================');

  const passwordHash = await bcrypt.hash('DemoPacifico2026!', 10);

  // ----------------------------------------------------------------------------
  // 1. PERMISOS Y ROLES DEL SISTEMA
  // ----------------------------------------------------------------------------
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
    { codigo: 'portal_proveedor:ver', modulo: 'PROVEEDOR_EXTERNO', descripcion: 'Consulta de órdenes y evaluaciones exclusivas del proveedor' },
  ];

  for (const p of permisosData) {
    await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      update: { modulo: p.modulo, descripcion: p.descripcion },
      create: p,
    });
  }

  const rolesDefinicion = [
    { codigo: 'ADMIN_EMPRESARIAL', nombre: 'Administrador Empresarial', desc: 'Control total de la organización' },
    { codigo: 'GERENCIA', nombre: 'Gerencia General / Operaciones', desc: 'Aprobaciones de alto monto, KPIs y riesgos' },
    { codigo: 'COMPRAS', nombre: 'Encargado de Compras', desc: 'Gestión de órdenes y catálogo de proveedores' },
    { codigo: 'LOGISTICA', nombre: 'Encargado de Logística y Almacén', desc: 'Control de inventario, recepciones y existencias' },
    { codigo: 'AUDITOR_LECTOR', nombre: 'Auditor / Consulta Empresarial', desc: 'Lectura exclusiva de reportes e historial sin edición' },
    { codigo: 'PROVEEDOR_EXTERNO', nombre: 'Proveedor Externo Autorizado', desc: 'Acceso restringido únicamente a sus propias órdenes y entregas' },
  ];

  const rolesMap: Record<string, string> = {};
  for (const r of rolesDefinicion) {
    let rol = await prisma.rol.findFirst({ where: { codigo: r.codigo, es_sistema: true } });
    if (!rol) {
      rol = await prisma.rol.create({
        data: { codigo: r.codigo, nombre: r.nombre, descripcion: r.desc, es_sistema: true },
      });
    }
    rolesMap[r.codigo] = rol.id;
  }

  // Vincular permisos a roles
  const todosPermisos = await prisma.permiso.findMany();
  for (const perm of todosPermisos) {
    // Admin tiene todos
    await prisma.rolPermiso.upsert({
      where: { uk_rol_permiso: { rol_id: rolesMap['ADMIN_EMPRESARIAL'], permiso_id: perm.id } },
      update: {},
      create: { rol_id: rolesMap['ADMIN_EMPRESARIAL'], permiso_id: perm.id },
    });

    // Auditor tiene reportes y empresas
    if (perm.codigo === 'reportes:gerenciales' || perm.codigo === 'productos:gestionar') {
      await prisma.rolPermiso.upsert({
        where: { uk_rol_permiso: { rol_id: rolesMap['AUDITOR_LECTOR'], permiso_id: perm.id } },
        update: {},
        create: { rol_id: rolesMap['AUDITOR_LECTOR'], permiso_id: perm.id },
      });
    }

    // Proveedor externo tiene solo portal
    if (perm.codigo === 'portal_proveedor:ver') {
      await prisma.rolPermiso.upsert({
        where: { uk_rol_permiso: { rol_id: rolesMap['PROVEEDOR_EXTERNO'], permiso_id: perm.id } },
        update: {},
        create: { rol_id: rolesMap['PROVEEDOR_EXTERNO'], permiso_id: perm.id },
      });
    }
  }

  console.log('✓ Roles y Permisos RBAC inicializados.');

  // ----------------------------------------------------------------------------
  // 2. UNIDADES DE MEDIDA GLOBALES
  // ----------------------------------------------------------------------------
  // Usaremos una lista común de unidades que replicaremos para las 3 empresas
  const unidadesBase = [
    { codigo: 'UND', nombre: 'Unidad', simbolo: 'und' },
    { codigo: 'CJA', nombre: 'Caja', simbolo: 'cja' },
    { codigo: 'KGM', nombre: 'Kilogramo', simbolo: 'kg' },
    { codigo: 'LTR', nombre: 'Litro', simbolo: 'L' },
    { codigo: 'MTR', nombre: 'Metro', simbolo: 'm' },
  ];

  // ----------------------------------------------------------------------------
  // 3. EMPRESAS (3 Empresas Medianas Reales de Demostración)
  // ----------------------------------------------------------------------------
  const empresasConfig = [
    {
      id: 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      rfc_cedula: '3-101-789456',
      razon_social: 'Distribuidora Central del Pacífico S.A. [DEMO]',
      nombre_comercial: 'Distribuidora del Pacífico',
      email: 'contacto@pacificocr-demo.com',
      telefono: '+506 2440-1000',
      direccion: 'Parque Empresarial del Este, Bodega 14, Alajuela, Costa Rica',
      moneda: Moneda.CRC,
      tema: 'CORPORATE_BLUE',
    },
    {
      id: 'e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
      rfc_cedula: '3-102-654321',
      razon_social: 'Corporación Logística del Valle S.A. [DEMO]',
      nombre_comercial: 'Logística del Valle',
      email: 'contacto@vallelogistica-demo.com',
      telefono: '+506 2550-2000',
      direccion: 'Zona Franca Coyol, Edificio 3B, Alajuela, Costa Rica',
      moneda: Moneda.CRC,
      tema: 'FOREST_GREEN',
    },
    {
      id: 'e3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e',
      rfc_cedula: '3-103-987123',
      razon_social: 'Suministros Industriales del Norte S.A. [DEMO]',
      nombre_comercial: 'Suministros Norte',
      email: 'contacto@norteindustrial-demo.com',
      telefono: '+506 2770-3000',
      direccion: 'Muelle de Cargas, Oficinas 12-14, Limón, Costa Rica',
      moneda: Moneda.USD,
      tema: 'DEEP_NAVY',
    },
  ];

  const empresasGuardadas = [];
  for (const emp of empresasConfig) {
    const e = await prisma.empresa.upsert({
      where: { rfc_cedula: emp.rfc_cedula },
      update: {
        razon_social: emp.razon_social,
        nombre_comercial: emp.nombre_comercial,
        email_contacto: emp.email,
        moneda_base: emp.moneda,
        tema_visual: emp.tema,
        activa: true,
      },
      create: {
        id: emp.id,
        rfc_cedula: emp.rfc_cedula,
        razon_social: emp.razon_social,
        nombre_comercial: emp.nombre_comercial,
        email_contacto: emp.email,
        telefono: emp.telefono,
        direccion: emp.direccion,
        moneda_base: emp.moneda,
        tema_visual: emp.tema,
        activa: true,
      },
    });

    await prisma.configuracionEmpresa.upsert({
      where: { empresa_id: e.id },
      update: {},
      create: {
        empresa_id: e.id,
        monto_max_autoaprobacion: emp.moneda === Moneda.USD ? 2000.0 : 750000.0,
        tolerancia_sobrentrega_porc: 5.0,
        dias_credito_default: 30,
      },
    });

    empresasGuardadas.push(e);
  }
  console.log(`✓ 3 Empresas multi-tenant inicializadas con parámetros de gobernanza.`);

  // ----------------------------------------------------------------------------
  // 4. USUARIOS (12 Cuentas: Admin, Gerencia, Compras, Bodega, Auditor, Proveedor)
  // ----------------------------------------------------------------------------
  const usuariosDef = [
    // Empresa 1
    { email: 'admin@pacificocr-demo.com', nombre: 'Juan Díaz Méndez', rol: 'ADMIN_EMPRESARIAL', empIdx: 0 },
    { email: 'gerencia@pacificocr-demo.com', nombre: 'Carlos Ruiz Brenes', rol: 'GERENCIA', empIdx: 0 },
    { email: 'compras@pacificocr-demo.com', nombre: 'Elena Vega Castillo', rol: 'COMPRAS', empIdx: 0 },
    { email: 'bodega@pacificocr-demo.com', nombre: 'Mauricio Solano Mora', rol: 'LOGISTICA', empIdx: 0 },
    { email: 'auditor@pacificocr-demo.com', nombre: 'Patricia Arias Soto', rol: 'AUDITOR_LECTOR', empIdx: 0 },
    // Empresa 2
    { email: 'admin@vallelogistica-demo.com', nombre: 'Valeria Monge Castro', rol: 'ADMIN_EMPRESARIAL', empIdx: 1 },
    { email: 'compras@vallelogistica-demo.com', nombre: 'Roberto Chen Fung', rol: 'COMPRAS', empIdx: 1 },
    { email: 'bodega@vallelogistica-demo.com', nombre: 'Andrés Gutiérrez Ramos', rol: 'LOGISTICA', empIdx: 1 },
    // Empresa 3
    { email: 'admin@norteindustrial-demo.com', nombre: 'Diego Cordero Silva', rol: 'ADMIN_EMPRESARIAL', empIdx: 2 },
    { email: 'compras@norteindustrial-demo.com', nombre: 'Lucía Fallas Marín', rol: 'COMPRAS', empIdx: 2 },
    { email: 'bodega@norteindustrial-demo.com', nombre: 'Gabriel Quesada Porras', rol: 'LOGISTICA', empIdx: 2 },
    // Proveedor Externo Autorizado
    { email: 'proveedor@sumimed-demo.com', nombre: 'Ing. Fernando Ortiz (SumiMed)', rol: 'PROVEEDOR_EXTERNO', empIdx: 0 },
  ];

  const usuariosGuardados: Record<string, any> = {};
  for (const u of usuariosDef) {
    const usr = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        nombre_completo: u.nombre,
        email_verificado: true,
        activo: true,
      },
      create: {
        email: u.email,
        password_hash: passwordHash,
        nombre_completo: u.nombre,
        email_verificado: true,
        activo: true,
      },
    });
    usuariosGuardados[u.email] = usr;

    const empId = empresasGuardadas[u.empIdx].id;
    const rolId = rolesMap[u.rol];
    if (rolId) {
      await prisma.membresiaEmpresa.upsert({
        where: { uk_usuario_empresa: { usuario_id: usr.id, empresa_id: empId } },
        update: { rol_id: rolId, activa: true },
        create: {
          usuario_id: usr.id,
          empresa_id: empId,
          rol_id: rolId,
          activa: true,
        },
      });
    }
  }
  console.log(`✓ 12 Usuarios con credenciales seguras y membresías asociadas.`);

  // ----------------------------------------------------------------------------
  // BUCLE DE GENERACIÓN DE DATOS MASIVOS POR EMPRESA
  // ----------------------------------------------------------------------------
  for (let empIdx = 0; empIdx < empresasGuardadas.length; empIdx++) {
    const empresa = empresasGuardadas[empIdx];
    const prefix = `E${empIdx + 1}`;
    console.log(`\n--- Generando datos para ${empresa.razon_social} (${prefix}) ---`);

    // A. Unidades de Medida
    const unidadesEmpresa: Record<string, string> = {};
    for (const u of unidadesBase) {
      const uRecord = await prisma.unidadMedida.upsert({
        where: { uk_unidad_empresa_codigo: { empresa_id: empresa.id, codigo: u.codigo } },
        update: {},
        create: { empresa_id: empresa.id, codigo: u.codigo, nombre: u.nombre, simbolo: u.simbolo },
      });
      unidadesEmpresa[u.codigo] = uRecord.id;
    }

    // B. Almacenes (3 por empresa = 9 en total)
    const almacenesData = [
      { codigo: `${prefix}-ALM-01`, nombre: `Almacén Central (${empresa.nombre_comercial})`, es_principal: true },
      { codigo: `${prefix}-ALM-02`, nombre: `Centro de Distribución Logística`, es_principal: false },
      { codigo: `${prefix}-ALM-03`, nombre: `Bodega de Respuesto y Tránsito`, es_principal: false },
    ];
    const almacenesGuardados: any[] = [];
    for (const alm of almacenesData) {
      const a = await prisma.almacen.upsert({
        where: { uk_almacen_empresa_codigo: { empresa_id: empresa.id, codigo: alm.codigo } },
        update: {},
        create: {
          empresa_id: empresa.id,
          codigo: alm.codigo,
          nombre: alm.nombre,
          ubicacion: `Sector Industrial ${prefix}`,
          es_principal: alm.es_principal,
        },
      });
      almacenesGuardados.push(a);
    }

    // C. Categorías (5 por empresa = 15 en total)
    const categoriasNombres = ['Materia Prima e Insumos', 'Material Médico y Quirúrgico', 'Empaque y Embalaje', 'Herramientas y Repuestos', 'Químicos y Reactivos'];
    const categoriasGuardadas: any[] = [];
    for (let c = 0; c < 5; c++) {
      const cat = await prisma.categoria.upsert({
        where: { uk_categoria_empresa_codigo: { empresa_id: empresa.id, codigo: `${prefix}-CAT-${c + 1}` } },
        update: {},
        create: {
          empresa_id: empresa.id,
          codigo: `${prefix}-CAT-${c + 1}`,
          nombre: `${categoriasNombres[c]} ${prefix}`,
          descripcion: `Categoría de control ${c + 1} para ${empresa.nombre_comercial}`,
        },
      });
      categoriasGuardadas.push(cat);
    }

    // D. Proveedores (15 por empresa = 45 en total)
    const proveedoresNombres = [
      'SumiMed CR Internacional', 'DisCaribe Distribuciones', 'Global Packing Logistics',
      'Ferretería & Repuestos Industriales', 'Química del Pacífico', 'Equipos Biomédicos del Valle',
      'Plásticos & Cajas de Costa Rica', 'Aceros del Atlántico', 'Distribuidora Continental',
      'ElectroTecnia Industrial', 'Insumos Médicos San José', 'BioSuministros del Norte',
      'Importadora Centroamericana', 'Adhesivos & Cintas Industriales', 'Herramientas Atlas S.A.'
    ];

    const proveedoresGuardados: any[] = [];
    for (let p = 0; p < 15; p++) {
      const fiscalId = `3-10${empIdx + 1}-${String(100000 + p)}`;
      const clasif = p < 4 ? ClasificacionProveedor.A : p < 10 ? ClasificacionProveedor.B : ClasificacionProveedor.C;
      const prov = await prisma.proveedor.upsert({
        where: { uk_proveedor_empresa_fiscal: { empresa_id: empresa.id, identificador_fiscal: fiscalId } },
        update: { nombre_legal: `${proveedoresNombres[p]} S.A. [DEMO]`, clasificacion: clasif },
        create: {
          empresa_id: empresa.id,
          identificador_fiscal: fiscalId,
          nombre_legal: `${proveedoresNombres[p]} S.A. [DEMO]`,
          nombre_fantasia: proveedoresNombres[p],
          clasificacion: clasif,
          terminos_pago_dias: p % 2 === 0 ? 30 : 45,
          moneda_preferida: empresa.moneda_base,
          lead_time_promedio_dias: 3 + (p % 7),
          email: `ventas@${proveedoresNombres[p].toLowerCase().replace(/[^a-z]/g, '')}-demo.com`,
          telefono: `+506 2200-${String(1000 + p)}`,
          direccion: `San José, Costa Rica - Edificio Prov ${p + 1}`,
          activo: true,
        },
      });
      proveedoresGuardados.push(prov);

      // Si es el primer proveedor de Empresa 1, vincular usuario externo
      if (empIdx === 0 && p === 0) {
        await prisma.usuario.update({
          where: { email: 'proveedor@sumimed-demo.com' },
          data: { proveedor_id: prov.id },
        });
      }

      // Contactos de proveedores (2 por proveedor = 90 en total)
      for (let k = 1; k <= 2; k++) {
        const nombreContacto = `Ejecutivo ${k} - ${proveedoresNombres[p]}`;
        const contactoExiste = await prisma.contactoProveedor.findFirst({
          where: { empresa_id: empresa.id, proveedor_id: prov.id, nombre: nombreContacto },
        });
        if (!contactoExiste) {
          await prisma.contactoProveedor.create({
            data: {
              empresa_id: empresa.id,
              proveedor_id: prov.id,
              nombre: nombreContacto,
              cargo: k === 1 ? 'Gerente de Cuentas Clave' : 'Ejecutivo de Logística',
              email: `contacto${k}@prov${p + 1}.com`,
              telefono: `+506 8800-${String(2000 + p * 2 + k)}`,
              es_principal: k === 1,
            },
          });
        }
      }
    }

    // E. Productos (60 por empresa = 180 en total)
    const productosGuardados: any[] = [];
    for (let pr = 1; pr <= 60; pr++) {
      const sku = `${prefix}-PRD-${String(pr).padStart(3, '0')}`;
      const cat = categoriasGuardadas[pr % categoriasGuardadas.length];
      const costo = empresa.moneda_base === Moneda.USD ? 5 + (pr % 30) * 2.5 : 2500 + (pr % 30) * 1250;
      const stockMin = 20 + (pr % 15) * 5;

      const prod = await prisma.producto.upsert({
        where: { uk_producto_empresa_sku: { empresa_id: empresa.id, sku } },
        update: { costo_promedio: costo, stock_minimo_global: stockMin },
        create: {
          empresa_id: empresa.id,
          sku,
          nombre: `Ítem Operativo ${prefix} #${pr} (${cat.nombre.split(' ')[0]})`,
          descripcion: `Material de distribución comercial grado industrial código ${sku}`,
          categoria_id: cat.id,
          unidad_medida_id: unidadesEmpresa['UND'] || Object.values(unidadesEmpresa)[0],
          costo_promedio: costo,
          precio_referencia: costo * 1.35,
          stock_minimo_global: stockMin,
          stock_seguridad: Math.floor(stockMin * 0.4),
          activo: true,
        },
      });
      productosGuardados.push(prod);

      // Vincular producto con 2 proveedores
      const provPrincipal = proveedoresGuardados[pr % proveedoresGuardados.length];
      const provAlterno = proveedoresGuardados[(pr + 1) % proveedoresGuardados.length];

      await prisma.productoProveedor.upsert({
        where: { uk_producto_proveedor: { empresa_id: empresa.id, producto_id: prod.id, proveedor_id: provPrincipal.id } },
        update: {},
        create: {
          empresa_id: empresa.id,
          producto_id: prod.id,
          proveedor_id: provPrincipal.id,
          codigo_producto_proveedor: `EXT-${sku}`,
          precio_unitario_acordado: costo * 0.95,
          moneda: empresa.moneda_base,
          dias_entrega_esperados: 4,
          es_preferido: true,
        },
      });

      await prisma.productoProveedor.upsert({
        where: { uk_producto_proveedor: { empresa_id: empresa.id, producto_id: prod.id, proveedor_id: provAlterno.id } },
        update: {},
        create: {
          empresa_id: empresa.id,
          producto_id: prod.id,
          proveedor_id: provAlterno.id,
          codigo_producto_proveedor: `ALT-${sku}`,
          precio_unitario_acordado: costo * 1.10,
          moneda: empresa.moneda_base,
          dias_entrega_esperados: 7,
          es_preferido: false,
        },
      });

      // Existencias en almacenes
      for (const alm of almacenesGuardados) {
        // Generar algunos productos en stock bajo para que las alertas del dashboard sean reales
        const isBajo = pr % 7 === 0;
        const stockCant = isBajo ? Math.floor(stockMin * 0.5) : stockMin * 2 + pr * 3;

        await prisma.inventarioStock.upsert({
          where: { uk_inventario_empresa_alm_prod: { empresa_id: empresa.id, almacen_id: alm.id, producto_id: prod.id } },
          update: { cantidad_actual: stockCant, stock_minimo: stockMin },
          create: {
            empresa_id: empresa.id,
            almacen_id: alm.id,
            producto_id: prod.id,
            cantidad_actual: stockCant,
            cantidad_reservada: 0,
            stock_minimo: stockMin,
            ubicacion_pasillo: `Pasillo ${(pr % 10) + 1}-Rack ${(pr % 4) + 1}`,
          },
        });
      }
    }

    // F. Solicitudes de Compra (40 por empresa = 120 en total)
    const usuarioCompras = Object.values(usuariosGuardados)[empIdx * 4 + 2] || Object.values(usuariosGuardados)[0];
    const usuarioAdmin = Object.values(usuariosGuardados)[empIdx * 4] || Object.values(usuariosGuardados)[0];

    const solicitudesGuardadas: any[] = [];
    for (let s = 1; s <= 40; s++) {
      const numSol = `${prefix}-SC-${String(s).padStart(4, '0')}`;
      const estado =
        s <= 15
          ? EstadoSolicitudCompra.CONVERTIDA_EN_ORDEN
          : s <= 25
          ? EstadoSolicitudCompra.APROBADA
          : s <= 35
          ? EstadoSolicitudCompra.PENDIENTE
          : EstadoSolicitudCompra.RECHAZADA;

      // Fechas escalonadas en los últimos 5 meses
      const fechaSol = new Date(Date.now() - (40 - s) * 3.5 * 24 * 60 * 60 * 1000);

      const sol = await prisma.solicitudCompra.upsert({
        where: { uk_solicitud_empresa_numero: { empresa_id: empresa.id, numero_solicitud: numSol } },
        update: { estado },
        create: {
          empresa_id: empresa.id,
          solicitante_id: usuarioCompras.id,
          numero_solicitud: numSol,
          fecha_solicitud: fechaSol,
          justificacion: `Requisición programada de reaprovisionamiento lote #${s}`,
          estado,
          moneda: empresa.moneda_base,
          total_estimado: empresa.moneda_base === Moneda.USD ? 850.0 : 450000.0,
        },
      });
      solicitudesGuardadas.push(sol);

      // Detalle de solicitud
      const detExiste = await prisma.detalleSolicitudCompra.findFirst({ where: { solicitud_id: sol.id } });
      if (!detExiste) {
        const prod = productosGuardados[s % productosGuardados.length];
        await prisma.detalleSolicitudCompra.create({
          data: {
            solicitud_id: sol.id,
            producto_id: prod.id,
            cantidad_solicitada: 50,
            precio_unitario_estimado: Number(prod.costo_promedio),
            subtotal: 50 * Number(prod.costo_promedio),
          },
        });
      }

      // Registro de aprobación si no está pendiente
      if (estado === EstadoSolicitudCompra.APROBADA || estado === EstadoSolicitudCompra.CONVERTIDA_EN_ORDEN) {
        const apExiste = await prisma.aprobacionSolicitud.findFirst({ where: { solicitud_id: sol.id } });
        if (!apExiste) {
          await prisma.aprobacionSolicitud.create({
            data: {
              solicitud_id: sol.id,
              aprobador_id: usuarioAdmin.id,
              decision: DecisionAprobacion.APROBADA,
              comentario: 'Aprobado conforme al presupuesto y políticas de abastecimiento.',
              fecha_decision: fechaSol,
            },
          });
        }
      }
    }

    // G. Órdenes de Compra (34 por empresa = ~100 en total)
    const ordenesGuardadas: any[] = [];
    for (let o = 1; o <= 34; o++) {
      const numOrd = `${prefix}-OC-${String(o).padStart(4, '0')}`;
      const prov = proveedoresGuardados[o % proveedoresGuardados.length];
      const alm = almacenesGuardados[o % almacenesGuardados.length];
      const solOrigen = o <= 15 ? solicitudesGuardadas[o - 1] : null;

      // Estado variado para mostrar la realidad de una empresa mediana
      const estado =
        o <= 18
          ? EstadoOrdenCompra.COMPLETADA
          : o <= 24
          ? EstadoOrdenCompra.PARCIALMENTE_RECIBIDA
          : o <= 29
          ? EstadoOrdenCompra.EN_TRANSITO
          : o <= 32
          ? EstadoOrdenCompra.EMITIDA
          : EstadoOrdenCompra.BORRADOR;

      const fechaEmision = new Date(Date.now() - (34 - o) * 4.5 * 24 * 60 * 60 * 1000);
      const fechaEntrega = new Date(fechaEmision.getTime() + 7 * 24 * 60 * 60 * 1000);

      const prod = productosGuardados[o % productosGuardados.length];
      const cant = 100 + (o % 10) * 10;
      const subtotal = cant * Number(prod.costo_promedio);
      const impuestos = subtotal * 0.13;
      const total = subtotal + impuestos;

      const ord = await prisma.ordenCompra.upsert({
        where: { uk_orden_empresa_numero: { empresa_id: empresa.id, numero_orden: numOrd } },
        update: { estado, total, subtotal, impuestos },
        create: {
          empresa_id: empresa.id,
          solicitud_origen_id: solOrigen?.id || null,
          proveedor_id: prov.id,
          almacen_destino_id: alm.id,
          creada_por_id: usuarioCompras.id,
          numero_orden: numOrd,
          fecha_emision: fechaEmision,
          fecha_prometida_entrega: fechaEntrega,
          estado,
          moneda: empresa.moneda_base,
          subtotal,
          impuestos,
          total,
          condiciones_pago: 'Crédito 30 días factura electrónica',
        },
      });
      ordenesGuardadas.push(ord);

      const detOrd = await prisma.detalleOrdenCompra.findFirst({ where: { orden_id: ord.id } });
      if (!detOrd) {
        await prisma.detalleOrdenCompra.create({
          data: {
            orden_id: ord.id,
            producto_id: prod.id,
            cantidad_ordenada: cant,
            cantidad_recibida: estado === EstadoOrdenCompra.COMPLETADA ? cant : estado === EstadoOrdenCompra.PARCIALMENTE_RECIBIDA ? cant * 0.6 : 0,
            precio_unitario: Number(prod.costo_promedio),
            impuesto_porcentaje: 13.0,
            subtotal,
          },
        });
      }
    }

    // H. Recepciones de Compra (54 por empresa = ~160 en total)
    const usuarioBodega = Object.values(usuariosGuardados)[empIdx * 4 + 3] || Object.values(usuariosGuardados)[0];
    const recepcionesGuardadas: any[] = [];

    let recCounter = 1;
    for (const ord of ordenesGuardadas) {
      if (ord.estado === EstadoOrdenCompra.COMPLETADA || ord.estado === EstadoOrdenCompra.PARCIALMENTE_RECIBIDA) {
        const numRec = `${prefix}-REC-${String(recCounter).padStart(4, '0')}`;
        const fechaRec = new Date(ord.fecha_prometida_entrega.getTime() - 24 * 60 * 60 * 1000);

        const rec = await prisma.recepcionCompra.upsert({
          where: { uk_recepcion_empresa_numero: { empresa_id: empresa.id, numero_recepcion: numRec } },
          update: {},
          create: {
            empresa_id: empresa.id,
            orden_compra_id: ord.id,
            almacen_id: ord.almacen_destino_id,
            recibido_por_id: usuarioBodega.id,
            numero_recepcion: numRec,
            numero_guia_factura: `FAC-PROV-${1000 + recCounter}`,
            fecha_recepcion: fechaRec,
            observaciones: 'Recepción conforme con inspección de calidad aprobada.',
            estado: EstadoRecepcion.CONFORME,
          },
        });
        recepcionesGuardadas.push(rec);

        const detOrd = await prisma.detalleOrdenCompra.findFirst({ where: { orden_id: ord.id } });
        if (detOrd) {
          const detRec = await prisma.detalleRecepcionCompra.findFirst({ where: { recepcion_id: rec.id } });
          if (!detRec) {
            await prisma.detalleRecepcionCompra.create({
              data: {
                recepcion_id: rec.id,
                detalle_orden_id: detOrd.id,
                producto_id: detOrd.producto_id,
                cantidad_recibida: Number(detOrd.cantidad_recibida),
                costo_unitario_real: Number(detOrd.precio_unitario),
              },
            });
          }
        }
        recCounter++;
      }
    }

    // I. Movimientos de Inventario / Kardex (400 por empresa = 1,200 en total)
    const kardexCount = await prisma.movimientoInventario.count({ where: { empresa_id: empresa.id } });
    if (kardexCount < 300) {
      console.log(`  -> Insertando movimientos de Kardex transaccionales auditables (${prefix})...`);
      for (let k = 1; k <= 400; k++) {
        const prod = productosGuardados[k % productosGuardados.length];
        const alm = almacenesGuardados[k % almacenesGuardados.length];
        const esEntrada = k % 3 !== 0;
        const cantMov = 10 + (k % 25);
        const stockAnt = 100 + (k % 50);
        const stockPost = esEntrada ? stockAnt + cantMov : stockAnt - cantMov;
        const fechaK = new Date(Date.now() - (400 - k) * 8 * 60 * 60 * 1000);

        await prisma.movimientoInventario.create({
          data: {
            empresa_id: empresa.id,
            almacen_id: alm.id,
            producto_id: prod.id,
            usuario_id: usuarioBodega.id,
            tipo_movimiento: esEntrada ? TipoMovimientoInventario.ENTRADA_COMPRA : TipoMovimientoInventario.SALIDA_DESPACHO,
            cantidad: cantMov,
            costo_unitario: Number(prod.costo_promedio),
            stock_anterior: stockAnt,
            stock_posterior: stockPost,
            referencia_tipo: esEntrada ? 'RECEPCION' : 'DESPACHO_VENTA',
            referencia_id: null,
            motivo: esEntrada ? 'Ingreso por compra y verificación física' : 'Despacho comercial a clientes',
            createdAt: fechaK,
          },
        });
      }
    }

    // J. Evaluaciones de Proveedores (45 por empresa = 135 en total)
    const periodos = ['2025-Q3', '2025-Q4', '2026-Q1'];
    for (const prov of proveedoresGuardados) {
      for (const per of periodos) {
        const otd = 88.0 + (prov.identificador_fiscal.charCodeAt(prov.identificador_fiscal.length - 1) % 12);
        const ofr = 92.0 + (prov.identificador_fiscal.charCodeAt(prov.identificador_fiscal.length - 2) % 8);
        const score = (otd * 0.5 + ofr * 0.5).toFixed(2);
        const catDes = Number(score) >= 95 ? CategoriaDesempeno.EXCELENTE : Number(score) >= 90 ? CategoriaDesempeno.CONFIABLE : CategoriaDesempeno.EN_OBSERVACION;

        await prisma.evaluacionProveedor.upsert({
          where: { uk_evaluacion_empresa_prov_periodo: { empresa_id: empresa.id, proveedor_id: prov.id, periodo: per } },
          update: { calificacion_global: Number(score), categoria_desempeno: catDes },
          create: {
            empresa_id: empresa.id,
            proveedor_id: prov.id,
            periodo: per,
            ordenes_evaluadas: 6,
            indice_puntualidad: otd,
            indice_cumplimiento_cant: ofr,
            indice_incidencias: 98.0,
            indice_precios: 95.0,
            calificacion_global: Number(score),
            categoria_desempeno: catDes,
            observaciones: `Evaluación de desempeño trimestral consolidada para ${prov.nombre_legal}`,
          },
        });
      }
    }

    // K. Incidencias de Proveedores (25 por empresa = 75 en total)
    for (let inc = 1; inc <= 25; inc++) {
      const prov = proveedoresGuardados[inc % proveedoresGuardados.length];
      const ord = ordenesGuardadas[inc % ordenesGuardadas.length];
      const resuelta = inc <= 18;
      const tipos = [TipoIncidencia.RETRASO, TipoIncidencia.FALTANTE, TipoIncidencia.PRODUCTO_DEFECTUOSO, TipoIncidencia.PRECIO_DISCREPANCIA];
      const tipo = tipos[inc % tipos.length];

      const incExiste = await prisma.incidenciaProveedor.findFirst({
        where: { empresa_id: empresa.id, proveedor_id: prov.id, orden_compra_id: ord.id },
      });

      if (!incExiste) {
        await prisma.incidenciaProveedor.create({
          data: {
            empresa_id: empresa.id,
            proveedor_id: prov.id,
            orden_compra_id: ord.id,
            tipo_incidencia: tipo,
            severidad: inc % 4 === 0 ? SeveridadIncidencia.CRITICA : inc % 2 === 0 ? SeveridadIncidencia.ALTA : SeveridadIncidencia.MEDIA,
            descripcion: `Incidencia operativa detectada en entrega de orden #${ord.numero_orden}: ${tipo.toLowerCase().replace('_', ' ')}.`,
            resuelta,
            fecha_resolucion: resuelta ? new Date() : null,
            solucion_aplicada: resuelta ? 'Proveedor envió nota de crédito y lote de reemplazo prioritario.' : null,
          },
        });
      }
    }

    // L. Alertas de Riesgo Operativo (35 por empresa = 105 en total)
    for (let al = 1; al <= 35; al++) {
      const prod = productosGuardados[al % productosGuardados.length];
      const estado = al <= 15 ? 'CRITICO' : al <= 25 ? 'EN_SEGUIMIENTO' : 'RESUELTO';
      const severidad = al % 3 === 0 ? NivelSeveridadAlerta.CRITICO : al % 2 === 0 ? NivelSeveridadAlerta.ADVERTENCIA : NivelSeveridadAlerta.INFO;

      const alertaExiste = await prisma.alertaRiesgo.findFirst({
        where: { empresa_id: empresa.id, recurso_id: prod.id, titulo: `Alerta #${al}: Monitoreo de Stock en ${prod.sku}` },
      });

      if (!alertaExiste) {
        await prisma.alertaRiesgo.create({
          data: {
            empresa_id: empresa.id,
            tipo_riesgo: TipoRiesgo.STOCK_MINIMO,
            nivel_severidad: severidad,
            titulo: `Alerta #${al}: Monitoreo de Stock en ${prod.sku}`,
            mensaje: `El producto ${prod.nombre} presenta un balance operativo proyectado por debajo del umbral mínimo de seguridad.`,
            recurso_tipo: 'PRODUCTO',
            recurso_id: prod.id,
            estado,
            resuelta: estado === 'RESUELTO',
            resuelto_por_id: estado === 'RESUELTO' ? usuarioAdmin.id : null,
            fecha_resolucion: estado === 'RESUELTO' ? new Date() : null,
            accion_resolucion: estado === 'RESUELTO' ? 'Se emitió orden de compra de contingencia y se reabasteció el almacén.' : null,
          },
        });
      }
    }

    // M. Simulaciones de Continuidad What-If (10 por empresa = 30 en total)
    for (let sm = 1; sm <= 10; sm++) {
      const provAfectado = proveedoresGuardados[sm % proveedoresGuardados.length];
      const prodAfectado = productosGuardados[sm % productosGuardados.length];
      const provAlterno = proveedoresGuardados[(sm + 1) % proveedoresGuardados.length];

      const simExiste = await prisma.simulacionContinuidad.findFirst({
        where: { empresa_id: empresa.id, nombre_escenario: `Escenario ${prefix}-${sm}: Disrupción Crítica ${provAfectado.nombre_fantasia}` },
      });

      if (!simExiste) {
        await prisma.simulacionContinuidad.create({
          data: {
            empresa_id: empresa.id,
            creado_por_id: usuarioAdmin.id,
            nombre_escenario: `Escenario ${prefix}-${sm}: Disrupción Crítica ${provAfectado.nombre_fantasia}`,
            descripcion: `Análisis de impacto operativo por retraso severo simulado en cadena de suministro de ${provAfectado.nombre_legal}.`,
            proveedor_afectado_id: provAfectado.id,
            dias_retraso_simulados: 14 + (sm % 10),
            impacto_quiebre_stock_estimado_dias: 6 + (sm % 5),
            sobrecosto_estimado: empresa.moneda_base === Moneda.USD ? 450.0 + sm * 80 : 350000.0 + sm * 65000,
            parametros_json: { diasRetraso: 14 + (sm % 10), proveedorNombre: provAfectado.nombre_legal },
            productos_afectados_json: [
              {
                productoId: prodAfectado.id,
                sku: prodAfectado.sku,
                nombre: prodAfectado.nombre,
                stockActual: 80,
                consumoDiarioEstimado: 12.5,
                diasCobertura: 6,
                sufreQuiebre: true,
                diasDeficit: 8,
                sobrecostoEstimado: empresa.moneda_base === Moneda.USD ? 350.0 : 280000.0,
                tieneAlternativo: true,
              },
            ],
            proveedores_alternos_json: [
              {
                productoId: prodAfectado.id,
                productoNombre: prodAfectado.nombre,
                proveedorAlternoId: provAlterno.id,
                proveedorAlternoNombre: provAlterno.nombre_legal,
                precioAcordado: Number(prodAfectado.costo_promedio) * 1.15,
                diasEntrega: 5,
              },
            ],
          },
        });
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SEMILLA DE ALTO VOLUMEN COMPLETADA EXITOSAMENTE');
  console.log('================================================================');
  console.log('Resumen de datos cargados en MySQL 8:');
  console.log(`- Empresas: ${await prisma.empresa.count()}`);
  console.log(`- Usuarios: ${await prisma.usuario.count()}`);
  console.log(`- Proveedores: ${await prisma.proveedor.count()}`);
  console.log(`- Contactos de Proveedores: ${await prisma.contactoProveedor.count()}`);
  console.log(`- Categorías: ${await prisma.categoria.count()}`);
  console.log(`- Productos: ${await prisma.producto.count()}`);
  console.log(`- Almacenes: ${await prisma.almacen.count()}`);
  console.log(`- Solicitudes de Compra: ${await prisma.solicitudCompra.count()}`);
  console.log(`- Órdenes de Compra: ${await prisma.ordenCompra.count()}`);
  console.log(`- Recepciones: ${await prisma.recepcionCompra.count()}`);
  console.log(`- Movimientos de Inventario (Kardex): ${await prisma.movimientoInventario.count()}`);
  console.log(`- Evaluaciones de Proveedores: ${await prisma.evaluacionProveedor.count()}`);
  console.log(`- Incidencias: ${await prisma.incidenciaProveedor.count()}`);
  console.log(`- Alertas de Riesgo: ${await prisma.alertaRiesgo.count()}`);
  console.log(`- Simulaciones de Continuidad: ${await prisma.simulacionContinuidad.count()}`);
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
