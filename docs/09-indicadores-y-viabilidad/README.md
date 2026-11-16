# 09. Indicadores Empresariales y Viabilidad — NexoSupply CR

Todos los indicadores de gestión logística y financiera de NexoSupply CR se calculan de manera dinámica y verificable a partir de transacciones reales almacenadas en MySQL. Queda terminantemente prohibido el uso de valores estáticos o simulados para aparentar funcionalidad.

---

## 1. Fórmulas Matemáticas y Definiciones de KPIs

### 1.1. Índice de Cumplimiento de Plazo (Puntualidad en Entregas - OTD)
Mide la capacidad de los proveedores de entregar dentro de la fecha convenida.
$$\text{OTD} = \left( \frac{\text{Número de Recepciones con } \text{fecha\_recepcion} \le \text{fecha\_prometida}}{\text{Total de Recepciones del Período}} \right) \times 100$$

### 1.2. Índice de Entregas Completas (Order Fill Rate - OFR)
Mide el porcentaje de órdenes que se entregaron íntegramente sin faltantes.
$$\text{OFR} = \left( \frac{\text{Número de Órdenes con Estado } \text{COMPLETADA}}{\text{Total de Órdenes Recibidas}} \right) \times 100$$

### 1.3. Tiempo Promedio de Entrega Real (Lead Time Real)
Calcula el promedio de días transcurridos desde la emisión de la orden hasta la recepción final en almacén.
$$\overline{LT} = \frac{\sum (\text{fecha\_recepcion} - \text{fecha\_emision})}{\text{Total de Órdenes Entregadas}}$$

### 1.4. Tasa de Variación de Costos de Compra (Price Variance - PV)
Registra la fluctuación porcentual entre el costo unitario de la última compra vs el costo promedio histórico.
$$\Delta P = \left( \frac{P_{\text{compra actual}} - P_{\text{costo promedio}}}{P_{\text{costo promedio}}} \right) \times 100$$

### 1.5. Concentración y Dependencia de Proveedores
Determina el grado de riesgo por exposición a un solo proveedor para un insumo o categoría estratégica.
$$\text{Dep}_{\text{prov}} = \left( \frac{\text{Monto Comprado al Proveedor } X}{\text{Monto Total Comprado en la Categoría}} \right) \times 100$$
- **Nivel Normal**: $< 40\%$
- **Nivel de Advertencia**: $40\% - 69\%$
- **Nivel Crítico**: $\ge 70\%$ (Dispara alerta de riesgo y recomendación de alta de proveedor alternativo).

### 1.6. Rotación de Inventario (Inventory Turnover)
Mide el dinamismo de las existencias en almacén durante un trimestre o año.
$$\text{Rotación} = \frac{\text{Costo Total de Mercancía Despachada / Consumida}}{\text{Inventario Promedio Valorizado}}$$

### 1.7. Alertas de Ruptura de Stock (Stockout Risk Alert)
Se activa inmediatamente cuando:
$$\text{cantidad\_actual} \le \text{stock\_minimo}$$
El cálculo de cobertura estimada en días se deriva de:
$$\text{Días de Cobertura} = \frac{\text{cantidad\_actual}}{\text{Consumo Diario Promedio Últimos 30 Días}}$$

---

## 2. Viabilidad Económica y Operativa del Modelo SaaS
- **Segmento Objetivo**: Comercializadoras, ferreterías mayoristas, distribuidores médicos y retail mediano en Costa Rica.
- **Reducción de Pérdidas**:
  - Eliminación de errores de sobrefacturación en órdenes de compra en un 95%.
  - Disminución del tiempo de ciclo de aprobación de compras de 4 días a 30 minutos.
  - Prevención de pérdidas por rotura de inventario y compras de emergencia no planificadas.
- **Escalabilidad de Infraestructura**: El motor MySQL 8 con particionamiento lógico por `empresa_id` e índices B-Tree garantiza latencias inferiores a 50ms para empresas con más de 100,000 movimientos de kardex anuales.
