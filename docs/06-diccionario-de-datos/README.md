# 06. Diccionario de Datos — NexoSupply CR

Definición exhaustiva de tablas y campos para MySQL 8 / Prisma ORM:

---

### 1. `empresas`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | Identificador único (UUID) |
| `rfc_cedula` | VARCHAR(30) | NO | Cédula jurídica o identificación fiscal (Único) |
| `razon_social` | VARCHAR(150) | NO | Nombre legal de la compañía |
| `nombre_comercial`| VARCHAR(150) | NO | Nombre de fantasía o marca comercial |
| `email_contacto` | VARCHAR(100) | NO | Correo oficial de la empresa |
| `telefono` | VARCHAR(30) | SÍ | Teléfono principal |
| `direccion` | TEXT | SÍ | Dirección física / fiscal |
| `moneda_base` | VARCHAR(3) | NO | Moneda principal: 'CRC' o 'USD' (default 'CRC') |
| `activa` | BOOLEAN | NO | Estado operativo de la empresa (default true) |
| `created_at` | DATETIME(3) | NO | Fecha de creación del registro |
| `updated_at` | DATETIME(3) | NO | Fecha de última modificación |

### 2. `usuarios`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | UUID único de usuario |
| `email` | VARCHAR(120) | NO | Correo electrónico de acceso (Único global) |
| `password_hash` | VARCHAR(255) | NO | Hash Bcrypt/Argon2 con salt de alta seguridad |
| `nombre_completo` | VARCHAR(120) | NO | Nombres y apellidos |
| `telefono` | VARCHAR(30) | SÍ | Teléfono de contacto |
| `avatar_url` | VARCHAR(255) | SÍ | Enlace al avatar o imagen de perfil |
| `es_superadmin` | BOOLEAN | NO | Flag de administrador de plataforma (default false) |
| `activo` | BOOLEAN | NO | Estado de la cuenta de usuario (default true) |
| `created_at` | DATETIME(3) | NO | Fecha de registro |
| `updated_at` | DATETIME(3) | NO | Fecha de actualización |

### 3. `membresias_empresa`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | UUID de membresía |
| `usuario_id` | VARCHAR(36) | NO | FK -> `usuarios.id` |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` |
| `rol_id` | VARCHAR(36) | NO | FK -> `roles.id` |
| `activa` | BOOLEAN | NO | Estado de la membresía en esa empresa |
| `created_at` | DATETIME(3) | NO | Fecha de vinculación |
| *Restricción* | UNIQUE | NO | `UNIQUE(usuario_id, empresa_id)` |

### 4. `proveedores`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | UUID del proveedor |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` (Tenant discriminator) |
| `identificador_fiscal`| VARCHAR(50)| NO | Cédula jurídica o tax ID |
| `nombre_legal` | VARCHAR(150) | NO | Razón social del proveedor |
| `nombre_fantasia` | VARCHAR(150) | SÍ | Nombre comercial |
| `clasificacion` | ENUM | NO | 'A', 'B', 'C' (Importancia estratégica) |
| `terminos_pago_dias` | INT | NO | Días de crédito acordados (default 30) |
| `moneda_preferida` | VARCHAR(3) | NO | 'CRC' o 'USD' |
| `lead_time_promedio_dias`| INT | NO | Días promedio comprometidos de entrega |
| `activo` | BOOLEAN | NO | Si puede ser usado en nuevas órdenes |
| `created_at` | DATETIME(3) | NO | Fecha de alta |
| *Restricción* | UNIQUE | NO | `UNIQUE(empresa_id, identificador_fiscal)` |

