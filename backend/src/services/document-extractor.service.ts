const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule;
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';

export interface ExtractionResult {
  texto: string;
  requiereOcr: boolean;
  totalPaginasOFilas?: number;
  metadatosExtraidos: Record<string, any>;
  estado: 'EXITOSO' | 'REQUIERE_OCR' | 'ERROR';
  error?: string;
}

export class DocumentExtractorService {
  /**
   * Extrae contenido estructurado de un archivo según su tipo MIME
   */
  public async extract(buffer: Buffer, mimeType: string, nombreArchivo: string): Promise<ExtractionResult> {
    const ext = nombreArchivo.split('.').pop()?.toLowerCase() || '';

    try {
      // 1. PDF
      if (mimeType === 'application/pdf' || ext === 'pdf') {
        return await this.extractPdf(buffer);
      }

      // 2. DOCX
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'docx'
      ) {
        return await this.extractDocx(buffer);
      }

      // 3. XLSX / XLS
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        ext === 'xlsx' ||
        ext === 'xls'
      ) {
        return this.extractExcel(buffer);
      }

      // 4. CSV
      if (mimeType === 'text/csv' || ext === 'csv') {
        return this.extractCsv(buffer);
      }

      // 5. TXT / Google Docs exportado a texto
      if (mimeType === 'text/plain' || ext === 'txt') {
        const text = buffer.toString('utf8');
        return {
          texto: this.normalizeText(text),
          requiereOcr: false,
          metadatosExtraidos: { encoding: 'utf-8', length: text.length },
          estado: 'EXITOSO',
        };
      }

      // Tipo por defecto: intentar texto utf-8
      const fallbackText = buffer.toString('utf8');
      return {
        texto: this.normalizeText(fallbackText),
        requiereOcr: false,
        metadatosExtraidos: { fallback: true },
        estado: 'EXITOSO',
      };
    } catch (err: any) {
      console.error(`[EXTRACTOR] Error procesando documento ${nombreArchivo}:`, err.message);
      return {
        texto: '',
        requiereOcr: false,
        metadatosExtraidos: {},
        estado: 'ERROR',
        error: err.message,
      };
    }
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    try {
      let rawText = '';
      let paginas = 1;

      if (typeof PDFParse === 'function' && PDFParse.prototype && PDFParse.prototype.getText) {
        const parser = new PDFParse(new Uint8Array(buffer));
        await parser.load();
        const res = await parser.getText();
        rawText = res?.text || '';
        paginas = res?.total || 1;
      } else if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(buffer);
        rawText = data?.text || '';
        paginas = data?.numpages || 1;
      } else {
        // Fallback simple por buffer si es texto incrustado
        rawText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\táéíóúñüÁÉÍÓÚÑÜ]/g, ' ');
      }

      const cleanText = this.normalizeText(rawText);

      // Detección de PDF escaneado (sin capa de texto)
      if (cleanText.trim().length < 30 && paginas > 0) {
        return {
          texto: '',
          requiereOcr: true,
          totalPaginasOFilas: paginas,
          metadatosExtraidos: {
            paginas,
            advertencia: 'Documento escaneado o sin capa de texto seleccionable. Requiere OCR para indexacion.',
          },
          estado: 'REQUIERE_OCR',
        };
      }

      return {
        texto: cleanText,
        requiereOcr: false,
        totalPaginasOFilas: paginas,
        metadatosExtraidos: { paginas },
        estado: 'EXITOSO',
      };
    } catch (err: any) {
      return {
        texto: '',
        requiereOcr: false,
        metadatosExtraidos: {},
        estado: 'ERROR',
        error: err.message,
      };
    }
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    const res = await mammoth.extractRawText({ buffer });
    const clean = this.normalizeText(res.value || '');
    return {
      texto: clean,
      requiereOcr: false,
      metadatosExtraidos: { warnings: res.messages },
      estado: 'EXITOSO',
    };
  }

  private extractExcel(buffer: Buffer): ExtractionResult {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetsText: string[] = [];
    let totalFilas = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(sheet);
      if (csvData && csvData.trim().length > 0) {
        sheetsText.push(`--- Hoja: ${sheetName} ---\n${csvData}`);
        totalFilas += csvData.split('\n').length;
      }
    }

    const fullText = sheetsText.join('\n\n');
    return {
      texto: fullText,
      requiereOcr: false,
      totalPaginasOFilas: totalFilas,
      metadatosExtraidos: { hojas: workbook.SheetNames, totalFilas },
      estado: 'EXITOSO',
    };
  }

  private extractCsv(buffer: Buffer): ExtractionResult {
    const content = buffer.toString('utf8');
    const records = parseCsv(content, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    const rowsFormatted = records.map((row: string[]) => row.join(' | ')).join('\n');
    return {
      texto: rowsFormatted,
      requiereOcr: false,
      totalPaginasOFilas: records.length,
      metadatosExtraidos: { totalFilas: records.length },
      estado: 'EXITOSO',
    };
  }

  public normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export const documentExtractorService = new DocumentExtractorService();
