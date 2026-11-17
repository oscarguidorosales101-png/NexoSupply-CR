import { google } from 'googleapis';
import path from 'path';

async function testOwnershipTransfer() {
  const keyFile = path.resolve(process.cwd(), '../nexosupply-cr-209e6cfebcda (1).json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const rootId = '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'; // NexoSupply-Root

  console.log('--- Probando transferencia de propiedad de archivo vacío ---');
  try {
    const file = await drive.files.create({
      requestBody: {
        name: 'test-transfer.txt',
        mimeType: 'text/plain',
        parents: [rootId],
      },
      fields: 'id, name, owners',
      supportsAllDrives: true,
    });
    console.log('[OK] Archivo 0 bytes creado:', file.data);

    // Intentar transferir propiedad al usuario oscarguidorosales101@gmail.com
    try {
      const permRes = await drive.permissions.create({
        fileId: file.data.id!,
        transferOwnership: true,
        requestBody: {
          role: 'owner',
          type: 'user',
          emailAddress: 'oscarguidorosales101@gmail.com',
        },
        supportsAllDrives: true,
      });
      console.log('[OK] Permiso transferido:', permRes.data);

      // Ahora intentar escribir contenido al archivo ahora que el dueño es oscarguidorosales101@gmail.com
      const updateRes = await drive.files.update({
        fileId: file.data.id!,
        media: {
          mimeType: 'text/plain',
          body: 'Contenido escrito después de transferir la propiedad al usuario.',
        },
        fields: 'id, name, size, owners',
        supportsAllDrives: true,
      });
      console.log('[ÉXITO TOTAL] Contenido subido exitosamente:', updateRes.data);
    } catch (errTransfer: any) {
      console.error('Fallo en transferencia de propiedad:', errTransfer.message);
    }

    await drive.files.delete({ fileId: file.data.id! });
  } catch (err: any) {
    console.error('Fallo general:', err.message);
  }
}

testOwnershipTransfer().catch(console.error);
