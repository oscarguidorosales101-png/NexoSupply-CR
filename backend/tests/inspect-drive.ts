import { google } from 'googleapis';
import path from 'path';

async function testDrive() {
  const keyFile = path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  console.log('--- 1. Buscando NexoSupply-Root ---');
  const res = await drive.files.list({
    q: "name = 'NexoSupply-Root' and trashed = false",
    fields: 'files(id, name, mimeType, owners, shared, webViewLink, capabilities, permissions)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = res.data.files || [];
  console.log(`Coincidencias encontradas: ${files.length}`);
  for (const f of files) {
    console.log(`Nombre: ${f.name}`);
    console.log(`ID: ${f.id}`);
    console.log(`MIME: ${f.mimeType}`);
    console.log(`Propietarios: ${JSON.stringify(f.owners?.map((o: any) => o.emailAddress))}`);
    console.log(`Compartido: ${f.shared}`);
    console.log(`Permisos canAddChildren: ${f.capabilities?.canAddChildren}`);
    console.log(`Permisos canEdit: ${f.capabilities?.canEdit}`);
    console.log(`Enlace: ${f.webViewLink}`);
  }

  if (files.length === 1) {
    const root = files[0];
    console.log('\n--- 2. Verificando capacidades de escritura y subida dentro de NexoSupply-Root ---');
    try {
      const testSub = await drive.files.create({
        requestBody: {
          name: 'test-permisos-temp',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [root.id!],
        },
        fields: 'id, name',
      });
      console.log(`[OK] Subcarpeta creada exitosamente: ${testSub.data.name} (ID: ${testSub.data.id})`);

      const testFile = await drive.files.create({
        requestBody: {
          name: 'test-archivo-temp.txt',
          mimeType: 'text/plain',
          parents: [testSub.data.id!],
        },
        media: {
          mimeType: 'text/plain',
          body: 'Prueba de escritura real en NexoSupply-Root desde NexoSupply CR.',
        },
        fields: 'id, name, webViewLink',
      });
      console.log(`[OK] Archivo TXT subido exitosamente: ${testFile.data.name} (ID: ${testFile.data.id})`);
      console.log(`[OK] Enlace web del archivo de prueba: ${testFile.data.webViewLink}`);

      // Modificación / lectura
      const getFile = await drive.files.get({
        fileId: testFile.data.id!,
        alt: 'media',
      });
      console.log(`[OK] Lectura del archivo: "${getFile.data}"`);

      // Limpieza de prueba
      await drive.files.delete({ fileId: testSub.data.id! });
      console.log('[OK] Carpeta y archivo de prueba limpiados correctamente.');
    } catch (err: any) {
      console.error('[ERROR] Fallo al probar permisos en NexoSupply-Root:', err.message);
    }
  }
}

testDrive().catch(console.error);
