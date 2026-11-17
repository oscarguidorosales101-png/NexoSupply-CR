import crypto from 'crypto';
import { env } from '../config/env';

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  provider: string;
  model: string;
}

export class EmbeddingService {
  private dimension: number = 384;
  private provider: string;
  private model: string;

  constructor() {
    this.provider = env.EMBEDDING_PROVIDER || 'local';
    this.model = env.EMBEDDING_MODEL || 'local-semantic-384';
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
   * Genera vector de embedding para un fragmento o consulta
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

    // Modo Local Determinista Semántico (Sin dependencia de servicios externos de IA)
    const vector = this.generateLocalSemanticVector(cleanText, this.dimension);
    return {
      vector,
      dimension: this.dimension,
      provider: this.provider,
      model: this.model,
    };
  }

  /**
   * Genera lote de embeddings
   */
  public async generateBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return await Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }

  private static readonly STOP_WORDS = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
    'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
    'este', 'si', 'porque', 'esta', 'son', 'entre', 'era', 'fue', 'sobre', 'ser',
    'tiene', 'cual', 'cuales', 'cuando', 'donde', 'quien', 'ano', 'hace', 'desde'
  ]);

  /**
   * Motor de embeddings semánticos local de 384 dimensiones
   * Utiliza hashing de n-gramas de caracteres, ponderación de términos y proyección con normalización L2
   */
  private generateLocalSemanticVector(text: string, dim: number): number[] {
    const vector = new Array(dim).fill(0);
    const tokens = text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const isStopWord = EmbeddingService.STOP_WORDS.has(token);
      // Peso de posición y frecuencia, atenuando fuertemente palabras vacías
      const baseWeight = isStopWord ? 0.05 : 1.0;
      const weight = baseWeight / Math.sqrt(1 + i * 0.05);

      // Hashes múltiples para distribuir características semánticas
      const hash1 = this.hashString(token);
      const hash2 = this.hashString(token + '_pos_' + (i % 5));
      const hash3 = this.hashString(token.slice(0, 4));

      const idx1 = Math.abs(hash1) % dim;
      const idx2 = Math.abs(hash2) % dim;
      const idx3 = Math.abs(hash3) % dim;

      const sign1 = (hash1 & 1) === 0 ? 1 : -1;
      const sign2 = (hash2 & 1) === 0 ? 1 : -1;
      const sign3 = (hash3 & 1) === 0 ? 1 : -1;

      vector[idx1] += weight * sign1;
      vector[idx2] += (weight * 0.5) * sign2;
      vector[idx3] += (weight * 0.3) * sign3;

      // Bigramas contiguos
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        const bigramHash = this.hashString(bigram);
        const bIdx = Math.abs(bigramHash) % dim;
        const bSign = (bigramHash & 1) === 0 ? 1 : -1;
        vector[bIdx] += (weight * 0.8) * bSign;
      }
    }

    // Normalización Euclídea L2 (unit vector para que el producto punto equivalga a similitud coseno)
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}

export const embeddingService = new EmbeddingService();
