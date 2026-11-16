# NexoSupply CR

> **Sistema Inteligente de Gestión, Control y Análisis de Abastecimiento e Inventario para Empresas de Distribución y Comercialización.**
> Plataforma SaaS Multiempresa (Multi-Tenant).

---

## Características Principales

- **Arquitectura SaaS Multiempresa (Multi-Tenant)**: Aislamiento riguroso de datos a nivel de backend y base de datos con soporte de usuarios en múltiples organizaciones y conmutación en caliente de empresa activa.
- **Base de Datos Relacional Robusta**: MySQL 8.0 gestionado mediante Prisma ORM con migraciones controladas, transacciones ACID para Kardex e inventario, y visualización con Prisma Studio.
- **Gestión Integral de Abastecimiento**:
  - Directorio digital y clasificación de Proveedores (A/B/C).
  - Catálogo de Productos y relación N:M producto-proveedor con lead time y precio acordado.
  - Solicitudes de Compra con flujo de aprobación por umbrales monetarios.
  - Órdenes de Compra con seguimiento de estados y recepciones parciales.
  - Control de Inventario multi-almacén con Kardex automático inmutable y prevención de saldos negativos.
  - Evaluación objetiva y matemática de proveedores (Puntualidad, Calidad, Incidencias, Variación de Precios).
  - Inteligencia de Riesgos operativos y dependencias de suministro.
  - Simulador de Continuidad Operativa ("What-If analysis") aislado sin afectación de datos reales.
  - Panel Gerencial en tiempo real con KPIs calculados directamente desde MySQL.
- **Chatbot Asistente Empresarial**: Integrado exclusivamente en la interfaz web del cliente, con arquitectura desacoplada para RAG documental y salvaguardas activas.
- **Diseño Moderno y Responsivo**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, soporte de temas visuales (Corporate Blue, Violet, Green, Dark/Light mode).

---

## Estructura del Repositorio

```
NexoSupply-CR/
├── docs/                   # Documentación de ingeniería, reglas de negocio y arquitectura
│   ├── 01-idea-empresarial/
│   ├── 02-alcance-funcional/
│   ├── 03-modelo-multiempresa/
│   ├── 04-modelo-de-procesos/
│   ├── 05-modelo-entidad-relacion/
│   ├── 06-diccionario-de-datos/
│   ├── 07-reglas-de-negocio/
│   ├── 08-seguridad-y-permisos/
│   ├── 09-indicadores-y-viabilidad/
│   └── 10-arquitectura-tecnologica/
├── backend/                # API REST Node.js, Express, TypeScript, Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma   # Esquema relacional centralizado
│   │   └── seed.ts         # Datos de demostración (Distribuidora Central del Pacífico S.A.)
│   └── src/                # Controladores, servicios, repositorios, middlewares
├── frontend/               # Aplicación SPA React 19, Vite, TypeScript, Tailwind CSS
│   └── src/                # Componentes, vistas, contextos, hooks
├── .gitignore              # Protección estricta de credenciales y variables de entorno
└── README.md
```

---

## Documentación Técnica

Para consultar los detalles de diseño, flujos de proceso, diccionario de datos y diagramas arquitectónicos, consulte los manuales en la carpeta [`docs/`](./docs):
- [01. Idea Empresarial](./docs/01-idea-empresarial/README.md)
- [02. Alcance Funcional](./docs/02-alcance-funcional/README.md)
- [03. Modelo Multiempresa](./docs/03-modelo-multiempresa/README.md)
- [04. Modelo de Procesos](./docs/04-modelo-de-procesos/README.md)
- [05. Modelo Entidad-Relación](./docs/05-modelo-entidad-relacion/README.md)
- [06. Diccionario de Datos](./docs/06-diccionario-de-datos/README.md)
- [07. Reglas de Negocio](./docs/07-reglas-de-negocio/README.md)
- [08. Seguridad y Permisos](./docs/08-seguridad-y-permisos/README.md)
- [09. Indicadores y Viabilidad](./docs/09-indicadores-y-viabilidad/README.md)
- [10. Arquitectura Tecnológica](./docs/10-arquitectura-tecnologica/README.md)

---

## Empresa Ficticia de Demostración
- **Nombre**: Distribuidora Central del Pacífico S.A.
- **Cédula Jurídica**: 3-101-789456
- **Propósito**: Datos iniciales de prueba y validación de funcionalidades multiempresa.
