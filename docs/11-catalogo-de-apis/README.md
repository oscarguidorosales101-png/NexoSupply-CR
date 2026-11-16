# 11. Catálogo Oficial de Endpoints REST API — NexoSupply CR

Todas las rutas están prefijadas con `/api/v1`. Las peticiones protegidas requieren el encabezado `Authorization: Bearer <token>` (o cookie HttpOnly `token`) y el encabezado `X-Empresa-Id` para contextualizar la organización activa.

---

## 1. Módulo de Autenticación (`/auth`)

| Método | Endpoint | Permiso / Rol | Descripción |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/login` | Público | Autentica al usuario mediante email y contraseña. Emite JWT y establece cookie HttpOnly. |
| `POST` | `/auth/register` | Público | Registra un nuevo usuario global y opcionalmente su primera empresa y almacén principal. |
| `POST` | `/auth/logout` | Autenticado | Revoca la cookie de sesión del navegador. |
| `GET` | `/auth/me` | Autenticado | Retorna el perfil del usuario, la empresa activa y el catálogo de empresas disponibles. |
| `POST` | `/auth/switch-tenant` | Autenticado | Conmuta la empresa activa revalidando membresía y emitiendo un nuevo JWT de contexto. |
| `POST` | `/auth/change-password`| Autenticado | Actualiza la contraseña del usuario verificando la clave actual. |

---

## 2. Módulo de Gestión Empresarial (`/empresas`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/empresas/profile` | Autenticado en Tenant | Obtiene datos comerciales, fiscales y almacenes de la empresa activa. |
| `PATCH`| `/empresas/profile` | `empresas:configurar` | Actualiza razón social, nombre comercial, contacto y tema visual. |
| `PATCH`| `/empresas/configuracion` | `empresas:configurar` | Modifica umbrales de autoaprobación y tolerancias de entrega. |
| `GET` | `/empresas/members` | Autenticado en Tenant | Lista los miembros activos y sus roles asignados. |
| `POST` | `/empresas/members/invite` | `usuarios:gestionar` | Genera una invitación segura con token para incorporación de miembros. |
| `GET` | `/empresas/roles-permisos` | Autenticado en Tenant | Consulta la matriz de roles y permisos configurados. |

---

## 3. Módulo de Proveedores (`/proveedores`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/proveedores` | Autenticado en Tenant | Lista los proveedores de la empresa (filtros: `activo`, `search`). |
| `GET` | `/proveedores/:id` | Autenticado en Tenant | Retorna el expediente completo de un proveedor con contactos e historial. |
| `POST` | `/proveedores` | `proveedores:crear_editar` | Da de alta un nuevo proveedor validando unicidad de cédula fiscal (RN-01). |
| `PATCH`| `/proveedores/:id` | `proveedores:crear_editar` | Modifica datos comerciales, clasificación A/B/C y condiciones de pago. |
| `POST` | `/proveedores/:id/contactos`| `proveedores:crear_editar`| Registra personas de contacto clave para el proveedor. |

---

## 4. Módulo de Productos y Catálogo (`/productos`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/productos` | Autenticado en Tenant | Lista catálogo con existencias (filtros: `categoriaId`, `search`, `bajoMinimo`). |
| `GET` | `/productos/:id` | Autenticado en Tenant | Detalle del producto con desglose de existencias por almacén y proveedores. |
| `POST` | `/productos` | `productos:gestionar` | Crea un producto validando unicidad de SKU por empresa. |
| `PATCH`| `/productos/:id` | `productos:gestionar` | Actualiza descripción, precios de referencia y umbrales de stock mínimo. |
| `POST` | `/productos/:id/proveedores`| `productos:gestionar`| Vincula producto a proveedor registrando precio acordado y lead time. |
| `GET` | `/productos/categorias` | Autenticado en Tenant | Lista las categorías de la empresa. |
| `POST` | `/productos/categorias` | `productos:gestionar` | Crea una nueva categoría. |
| `GET` | `/productos/unidades-medida`| Autenticado en Tenant | Lista unidades de medida configuradas. |
| `POST` | `/productos/unidades-medida`| `productos:gestionar` | Da de alta una unidad de medida. |

---

