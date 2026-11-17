import { google } from 'googleapis';
import path from 'path';

async function testDocsApi() {
  const keyFile = path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const rootId = '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'; // NexoSupply-Root

  console.log('--- Probando creación mediante Google Docs API ---');
  try {
    // 1. Crear documento en blanco mediante Google Docs API
    const doc = await docs.documents.create({
      requestBody: {
        title: 'empresa_test_doc',
      },
    });
    console.log('[OK] Google Doc creado:', doc.data.documentId, doc.data.title);

    // 2. Moverlo dentro de NexoSupply-Root
    await drive.files.update({
      fileId: doc.data.documentId!,
      addParents: rootId,
      fields: 'id, parents, webViewLink',
      supportsAllDrives: true,
    });
    console.log('[OK] Documento movido a NexoSupply-Root con éxito!');

    // 3. Insertar texto en el documento mediante Google Docs API batchUpdate
    await docs.documents.batchUpdate({
      documentId: doc.data.documentId!,
      requestBody: {
        requests: [
          {
            insertText: {
              text: 'NEXOSUPPLY CR — DATOS DE EMPRESA\n\nNombre: Distribuidora Central del Pacífico S.A.\nCédula: 3-101-789456\nEstado: ACTIVA (DEMO)\n',
              location: { index: 1 },
            },
          },
        ],
      },
    });
    console.log('[ÉXITO ROTUNDO] Texto insertado en el documento de Google Drive!');

    // Limpieza
    await drive.files.delete({ fileId: doc.data.documentId! });
    console.log('[OK] Documento de prueba limpiado.');
  } catch (err: any) {
    console.error('Fallo en Google Docs API:', err.message);
  }
}

testDocsApi().catch(console.error);
