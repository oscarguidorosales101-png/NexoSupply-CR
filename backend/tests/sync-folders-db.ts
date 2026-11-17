import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMPRESA_ID = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

const FOLDERS = [
  // Raíz y Estructura Global
  { id: 'f-root', nombre: 'NexoSupply-Root', categoria: 'ROOT', drive_folder_id: '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1', ruta: 'NexoSupply-Root' },
  { id: 'f-docs', nombre: '00-DOCUMENTACION-DEL-PROYECTO', categoria: 'DOCS_ROOT', drive_folder_id: '1jy__rU-GyKkP8U4tv0_XGk2af5aoEkJ1', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO' },
  { id: 'f-docs-01', nombre: '01-Idea-Empresarial', categoria: 'DOCUMENTACION', drive_folder_id: '1_kpaX-KYxLzA0bgNdVVst_TrzLsAoosl', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/01-Idea-Empresarial' },
  { id: 'f-docs-02', nombre: '02-Alcance-Funcional', categoria: 'DOCUMENTACION', drive_folder_id: '16vi87Q1R9FLIOafrb568u22YmCLi3k6I', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/02-Alcance-Funcional' },
  { id: 'f-docs-03', nombre: '03-Modelo-Multiempresa', categoria: 'DOCUMENTACION', drive_folder_id: '10a2cbFDuNIslJ8O0NqXgIUyVaTEO2C3i', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/03-Modelo-Multiempresa' },
  { id: 'f-docs-04', nombre: '04-Modelo-De-Procesos', categoria: 'DOCUMENTACION', drive_folder_id: '1cEMB6x6VUmeiNzwKOg0tzLIl884Hyn38', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/04-Modelo-De-Procesos' },
  { id: 'f-docs-05', nombre: '05-Modelo-Entidad-Relacion', categoria: 'DOCUMENTACION', drive_folder_id: '10dHNGcxDwy44phzZ953HNRhKqvm8f56D', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/05-Modelo-Entidad-Relacion' },
  { id: 'f-docs-06', nombre: '06-Diccionario-De-Datos', categoria: 'DOCUMENTACION', drive_folder_id: '1Nz7Z4vRi6j_-vhhiSl88X0huwYsDICV9', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/06-Diccionario-De-Datos' },
  { id: 'f-docs-07', nombre: '07-Reglas-De-Negocio', categoria: 'DOCUMENTACION', drive_folder_id: '1aecj1mArbqXg1VyCe0mYmglkMdrzcfyi', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/07-Reglas-De-Negocio' },
  { id: 'f-docs-08', nombre: '08-Seguridad-Y-Permisos', categoria: 'DOCUMENTACION', drive_folder_id: '1nApZGKVrjdJhoKXxzxYn4orJbznUaBHE', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/08-Seguridad-Y-Permisos' },
  { id: 'f-docs-09', nombre: '09-Indicadores-Y-Viabilidad', categoria: 'DOCUMENTACION', drive_folder_id: '1wY96GfVWc06NGJCR4Zii7BvW2xWaxSlX', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/09-Indicadores-Y-Viabilidad' },
  { id: 'f-docs-10', nombre: '10-Arquitectura-Tecnologica', categoria: 'DOCUMENTACION', drive_folder_id: '1VLV1rzIHiqosmFHeD3JTKZJ7ToAkZPa9', ruta: 'NexoSupply-Root/00-DOCUMENTACION-DEL-PROYECTO/10-Arquitectura-Tecnologica' },

  // 01-EMPRESAS / Empresa-001
  { id: 'f-emp-root', nombre: '01-EMPRESAS', categoria: 'EMPRESAS_ROOT', drive_folder_id: '1J4rhfX4mLQuqM4rNd3yH8o8TwTz00zsT', ruta: 'NexoSupply-Root/01-EMPRESAS' },
  { id: 'f-emp-001', nombre: 'Empresa-001', categoria: 'EMPRESA_CARPETA', drive_folder_id: '1yWfxZgIfLD_DWiXKGH51juF-iPdIPObH', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001' },
  { id: `${EMPRESA_ID}-GENERAL`, nombre: '01-Informacion-General', categoria: 'GENERAL', drive_folder_id: '1F1i7i5Kds1SrgFg_wLB0QarhEyGqy3e3', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/01-Informacion-General' },
  { id: `${EMPRESA_ID}-PROVEEDORES`, nombre: '02-Proveedores', categoria: 'PROVEEDORES', drive_folder_id: '1_0NgRdFII43x5oajUqTV2JcIybwYmI87', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/02-Proveedores' },
  { id: `${EMPRESA_ID}-INVENTARIO`, nombre: '03-Productos-E-Inventario', categoria: 'INVENTARIO', drive_folder_id: '1G275FrxTNM6mqWswpseLErf_FlEJJGVc', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/03-Productos-E-Inventario' },
  { id: `${EMPRESA_ID}-COMPRAS`, nombre: '04-Compras-Y-Ordenes', categoria: 'COMPRAS', drive_folder_id: '1CZQTWYyvADn_smMaGZVfXiHT4zIZLOwT', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/04-Compras-Y-Ordenes' },
  { id: `${EMPRESA_ID}-LOGISTICA`, nombre: '05-Recepciones-Y-Logistica', categoria: 'LOGISTICA', drive_folder_id: '1UmVg-4ufxqP7cDioUrtUQt61bslvud4h', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/05-Recepciones-Y-Logistica' },
  { id: `${EMPRESA_ID}-EVALUACIONES`, nombre: '06-Evaluaciones-E-Incidencias', categoria: 'EVALUACIONES', drive_folder_id: '1CaQXEUITpke-I-pRAxzejto005G4Q_A4', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/06-Evaluaciones-E-Incidencias' },
  { id: `${EMPRESA_ID}-RIESGOS`, nombre: '07-Riesgos-Y-Alertas', categoria: 'RIESGOS', drive_folder_id: '1wDI8VISA02BYtheSzo_q2qh1DnFGvXVr', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/07-Riesgos-Y-Alertas' },
  { id: `${EMPRESA_ID}-REPORTES`, nombre: '08-Reportes-E-Indicadores', categoria: 'REPORTES', drive_folder_id: '1K0zp3MqxzLkVtvobAzotF6ViYMlvAisj', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/08-Reportes-E-Indicadores' },
  { id: `${EMPRESA_ID}-POLITICAS`, nombre: '09-Procedimientos-Y-Politicas', categoria: 'POLITICAS', drive_folder_id: '1GcDScz5I5UUIpk6kcxfcHtjhH2a6Dyur', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/09-Procedimientos-Y-Politicas' },
  { id: `${EMPRESA_ID}-HISTORICO`, nombre: '10-Historico', categoria: 'HISTORICO', drive_folder_id: '1rH6mevfEv-Mq7RtKRxp7fM9eIdggC4y_', ruta: 'NexoSupply-Root/01-EMPRESAS/Empresa-001/10-Historico' },

  // 02-ADMINISTRACION-NEXOSUPPLY
  { id: 'f-admin-root', nombre: '02-ADMINISTRACION-NEXOSUPPLY', categoria: 'ADMIN_ROOT', drive_folder_id: '1LZPuGUcxjG8aAbLqI_LO0rLf_522E8C_', ruta: 'NexoSupply-Root/02-ADMINISTRACION-NEXOSUPPLY' },
  { id: 'f-admin-manuales', nombre: 'Manuales-Del-Sistema', categoria: 'MANUALES', drive_folder_id: '1rkeLur5-U_2Y08TkW3yyxY_peTRYLkhz', ruta: 'NexoSupply-Root/02-ADMINISTRACION-NEXOSUPPLY/Manuales-Del-Sistema' },
  { id: 'f-admin-tecnica', nombre: 'Documentacion-Tecnica', categoria: 'TECNICA', drive_folder_id: '1uqkvgMFCEeNkAxv6zIwVj7q3q1E-jaw0', ruta: 'NexoSupply-Root/02-ADMINISTRACION-NEXOSUPPLY/Documentacion-Tecnica' },
  { id: 'f-admin-politicas', nombre: 'Politicas-Generales', categoria: 'POLITICAS_ADMIN', drive_folder_id: '1C5ZFtZ_jdSa25OtZlOVkeboI58z1ik9e', ruta: 'NexoSupply-Root/02-ADMINISTRACION-NEXOSUPPLY/Politicas-Generales' },

  // 03-REGISTROS-DE-SINCRONIZACION
  { id: 'f-sync-root', nombre: '03-REGISTROS-DE-SINCRONIZACION', categoria: 'SYNC_ROOT', drive_folder_id: '1HTIxbFThILDz8F2zxhVkWj3ocQtPQ56Z', ruta: 'NexoSupply-Root/03-REGISTROS-DE-SINCRONIZACION' },
  { id: 'f-sync-historial', nombre: 'Historial-De-Ingesta', categoria: 'HISTORIAL_INGESTA', drive_folder_id: '1ivk1cxL63Rfa2iWxRPb46N9iCBCqWGRK', ruta: 'NexoSupply-Root/03-REGISTROS-DE-SINCRONIZACION/Historial-De-Ingesta' },
  { id: 'f-sync-incidencias', nombre: 'Incidencias-De-Sincronizacion', categoria: 'INCIDENCIAS_SYNC', drive_folder_id: '1cE0rKcqedmFJPjJirWwcWjn1e_p3qdrW', ruta: 'NexoSupply-Root/03-REGISTROS-DE-SINCRONIZACION/Incidencias-De-Sincronizacion' },
];

async function main() {
  console.log('--- Sincronizando 31 Carpetas Drive en MySQL CarpetaDrive ---');
  for (const f of FOLDERS) {
    const res = await prisma.carpetaDrive.upsert({
      where: { id: f.id },
      update: {
        nombre: f.nombre,
        categoria: f.categoria,
        drive_folder_id: f.drive_folder_id,
        ruta_relativa: f.ruta,
        activa: true,
      },
      create: {
        id: f.id,
        empresa_id: EMPRESA_ID,
        nombre: f.nombre,
        categoria: f.categoria,
        drive_folder_id: f.drive_folder_id,
        ruta_relativa: f.ruta,
        activa: true,
      },
    });
    console.log(`[OK] Carpeta DB: ${res.nombre} (Drive ID: ${res.drive_folder_id})`);
  }
}

main().finally(() => prisma.$disconnect());
