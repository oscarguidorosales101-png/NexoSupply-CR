# 06. Diccionario de Datos Físico — NexoSupply CR

Definición exhaustiva y física de tablas, columnas, tipos de datos en MySQL 8 (InnoDB), restricciones de unicidad e índices para Prisma ORM:

---

### 1. `empresas`
| Columna | Tipo MySQL | Nulo | Restricciones / Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK (UUID) | Identificador único de la empresa |
| `rfc_cedula` | VARCHAR(30) | NO | UNIQUE | Cédula jurídica o tributaria |
| `razon_social` | VARCHAR(150) | NO | | Nombre legal registrado |
| `nombre_comercial`| VARCHAR(150) | NO | | Nombre comercial o marca de fantasía |
| `email_contacto` | VARCHAR(100) | NO | | Correo oficial corporativo |
| `telefono` | VARCHAR(30) | SÍ | | Teléfono principal |
| `direccion` | TEXT | SÍ | | Ubicación física de la sede central |
| `moneda_base` | ENUM('CRC','USD') | NO | DEFAULT 'CRC' | Moneda base de costeo y contabilidad |
| `logo_url` | VARCHAR(255) | SÍ | | URL del isotipo/logotipo corporativo |
| `tema_visual` | VARCHAR(40) | NO | DEFAULT 'CORPORATE_BLUE'| Tema visual UI por defecto |
| `activa` | TINYINT(1) | NO | DEFAULT 1 | Estado operativo de la empresa |
| `created_at` | DATETIME(3) | NO | DEFAULT NOW(3) | Fecha de registro |
| `updated_at` | DATETIME(3) | NO | ON UPDATE NOW(3) | Fecha de última modificación |

### 2. `usuarios`
| Columna | Tipo MySQL | Nulo | Restricciones / Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK (UUID) | Identificador global del usuario |
| `email` | VARCHAR(120) | NO | UNIQUE | Correo de acceso al sistema |
| `password_hash` | VARCHAR(255) | NO | | Hash seguro generado con Bcrypt (salt rounds 10-12) |
| `nombre_completo` | VARCHAR(120) | NO | | Nombre y apellidos del usuario |
| `telefono` | VARCHAR(30) | SÍ | | Teléfono de contacto directo |
| `avatar_url` | VARCHAR(255) | SÍ | | Enlace a la imagen de perfil |
| `es_superadmin` | TINYINT(1) | NO | DEFAULT 0 | Flag de administrador global de plataforma |
| `activo` | TINYINT(1) | NO | DEFAULT 1 | Estado de la cuenta de usuario |
| `created_at` | DATETIME(3) | NO | DEFAULT NOW(3) | Fecha de creación |
| `updated_at` | DATETIME(3) | NO | ON UPDATE NOW(3) | Fecha de modificación |

