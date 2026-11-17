import { google } from 'googleapis';
import path from 'path';

async function testCopy() {
  const keyFile = path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const rootId = '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'; // NexoSupply-Root
  const sourceFileId = '1zyS1CavPTcUoGwOh7RSAP3X89CLeqpQg'; // File owned by oscarguidorosales101@gmail.com

  console.log('--- Probando drive.files.copy de un archivo del usuario ---');
  try {
    const copyRes = await drive.files.copy({
      fileId: sourceFileId,
      requestBody: {
        name: 'test-copy.json',
        parents: [rootId],
      },
      fields: 'id, name, owners',
      supportsAllDrives: true,
    });
    console.log('[OK] Copia creada exitosamente:', copyRes.data);
    await drive.files.delete({ fileId: copyRes.data.id! });
    console.log('[OK] Copia limpiada');
  } catch (err: any) {
    console.error('Fallo en drive.files.copy:', err.message);
  }
}

testCopy().catch(console.error);
