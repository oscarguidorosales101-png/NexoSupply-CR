export const ROLES = {
  ADMIN_EMPRESARIAL: 'ADMIN_EMPRESARIAL',
  GERENCIA: 'GERENCIA',
  COMPRAS: 'COMPRAS',
  LOGISTICA: 'LOGISTICA',
} as const;

export type RolCodigo = (typeof ROLES)[keyof typeof ROLES];

export const PERMISOS = {
  // Empresas
  EMPRESAS_CONFIGURAR: 'empresas:configurar',
  USUARIOS_GESTIONAR: 'usuarios:gestionar',

  // Proveedores
  PROVEEDORES_CREAR_EDITAR: 'proveedores:crear_editar',

  // Productos
  PRODUCTOS_GESTIONAR: 'productos:gestionar',

  // Compras
  SOLICITUDES_CREAR: 'solicitudes:crear',
  SOLICITUDES_APROBAR: 'solicitudes:aprobar',
  ORDENES_EMITIR: 'ordenes:emitir',

  // Logística e Inventario
  RECEPCIONES_REGISTRAR: 'recepciones:registrar',
  INVENTARIO_AJUSTAR: 'inventario:ajustar',

  // Análisis y Reportes
  SIMULACIONES_EJECUTAR: 'simulaciones:ejecutar',
  REPORTES_GERENCIALES: 'reportes:gerenciales',
} as const;

export type PermisoCodigo = (typeof PERMISOS)[keyof typeof PERMISOS];
