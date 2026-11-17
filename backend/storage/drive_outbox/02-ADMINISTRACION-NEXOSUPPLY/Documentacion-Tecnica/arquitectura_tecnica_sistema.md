# ARQUITECTURA TECNICA DEL SISTEMA — NEXOSUPPLY CR

- **Backend:** Node.js v24, Express, TypeScript, Prisma ORM 5.22.
- **Base de Datos Operativa:** MySQL 8 con 32 tablas relacionales normalizadas.
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Motor RAG Documental:** Embeddings neuronales con Xenova/all-MiniLM-L6-v2 (384 dimensiones) y Qdrant Vector Engine.
- **Repositorio Documental:** Google Drive API v3 (Cuenta de Servicio para lectura y OAuth 2.0 para escritura en Drive personal).
- **Seguridad:** Cifrado AES-256-GCM para tokens, JWT con firma SHA-256 en cookies HttpOnly, proteccion estricta anti-IDOR con filtro por empresa_id.
