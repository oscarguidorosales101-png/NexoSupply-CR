# 08. Seguridad, Permisos y Protección de Datos — NexoSupply CR

La seguridad y la privacidad multi-tenant son principios fundacionales del diseño arquitectónico de NexoSupply CR.

---

## 1. Arquitectura de Autenticación
- **Contraseñas**: Hasheadas mediante `bcrypt` con un costo de iteración de `12` salt rounds. Ninguna contraseña se almacena ni viaja en texto plano.
- **Tokens de Sesión**: JSON Web Tokens (JWT) firmados con algoritmo `HS256` / `RS256` utilizando secretos criptográficos de alta entropía.
- **Cookies Seguras**: El token de sesión viaja en cookies con atributos:
  - `HttpOnly`: Inaccesible desde JavaScript en el navegador (inmune a robo por XSS).
  - `Secure`: Solo transmitido a través de conexiones cifradas HTTPS.
  - `SameSite=Strict`: Protección contra ataques de falsificación de peticiones en sitios cruzados (CSRF).
- **Protección contra Fuerza Bruta**: Rate limiting implementado en el backend Express para los endpoints `/auth/login`, `/auth/register` y `/auth/forgot-password` (máximo 5 intentos fallidos por ventana de 15 minutos).

## 2. Aislamiento Multi-Tenant y Prevención IDOR
El sistema neutraliza los ataques de manipulación de identificadores (IDOR) mediante validación en 3 capas:
1. **Validación de Parámetros**: Las rutas protegidas validan que el `empresaId` de la URL coincida con la membresía activa del token del usuario.
2. **Contexto Forzado**: Los servicios backend no aceptan `empresaId` proveniente del cuerpo (body) de la petición HTTP; lo extraen exclusivamente del objeto seguro `req.tenant.id` establecido por el middleware de autenticación.
3. **Restricción en Base de Datos**: Cada query relacional en Prisma incluye la cláusula `where: { empresa_id: req.tenant.id }`.

```typescript
// Ejemplo de patrón seguro en servicio de backend:
export async function getOrdenCompraById(empresaId: string, ordenId: string) {
  const orden = await prisma.ordenesCompra.findFirst({
    where: {
      id: ordenId,
      empresa_id: empresaId, // Blindaje contra acceso no autorizado
    },
    include: {
      detalles: true,
      proveedor: true,
    },
  });

  if (!orden) {
    throw new NotFoundError("La orden de compra solicitada no existe en esta empresa.");
  }
  return orden;
}
```

## 3. Matriz RBAC (Role-Based Access Control)

| Permiso Clave | Superadmin Plataforma | Admin Empresarial | Gerencia | Compras | Logística / Bodega |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `empresas:crear_planes` | SI | NO | NO | NO | NO |
| `empresas:configurar` | NO | SI | NO | NO | NO |
| `usuarios:invitar` | NO | SI | NO | NO | NO |
| `proveedores:crear_editar`| NO | SI | NO | SI | NO |
| `solicitudes:crear` | NO | SI | SI | SI | NO |
| `solicitudes:aprobar` | NO | SI | SI | NO | NO |
| `ordenes:emitir` | NO | SI | SI | SI | NO |
| `recepciones:registrar` | NO | SI | NO | NO | SI |
| `inventario:ajustar` | NO | SI | NO | NO | SI |
| `simulaciones:ejecutar` | NO | SI | SI | SI | NO |
| `reportes:gerenciales` | NO | SI | SI | SI | NO |

## 4. Medidas de Protección de la API
- **Helmet**: Configuración de cabeceras HTTP de seguridad (Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options).
- **CORS Restringido**: Lista blanca estricta con el origen del cliente web (`FRONTEND_URL`), rechazando peticiones desde orígenes desconocidos.
- **Validación con Zod**: Todos los payloads de entrada son parseados y validados estrictamente; campos adicionales no declarados son eliminados (`strip`).
- **Manejo Centralizado de Excepciones**: No se exponen trazas de pila (stack traces), nombres de tablas internas ni errores SQL en entornos de producción.
