# 08. Seguridad, Permisos y Protección de Datos — NexoSupply CR

El diseño de seguridad implementado en MySQL 8 y Prisma ORM para NexoSupply CR cubre autenticación, autorización basada en roles (RBAC), aislamiento multiempresa y auditoría.

---

## 1. Hashing de Contraseñas y Gestión de Credenciales
- **Algoritmo**: `bcryptjs` con salt de 10 rounds para las contraseñas del seed (`DemoPacifico2026!`).
- **Almacenamiento**: Columna `usuarios.password_hash` (`VARCHAR(255)`).
- **Prohibición**: Cero contraseñas en texto plano.

## 2. Aislamiento Físico Multi-Tenant
- Cada entidad empresarial contiene la columna `empresa_id VARCHAR(36) NOT NULL` con clave foránea referenciando a `empresas(id)` con `ON DELETE RESTRICT` o `ON DELETE CASCADE` según corresponda.
- **Índices Compuestos**:
  - `@@unique([empresa_id, identificador_fiscal])` en `proveedores`.
  - `@@unique([empresa_id, sku])` en `productos`.
  - `@@unique([empresa_id, codigo])` en `almacenes`, `categorias`, `unidades_medida`.
  - `@@unique([empresa_id, numero_orden])` en `ordenes_compra`.
  - `@@unique([empresa_id, numero_solicitud])` en `solicitudes_compra`.
  - `@@unique([empresa_id, numero_recepcion])` en `recepciones_compra`.
  - `@@unique([empresa_id, almacen_id, producto_id])` en `inventario_stock`.

## 3. Matriz de Roles y Permisos Sembrados

| Permiso | Módulo | ADMIN_EMPRESARIAL | GERENCIA | COMPRAS | LOGISTICA |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `empresas:configurar` | EMPRESAS | SI | NO | NO | NO |
| `usuarios:gestionar` | USUARIOS | SI | NO | NO | NO |
| `proveedores:crear_editar` | PROVEEDORES | SI | NO | SI | NO |
| `productos:gestionar` | PRODUCTOS | SI | NO | SI | NO |
| `solicitudes:crear` | COMPRAS | SI | SI | SI | NO |
| `solicitudes:aprobar` | COMPRAS | SI | SI | NO | NO |
| `ordenes:emitir` | COMPRAS | SI | SI | SI | NO |
| `recepciones:registrar` | LOGISTICA | SI | NO | NO | SI |
| `inventario:ajustar` | INVENTARIO | SI | NO | NO | SI |
| `simulaciones:ejecutar` | CONTINUIDAD | SI | SI | SI | NO |
| `reportes:gerenciales` | REPORTES | SI | SI | SI | NO |

## 4. Trazabilidad de Auditoría
- Tabla física `registros_auditoria` con índice compuesto `(empresa_id, entidad, created_at)`.
- Almacena estado previo y posterior en formato JSON (`datos_anteriores_json`, `datos_nuevos_json`).
