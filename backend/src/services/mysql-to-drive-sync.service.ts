import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { googleDriveService } from './google-drive.service';

export interface GeneratedDocument {
  categoria: string;
  nombreArchivo: string;
  buffer: Buffer;
  mimeType: string;
}

export class MysqlToDriveSyncService {
  /**
   * Genera los documentos PDF oficiales a partir de los datos vivos de MySQL
   */
  public async generateOperationalPdfs(empresaId: string): Promise<GeneratedDocument[]> {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        configuracion: true,
      },
    });

    if (!empresa) throw new Error('Empresa no encontrada');

    const docs: GeneratedDocument[] = [];

    // 1. Inventario Actual y Existencias por Almacén
    const inventarioPdf = await this.buildInventarioPdf(empresa);
    docs.push({
      categoria: 'INVENTARIO',
      nombreArchivo: 'inventario_actual.pdf',
      buffer: inventarioPdf,
      mimeType: 'application/pdf',
    });

    // 2. Catálogo de Productos y SKUs
    const catalogoPdf = await this.buildCatalogoProductosPdf(empresa);
    docs.push({
      categoria: 'INVENTARIO',
      nombreArchivo: 'catalogo_productos.pdf',
      buffer: catalogoPdf,
      mimeType: 'application/pdf',
    });

    // 3. Órdenes de Compra y Estado de Abastecimiento
    const ordenesPdf = await this.buildOrdenesPendientesPdf(empresa);
    docs.push({
      categoria: 'COMPRAS',
      nombreArchivo: 'ordenes_pendientes.pdf',
      buffer: ordenesPdf,
      mimeType: 'application/pdf',
    });

    // 4. Evaluaciones de Proveedores e Incidencias
    const evaluacionesPdf = await this.buildEvaluacionesPdf(empresa);
    docs.push({
      categoria: 'EVALUACIONES',
      nombreArchivo: 'evaluacion_proveedores.pdf',
      buffer: evaluacionesPdf,
      mimeType: 'application/pdf',
    });

    // 5. Alertas Críticas y Gestión de Riesgos
    const riesgosPdf = await this.buildRiesgosPdf(empresa);
    docs.push({
      categoria: 'RIESGOS',
      nombreArchivo: 'alertas_criticas.pdf',
      buffer: riesgosPdf,
      mimeType: 'application/pdf',
    });

    // 6. Resumen Ejecutivo e Indicadores Clave
    const indicadoresPdf = await this.buildIndicadoresPdf(empresa);
    docs.push({
      categoria: 'REPORTES',
      nombreArchivo: 'resumen_ejecutivo.pdf',
      buffer: indicadoresPdf,
      mimeType: 'application/pdf',
    });

    return docs;
  }

  /**
   * Ejecuta la sincronización hacia Google Drive mediante patrón Outbox y trabajos de ingesta
   */
  public async syncToDrive(empresaId: string): Promise<{
    sincronizados: number;
    errores: number;
    detalles: string[];
  }> {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new Error('Empresa no encontrada');

    // 1. Asegurar que las carpetas existan en MySQL y Drive
    const carpetas = await googleDriveService.ensureEnterpriseFolders(
      empresa.id,
      `Empresa-${empresa.rfc_cedula.slice(-6)}`
    );

    // 2. Generar PDFs con datos vivos
    const pdfs = await this.generateOperationalPdfs(empresaId);
    let sincronizados = 0;
    let errores = 0;
    const detalles: string[] = [];

    for (const doc of pdfs) {
      const carpeta = carpetas.find((c) => c.categoria === doc.categoria);
      const carpetaId = carpeta ? carpeta.id : undefined;
      const driveFolderId = carpeta?.drive_folder_id;

      // Registrar trabajo Outbox en estado PROCESANDO
      const trabajo = await prisma.trabajoIngesta.create({
        data: {
          empresa_id: empresaId,
          tipo_trabajo: 'EXPORT_MYSQL_DOC',
          estado: 'PROCESANDO',
          payload_json: {
            nombreArchivo: doc.nombreArchivo,
            categoria: doc.categoria,
          },
        },
      });

      try {
        let driveFileId = `local-sync-${empresaId}-${doc.nombreArchivo}`;
        let webViewLink = `https://drive.google.com/file/d/${driveFileId}/view`;

        // Si Google Drive API está conectado y la carpeta tiene ID físico en Drive, subir el archivo real
        if (googleDriveService.isReady() && driveFolderId) {
          try {
            const uploaded = await googleDriveService.uploadOrUpdateFile(
              driveFolderId,
              doc.nombreArchivo,
              doc.mimeType,
              doc.buffer
            );
            driveFileId = uploaded.id;
            webViewLink = uploaded.webViewLink || webViewLink;
          } catch (driveErr: any) {
            console.warn(`[DRIVE_UPLOAD] Subida física diferida para ${doc.nombreArchivo}:`, driveErr.message);
          }
        }

        // Registrar o actualizar documento en tabla DocumentoDrive
        const docRecord = await prisma.documentoDrive.upsert({
          where: {
            id: `${empresaId}-${doc.nombreArchivo}`,
          },
          update: {
            carpeta_id: carpetaId,
            drive_file_id: driveFileId,
            nombre: doc.nombreArchivo,
            tipo_mime: doc.mimeType,
            tamanio_bytes: BigInt(doc.buffer.length),
            url_web_view: webViewLink,
            estado_indexacion: 'PENDIENTE', // Listo para que el pipeline RAG lo procese
            fecha_modificacion_drive: new Date(),
            fecha_sincronizacion: new Date(),
          },
          create: {
            id: `${empresaId}-${doc.nombreArchivo}`,
            empresa_id: empresaId,
            carpeta_id: carpetaId,
            drive_file_id: driveFileId,
            nombre: doc.nombreArchivo,
            tipo_mime: doc.mimeType,
            tamanio_bytes: BigInt(doc.buffer.length),
            url_web_view: webViewLink,
            estado_indexacion: 'PENDIENTE',
            fecha_modificacion_drive: new Date(),
            fecha_sincronizacion: new Date(),
          },
        });

        // Actualizar trabajo Outbox a SINCRONIZADO
        await prisma.trabajoIngesta.update({
          where: { id: trabajo.id },
          data: {
            estado: 'SINCRONIZADO',
            documento_id: docRecord.id,
          },
        });

        sincronizados++;
        detalles.push(`Sincronizado: ${doc.nombreArchivo} (${(doc.buffer.length / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        errores++;
        detalles.push(`Error en ${doc.nombreArchivo}: ${err.message}`);
        await prisma.trabajoIngesta.update({
          where: { id: trabajo.id },
          data: {
            estado: 'ERROR',
            error_detalle: err.message,
          },
        });
      }
    }

    return { sincronizados, errores, detalles };
  }

  // --- GENERADORES PDF INDIVIDUALES ---

  private async buildInventarioPdf(empresa: any): Promise<Buffer> {
    const stocks = await prisma.inventarioStock.findMany({
      where: { empresa_id: empresa.id },
      include: {
        producto: { select: { sku: true, nombre: true, costo_promedio: true } },
        almacen: { select: { nombre: true, codigo: true } },
      },
      orderBy: { cantidad_actual: 'asc' },
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'REPORTE DE INVENTARIO Y EXISTENCIAS POR ALMACEN', empresa);

      doc.fontSize(10).font('Helvetica-Bold').text('Existencias consolidadas por SKU:', { underline: true });
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('SKU                Producto                                  Almacen                  Actual    Minimo   Costo Prom.');
      doc.text('-----------------------------------------------------------------------------------------------------------------');
      doc.font('Helvetica').fontSize(8);

      for (const s of stocks) {
        const sku = (s.producto.sku || '').padEnd(16);
        const prod = (s.producto.nombre || '').slice(0, 38).padEnd(40);
        const alm = (s.almacen.nombre || '').slice(0, 22).padEnd(24);
        const cant = String(s.cantidad_actual).padStart(7);
        const min = String(s.stock_minimo).padStart(8);
        const costo = `${empresa.moneda_base} ${Number(s.producto.costo_promedio).toFixed(0)}`.padStart(13);

        doc.text(`${sku} ${prod} ${alm} ${cant} ${min} ${costo}`);
      }

      doc.moveDown(1.5);
      doc.fontSize(8).font('Helvetica-Oblique').text(`Total de registros de inventario evaluados: ${stocks.length}`);
    });
  }

  private async buildCatalogoProductosPdf(empresa: any): Promise<Buffer> {
    const productos = await prisma.producto.findMany({
      where: { empresa_id: empresa.id, activo: true },
      include: { categoria: true, unidad_medida: true },
      orderBy: { nombre: 'asc' },
      take: 60,
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'CATALOGO OFICIAL DE PRODUCTOS Y SUMINISTROS', empresa);

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('SKU            Nombre del Producto                          Categoria          Unidad     Costo Ref.');
      doc.text('---------------------------------------------------------------------------------------------------------');
      doc.font('Helvetica').fontSize(8);

      for (const p of productos) {
        const sku = (p.sku || '').padEnd(14);
        const nom = (p.nombre || '').slice(0, 40).padEnd(43);
        const cat = (p.categoria?.nombre || 'General').slice(0, 16).padEnd(18);
        const uni = (p.unidad_medida?.codigo || 'UND').padEnd(9);
        const precio = `${empresa.moneda_base} ${Number(p.costo_promedio).toFixed(0)}`;

        doc.text(`${sku} ${nom} ${cat} ${uni} ${precio}`);
      }
    });
  }

  private async buildOrdenesPendientesPdf(empresa: any): Promise<Buffer> {
    const ordenes = await prisma.ordenCompra.findMany({
      where: {
        empresa_id: empresa.id,
        estado: { in: ['EMITIDA', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDA'] },
      },
      include: { proveedor: true },
      orderBy: { fecha_emision: 'desc' },
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'ORDENES DE COMPRA ACTIVAS Y PENDIENTES DE ENTREGA', empresa);

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Orden           Proveedor                         Fecha Emision    Promesa Entrega   Estado                  Total');
      doc.text('------------------------------------------------------------------------------------------------------------------');
      doc.font('Helvetica').fontSize(8);

      for (const o of ordenes) {
        const num = (o.numero_orden || '').padEnd(14);
        const prov = (o.proveedor?.nombre_legal || 'Proveedor').slice(0, 30).padEnd(32);
        const fechaE = new Date(o.fecha_emision).toLocaleDateString().padEnd(16);
        const fechaP = (o.fecha_prometida_entrega ? new Date(o.fecha_prometida_entrega).toLocaleDateString() : 'N/D').padEnd(17);
        const est = (o.estado || '').slice(0, 20).padEnd(22);
        const tot = `${o.moneda} ${Number(o.total).toLocaleString('es-CR')}`;

        doc.text(`${num} ${prov} ${fechaE} ${fechaP} ${est} ${tot}`);
      }
    });
  }

  private async buildEvaluacionesPdf(empresa: any): Promise<Buffer> {
    const evals = await prisma.evaluacionProveedor.findMany({
      where: { empresa_id: empresa.id },
      include: { proveedor: true },
      orderBy: { calificacion_global: 'desc' },
      take: 40,
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'REPORTE DE EVALUACION DE PROVEEDORES Y CUMPLIMIENTO', empresa);

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Proveedor                         Periodo     OTD (%)   OFR (%)   Incidencias   Score Global  Clasificacion');
      doc.text('-------------------------------------------------------------------------------------------------------------');
      doc.font('Helvetica').fontSize(8);

      for (const e of evals) {
        const prov = (e.proveedor?.nombre_legal || 'Proveedor').slice(0, 30).padEnd(32);
        const per = (e.periodo || '').padEnd(11);
        const otd = `${Number(e.indice_puntualidad).toFixed(1)}%`.padStart(8);
        const ofr = `${Number(e.indice_cumplimiento_cant).toFixed(1)}%`.padStart(9);
        const inc = `${Number(e.indice_incidencias).toFixed(0)}`.padStart(12);
        const score = `${Number(e.calificacion_global).toFixed(2)}`.padStart(13);
        const nivel = `   ${e.categoria_desempeno}`;

        doc.text(`${prov} ${per} ${otd} ${ofr} ${inc} ${score} ${nivel}`);
      }
    });
  }

  private async buildRiesgosPdf(empresa: any): Promise<Buffer> {
    const alertas = await prisma.alertaRiesgo.findMany({
      where: { empresa_id: empresa.id },
      orderBy: { createdAt: 'desc' },
      take: 35,
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'MATRIZ DE RIESGOS OPERATIVOS Y ALERTAS ACTIVAS', empresa);

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Severidad   Estado            Fecha           Titulo / Detalle del Riesgo');
      doc.text('-------------------------------------------------------------------------------------------------------------');
      doc.font('Helvetica').fontSize(8);

      for (const a of alertas) {
        const sev = (a.nivel_severidad || '').padEnd(11);
        const est = (a.estado || (a.resuelta ? 'RESUELTO' : 'CRITICO')).padEnd(17);
        const fecha = new Date(a.createdAt).toLocaleDateString().padEnd(15);
        const tit = a.titulo.slice(0, 50);

        doc.text(`${sev} ${est} ${fecha} ${tit}`);
        if (a.mensaje) {
          doc.fontSize(7).font('Helvetica-Oblique').text(`           Detalle: ${a.mensaje.slice(0, 100)}`);
          doc.fontSize(8).font('Helvetica');
        }
      }
    });
  }

  private async buildIndicadoresPdf(empresa: any): Promise<Buffer> {
    const totalProd = await prisma.producto.count({ where: { empresa_id: empresa.id } });
    const totalProv = await prisma.proveedor.count({ where: { empresa_id: empresa.id, activo: true } });
    const ordenesActivas = await prisma.ordenCompra.count({
      where: { empresa_id: empresa.id, estado: { in: ['EMITIDA', 'EN_TRANSITO'] } },
    });

    return await this.createPdfBuffer((doc) => {
      this.writeHeader(doc, 'INFORME EJECUTIVO DE GESTION DE ABASTECIMIENTO', empresa);

      doc.fontSize(11).font('Helvetica-Bold').text('RESUMEN GENERAL DE OPERACIONES', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Empresa Auditada: ${empresa.razon_social}`);
      doc.text(`Identificacion Fiscal / Cedula: ${empresa.rfc_cedula}`);
      doc.text(`Moneda Operativa Base: ${empresa.moneda_base}`);
      doc.text(`Catalogo Activo de SKUs: ${totalProd} productos`);
      doc.text(`Proveedores Registrados y Activos: ${totalProv} empresas`);
      doc.text(`Ordenes de Compra en Proceso: ${ordenesActivas} ordenes`);
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').text('POLITICAS Y DIRECTRICES OPERATIVAS:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      doc.text('1. Todo ingreso a bodega requiere documento de recepcion y cotejo fisico contra orden de compra.');
      doc.text('2. Las compras que superen el limite de autoaprobacion deben contar con visto bueno administrativo.');
      doc.text('3. Las alertas en estado CRITICO deben ser atendidas o pasadas a seguimiento preventivo en un plazo maximo de 24 horas.');
    });
  }

  private writeHeader(doc: PDFKit.PDFDocument, titulo: string, empresa: any): void {
    doc.fontSize(15).font('Helvetica-Bold').text('NEXOSUPPLY CR — SISTEMA INTELIGENTE DE GESTION', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`${empresa.razon_social} (Cedula: ${empresa.rfc_cedula})`, { align: 'center' });
    doc.fontSize(8).font('Helvetica-Oblique').text(`Fecha de Emision Documental: ${new Date().toLocaleString('es-CR')} | Origen: MySQL 8`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.moveDown(1);
  }

  private createPdfBuffer(builder: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      try {
        builder(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const mysqlToDriveSyncService = new MysqlToDriveSyncService();
