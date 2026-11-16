-- CreateTable
CREATE TABLE `empresas` (
    `id` VARCHAR(36) NOT NULL,
    `rfc_cedula` VARCHAR(30) NOT NULL,
    `razon_social` VARCHAR(150) NOT NULL,
    `nombre_comercial` VARCHAR(150) NOT NULL,
    `email_contacto` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `direccion` TEXT NULL,
    `moneda_base` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `logo_url` VARCHAR(255) NULL,
    `tema_visual` VARCHAR(40) NOT NULL DEFAULT 'CORPORATE_BLUE',
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresas_rfc_cedula_key`(`rfc_cedula`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `nombre_completo` VARCHAR(120) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `avatar_url` VARCHAR(255) NULL,
    `es_superadmin` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membresias_empresa` (
    `id` VARCHAR(36) NOT NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `rol_id` VARCHAR(36) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_membresia_empresa`(`empresa_id`),
    INDEX `idx_membresia_usuario`(`usuario_id`),
    UNIQUE INDEX `membresias_empresa_usuario_id_empresa_id_key`(`usuario_id`, `empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NULL,
    `codigo` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `es_sistema` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_empresa_id_codigo_key`(`empresa_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `id` VARCHAR(36) NOT NULL,
    `codigo` VARCHAR(60) NOT NULL,
    `modulo` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(200) NOT NULL,

    UNIQUE INDEX `permisos_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles_permisos` (
    `id` VARCHAR(36) NOT NULL,
    `rol_id` VARCHAR(36) NOT NULL,
    `permiso_id` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `roles_permisos_rol_id_permiso_id_key`(`rol_id`, `permiso_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitaciones_empresa` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `rol_id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(120) NOT NULL,
    `estado` ENUM('PENDIENTE', 'ACEPTADA', 'EXPIRADA', 'REVOCADA') NOT NULL DEFAULT 'PENDIENTE',
    `expira_en` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invitaciones_empresa_token_key`(`token`),
    INDEX `idx_invitacion_empresa_email`(`empresa_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuraciones_empresa` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `monto_max_autoaprobacion` DECIMAL(12, 2) NOT NULL DEFAULT 500000.00,
    `tolerancia_sobrentrega_porc` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `dias_credito_default` INTEGER NOT NULL DEFAULT 30,
    `notificar_alertas_stock` BOOLEAN NOT NULL DEFAULT true,
    `notificar_retrasos` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuraciones_empresa_empresa_id_key`(`empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedores` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `identificador_fiscal` VARCHAR(50) NOT NULL,
    `nombre_legal` VARCHAR(150) NOT NULL,
    `nombre_fantasia` VARCHAR(150) NULL,
    `clasificacion` ENUM('A', 'B', 'C') NOT NULL DEFAULT 'B',
    `terminos_pago_dias` INTEGER NOT NULL DEFAULT 30,
    `moneda_preferida` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `lead_time_promedio_dias` INTEGER NOT NULL DEFAULT 7,
    `email` VARCHAR(100) NULL,
    `telefono` VARCHAR(30) NULL,
    `direccion` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_proveedor_empresa_activo`(`empresa_id`, `activo`),
    UNIQUE INDEX `proveedores_empresa_id_identificador_fiscal_key`(`empresa_id`, `identificador_fiscal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contactos_proveedores` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `nombre` VARCHAR(120) NOT NULL,
    `cargo` VARCHAR(80) NULL,
    `email` VARCHAR(100) NULL,
    `telefono` VARCHAR(30) NULL,
    `es_principal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_contacto_empresa_proveedor`(`empresa_id`, `proveedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categorias_empresa_id_codigo_key`(`empresa_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unidades_medida` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `codigo` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `simbolo` VARCHAR(10) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unidades_medida_empresa_id_codigo_key`(`empresa_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `categoria_id` VARCHAR(36) NULL,
    `unidad_medida_id` VARCHAR(36) NOT NULL,
    `sku` VARCHAR(60) NOT NULL,
    `codigo_barras` VARCHAR(60) NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `costo_promedio` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `precio_referencia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `stock_minimo_global` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `stock_seguridad` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_producto_empresa_activo`(`empresa_id`, `activo`),
    INDEX `idx_producto_empresa_categoria`(`empresa_id`, `categoria_id`),
    UNIQUE INDEX `productos_empresa_id_sku_key`(`empresa_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos_proveedores` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `codigo_producto_proveedor` VARCHAR(60) NULL,
    `precio_unitario_acordado` DECIMAL(12, 4) NOT NULL,
    `moneda` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `dias_entrega_esperados` INTEGER NOT NULL DEFAULT 7,
    `es_preferido` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_pp_empresa_producto`(`empresa_id`, `producto_id`),
    INDEX `idx_pp_empresa_proveedor`(`empresa_id`, `proveedor_id`),
    UNIQUE INDEX `productos_proveedores_empresa_id_producto_id_proveedor_id_key`(`empresa_id`, `producto_id`, `proveedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitudes_compra` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `solicitante_id` VARCHAR(36) NOT NULL,
    `numero_solicitud` VARCHAR(40) NOT NULL,
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `justificacion` TEXT NOT NULL,
    `estado` ENUM('BORRADOR', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'CONVERTIDA_EN_ORDEN', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `moneda` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `total_estimado` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_solicitud_empresa_estado`(`empresa_id`, `estado`),
    UNIQUE INDEX `solicitudes_compra_empresa_id_numero_solicitud_key`(`empresa_id`, `numero_solicitud`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalles_solicitud` (
    `id` VARCHAR(36) NOT NULL,
    `solicitud_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `cantidad_solicitada` DECIMAL(12, 2) NOT NULL,
    `precio_unitario_estimado` DECIMAL(12, 4) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `observaciones` VARCHAR(255) NULL,

    INDEX `idx_det_solicitud_id`(`solicitud_id`),
    INDEX `idx_det_solicitud_producto`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aprobaciones_solicitud` (
    `id` VARCHAR(36) NOT NULL,
    `solicitud_id` VARCHAR(36) NOT NULL,
    `aprobador_id` VARCHAR(36) NOT NULL,
    `decision` ENUM('APROBADA', 'RECHAZADA') NOT NULL,
    `comentario` TEXT NULL,
    `fecha_decision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_aprobacion_solicitud`(`solicitud_id`),
    INDEX `idx_aprobacion_usuario`(`aprobador_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_compra` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `solicitud_origen_id` VARCHAR(36) NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `almacen_destino_id` VARCHAR(36) NOT NULL,
    `creada_por_id` VARCHAR(36) NOT NULL,
    `numero_orden` VARCHAR(40) NOT NULL,
    `fecha_emision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_prometida_entrega` DATETIME(3) NOT NULL,
    `estado` ENUM('BORRADOR', 'EMITIDA', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDA', 'COMPLETADA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
    `moneda` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `tasa_cambio` DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `impuestos` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `condiciones_pago` VARCHAR(120) NULL,
    `notas` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ordenes_compra_solicitud_origen_id_key`(`solicitud_origen_id`),
    INDEX `idx_orden_empresa_estado`(`empresa_id`, `estado`),
    INDEX `idx_orden_empresa_proveedor`(`empresa_id`, `proveedor_id`),
    UNIQUE INDEX `ordenes_compra_empresa_id_numero_orden_key`(`empresa_id`, `numero_orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalles_orden` (
    `id` VARCHAR(36) NOT NULL,
    `orden_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `cantidad_ordenada` DECIMAL(12, 2) NOT NULL,
    `cantidad_recibida` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `porcentaje_descuento` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `impuesto_porcentaje` DECIMAL(5, 2) NOT NULL DEFAULT 13.00,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `idx_det_orden_id`(`orden_id`),
    INDEX `idx_det_orden_producto`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `almacenes` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `ubicacion` VARCHAR(200) NULL,
    `responsable` VARCHAR(120) NULL,
    `es_principal` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_almacen_empresa_activo`(`empresa_id`, `activo`),
    UNIQUE INDEX `almacenes_empresa_id_codigo_key`(`empresa_id`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventario_stock` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `almacen_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `cantidad_actual` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cantidad_reservada` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `stock_minimo` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `ubicacion_pasillo` VARCHAR(60) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_inv_empresa_producto`(`empresa_id`, `producto_id`),
    INDEX `idx_inv_empresa_almacen`(`empresa_id`, `almacen_id`),
    UNIQUE INDEX `inventario_stock_empresa_id_almacen_id_producto_id_key`(`empresa_id`, `almacen_id`, `producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_inventario` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `almacen_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `tipo_movimiento` ENUM('ENTRADA_COMPRA', 'SALIDA_DESPACHO', 'ENTRADA_AJUSTE', 'SALIDA_AJUSTE', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA') NOT NULL,
    `cantidad` DECIMAL(12, 2) NOT NULL,
    `costo_unitario` DECIMAL(12, 4) NOT NULL,
    `stock_anterior` DECIMAL(12, 2) NOT NULL,
    `stock_posterior` DECIMAL(12, 2) NOT NULL,
    `referencia_tipo` VARCHAR(50) NOT NULL,
    `referencia_id` VARCHAR(36) NULL,
    `motivo` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_kardex_empresa_prod_fecha`(`empresa_id`, `producto_id`, `created_at`),
    INDEX `idx_kardex_empresa_almacen`(`empresa_id`, `almacen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recepciones_compra` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `orden_compra_id` VARCHAR(36) NOT NULL,
    `almacen_id` VARCHAR(36) NOT NULL,
    `recibido_por_id` VARCHAR(36) NOT NULL,
    `numero_recepcion` VARCHAR(40) NOT NULL,
    `numero_guia_factura` VARCHAR(80) NULL,
    `fecha_recepcion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observaciones` TEXT NULL,
    `estado` ENUM('CONFORME', 'CON_DIFERENCIAS', 'RECHAZADA') NOT NULL DEFAULT 'CONFORME',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_recepcion_empresa_orden`(`empresa_id`, `orden_compra_id`),
    UNIQUE INDEX `recepciones_compra_empresa_id_numero_recepcion_key`(`empresa_id`, `numero_recepcion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detalles_recepcion` (
    `id` VARCHAR(36) NOT NULL,
    `recepcion_id` VARCHAR(36) NOT NULL,
    `detalle_orden_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `cantidad_recibida` DECIMAL(12, 2) NOT NULL,
    `cantidad_rechazada` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `motivo_rechazo` VARCHAR(255) NULL,
    `costo_unitario_real` DECIMAL(12, 4) NOT NULL,

    INDEX `idx_det_recepcion_id`(`recepcion_id`),
    INDEX `idx_det_recepcion_orden_det`(`detalle_orden_id`),
    INDEX `idx_det_recepcion_producto`(`producto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluaciones_proveedor` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `periodo` VARCHAR(20) NOT NULL,
    `ordenes_evaluadas` INTEGER NOT NULL DEFAULT 0,
    `indice_puntualidad` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `indice_cumplimiento_cant` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `indice_incidencias` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `indice_precios` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `calificacion_global` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `categoria_desempeno` ENUM('EXCELENTE', 'CONFIABLE', 'EN_OBSERVACION', 'CRITICO') NOT NULL DEFAULT 'EXCELENTE',
    `observaciones` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_eval_empresa_score`(`empresa_id`, `calificacion_global`),
    UNIQUE INDEX `evaluaciones_proveedor_empresa_id_proveedor_id_periodo_key`(`empresa_id`, `proveedor_id`, `periodo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidencias_proveedor` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `orden_compra_id` VARCHAR(36) NULL,
    `recepcion_id` VARCHAR(36) NULL,
    `tipo_incidencia` ENUM('RETRASO', 'FALTANTE', 'PRODUCTO_DEFECTUOSO', 'PRECIO_DISCREPANCIA', 'DOCUMENTACION_INCORRECTA') NOT NULL,
    `severidad` ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    `descripcion` TEXT NOT NULL,
    `costo_impacto_estimado` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `resuelta` BOOLEAN NOT NULL DEFAULT false,
    `fecha_resolucion` DATETIME(3) NULL,
    `solucion_aplicada` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_incidencia_empresa_proveedor`(`empresa_id`, `proveedor_id`),
    INDEX `idx_incidencia_empresa_resuelta`(`empresa_id`, `resuelta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_precios` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `producto_id` VARCHAR(36) NOT NULL,
    `proveedor_id` VARCHAR(36) NOT NULL,
    `orden_compra_id` VARCHAR(36) NULL,
    `precio_unitario` DECIMAL(12, 4) NOT NULL,
    `moneda` ENUM('CRC', 'USD') NOT NULL DEFAULT 'CRC',
    `fecha_vigencia` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivo_cambio` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_hp_empresa_prod_fecha`(`empresa_id`, `producto_id`, `fecha_vigencia`),
    INDEX `idx_hp_empresa_proveedor`(`empresa_id`, `proveedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alertas_riesgo` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `tipo_riesgo` ENUM('STOCK_MINIMO', 'RETRASO_PROVEEDOR', 'CONCENTRACION_PROVEEDOR', 'FLUCTUACION_PRECIO') NOT NULL,
    `nivel_severidad` ENUM('INFO', 'ADVERTENCIA', 'CRITICO') NOT NULL DEFAULT 'ADVERTENCIA',
    `titulo` VARCHAR(150) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `recurso_tipo` VARCHAR(40) NOT NULL,
    `recurso_id` VARCHAR(36) NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `resuelta` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_alerta_empresa_estado`(`empresa_id`, `resuelta`, `nivel_severidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `simulaciones_continuidad` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `creado_por_id` VARCHAR(36) NOT NULL,
    `nombre_escenario` VARCHAR(120) NOT NULL,
    `descripcion` TEXT NULL,
    `proveedor_afectado_id` VARCHAR(36) NOT NULL,
    `dias_retraso_simulados` INTEGER NOT NULL,
    `parametros_json` JSON NOT NULL,
    `productos_afectados_json` JSON NOT NULL,
    `impacto_quiebre_stock_estimado_dias` INTEGER NOT NULL,
    `proveedores_alternos_json` JSON NOT NULL,
    `sobrecosto_estimado` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `fecha_simulacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_sim_empresa_fecha`(`empresa_id`, `fecha_simulacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_auditoria` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `accion` ENUM('CREATE', 'UPDATE', 'DELETE', 'APROBACION', 'RECHAZO', 'RECEPCION', 'AJUSTE_KARDEX', 'LOGIN', 'SWITCH_TENANT') NOT NULL,
    `entidad` VARCHAR(60) NOT NULL,
    `entidad_id` VARCHAR(36) NOT NULL,
    `datos_anteriores_json` JSON NULL,
    `datos_nuevos_json` JSON NULL,
    `ip_origen` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_auditoria_empresa_entidad`(`empresa_id`, `entidad`, `created_at`),
    INDEX `idx_auditoria_usuario_fecha`(`usuario_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_empresa` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `tipo_documento` ENUM('POLITICA_COMPRAS', 'CONTRATO_PROVEEDOR', 'COTIZACION', 'FICHA_TECNICA', 'OTRO') NOT NULL DEFAULT 'POLITICA_COMPRAS',
    `archivo_url` VARCHAR(255) NULL,
    `contenido_texto` LONGTEXT NULL,
    `metadata_json` JSON NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_doc_empresa_tipo`(`empresa_id`, `tipo_documento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultas_chatbot_log` (
    `id` VARCHAR(36) NOT NULL,
    `empresa_id` VARCHAR(36) NOT NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `pregunta` TEXT NOT NULL,
    `respuesta_resumen` TEXT NULL,
    `tokens_usados` INTEGER NOT NULL DEFAULT 0,
    `fue_exitosa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_chatbot_empresa_fecha`(`empresa_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `membresias_empresa` ADD CONSTRAINT `membresias_empresa_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membresias_empresa` ADD CONSTRAINT `membresias_empresa_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membresias_empresa` ADD CONSTRAINT `membresias_empresa_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles_permisos` ADD CONSTRAINT `roles_permisos_permiso_id_fkey` FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitaciones_empresa` ADD CONSTRAINT `invitaciones_empresa_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitaciones_empresa` ADD CONSTRAINT `invitaciones_empresa_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuraciones_empresa` ADD CONSTRAINT `configuraciones_empresa_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proveedores` ADD CONSTRAINT `proveedores_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactos_proveedores` ADD CONSTRAINT `contactos_proveedores_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contactos_proveedores` ADD CONSTRAINT `contactos_proveedores_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unidades_medida` ADD CONSTRAINT `unidades_medida_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_unidad_medida_id_fkey` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos_proveedores` ADD CONSTRAINT `productos_proveedores_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos_proveedores` ADD CONSTRAINT `productos_proveedores_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos_proveedores` ADD CONSTRAINT `productos_proveedores_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_compra` ADD CONSTRAINT `solicitudes_compra_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_compra` ADD CONSTRAINT `solicitudes_compra_solicitante_id_fkey` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_solicitud` ADD CONSTRAINT `detalles_solicitud_solicitud_id_fkey` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_solicitud` ADD CONSTRAINT `detalles_solicitud_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aprobaciones_solicitud` ADD CONSTRAINT `aprobaciones_solicitud_solicitud_id_fkey` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes_compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aprobaciones_solicitud` ADD CONSTRAINT `aprobaciones_solicitud_aprobador_id_fkey` FOREIGN KEY (`aprobador_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_solicitud_origen_id_fkey` FOREIGN KEY (`solicitud_origen_id`) REFERENCES `solicitudes_compra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_almacen_destino_id_fkey` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_compra` ADD CONSTRAINT `ordenes_compra_creada_por_id_fkey` FOREIGN KEY (`creada_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_orden` ADD CONSTRAINT `detalles_orden_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_orden` ADD CONSTRAINT `detalles_orden_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `almacenes` ADD CONSTRAINT `almacenes_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_stock` ADD CONSTRAINT `inventario_stock_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_stock` ADD CONSTRAINT `inventario_stock_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_stock` ADD CONSTRAINT `inventario_stock_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `recepciones_compra_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `recepciones_compra_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `recepciones_compra_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `recepciones_compra_recibido_por_id_fkey` FOREIGN KEY (`recibido_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_recepcion` ADD CONSTRAINT `detalles_recepcion_recepcion_id_fkey` FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones_compra`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_recepcion` ADD CONSTRAINT `detalles_recepcion_detalle_orden_id_fkey` FOREIGN KEY (`detalle_orden_id`) REFERENCES `detalles_orden`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detalles_recepcion` ADD CONSTRAINT `detalles_recepcion_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluaciones_proveedor` ADD CONSTRAINT `evaluaciones_proveedor_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluaciones_proveedor` ADD CONSTRAINT `evaluaciones_proveedor_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidencias_proveedor` ADD CONSTRAINT `incidencias_proveedor_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidencias_proveedor` ADD CONSTRAINT `incidencias_proveedor_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidencias_proveedor` ADD CONSTRAINT `incidencias_proveedor_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incidencias_proveedor` ADD CONSTRAINT `incidencias_proveedor_recepcion_id_fkey` FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones_compra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_precios` ADD CONSTRAINT `historial_precios_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_precios` ADD CONSTRAINT `historial_precios_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_precios` ADD CONSTRAINT `historial_precios_proveedor_id_fkey` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_precios` ADD CONSTRAINT `historial_precios_orden_compra_id_fkey` FOREIGN KEY (`orden_compra_id`) REFERENCES `ordenes_compra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_riesgo` ADD CONSTRAINT `alertas_riesgo_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `simulaciones_continuidad` ADD CONSTRAINT `simulaciones_continuidad_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `simulaciones_continuidad` ADD CONSTRAINT `simulaciones_continuidad_creado_por_id_fkey` FOREIGN KEY (`creado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `simulaciones_continuidad` ADD CONSTRAINT `simulaciones_continuidad_proveedor_afectado_id_fkey` FOREIGN KEY (`proveedor_afectado_id`) REFERENCES `proveedores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_auditoria` ADD CONSTRAINT `registros_auditoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_empresa` ADD CONSTRAINT `documentos_empresa_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultas_chatbot_log` ADD CONSTRAINT `consultas_chatbot_log_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultas_chatbot_log` ADD CONSTRAINT `consultas_chatbot_log_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
