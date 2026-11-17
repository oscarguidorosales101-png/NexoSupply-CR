# POLITICAS DE SEGURIDAD DE LA INFORMACION — NEXOSUPPLY CR

- **Aislamiento Multi-Tenant:** Ninguna consulta o busqueda vectorial puede omitir el identificador de empresa (`empresa_id`).
- **Cifrado de Credenciales:** Los tokens OAuth se cifran con AES-256-GCM y clave derivada de 32 bytes.
- **Proteccion de Secretos:** Queda terminantemente prohibido almacenar archivos `.env`, claves privadas o credenciales en Google Drive o en repositorios publicos.
- **Auditoria Inmutable:** Toda accion critica queda registrada en bitacoras de auditoria con marca temporal y usuario ejecutor.
