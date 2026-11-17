# MODELO DE DATOS Y RELACIONES EN PRISMA Y MYSQL

El sistema consta de 32 tablas agrupadas funcionalmente:
1. **Seguridad y Acceso:** Usuario, Rol, Permiso, Sesion, Auditoria.
2. **Multiempresa:** Empresa, ConfiguracionEmpresa, EmpresaUsuario.
3. **Proveedores:** Proveedor, EvaluacionProveedor, ContactoProveedor.
4. **Productos:** Categoria, UnidadMedida, Producto, ListaPrecios.
5. **Inventario:** Almacen, InventarioStock, MovimientoInventario, AjusteInventario.
6. **Compras:** SolicitudCompra, DetalleSolicitudCompra, OrdenCompra, DetalleOrdenCompra, RecepcionCompra, DetalleRecepcionCompra.
7. **Riesgos y Analisis:** AlertaRiesgo, SimulacionAbastecimiento, ReporteGenerado.
8. **Documental y RAG:** CarpetaDrive, DocumentoDrive, FragmentoDocumental, SincronizacionDrive, TrabajoIngesta, HistorialConsultaRag, CredencialOAuthDrive.
