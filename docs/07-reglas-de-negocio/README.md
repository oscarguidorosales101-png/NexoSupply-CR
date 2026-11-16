# 07. Reglas de Negocio Oficiales — NexoSupply CR

El sistema implementa rigurosamente el conjunto de reglas de negocio para garantizar consistencia operativa, control financiero y auditoría en cada transacción.

---

### RN-01. Unicidad de Proveedores en Contexto Empresarial
Cada proveedor posee un identificador fiscal único dentro de cada empresa (`empresa_id` + `identificador_fiscal`). Un mismo proveedor físico puede existir en dos empresas distintas sin compartir datos comerciales, cotizaciones ni historial de compras.

### RN-02. Restricción de Proveedores Inactivos
Un proveedor en estado `activo = false` queda bloqueado inmediatamente para la creación de nuevas solicitudes de compra, órdenes de compra y cotizaciones. Las órdenes previamente emitidas continúan su ciclo de recepción hasta cerrarse.

### RN-03. Integridad Mínima de Solicitud de Compra
Toda solicitud de compra debe contener al menos un producto con cantidad estrictamente mayor a cero (`cantidad > 0`). No se permiten solicitudes vacías.

### RN-04. Aprobación Previa Obligatoria de Solicitudes
Ninguna orden de compra puede emitirse vinculada a una solicitud a menos que dicha solicitud cuente con el estado `APROBADA`. Se implementa separación de funciones: el solicitante no puede autoaprobar su propia solicitud si el monto excede el umbral de política configurado para su rol.

### RN-05. Recepción Parcial Permitida
Una orden de compra admite múltiples recepciones parciales. Cada recepción disminuye la cantidad pendiente de los ítems de la orden. El estado de la orden conmuta a `PARCIALMENTE_RECIBIDA` hasta que todas las partidas hayan sido entregadas o canceladas justificadamente.

### RN-06. Vinculación Obligatoria de Recepciones Físicas
Toda recepción de mercancía debe originarse a partir de una orden de compra válida y emitida. No existen recepciones huérfanas en almacén.

### RN-07. Control de Tolerancia de Sobrentregas
Las cantidades recibidas no pueden superar las cantidades autorizadas en la orden de compra a menos que la empresa tenga habilitado un porcentaje de tolerancia (ej. 5% para granel/líquidos) o medie una aprobación expresa del administrador de compras.

### RN-08. Generación Automática de Kardex
Toda entrada o salida física de existencias en un almacén genera obligatoriamente un registro en `movimientos_inventario`. No existen modificaciones directas a la columna de existencias (`cantidad_actual`) fuera de una transacción que inserte su respectivo movimiento de trazabilidad.

### RN-09. Prohibición de Saldos Negativos en Inventario
Ninguna operación de salida o ajuste puede dejar las existencias de un producto en un almacén con un valor menor a cero (`cantidad_actual >= 0`). Si una salida solicitada excede el disponible físico, la transacción es abortada inmediatamente.

### RN-10. Justificación y Firma de Ajustes de Inventario
Todo ajuste manual de inventario (positivo o negativo) debe registrar obligatoriamente: motivo formal, usuario que lo ejecuta, fecha/hora y diferencias encontradas.

### RN-11. Conservación Inmutable del Historial de Precios
Cada vez que se aprueba una orden de compra o se actualiza el precio acordado de un producto-proveedor, se almacena una entrada en el histórico con fecha de vigencia, moneda y proveedor. Los precios de órdenes pasadas no se modifican retroactivamente.

### RN-12. Tipificación y Trazabilidad de Incidencias
Toda incidencia con un proveedor debe estar catalogada por tipo (retraso, faltante, avería, discrepancia de precio), registrar fecha y estar asociada a una orden o recepción específica.

### RN-13. Objetividad en la Evaluación de Proveedores
La calificación de un proveedor se calcula exclusivamente mediante fórmulas aritméticas transparentes basadas en entregas reales, fechas de cumplimiento e incidencias registradas en MySQL. Quedan prohibidas las calificaciones arbitrarias sin sustento transaccional.

### RN-14. Aislamiento Estricto de Simulaciones de Continuidad
El módulo de simulación operativa opera en modo estrictamente analítico. Bajo ninguna circunstancia una simulación de contingencia altera las existencias de almacén, las órdenes de compra activas ni las reservas de inventario reales.

### RN-15. Auditoría Inmutable de Operaciones Críticas
Se registran de forma automática e irreversible los eventos de: creación/modificación de usuarios, aprobaciones de compra, cancelaciones de órdenes, ajustes manuales de kardex y cambios en parámetros de configuración empresarial.