### 3. `membresias_empresa`
| Columna | Tipo MySQL | Nulo | Restricciones / Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK (UUID) | Identificador de membresía |
| `usuario_id` | VARCHAR(36) | NO | FK -> `usuarios.id` ON DELETE CASCADE | Usuario vinculado |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` ON DELETE CASCADE | Empresa asociada |
| `rol_id` | VARCHAR(36) | NO | FK -> `roles.id` ON DELETE RESTRICT | Rol asignado al usuario en esa empresa |
| `activa` | TINYINT(1) | NO | DEFAULT 1 | Estado de la membresía |
| `created_at` | DATETIME(3) | NO | DEFAULT NOW(3) | Fecha de alta |
| `updated_at` | DATETIME(3) | NO | ON UPDATE NOW(3) | Fecha de actualización |
| *Índices* | | | `UNIQUE(usuario_id, empresa_id)`, `INDEX(empresa_id)`, `INDEX(usuario_id)` | Control estricto de una membresía por par usuario-empresa |

### 4. `roles` y `permisos`
- `roles`: `id` (PK), `empresa_id` (FK nullable), `codigo` (VARCHAR 50), `nombre` (VARCHAR 100), `descripcion`, `es_sistema` (TINYINT 1), `created_at`, `updated_at`.
- `permisos`: `id` (PK), `codigo` (VARCHAR 60 UNIQUE), `modulo` (VARCHAR 50), `descripcion` (VARCHAR 200).
- `roles_permisos`: `id` (PK), `rol_id` (FK), `permiso_id` (FK), `UNIQUE(rol_id, permiso_id)`.

### 5. `proveedores`
| Columna | Tipo MySQL | Nulo | Restricciones / Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK (UUID) | Identificador único del proveedor |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` ON DELETE RESTRICT | Inquilino propietario (Discriminador) |
| `identificador_fiscal`| VARCHAR(50) | NO | | Cédula jurídica o Tax ID |
| `nombre_legal` | VARCHAR(150) | NO | | Razón social oficial |
| `nombre_fantasia`| VARCHAR(150) | SÍ | | Nombre comercial del proveedor |
| `clasificacion` | ENUM('A','B','C') | NO | DEFAULT 'B' | Matriz de criticidad ABC |
| `terminos_pago_dias` | INT | NO | DEFAULT 30 | Plazo de crédito comercial acordado |
| `moneda_preferida` | ENUM('CRC','USD') | NO | DEFAULT 'CRC' | Moneda habitual de cotización |
| `lead_time_promedio_dias` | INT | NO | DEFAULT 7 | Tiempo de entrega contractual estimado |
| `email` | VARCHAR(100) | SÍ | | Correo para envío de órdenes |
| `telefono` | VARCHAR(30) | SÍ | | Teléfono de recepción |
| `direccion` | TEXT | SÍ | | Dirección de despacho/oficinas |
| `activo` | TINYINT(1) | NO | DEFAULT 1 | Si puede ser seleccionado en compras |
| *Índices* | | | `UNIQUE(empresa_id, identificador_fiscal)`, `INDEX(empresa_id, activo)` | Aislamiento y consulta rápida |

### 6. `productos`
| Columna | Tipo MySQL | Nulo | Restricciones / Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK (UUID) | Identificador único del producto |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` ON DELETE RESTRICT | Inquilino propietario |
| `categoria_id` | VARCHAR(36) | SÍ | FK -> `categorias.id` ON DELETE SET NULL | Clasificación interna |
| `unidad_medida_id`| VARCHAR(36) | NO | FK -> `unidades_medida.id` ON DELETE RESTRICT | Unidad física de medición |
| `sku` | VARCHAR(60) | NO | | Código interno único por empresa |
| `codigo_barras` | VARCHAR(60) | SÍ | | Código EAN/UPC opcional |
| `nombre` | VARCHAR(150) | NO | | Nombre comercial del insumo/artículo |
| `descripcion` | TEXT | SÍ | | Especificaciones técnicas |
| `costo_promedio` | DECIMAL(12,4) | NO | DEFAULT 0.0000 | Costo medio ponderado en moneda base |
| `precio_referencia` | DECIMAL(12,2) | NO | DEFAULT 0.00 | Precio referencial de venta/presupuesto |
| `stock_minimo_global` | DECIMAL(12,2) | NO | DEFAULT 0.00 | Punto de reorden para alertas automáticas |
| `stock_seguridad` | DECIMAL(12,2) | NO | DEFAULT 0.00 | Colchón de seguridad para imprevistos |
| `activo` | TINYINT(1) | NO | DEFAULT 1 | Disponibilidad en catálogo |
| *Índices* | | | `UNIQUE(empresa_id, sku)`, `INDEX(empresa_id, activo)`, `INDEX(empresa_id, categoria_id)` | |

### 7. `productos_proveedores` (Relación N:M)
| Columna | Tipo MySQL | Nulo | Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK | |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` | Discriminador empresarial |
| `producto_id` | VARCHAR(36) | NO | FK -> `productos.id` ON DELETE CASCADE | |
| `proveedor_id` | VARCHAR(36) | NO | FK -> `proveedores.id` ON DELETE CASCADE | |
| `codigo_producto_proveedor` | VARCHAR(60) | SÍ | | SKU con que el proveedor factura el ítem |
| `precio_unitario_acordado` | DECIMAL(12,4) | NO | | Precio contractual de compra |
| `moneda` | ENUM('CRC','USD') | NO | | Moneda de compra pactada |
| `dias_entrega_esperados` | INT | NO | DEFAULT 7 | Lead time particular con este proveedor |
| `es_preferido` | TINYINT(1) | NO | DEFAULT 0 | Proveedor predeterminado de reposición |
| *Índices* | | | `UNIQUE(empresa_id, producto_id, proveedor_id)` | |