## 5. Módulo de Compras y Aprobaciones (`/compras`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/compras/solicitudes` | Autenticado en Tenant | Lista requerimientos departamentales (filtro: `estado`). |
| `GET` | `/compras/solicitudes/:id`| Autenticado en Tenant | Consulta el desglose y trazabilidad de una solicitud. |
| `POST` | `/compras/solicitudes` | `solicitudes:crear` | Crea una solicitud (RN-03: al menos 1 producto con cantidad > 0). |
| `POST` | `/compras/solicitudes/:id/aprobar`| `solicitudes:aprobar` | Aprueba o rechaza solicitud con política de separación de funciones. |
| `GET` | `/compras/ordenes` | Autenticado en Tenant | Lista órdenes de compra (filtros: `estado`, `proveedorId`). |
| `GET` | `/compras/ordenes/:id` | Autenticado en Tenant | Detalle de orden con cantidades pendientes, recibidas e historial. |
| `POST` | `/compras/solicitudes/:solicitudId/generar-orden` | `ordenes:emitir` | Genera orden desde solicitud aprobada (RN-04). |
| `POST` | `/compras/ordenes` | `ordenes:emitir` | Emite una orden de compra directa a proveedor activo (RN-02). |

---

## 6. Módulo de Inventario, Almacenes y Recepciones (`/inventario`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/inventario/stock` | Autenticado en Tenant | Existencias consolidadas por almacén y producto. |
| `GET` | `/inventario/kardex` | Autenticado en Tenant | Movimientos físicos inmutables (filtros: `productoId`, `almacenId`). |
| `POST` | `/inventario/ajustes` | `inventario:ajustar` | Ajuste manual ACID (RN-08, RN-09: bloqueo de saldo negativo, RN-10: motivo obligatorio). |
| `GET` | `/inventario/almacenes` | Autenticado en Tenant | Catálogo de almacenes y bodegas de la empresa. |
| `POST` | `/inventario/almacenes` | `inventario:ajustar` | Crea un nuevo almacén físico. |
| `GET` | `/inventario/recepciones` | Autenticado en Tenant | Historial de actas de recepción en almacén. |
| `POST` | `/inventario/recepciones` | `recepciones:registrar` | Recepción física en almacén: actualiza orden, stock, kardex y costos en transacción atómica. |

---

## 7. Módulo de Evaluación e Incidencias (`/evaluaciones`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/evaluaciones` | Autenticado en Tenant | Lista evaluaciones mensuales/trimestrales por proveedor. |
| `POST` | `/evaluaciones/calcular` | `reportes:gerenciales`| Ejecuta el cálculo matemático de OTD, OFR e incidencias para un periodo. |
| `GET` | `/evaluaciones/incidencias`| Autenticado en Tenant | Consulta el historial de reclamos y anomalías operativas. |
| `POST` | `/evaluaciones/incidencias`| `proveedores:crear_editar`| Registra una incidencia vinculada a proveedor/orden (RN-12). |
| `PATCH`| `/evaluaciones/incidencias/:id/resolver`| `proveedores:crear_editar`| Registra la resolución y solución técnica aplicada a la incidencia. |

---

## 8. Módulo de Riesgos y Alertas (`/riesgos`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/riesgos/alertas` | Autenticado en Tenant | Consulta alertas activas o resueltas (stockout, retrasos). |
| `PATCH`| `/riesgos/alertas/:id/resolver`| Autenticado en Tenant | Marca una alerta como resuelta. |
| `POST` | `/riesgos/escanear` | `reportes:gerenciales`| Escanea el estado del inventario para disparar alertas automáticas. |

---

## 9. Módulo de Simulador de Continuidad (`/simulaciones`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/simulaciones` | Autenticado en Tenant | Historial de simulaciones y escenarios guardados. |
| `POST` | `/simulaciones` | `simulaciones:ejecutar` | Ejecuta análisis "What-if" por retraso de proveedor crítico (RN-14: cero mutaciones operativas). |

---

## 10. Módulo de Reportes Ejecutivos y Auditoría (`/reportes`)

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/reportes/dashboard` | `reportes:gerenciales`| KPIs consolidados en tiempo real desde MySQL (valor de inventario, OTD, alertas). |
| `GET` | `/reportes/auditoria` | `empresas:configurar` | Bitácora inmutable de transacciones críticas (RN-15). |

---

## 11. Módulo de Asistente Empresarial (`/chatbot`)

| Método | Endpoint | Estado | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/chatbot/status` | Informativo | Retorna estado de preparación de la integración. |
| `POST` | `/chatbot/query` | Desactivado | Registra la consulta para auditoría y responde informando que la activación está programada para la Etapa 5. |
