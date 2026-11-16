# 03. Modelo Multiempresa (Multi-Tenant Architecture)

## 1. Estrategia de Aislamiento
NexoSupply CR adopta una arquitectura SaaS Multi-Tenant basada en **Base de Datos Compartida con Esquema Compartido y Discriminador Obligatorio (`empresa_id`)**. Esta estrategia maximiza la eficiencia de infraestructura y el mantenimiento de migraciones a la vez que garantiza un aislamiento lógico estricto a prueba de vulnerabilidades de tipo IDOR (Insecure Direct Object References).

```
               [ Usuario Autenticado ]
                         │
                         ▼
             [ Token JWT / Sesión ]
     { userId: "usr_1", email: "user@pacifico.cr" }
                         │
                         ▼
        [ Membresías Activas del Usuario ]
    ├── Empresa A (Distribuidora Central): ROL_ADMIN
    └── Empresa B (Ferretería del Sur):   ROL_COMPRAS
                         │
         Petición HTTP con Cabecera / Parámetro:
                   [ X-Empresa-Id ]
                         │
                         ▼
       [ Middleware: TenantAuthorizationContext ]
  Valida:
  1. ¿El token es válido y no revocado?
  2. ¿El usuario tiene membresía en X-Empresa-Id?
  3. ¿La membresía está en estado ACTIVA?
  4. ¿La empresa está en estado ACTIVA?
  5. ¿El rol de la membresía cuenta con los permisos necesarios?
                         │ (Pasa validación)
                         ▼
    [ Capa de Servicios y Repositorios Prisma ]
      Scope forzado: WHERE empresa_id = validatedTenantId
                         │
                         ▼
        [ MySQL 8: Base de Datos nexosupply_cr ]
```

## 2. Entidades Fundamentales de la Gobernanza Multiempresa
1. **`empresas`**: Almacena los datos fiscales, comerciales, estado y fecha de vencimiento de suscripción.
2. **`usuarios`**: Almacena las credenciales globales del usuario (email único a nivel sistema, hash de contraseña seguro, nombre completo, teléfono, estado global).
3. **`membresias_empresa`**: Entidad intermedia que conecta un `usuario_id` con una `empresa_id`, asignándole un `rol_id` específico y un estado (ACTIVA, INACTIVA, SUSPENDIDA).
4. **`roles`**: Define agrupaciones de permisos. Puede ser de sistema (plantilla) o personalizado por empresa.
5. **`permisos`**: Catálogo atómico de facultades operativas (`proveedores:crear`, `compras:aprobar`, `inventario:ajustar`, etc.).
6. **`invitaciones_empresa`**: Tokens seguros de un solo uso con fecha de expiración para incorporar nuevos miembros a una empresa por correo electrónico.
7. **`configuraciones_empresa`**: Parámetros clave-valor por empresa (monto máximo de autoaprobación, moneda base, tema visual predeterminado).

## 3. Selector de Empresa en Tiempo Real
Un usuario perteneciente a múltiples organizaciones puede conmutar de empresa en cualquier momento desde la barra superior de navegación.
- **Mecanismo Seguro**: Al conmutar de empresa, el frontend no asume permisos locales. Realiza una petición al endpoint `/api/v1/auth/switch-tenant` enviando el `empresaId` destino.
- **Respuesta del Servidor**: El servidor valida la membresía en la base de datos MySQL, emite un nuevo token de contexto con los permisos específicos para esa empresa y retorna la configuración personalizada.
- **Limpieza de Caché**: El frontend invalida inmediatamente las consultas de React Query / estado global para garantizar que ningún dato de la empresa anterior permanezca en memoria.

## 4. Reglas Críticas de Integridad Referencial
- **Prohibición de Vínculos Cruzados**: Es imposible asociar un almacén de la Empresa A con un producto de la Empresa B, o una orden de la Empresa A con un proveedor de la Empresa B.
- **Claves Únicas Compuestas**:
  - `UNIQUE INDEX uk_proveedor_codigo (empresa_id, codigo_tributario)`
  - `UNIQUE INDEX uk_producto_sku (empresa_id, sku)`
  - `UNIQUE INDEX uk_orden_consecutivo (empresa_id, numero_orden)`
- **Validación Automática en Prisma Client**: Cada modelo vinculado a empresa implementa `empresa_id` con clave foránea `REFERENCES empresas(id) ON DELETE RESTRICT`.
