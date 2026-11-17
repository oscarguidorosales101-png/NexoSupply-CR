export interface Chunk {
  numeroFragmento: number;
  contenido: string;
  tokensEstimados: number;
  inicioCaracter: number;
  finCaracter: number;
}

export class ChunkingService {
  /**
   * Divide un texto en fragmentos semánticos respetando párrafos, encabezados y listas
   * @param text Texto completo extraído
   * @param chunkSizeTokens Tamaño objetivo en tokens (1 token ≈ 4 caracteres)
   * @param overlapTokens Solapamiento en tokens
   */
  public chunkText(
    text: string,
    chunkSizeTokens: number = 750,
    overlapTokens: number = 100
  ): Chunk[] {
    if (!text || text.trim().length === 0) return [];

    const targetChunkSizeChars = Math.max(chunkSizeTokens * 4, 400);
    const overlapChars = Math.max(overlapTokens * 4, 50);

    // Separar por bloques naturales de contenido (párrafos dobles, saltos de línea, tablas)
    const blocks = text.split(/\n\s*\n/);
    const chunks: Chunk[] = [];

    let currentChunkText = '';
    let currentStartIndex = 0;
    let runningIndex = 0;

    for (const block of blocks) {
      const cleanBlock = block.trim();
      if (!cleanBlock) {
        runningIndex += block.length + 2;
        continue;
      }

      // Si el bloque por sí solo excede el tamaño máximo, fragmentarlo por oraciones o líneas
      if (cleanBlock.length > targetChunkSizeChars) {
        const subLines = cleanBlock.split(/(?<=[.!?])\s+|\n/);
        for (const line of subLines) {
          if (!line.trim()) continue;

          if (currentChunkText.length + line.length > targetChunkSizeChars && currentChunkText.length > 0) {
            chunks.push(this.buildChunk(chunks.length + 1, currentChunkText, currentStartIndex));

            // Aplicar solapamiento
            const overlapPart = currentChunkText.slice(Math.max(0, currentChunkText.length - overlapChars));
            currentStartIndex = runningIndex - overlapPart.length;
            currentChunkText = overlapPart + '\n' + line;
          } else {
            if (currentChunkText.length === 0) {
              currentStartIndex = runningIndex;
            }
            currentChunkText = currentChunkText ? currentChunkText + '\n' + line : line;
          }
          runningIndex += line.length + 1;
        }
      } else {
        if (currentChunkText.length + cleanBlock.length > targetChunkSizeChars && currentChunkText.length > 0) {
          chunks.push(this.buildChunk(chunks.length + 1, currentChunkText, currentStartIndex));

          // Aplicar solapamiento del final del fragmento anterior
          const overlapPart = currentChunkText.slice(Math.max(0, currentChunkText.length - overlapChars));
          currentStartIndex = runningIndex - overlapPart.length;
          currentChunkText = overlapPart + '\n\n' + cleanBlock;
        } else {
          if (currentChunkText.length === 0) {
            currentStartIndex = runningIndex;
          }
          currentChunkText = currentChunkText ? currentChunkText + '\n\n' + cleanBlock : cleanBlock;
        }
        runningIndex += block.length + 2;
      }
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push(this.buildChunk(chunks.length + 1, currentChunkText, currentStartIndex));
    }

    return chunks;
  }

  private buildChunk(numero: number, contenido: string, inicio: number): Chunk {
    const cleanContent = contenido.trim();
    return {
      numeroFragmento: numero,
      contenido: cleanContent,
      tokensEstimados: Math.ceil(cleanContent.length / 4),
      inicioCaracter: Math.max(0, inicio),
      finCaracter: Math.max(0, inicio + cleanContent.length),
    };
  }
}

export const chunkingService = new ChunkingService();
