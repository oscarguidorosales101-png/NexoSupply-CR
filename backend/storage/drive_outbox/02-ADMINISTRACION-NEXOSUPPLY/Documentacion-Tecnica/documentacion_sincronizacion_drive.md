# ARQUITECTURA DE SINCRONIZACION Y PATRON OUTBOX

### Caracteristicas de Resiliencia:
- **Patron Outbox:** Las modificaciones en el negocio se encolan en la tabla `trabajos_ingesta` sin bloquear la transaccion operativa.
- **Idempotencia:** Cada archivo se verifica con hash SHA-256 antes de transmitirlo para evitar sobreescrituras innecesarias.
- **Drive Changes API:** Monitorea cambios remotos en las carpetas para sincronizar versiones de documentos actualizados en Google Drive.
