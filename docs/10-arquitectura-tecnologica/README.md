# 10. Arquitectura Tecnológica y Guía de Infraestructura — NexoSupply CR

---

## 1. Stack Tecnológico Físico y Versiones Verificadas

- **Sistema Operativo**: Windows x64.
- **Node.js**: `v24.13.0`.
- **npm**: `11.6.2`.
- **Motor de Base de Datos**: `MySQL Server 8.0.40` (Servicio Windows `MySQL80`, puerto 3306).
- **ORM / Capa de Persistencia**: `Prisma ORM v5.22.0` (`@prisma/client` y `prisma` CLI).
- **GUI de Base de Datos**: `Prisma Studio v0.503.0` (disponible en `http://localhost:5555`).

---

## 2. Configuración de Base de Datos MySQL y Prisma ORM

### 2.1. Cadena de Conexión en `backend/.env`
```env
DATABASE_URL="mysql://root@127.0.0.1:3306/nexosupply_cr"
```

### 2.2. Comandos Operativos de Prisma
Ejecutar desde el directorio `backend/`:

1. **Validar esquema**:
   ```bash
   npx prisma validate
   ```
2. **Generar Prisma Client**:
   ```bash
   npx prisma generate
   ```
3. **Aplicar migraciones de forma segura**:
   ```bash
   npx prisma migrate dev --name init_multi_tenant_schema
   ```
4. **Poblar datos de prueba (Seed Idempotente)**:
   ```bash
   npm run prisma:seed
   ```
5. **Abrir el Explorador Visual (Prisma Studio)**:
   ```bash
   npx prisma studio
   ```
   *Acceso en navegador: `http://localhost:5555`*.
   *Permite visualizar en tiempo real las 32 tablas creadas en MySQL 8, sus relaciones y registros sin alterar el esquema.*

---

## 3. Delimitación del Chatbot Asistente Empresarial

- **Estado**: Desactivado de forma segura en `backend/.env` (`AI_API_KEY=""`).
- **Tablas de Soporte**: `documentos_empresa` y `consultas_chatbot_log` creadas en MySQL para aislar el corpus documental estrictamente por `empresa_id`.
- **Garantía**: Cero llamadas externas de red a proveedores de IA hasta que el propietario proporcione y autorice la clave correspondiente.
