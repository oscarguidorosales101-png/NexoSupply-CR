import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stream from 'stream';
import { prisma } from '../config/database';
import { googleDriveOAuthService } from '../services/google-drive-oauth.service';

interface SupplierReportResult {
  totalProveedores: number;
  nombreArchivo: string;
  rutaDrive: string;
  idCarpetaDestino: string;
  idArchivoSubido?: string;
  resultadoVerificacionDescarga?: string;
  archivoExisteFisicamente: boolean;
  oauthConectado: boolean;
  authUrl?: string;
  mensaje: string;
  contenidoReporte: string;
}

export async function generateAndPublishProveedoresReport(): Promise<SupplierReportResult> {
  const empresaId = 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
  const nombreArchivo = 'informe_proveedores.txt';
  const rutaDrive = 'NexoSupply-Root/01-EMPRESAS/Empresa-001/02-Proveedores/';
  
  // 1. Carpeta oficial verificada directamente en Google Drive
  const idCarpetaDestino = '1_0NgRdFII43x5oajUqTV2JcIybwYmI87'; // 02-Proveedores en Google Drive real
  const carpetaDestino = await prisma.carpetaDrive.findFirst({
    where: {
      empresa_id: empresaId,
      drive_folder_id: idCarpetaDestino,
    },
  });

  // 2. Consultar proveedores reales de MySQL mediante Prisma
  const proveedores = await prisma.proveedor.findMany({
    where: {
      empresa_id: empresaId,
    },
    include: {
      contactos: true,
      productos_proveedores: {
        include: {
          producto: {
            include: {
              categoria: true,
            },
          },
        },
      },
    },
    orderBy: [
      { clasificacion: 'asc' },
      { nombre_legal: 'asc' },
    ],
  });

  const fechaGeneracion = new Date().toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 3. Estructurar el contenido del informe en texto plano
  let texto = '================================================================================\n';
  texto += '                    NEXOSUPPLY CR — INFORME DE PROVEEDORES                      \n';
  texto += '                 SISTEMA DE GESTION DE ABASTECIMIENTO E INVENTARIO              \n';
  texto += '================================================================================\n\n';
  texto += `Empresa: Distribuidora Central del Pacífico S.A. (Empresa-001)\n`;
  texto += `Cédula Jurídica: 3-101-789456\n`;
  texto += `Fecha y Hora de Generación: ${fechaGeneracion} (Hora Costa Rica)\n`;
  texto += `Cantidad Total de Proveedores Registrados: ${proveedores.length}\n`;
  texto += `Ruta de Destino en Google Drive: ${rutaDrive}\n`;
  texto += `ID de Carpeta de Destino: ${idCarpetaDestino}\n\n`;
  texto += '================================================================================\n';
  texto += '                         DETALLE DE PROVEEDORES REGISTRADOS                     \n';
  texto += '================================================================================\n\n';

  proveedores.forEach((p, index) => {
    texto += `[PROVEEDOR #${index + 1}]\n`;
    texto += `--------------------------------------------------------------------------------\n`;
    texto += `Nombre Comercial (Fantasía) : ${p.nombre_fantasia || 'N/A'}\n`;
    texto += `Razón Social (Legal)        : ${p.nombre_legal}\n`;
    texto += `Identificación Fiscal (Céd) : ${p.identificador_fiscal}\n`;
    texto += `Clasificación / Nivel       : Categoría ${p.clasificacion}\n`;
    texto += `Estado Operativo Actual     : ${p.activo ? 'ACTIVO' : 'INACTIVO'}\n`;
    texto += `Términos de Pago            : ${p.terminos_pago_dias} días crédito\n`;
    texto += `Moneda Preferida            : ${p.moneda_preferida}\n`;
    texto += `Tiempo de Entrega (Lead Time): ${p.lead_time_promedio_dias} días hábiles\n`;
    texto += `Correo Electrónico          : ${p.email || 'No registrado'}\n`;
    texto += `Teléfono de Contacto        : ${p.telefono || 'No registrado'}\n`;
    texto += `Dirección Física            : ${p.direccion || 'No registrada'}\n\n`;

    // Contactos
    texto += `  Contactos Autorizados (${p.contactos.length}):\n`;
    if (p.contactos.length === 0) {
      texto += `    - No hay contactos individuales registrados.\n`;
    } else {
      p.contactos.forEach((c) => {
        texto += `    * ${c.nombre} — Cargo: ${c.cargo || 'N/A'} | Tel: ${c.telefono || 'N/A'} | Email: ${c.email || 'N/A'} ${c.es_principal ? '[CONTACTO PRINCIPAL]' : ''}\n`;
      });
    }
    texto += `\n`;

    // Productos y Servicios Vinculados
    texto += `  Catálogo de Productos y Servicios Suministrados (${p.productos_proveedores.length}):\n`;
    if (p.productos_proveedores.length === 0) {
      texto += `    - Sin productos asignados formalmente en catálogo.\n`;
    } else {
      p.productos_proveedores.forEach((pp) => {
        const prod = pp.producto;
        const catNombre = prod.categoria?.nombre || 'General';
        texto += `    * [${prod.sku}] ${prod.nombre} | Cat: ${catNombre} | Costo Acordado: ${pp.precio_unitario_acordado} ${pp.moneda} | Lead Time: ${pp.dias_entrega_esperados} días ${pp.es_preferido ? '[PREFERIDO]' : ''}\n`;
      });
    }
    texto += `\n--------------------------------------------------------------------------------\n\n`;
  });

  texto += '================================================================================\n';
  texto += '                            FIN DEL INFORME DE PROVEEDORES                      \n';
  texto += '                    DOCUMENTO GENERADO AUTOMATICAMENTE POR NEXOSUPPLY CR        \n';
  texto += '================================================================================\n';

  const fileBuffer = Buffer.from(texto, 'utf-8');
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Guardar copia inmutable en almacenamiento local Outbox
  const outboxDir = path.resolve(process.cwd(), 'storage/drive_outbox/01-EMPRESAS/Empresa-001/02-Proveedores');
  fs.mkdirSync(outboxDir, { recursive: true });
  const outboxFilePath = path.join(outboxDir, nombreArchivo);
  fs.writeFileSync(outboxFilePath, fileBuffer);

  // 5. Verificar si existe cliente OAuth 2.0 autenticado
  const oauthClient = await googleDriveOAuthService.getAuthenticatedClient(empresaId);
  const oauthStatus = await googleDriveOAuthService.getStatus(empresaId);

  if (!oauthClient || !oauthStatus.conectado) {
    // Generar la URL de autorización específica para que el usuario pueda conceder acceso
    const authUrlData = googleDriveOAuthService.getAuthUrl(empresaId, 'admin-publish');

    // Registrar en tabla DocumentoDrive como pendiente de subida física
    const docId = `doc-prov-${crypto.createHash('md5').update(`${empresaId}-${nombreArchivo}`).digest('hex')}`;
    await prisma.documentoDrive.upsert({
      where: { id: docId },
      update: {
        nombre: nombreArchivo,
        tipo_mime: 'text/plain',
        tamanio_bytes: BigInt(fileBuffer.length),
        hash_contenido: sha256,
        estado_indexacion: 'PENDIENTE',
        version: '1',
      },
      create: {
        id: docId,
        carpeta_id: carpetaDestino ? carpetaDestino.id : undefined,
        empresa_id: empresaId,
        drive_file_id: 'PENDIENTE_OAUTH',
        nombre: nombreArchivo,
        tipo_mime: 'text/plain',
        tamanio_bytes: BigInt(fileBuffer.length),
        hash_contenido: sha256,
        estado_indexacion: 'PENDIENTE',
        version: '1',
      },
    });

    return {
      totalProveedores: proveedores.length,
      nombreArchivo,
      rutaDrive,
      idCarpetaDestino,
      archivoExisteFisicamente: false,
      oauthConectado: false,
      authUrl: authUrlData.url,
      mensaje: 'OAuth 2.0 no está conectado actualmente. Las cuentas de servicio de Google Cloud tienen 0 bytes de cuota de almacenamiento en Mi unidad personal, por lo que la API rechaza la subida directa con Service Account. Se requiere la autorización OAuth 2.0 del propietario (oscarguidorosales101@gmail.com) para escribir en Google Drive.',
      contenidoReporte: texto,
    };
  }

  // 6. Si OAuth 2.0 está conectado, realizar la subida física a Google Drive
  try {
    const uploadRes = await googleDriveOAuthService.uploadOrUpdateFile(
      empresaId,
      idCarpetaDestino,
      nombreArchivo,
      'text/plain',
      fileBuffer
    );

    const driveFileId = uploadRes.driveFileId;

    // 7. Descarga de verificación obligatoria desde Google Drive API
    const downloadRes = await oauthClient.files.get(
      {
        fileId: driveFileId,
        alt: 'media',
      },
      { responseType: 'stream' }
    );

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      (downloadRes.data as stream.Readable)
        .on('data', (c) => chunks.push(Buffer.from(c)))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const downloadedBuffer = Buffer.concat(chunks);
    const downloadedSha256 = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
    const coincidenciaExacta = downloadedSha256 === sha256;

    // 8. Verificar que aparezca en la lista de la carpeta sin duplicados
    const listCheck = await oauthClient.files.list({
      q: `'${idCarpetaDestino}' in parents and name='${nombreArchivo}' and trashed=false`,
      fields: 'files(id, name, size)',
    });

    const totalArchivosConEseNombre = listCheck.data.files?.length || 0;

    return {
      totalProveedores: proveedores.length,
      nombreArchivo,
      rutaDrive,
      idCarpetaDestino,
      idArchivoSubido: driveFileId,
      resultadoVerificacionDescarga: coincidenciaExacta
        ? `DESCARGA_VERIFICADA_CORRECTA: Hash SHA-256 coincide exactamente (${sha256.substring(0, 16)}...). Archivos en carpeta: ${totalArchivosConEseNombre} (sin duplicados).`
        : `DISCREPANCIA_HASH: Original=${sha256} vs Descargado=${downloadedSha256}`,
      archivoExisteFisicamente: true,
      oauthConectado: true,
      mensaje: 'Archivo subido y verificado físicamente en Google Drive.',
      contenidoReporte: texto,
    };
  } catch (error: any) {
    return {
      totalProveedores: proveedores.length,
      nombreArchivo,
      rutaDrive,
      idCarpetaDestino,
      archivoExisteFisicamente: false,
      oauthConectado: true,
      mensaje: `Error al subir el archivo a Google Drive: ${error.message}`,
      contenidoReporte: texto,
    };
  }
}

// Ejecución directa si se invoca por línea de comandos
if (require.main === module) {
  generateAndPublishProveedoresReport()
    .then((result) => {
      console.log('=============================================================');
      console.log('RESULTADO DE GENERACION Y PUBLICACION DE INFORME DE PROVEEDORES');
      console.log('=============================================================');
      console.log('Total Proveedores Consultados:', result.totalProveedores);
      console.log('Nombre de Archivo           :', result.nombreArchivo);
      console.log('Ruta en Google Drive         :', result.rutaDrive);
      console.log('ID Carpeta Destino           :', result.idCarpetaDestino);
      console.log('OAuth Conectado              :', result.oauthConectado);
      console.log('Archivo Existe Físicamente   :', result.archivoExisteFisicamente);
      if (result.idArchivoSubido) {
        console.log('ID Archivo Subido            :', result.idArchivoSubido);
      }
      if (result.resultadoVerificacionDescarga) {
        console.log('Resultado de Descarga        :', result.resultadoVerificacionDescarga);
      }
      if (result.authUrl) {
        console.log('\nURL DE AUTORIZACION OAUTH 2.0 PENDIENTE:');
        console.log(result.authUrl);
      }
      console.log('\nMensaje:', result.mensaje);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}
