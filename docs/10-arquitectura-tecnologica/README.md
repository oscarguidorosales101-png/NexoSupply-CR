# 10. Arquitectura Tecnológica y Guía de Infraestructura — NexoSupply CR

---

## 1. Stack Tecnológico Oficial

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                            │
│  React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons     │
│  State: React Context + React Router v7 + Recharts (KPIs)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP / JSON REST APIs (JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND LAYER                            │
│  Node.js (v24 LTS) + Express + TypeScript                       │
│  Validation: Zod | Security: Helmet, CORS, Rate-Limit, Bcrypt   │
│  Architecture: Controllers -> Services -> Repositories          │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Prisma Client (ORM)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                          │
│  MySQL Server 8.0.40                                            │
│  Database: nexosupply_cr (utf8mb4_unicode_ci)                   │
│  GUI / Data Inspector: Prisma Studio (port 5555)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Configuración de Base de Datos MySQL y Prisma ORM

### 2.1. Conexión a MySQL
Cadena de conexión estándar en `backend/.env`:
```env
DATABASE_URL="mysql://root:@localhost:3306/nexosupply_cr"
```
*(Nota: Ajustar usuario y contraseña según la configuración de la instancia local de MySQL 8)*.

### 2.2. Comandos Clave de Prisma
- **Generar cliente tipado**:
  ```bash
  npx prisma generate
  ```
- **Crear y aplicar migraciones en base de datos**:
  ```bash
  npx prisma migrate dev --name init_multi_tenant_schema
  ```
- **Poblar base de datos con datos de prueba (Seed)**:
  ```bash
  npm run prisma:seed
  ```
- **Abrir explorador visual de base de datos (Prisma Studio)**:
  ```bash
  npx prisma studio
  ```
  *Permite inspeccionar directamente las tablas y registros reales de MySQL en el navegador (`http://localhost:5555`).*

---

## 3. Delimitación del Chatbot Empresarial

El módulo de chatbot se implementa con las siguientes salvaguardas:
1. **Componente de Interfaz Exclusivo**: Vive únicamente en el cliente web autenticado (`frontend/src/components/chatbot/BusinessChatDrawer.tsx`). No existen interfaces externas ni páginas independientes de chat.
2. **Backend Desacoplado**: Controlador en `backend/src/controllers/chatbot.controller.ts` y servicio en `backend/src/services/chatbot.service.ts`.
3. **Estado de la Clave de Inteligencia Artificial (`AI_API_KEY`)**:
   - Variable de entorno declarada en `backend/.env.example` como `AI_API_KEY=""`.
   - Si la clave está ausente o no configurada, el servicio responde amigablemente con un estado `DESACTIVADO_PENDIENTE_CONFIGURACION`, indicando al usuario que el módulo de consulta documental asistida por IA está en preparación y se habilitará próximamente.
   - En ningún momento la aplicación falla, se bloquea o inventa respuestas ficticias.

---

## 4. Guía de Ejecución y Desarrollo Local

### Backend:
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
*(El servidor de frontend se ejecuta típicamente en `http://localhost:5173` y el backend en `http://localhost:4000`)*.
