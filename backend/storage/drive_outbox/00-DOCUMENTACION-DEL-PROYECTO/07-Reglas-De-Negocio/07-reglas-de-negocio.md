# 07. Reglas de Negocio Oficiales — NexoSupply CR

El esquema de base de datos en MySQL 8 y Prisma ORM garantiza a nivel de integridad física y transaccional el cumplimiento de las siguientes reglas de negocio:

---

### RN-01. Unicidad de Proveedores en Contexto Empresarial
- **Implementación Física**: Restricción `@@unique([empresa_id, identificador_fiscal])` en tabla `proveedores`.
- **Efecto**: Impide duplicados de un mismo proveedor dentro de una misma empresa, pero permite que dos empresas distintas compartan o contraten al mismo proveedor con condiciones comerciales totalmente independientes.

### RN-02. Restricción de Proveedores Inactivos
- **Implementación Física**: Columna `activo BOOLEAN DEFAULT true` con índice `@@index([empresa_id, activo])`.
- **Efecto**: Los servicios de backend y Prisma Client filtran `activo = true` al generar órdenes y solicitudes de compra.

### RN-03. Integridad Mínima de Solicitud de Compra
- **Implementación Física**: Clave foránea `solicitud_id` en `detalles_solicitud` vinculada en cascada a `solicitudes_compra`. Toda solicitud requiere al menos un detalle con `cantidad_solicitada > 0` y `precio_unitario_estimado >= 0`.

### RN-04. Aprobación Previa Obligatoria de Solicitudes
- **Implementación Física**: Enum `EstadoSolicitudCompra` (`PENDIENTE`, `APROBADA`, etc.). Relación 1:1 opcional entre `SolicitudCompra` y `OrdenCompra` (`solicitud_origen_id UNIQUE`). Solo solicitudes con estado `APROBADA` admiten la creación de su orden derivada.

### RN-05. Recepción Parcial Permitida y Control de Saldos
- **Implementación Física**: Columnas `cantidad_ordenada` y `cantidad_recibida` en `detalles_orden`.
- **Efecto**: Cada registro en `detalles_recepcion` incrementa `cantidad_recibida`. Cuando $\sum \text{cantidad\_recibida} < \sum \text{cantidad\_ordenada}$, el estado de la orden es `PARCIALMENTE_RECIBIDA`. Al completarse, el estado transiciona a `COMPLETADA`.

### RN-06. Vinculación Obligatoria de Recepciones Físicas
- **Implementación Física**: Clave foránea `orden_compra_id` en `recepciones_compra` con `ON DELETE RESTRICT`. No existen recepciones sin orden previa emitida.

### RN-07. Control de Tolerancia de Sobrentregas
- **Implementación Física**: Columna `tolerancia_sobrentrega_porc` en `configuraciones_empresa`. El backend verifica que `cantidad_recibida <= cantidad_ordenada * (1 + tolerancia / 100)`.

### RN-08. Kardex Inmutable y Obligatorio
- **Implementación Física**: Tabla `movimientos_inventario` con trazabilidad completa de `stock_anterior`, `stock_posterior`, `usuario_id`, `almacen_id` y `referencia_tipo`. Toda modificación a `inventario_stock.cantidad_actual` debe acompañarse de un movimiento dentro de un bloque `prisma.$transaction`.

### RN-09. Prohibición de Saldos Negativos en Inventario
- **Implementación Física**: Verificación en la capa de persistencia y validación previa a la actualización del stock disponible. Si `cantidad_actual - salida < 0`, se revierte la transacción.

### RN-10. Justificación y Firma de Ajustes de Inventario
- **Implementación Física**: Campos obligatorios `motivo VARCHAR(255)`, `usuario_id VARCHAR(36)` y `created_at DATETIME(3)` en `movimientos_inventario`.

### RN-11. Conservación Inmutable del Historial de Precios
- **Implementación Física**: Tabla `historial_precios` donde cada registro preserva `precio_unitario`, `moneda`, `fecha_vigencia` y `motivo_cambio`. No se permite sobreescritura destructiva de precios pasados.

### RN-12. Tipificación y Trazabilidad de Incidencias
- **Implementación Física**: Tabla `incidencias_proveedor` con enums tipificados (`TipoIncidencia`, `SeveridadIncidencia`) y claves foráneas opcionales a `orden_compra_id` y `recepcion_id`.

### RN-13. Objetividad en la Evaluación de Proveedores
- **Implementación Física**: Tabla `evaluaciones_proveedor` con índices decimales exactos (`indice_puntualidad`, `indice_cumplimiento_cant`, `indice_incidencias`, `indice_precios`, `calificacion_global`) calculados de forma determinista desde recepciones reales.

### RN-14. Aislamiento Estricto de Simulaciones de Continuidad
- **Implementación Física**: Tabla `simulaciones_continuidad` con columnas JSON (`parametros_json`, `productos_afectados_json`, `proveedores_alternos_json`). Las simulaciones se ejecutan en memoria y se guardan como registros analíticos sin tocar `inventario_stock` ni `ordenes_compra`.

### RN-15. Auditoría Inmutable de Operaciones Críticas
- **Implementación Física**: Tabla `registros_auditoria` con trazabilidad de `usuario_id`, `empresa_id`, `accion`, `entidad`, `datos_anteriores_json`, `datos_nuevos_json` e IP de origen.