### 8. `almacenes` e `inventario_stock`
- `almacenes`: `id` (PK), `empresa_id` (FK), `codigo` (VARCHAR 30), `nombre` (VARCHAR 100), `ubicacion`, `responsable`, `es_principal` (TINYINT 1), `activo` (TINYINT 1). `UNIQUE(empresa_id, codigo)`.
- `inventario_stock`: `id` (PK), `empresa_id` (FK), `almacen_id` (FK), `producto_id` (FK), `cantidad_actual` (DECIMAL 12,2 DEFAULT 0.00), `cantidad_reservada` (DECIMAL 12,2 DEFAULT 0.00), `stock_minimo` (DECIMAL 12,2 DEFAULT 0.00), `ubicacion_pasillo` (VARCHAR 60), `updated_at`. `UNIQUE(empresa_id, almacen_id, producto_id)`.

### 9. `movimientos_inventario` (Kardex Físico Inmutable)
| Columna | Tipo MySQL | Nulo | Claves | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | VARCHAR(36) | NO | PK | Identificador inmutable de la transacción |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` | Discriminador multiempresa |
| `almacen_id` | VARCHAR(36) | NO | FK -> `almacenes.id` | Almacén donde ocurre el movimiento |
| `producto_id` | VARCHAR(36) | NO | FK -> `productos.id` | Producto afectado |
| `usuario_id` | VARCHAR(36) | NO | FK -> `usuarios.id` | Usuario responsable de autorizar la transacción |
| `tipo_movimiento` | ENUM | NO | | 'ENTRADA_COMPRA','SALIDA_DESPACHO','ENTRADA_AJUSTE','SALIDA_AJUSTE','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_SALIDA' |
| `cantidad` | DECIMAL(12,2) | NO | | Unidades transferidas |
| `costo_unitario` | DECIMAL(12,4) | NO | | Costo unitario exacto del movimiento |
| `stock_anterior` | DECIMAL(12,2) | NO | | Balance físico antes del movimiento |
| `stock_posterior` | DECIMAL(12,2) | NO | | Balance físico después del movimiento |
| `referencia_tipo` | VARCHAR(50) | NO | | Tipo de documento soporte ('RECEPCION', 'AJUSTE', 'INVENTARIO_INICIAL') |
| `referencia_id` | VARCHAR(36) | SÍ | | ID del documento fuente |
| `motivo` | VARCHAR(255) | NO | | Justificación técnica del movimiento |
| `created_at` | DATETIME(3) | NO | DEFAULT NOW(3) | Marca temporal de auditoría |
| *Índices* | | | `INDEX(empresa_id, producto_id, created_at)`, `INDEX(empresa_id, almacen_id)` | |

### 10. `solicitudes_compra` y `detalles_solicitud`
- `solicitudes_compra`: `id` (PK), `empresa_id` (FK), `solicitante_id` (FK -> `usuarios.id`), `numero_solicitud` (VARCHAR 40), `fecha_solicitud`, `justificacion` (TEXT), `estado` (ENUM 'BORRADOR','PENDIENTE','APROBADA','RECHAZADA','CONVERTIDA_EN_ORDEN','CANCELADA'), `moneda`, `total_estimado` (DECIMAL 12,2). `UNIQUE(empresa_id, numero_solicitud)`.
- `detalles_solicitud`: `id` (PK), `solicitud_id` (FK CASCADE), `producto_id` (FK), `cantidad_solicitada` (DECIMAL 12,2), `precio_unitario_estimado` (DECIMAL 12,4), `subtotal` (DECIMAL 12,2), `observaciones`.

### 11. `ordenes_compra` y `detalles_orden`
- `ordenes_compra`: `id` (PK), `empresa_id` (FK), `solicitud_origen_id` (FK nullable UNIQUE), `proveedor_id` (FK), `almacen_destino_id` (FK), `creada_por_id` (FK), `numero_orden` (VARCHAR 40), `fecha_emision`, `fecha_prometida_entrega`, `estado` (ENUM 'BORRADOR','EMITIDA','EN_TRANSITO','PARCIALMENTE_RECIBIDA','COMPLETADA','CANCELADA'), `moneda`, `tasa_cambio` (DECIMAL 10,4), `subtotal`, `impuestos`, `total`, `condiciones_pago`, `notas`. `UNIQUE(empresa_id, numero_orden)`.
- `detalles_orden`: `id` (PK), `orden_id` (FK CASCADE), `producto_id` (FK), `cantidad_ordenada` (DECIMAL 12,2), `cantidad_recibida` (DECIMAL 12,2 DEFAULT 0.00), `precio_unitario` (DECIMAL 12,4), `porcentaje_descuento`, `impuesto_porcentaje` (DECIMAL 5,2 DEFAULT 13.00), `subtotal` (DECIMAL 12,2).

### 12. `recepciones_compra` y `detalles_recepcion`
- `recepciones_compra`: `id` (PK), `empresa_id` (FK), `orden_compra_id` (FK), `almacen_id` (FK), `recibido_por_id` (FK), `numero_recepcion` (VARCHAR 40), `numero_guia_factura`, `fecha_recepcion`, `observaciones`, `estado` (ENUM 'CONFORME','CON_DIFERENCIAS','RECHAZADA'). `UNIQUE(empresa_id, numero_recepcion)`.
- `detalles_recepcion`: `id` (PK), `recepcion_id` (FK CASCADE), `detalle_orden_id` (FK), `producto_id` (FK), `cantidad_recibida` (DECIMAL 12,2), `cantidad_rechazada` (DECIMAL 12,2 DEFAULT 0.00), `motivo_rechazo`, `costo_unitario_real` (DECIMAL 12,4).

### 13. `evaluaciones_proveedor` e `incidencias_proveedor`
- `evaluaciones_proveedor`: `id` (PK), `empresa_id` (FK), `proveedor_id` (FK), `periodo` (VARCHAR 20, ej '2026-11'), `ordenes_evaluadas`, `indice_puntualidad` (DECIMAL 5,2), `indice_cumplimiento_cant` (DECIMAL 5,2), `indice_incidencias` (DECIMAL 5,2), `indice_precios` (DECIMAL 5,2), `calificacion_global` (DECIMAL 5,2), `categoria_desempeno` (ENUM 'EXCELENTE','CONFIABLE','EN_OBSERVACION','CRITICO'), `observaciones`. `UNIQUE(empresa_id, proveedor_id, periodo)`.
- `incidencias_proveedor`: `id` (PK), `empresa_id` (FK), `proveedor_id` (FK), `orden_compra_id` (FK nullable), `recepcion_id` (FK nullable), `tipo_incidencia` (ENUM 'RETRASO','FALTANTE','PRODUCTO_DEFECTUOSO','PRECIO_DISCREPANCIA','DOCUMENTACION_INCORRECTA'), `severidad` (ENUM 'BAJA','MEDIA','ALTA','CRITICA'), `descripcion`, `costo_impacto_estimado` (DECIMAL 12,2), `resuelta` (TINYINT 1), `fecha_resolucion`, `solucion_aplicada`.

### 14. `historial_precios`, `alertas_riesgo` y `simulaciones_continuidad`
- `historial_precios`: `id` (PK), `empresa_id` (FK), `producto_id` (FK), `proveedor_id` (FK), `orden_compra_id` (FK nullable), `precio_unitario` (DECIMAL 12,4), `moneda`, `fecha_vigencia`, `motivo_cambio`.
- `alertas_riesgo`: `id` (PK), `empresa_id` (FK), `tipo_riesgo` (ENUM 'STOCK_MINIMO','RETRASO_PROVEEDOR','CONCENTRACION_PROVEEDOR','FLUCTUACION_PRECIO'), `nivel_severidad` (ENUM 'INFO','ADVERTENCIA','CRITICO'), `titulo`, `mensaje`, `recurso_tipo`, `recurso_id`, `leida` (TINYINT 1), `resuelta` (TINYINT 1).
- `simulaciones_continuidad`: `id` (PK), `empresa_id` (FK), `creado_por_id` (FK), `nombre_escenario`, `descripcion`, `proveedor_afectado_id` (FK), `dias_retraso_simulados`, `parametros_json` (JSON), `productos_afectados_json` (JSON), `impacto_quiebre_stock_estimado_dias`, `proveedores_alternos_json` (JSON), `sobrecosto_estimado` (DECIMAL 12,2), `fecha_simulacion`.
