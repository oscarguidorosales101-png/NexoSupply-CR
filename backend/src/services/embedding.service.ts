import { env } from '../config/env';

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  provider: string;
  model: string;
}

export class EmbeddingService {
  private dimension: number = 384;
  private provider: string = 'xenova-transformers';
  private model: string = 'Xenova/all-MiniLM-L6-v2';
  private pipelinePromise: Promise<any> | null = null;

  constructor() {
    this.provider = env.EMBEDDING_PROVIDER && env.EMBEDDING_PROVIDER !== 'local' ? env.EMBEDDING_PROVIDER : 'xenova-transformers';
    this.model = env.EMBEDDING_MODEL && env.EMBEDDING_MODEL !== 'local-semantic-384' ? env.EMBEDDING_MODEL : 'Xenova/all-MiniLM-L6-v2';
  }

  private async getExtractor() {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const { pipeline } = await import('@xenova/transformers');
        return await pipeline('feature-extraction', this.model, {
          quantized: true,
        });
      })();
    }
    return await this.pipelinePromise;
  }

  public getDimension(): number {
    return this.dimension;
  }

  public getProvider(): string {
    return this.provider;
  }

  public getModel(): string {
    return this.model;
  }

  /**
   * Genera vector de embedding denso real (384 dimensiones) usando transformer ONNX local
   */
  public async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      return {
        vector: new Array(this.dimension).fill(0),
        dimension: this.dimension,
        provider: this.provider,
        model: this.model,
      };
    }

    try {
      const extractor = await this.getExtractor();
      const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data as Float32Array) as number[];

      return {
        vector,
        dimension: vector.length || this.dimension,
        provider: this.provider,
        model: this.model,
      };
    } catch (err: any) {
      console.error('[EMBEDDINGS] Error al inferir embedding con transformer local:', err.message);
      throw new Error(`Fallo en generador de embeddings densos: ${err.message}`);
    }
  }

  /**
   * Genera lote de embeddings
   */
  public async generateBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (const t of texts) {
      results.push(await this.generateEmbedding(t));
    }
    return results;
  }
}

export const embeddingService = new EmbeddingService();
