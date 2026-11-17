# 02. Alcance Funcional — NexoSupply CR

El alcance funcional abarca 10 módulos empresariales integrados que cubren el ciclo completo de abastecimiento e inventario:

## Módulo 1. Administración de Empresas (Tenant Management)
- Registro de empresas con cédula jurídica, razón social, nombre comercial y datos fiscales.
- Configuración de políticas empresariales (moneda por defecto, umbrales de aprobación por monto, tolerancia de sobrentregas).
- Gestión de usuarios y membresías con roles asignados por empresa.
- Emisión y aceptación de invitaciones de usuarios.
- Ajuste de preferencias de personalización visual (temas de color corporativo, logotipo, modo oscuro/claro).

## Módulo 2. Proveedores
- Registro y expediente digital de proveedores (categorización, clasificación A/B/C, datos fiscales, plazos de pago acordados).
- Gestión de contactos clave por proveedor (ventas, cobranza, soporte logístico).
- Historial de transacciones y compras asociadas.
- Registro de incidencias (entregas tardías, faltantes, productos dañados).
- Perfil de riesgo y calificación ponderada del proveedor.

## Módulo 3. Productos y Catálogo
- Maestro de productos con código interno (SKU), código de barras opcional, descripción detallada y unidad de medida (UNIDADES, KILOS, LITROS, CAJAS, ETC.).
- Jerarquía de categorías y subcategorías.
- Precios de costo de referencia y control de monedas (CRC / USD).
- Relación de abastecimiento N:M entre Productos y Proveedores, registrando código de proveedor, precio acordado y tiempo estimado de entrega (Lead Time en días).

## Módulo 4. Compras (Procurement)
- Solicitudes de Compra: Elaboradas por departamentos demandantes con detalle de ítems, cantidades solicitadas y justificación.
- Flujo de Aprobación multinivel: Validación automática según montos de política empresarial (Gerencia / Dirección).
- Generación de Órdenes de Compra vinculadas a solicitudes aprobadas.
- Estados de orden: BORRADOR, PENDIENTE_APROBACION, APROBADA, EMITIDA, EN_TRANSITO, PARCIALMENTE_RECIBIDA, COMPLETADA, CANCELADA.
- Trazabilidad de fecha prometida de entrega vs fecha real de recepción.

## Módulo 5. Inventario
- Control multi-almacén con Almacén Principal predeterminado por empresa.
- Existencias en tiempo real (Stock disponible, stock reservado, stock mínimo, stock de seguridad).
- Registro obligatorio de Kardex para todo movimiento: ENTRADA_COMPRA, SALIDA_VENTA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, TRANSFERENCIA_ALMACEN.
- Cálculo de costo promedio ponderado en moneda base.
- Generación automática de alertas de stock crítico bajo el mínimo.

## Módulo 6. Recepciones Físicas
- Registro de entregas vinculadas obligatoriamente a una Orden de Compra válida.
- Soporte de recepciones parciales y recepciones múltiples para una misma orden.
- Validación automática de cantidades recibidas contra cantidades autorizadas.
- Detección de diferencias (faltantes/sobrantes) y generación automática de incidencias operativas.
- Cierre formal de la orden al completar la recepción de todas las partidas.

## Módulo 7. Evaluación de Proveedores
- Criterios objetivos y reproducibles:
  1. Índice de Cumplimiento de Plazo (Puntualidad): Porcentaje de órdenes recibidas en o antes de la fecha prometida.
  2. Índice de Cumplimiento de Cantidades: Proporción de unidades recibidas conformes vs autorizadas.
  3. Índice de Incidencias: Frecuencia y severidad de reclamos técnicos y logísticos.
  4. Variación de Precios: Desviación entre el precio de cotización/orden y el precio facturado real.
- Calificación consolidada (Score 0 a 100) y semáforo de desempeño (Excelente, Confiable, En Observación, Crítico).

## Módulo 8. Inteligencia de Riesgos
- Detección algorítmica de riesgo de desabastecimiento inmediato (stock actual < demanda promedio de reposición).
- Índice de dependencia de proveedor: Detección de productos donde más del 70% de la compra se concentra en un único proveedor sin sustituto configurado.
- Alertas predictivas de retrasos recurrentes basadas en el lead time histórico.
- Matriz de riesgo operativo (Impacto vs Probabilidad).

## Módulo 9. Simulador de Continuidad Operativa (What-If Analysis)
- Entorno aislado ("Sandbox") para modelar contingencias sin alterar la base de datos operativa:
  - Simulación de retraso de N días de un proveedor crítico.
  - Proyección de caída de existencias y fecha estimada de quiebre de stock.
  - Identificación automática de proveedores alternativos registrados para los productos afectados.
  - Estimación del impacto financiero diferencial (sobrecosto por cambio de proveedor y flete urgente).

## Módulo 10. Panel Gerencial (Executive Dashboard)
- Indicadores operativos calculados en tiempo real mediante agregaciones de MySQL.
- Gráficos interactivos de tendencias de gasto, cumplimiento de compras e inventario valorizado.
- Acceso directo a reportes exportables para auditoría y toma de decisiones.
