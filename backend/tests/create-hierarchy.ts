import { google } from 'googleapis';
import path from 'path';

async function createHierarchy() {
  const keyFile = path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const rootId = '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'; // NexoSupply-Root

  console.log('--- Creando Estructura Normada en NexoSupply-Root ---');

  // Función auxiliar para obtener o crear carpeta
  async function getOrCreate(name: string, parentId: string) {
    const list = await drive.files.list({
      q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
    });
    if (list.data.files && list.data.files.length > 0) {
      console.log(`[EXISTE] ${name} -> ID: ${list.data.files[0].id}`);
      return list.data.files[0].id!;
    }
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id, name',
      supportsAllDrives: true,
    });
    console.log(`[CREADA] ${name} -> ID: ${created.data.id}`);
    return created.data.id!;
  }

  // 1. 00-DOCUMENTACION-DEL-PROYECTO
  const fDocs = await getOrCreate('00-DOCUMENTACION-DEL-PROYECTO', rootId);
  const subDocs = [
    '01-Idea-Empresarial',
    '02-Alcance-Funcional',
    '03-Modelo-Multiempresa',
    '04-Modelo-De-Procesos',
    '05-Modelo-Entidad-Relacion',
    '06-Diccionario-De-Datos',
    '07-Reglas-De-Negocio',
    '08-Seguridad-Y-Permisos',
    '09-Indicadores-Y-Viabilidad',
    '10-Arquitectura-Tecnologica',
  ];
  const docsFolderMap: Record<string, string> = {};
  for (const s of subDocs) {
    docsFolderMap[s] = await getOrCreate(s, fDocs);
  }

  // 2. 01-EMPRESAS / Empresa-001
  const fEmpresas = await getOrCreate('01-EMPRESAS', rootId);
  const fEmpresa001 = await getOrCreate('Empresa-001', fEmpresas);
  const subEmpresa = [
    '01-Informacion-General',
    '02-Proveedores',
    '03-Productos-E-Inventario',
    '04-Compras-Y-Ordenes',
    '05-Recepciones-Y-Logistica',
    '06-Evaluaciones-E-Incidencias',
    '07-Riesgos-Y-Alertas',
    '08-Reportes-E-Indicadores',
    '09-Procedimientos-Y-Politicas',
    '10-Historico',
  ];
  const empresaFolderMap: Record<string, string> = {};
  for (const s of subEmpresa) {
    empresaFolderMap[s] = await getOrCreate(s, fEmpresa001);
  }

  // 3. 02-ADMINISTRACION-NEXOSUPPLY
  const fAdmin = await getOrCreate('02-ADMINISTRACION-NEXOSUPPLY', rootId);
  const subAdmin = [
    'Manuales-Del-Sistema',
    'Documentacion-Tecnica',
    'Politicas-Generales',
  ];
  const adminFolderMap: Record<string, string> = {};
  for (const s of subAdmin) {
    adminFolderMap[s] = await getOrCreate(s, fAdmin);
  }

  // 4. 03-REGISTROS-DE-SINCRONIZACION
  const fSync = await getOrCreate('03-REGISTROS-DE-SINCRONIZACION', rootId);
  const subSync = [
    'Historial-De-Ingesta',
    'Incidencias-De-Sincronizacion',
  ];
  const syncFolderMap: Record<string, string> = {};
  for (const s of subSync) {
    syncFolderMap[s] = await getOrCreate(s, fSync);
  }

  console.log('\n========================================================');
  console.log('ESTRUCTURA DE CARPETAS CREADA Y VERIFICADA EXITOSAMENTE');
  console.log('========================================================');
  console.log({
    rootId,
    fDocs,
    docsFolderMap,
    fEmpresas,
    fEmpresa001,
    empresaFolderMap,
    fAdmin,
    adminFolderMap,
    fSync,
    syncFolderMap,
  });
}

createHierarchy().catch(console.error);
