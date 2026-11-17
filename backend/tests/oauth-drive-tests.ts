import crypto from 'crypto';
import { googleDriveOAuthService } from '../src/services/google-drive-oauth.service';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

async function runOAuthDriveTests() {
  console.log('================================================================');
  console.log('NEXOSUPPLY CR - SUITE DE PRUEBAS UNITARIAS Y DE SEGURIDAD OAUTH');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  const empresaDemoId = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
  const usuarioDemoId = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

  // 1. Detección y Configuración de Credenciales
  console.log('\n--- 1. Configuracion y Descubrimiento de Credenciales ---');
  assert(googleDriveOAuthService.isOAuthConfigured(), 'Credenciales OAuth 2.0 detectadas y configuradas correctamente');
  assert(
    googleDriveOAuthService.getRootFolderId() === '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1',
    'Carpeta raiz autorizada coincide con NexoSupply-Root (1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1)'
  );
  assert(
    googleDriveOAuthService.getExpectedOwnerEmail() === 'oscarguidorosales101@gmail.com',
    'Email del propietario autorizado coincide estrictamente con oscarguidorosales101@gmail.com'
  );

  // 2. Generación y Validación de Auth URL
  console.log('\n--- 2. Generacion de Auth URL y Scopes ---');
  const { url, state } = googleDriveOAuthService.getAuthUrl(empresaDemoId, usuarioDemoId);
  assert(typeof url === 'string' && url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'URL de autorizacion valida hacia accounts.google.com');
  assert(url.includes('access_type=offline'), 'Solicitud explicita de acceso offline (access_type=offline)');
  assert(url.includes('prompt=consent'), 'Solicitud explicita de prompt=consent para recepcion de refresh_token');
  assert(url.includes('drive.file'), 'Alcance restringido a https://www.googleapis.com/auth/drive.file');
  assert(url.includes('userinfo.email'), 'Alcance incluye https://www.googleapis.com/auth/userinfo.email');
  assert(url.includes(`state=${encodeURIComponent(state)}`), 'Parametro state criptografico inyectado en URL');

  // 3. Mecanismo Criptográfico Anti-CSRF
  console.log('\n--- 3. Proteccion Criptografica Anti-CSRF (State con HMAC-SHA256) ---');
  const verifiedState = googleDriveOAuthService.verifyState(state);
  assert(verifiedState.empresaId === empresaDemoId, 'Recuperacion integra de empresaId desde el state');
  assert(verifiedState.userId === usuarioDemoId, 'Recuperacion integra de userId desde el state');

  // Probar rechazo de state alterado
  let tamperingRejected = false;
  try {
    const alteredState = state.slice(0, -4) + 'abcd';
    googleDriveOAuthService.verifyState(alteredState);
  } catch (err: any) {
    tamperingRejected = err.message.includes('firma criptográfica inválida');
  }
  assert(tamperingRejected, 'Rechazo estricto ante manipulacion o ataque CSRF en el parametro state');

  // 4. Cifrado y Descifrado AES-256-GCM para Tokens
  console.log('\n--- 4. Cifrado de Tokens con AES-256-GCM ---');
  const sampleTokenPayload = JSON.stringify({
    access_token: 'ya29.sample_test_token_1234567890',
    refresh_token: '1//04_test_refresh_token_very_long_and_secret',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    token_type: 'Bearer',
    expiry_date: Date.now() + 3600 * 1000,
  });

  // Acceder a metodos de cifrado
  const anyService = googleDriveOAuthService as any;
  const encrypted = anyService.encrypt(sampleTokenPayload);
  assert(Boolean(encrypted.cipherText && encrypted.iv && encrypted.tag), 'Generacion de criptograma, IV de 12 bytes y Auth Tag GCM');
  assert(encrypted.cipherText !== sampleTokenPayload, 'El criptograma difiere completamente del texto plano');

  const decrypted = anyService.decrypt(encrypted.cipherText, encrypted.iv, encrypted.tag);
  assert(decrypted === sampleTokenPayload, 'Descifrado integro y exacto del payload de tokens');

  // Probar rechazo ante tag alterado
  let tagTamperingRejected = false;
  try {
    const badTag = crypto.randomBytes(16).toString('hex');
    anyService.decrypt(encrypted.cipherText, encrypted.iv, badTag);
  } catch (err: any) {
    tagTamperingRejected = true;
  }
  assert(tagTamperingRejected, 'Rechazo criptografico inmediato si el Tag de autenticidad es manipulado');

  // 5. Barrera Estricta de Escritura en Google Drive
  console.log('\n--- 5. Restriccion Estricta de Escritura a NexoSupply-Root ---');
  const rootAllowed = await googleDriveOAuthService.isFolderAllowed(
    '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1',
    empresaDemoId
  );
  assert(rootAllowed, 'Carpeta raiz NexoSupply-Root autorizada para operaciones de escritura');

  const arbitraryFolderDenied = await googleDriveOAuthService.isFolderAllowed(
    '1_MALICIOUS_OUTSIDE_FOLDER_9999',
    empresaDemoId
  );
  assert(!arbitraryFolderDenied, 'Carpeta arbitraria externa denegada categoricamente para escritura');

  // 6. Persistencia y Consulta de Estado en MySQL
  console.log('\n--- 6. Estado de Conexion y Persistencia en MySQL ---');
  const status = await googleDriveOAuthService.getStatus(empresaDemoId);
  assert(typeof status.conectado === 'boolean', 'Consulta de estado OAuth retorna estructura valida');
  assert(status.raizAutorizada === '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1', 'Estado reporta raiz autorizada correcta');

  // 7. Verificación de los 15 Archivos Operativos TXT en Disco
  console.log('\n--- 7. Disponibilidad de 15 Archivos Operativos TXT ---');
  const fs = require('fs');
  const path = require('path');
  const exportDir = path.resolve(__dirname, '../drive_txt_export');
  assert(fs.existsSync(exportDir), 'Directorio drive_txt_export existe fisicamente');
  const txtFiles = fs.readdirSync(exportDir).filter((f: string) => f.endsWith('.txt'));
  assert(txtFiles.length === 15, `Se verificaron los 15 archivos operativos generados (Total: ${txtFiles.length})`);

  console.log('\n================================================================');
  console.log(`RESULTADO DE LA SUITE OAUTH: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runOAuthDriveTests().catch((err) => {
  console.error('[FATAL] Error ejecutando suite de pruebas OAuth:', err);
  process.exit(1);
});