### 5. `productos`
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | UUID del producto |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` (Tenant discriminator) |
| `categoria_id` | VARCHAR(36) | SÍ | FK -> `categorias.id` |
| `sku` | VARCHAR(60) | NO | Código interno de inventario |
| `codigo_barras` | VARCHAR(60) | SÍ | EAN-13 o UPC |
| `nombre` | VARCHAR(150) | NO | Nombre del producto |
| `descripcion` | TEXT | SÍ | Especificaciones técnicas |
| `unidad_medida` | VARCHAR(30) | NO | 'UNIDAD', 'KILO', 'METRO', 'LITRO', 'CAJA' |
| `costo_promedio` | DECIMAL(12,4)| NO | Costo promedio unitario en moneda base |
| `precio_referencia`| DECIMAL(12,2)| NO | Precio referencial de venta o reposición |
| `stock_minimo_global`| DECIMAL(12,2)| NO | Umbral de alerta para reposición |
| `activo` | BOOLEAN | NO | Estado del producto |
| *Restricción* | UNIQUE | NO | `UNIQUE(empresa_id, sku)` |

### 6. `productos_proveedores` (Relación N:M)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | NO | UUID del registro |
| `empresa_id` | VARCHAR(36) | NO | FK -> `empresas.id` |
| `producto_id` | VARCHAR(36) | NO | FK -> `productos.id` |
| `proveedor_id` | VARCHAR(36) | NO | FK -> `proveedores.id` |
| `codigo_producto_proveedor` | VARCHAR(60) | SÍ | Código con que el proveedor lo vende |
| `precio_unitario_acordado` | DECIMAL(12,4) | NO | Precio de compra negociado |
| `moneda` | VARCHAR(3) | NO | 'CRC' o 'USD' |
| `dias_entrega_esperados` | INT | NO | Lead time contractual |
| `es_proveedor_preferido` | BOOLEAN | NO | Flag de prioridad |
| *Restricción* | UNIQUE | NO | `UNIQUE(empresa_id, producto_id, proveedor_id)` |

### 7. `solicitudes_compra` y `detalles_solicitud`
- `solicitudes_compra`: `id`, `empresa_id`, `numero_solicitud`, `solicitante_id`, `fecha_solicitud`, `justificacion`, `estado` (BORRADOR, PENDIENTE, APROBADA, RECHAZADA, CONVERTIDA_EN_ORDEN), `total_estimado`, `moneda`.
- `detalles_solicitud`: `id`, `solicitud_id`, `producto_id`, `cantidad_solicitada`, `precio_unitario_estimado`, `subtotal`.

### 8. `ordenes_compra` y `detalles_orden`
- `ordenes_compra`: `id`, `empresa_id`, `solicitud_origen_id` (opcional), `proveedor_id`, `almacen_destino_id`, `numero_orden`, `fecha_emision`, `fecha_prometida_entrega`, `estado` (BORRADOR, EMITIDA, EN_TRANSITO, PARCIALMENTE_RECIBIDA, COMPLETADA, CANCELADA), `subtotal`, `impuestos`, `total`, `moneda`, `tasa_cambio`, `condiciones_pago`.
- `detalles_orden`: `id`, `orden_id`, `producto_id`, `cantidad_ordenada`, `cantidad_recibida`, `precio_unitario`, `subtotal`.

### 9. `recepciones_compra` y `detalles_recepcion`
- `recepciones_compra`: `id`, `empresa_id`, `orden_compra_id`, `almacen_id`, `recibido_por_id`, `numero_recepcion`, `numero_guia_factura`, `fecha_recepcion`, `observaciones`, `estado` (CONFORME, CON_DIFERENCIAS, RECHAZADA).
- `detalles_recepcion`: `id`, `recepcion_id`, `detalle_orden_id`, `producto_id`, `cantidad_recibida`, `cantidad_rechazada`, `motivo_rechazo`.

### 10. `almacenes`, `inventario_stock` y `movimientos_inventario` (Kardex)
- `almacenes`: `id`, `empresa_id`, `codigo`, `nombre`, `ubicacion`, `es_principal`, `activo`.
- `inventario_stock`: `id`, `empresa_id`, `almacen_id`, `producto_id`, `cantidad_actual`, `cantidad_reservada`, `stock_minimo`, `ubicacion_pasillo`.
- `movimientos_inventario`: `id`, `empresa_id`, `almacen_id`, `producto_id`, `usuario_id`, `tipo_movimiento` (ENTRADA_COMPRA, SALIDA_AJUSTE, ENTRADA_AJUSTE, SALIDA_DESPACHO, TRANSFERENCIA), `cantidad`, `costo_unitario`, `stock_anterior`, `stock_posterior`, `referencia_tipo` ('RECEPCION', 'AJUSTE', 'ORDEN'), `referencia_id`, `motivo`, `fecha`.

### 11. `evaluaciones_proveedor` y `incidencias_proveedor`
- `evaluaciones_proveedor`: `id`, `empresa_id`, `proveedor_id`, `periodo` (YYYY-MM o trimestral), `ordenes_evaluadas`, `indice_puntualidad`, `indice_cumplimiento_cant`, `indice_incidencias`, `indice_precios`, `calificacion_global`, `categoria_desempeno`.
- `incidencias_proveedor`: `id`, `empresa_id`, `proveedor_id`, `orden_compra_id` (opcional), `recepcion_id` (opcional), `tipo_incidencia` (RETRASO, FALTANTE, PRODUCTO_DEFECTUOSO, PRECIO_DISCREPANCIA), `severidad` (BAJA, MEDIA, ALTA, CRITICA), `descripcion`, `costo_impacto_estimado`, `resuelta`, `fecha_resolucion`.

### 12. `simulaciones_continuidad`
- `id`, `empresa_id`, `creado_por_id`, `nombre_escenario`, `proveedor_afectado_id`, `dias_retraso_simulados`, `productos_afectados_json`, `impacto_quiebre_stock_estimado_dias`, `proveedores_alternos_json`, `sobrecosto_estimado`, `fecha_simulacion`.

### 13. `registros_auditoria`
- `id`, `empresa_id` (opcional si es acción de superadmin), `usuario_id`, `accion` (CREATE, UPDATE, DELETE, APROBACION, RECEPCION, LOGIN), `entidad` ('ORDEN_COMPRA', 'INVENTARIO', 'USUARIO'), `entidad_id`, `datos_anteriores_json`, `datos_nuevos_json`, `ip_origen`, `user_agent`, `created_at`.
