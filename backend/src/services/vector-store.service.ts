import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env';

export class VectorStoreUnavailableError extends Error {
  constructor(message: string = 'El motor de base de datos vectorial Qdrant no está disponible en http://localhost:6333.') {
    super(message);
    this.name = 'VectorStoreUnavailableError';
  }
}

export interface VectorPoint {
  id: string; // UUID
  vector: number[];
  payload: {
    empresa_id: string;
    documento_id: string;
    fragmento_id: string;
    carpeta_id?: string;
    nombre_documento: string;
    fecha_modificacion?: string;
    url_documento?: string;
    numero_fragmento: number;
    contenido: string;
    [key: string]: any;
  };
}

export interface SearchMatch {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

export class VectorStoreService {
  private qdrantClient: QdrantClient | null = null;
  private isQdrantReachable: boolean = false;
  private defaultCollection: string = 'nexosupply_documents';
  private lastCheckTime: number = 0;

  constructor() {
    this.checkHealth().catch(() => {});
  }

  public async checkHealth(): Promise<boolean> {
    const now = Date.now();
    // Cachear estado por 5 segundos para evitar sobrecarga en healthchecks repetidos
    if (this.qdrantClient && now - this.lastCheckTime < 5000) {
      return this.isQdrantReachable;
    }
    this.lastCheckTime = now;

    try {
      if (!this.qdrantClient) {
        this.qdrantClient = new QdrantClient({
          url: env.QDRANT_URL || 'http://localhost:6333',
          apiKey: env.QDRANT_API_KEY || undefined,
          checkCompatibility: false,
        });
      }

      const collections = await this.qdrantClient.getCollections();
      this.isQdrantReachable = true;
      await this.ensureCollection(this.defaultCollection, 384);
      return true;
    } catch {
      this.isQdrantReachable = false;
      return false;
    }
  }

  public isQdrantActive(): boolean {
    return this.isQdrantReachable;
  }

  public async ensureCollection(collectionName: string = this.defaultCollection, vectorSize: number = 384): Promise<void> {
    if (!this.isQdrantReachable || !this.qdrantClient) return;

    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (!exists) {
        await this.qdrantClient.createCollection(collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
      }
    } catch (err: any) {
      console.warn(`[QDRANT] Advertencia verificando colección ${collectionName}:`, err.message);
    }
  }

  /**
   * Inserta o actualiza vectores con metadatos en Qdrant
   */
  public async upsertVectors(
    points: VectorPoint[],
    collectionName: string = this.defaultCollection
  ): Promise<void> {
    if (points.length === 0) return;

    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.qdrantClient) {
      throw new VectorStoreUnavailableError(
        'No se pudieron indexar los fragmentos vectoriales: El servidor Qdrant no responde en http://localhost:6333.'
      );
    }

    try {
      await this.qdrantClient.upsert(collectionName, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
    } catch (err: any) {
      console.error('[QDRANT] Error en upsert Qdrant:', err.message);
      throw new Error(`Error al persistir vectores en Qdrant: ${err.message}`);
    }
  }

  /**
   * Elimina vectores de un documento específico de una empresa
   */
  public async deleteVectorsByDocument(
    documentoId: string,
    empresaId: string,
    collectionName: string = this.defaultCollection
  ): Promise<void> {
    if (!empresaId) throw new Error('empresa_id es obligatorio para eliminar vectores');

    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.qdrantClient) {
      // Si Qdrant está offline no bloqueamos la eliminación en MySQL pero emitimos advertencia
      console.warn('[QDRANT] Omitiendo purga en Qdrant porque el servidor no está en ejecución.');
      return;
    }

    try {
      await this.qdrantClient.delete(collectionName, {
        filter: {
          must: [
            { key: 'empresa_id', match: { value: empresaId } },
            { key: 'documento_id', match: { value: documentoId } },
          ],
        },
      });
    } catch (err: any) {
      console.warn('[QDRANT] Advertencia eliminando vectores en Qdrant:', err.message);
    }
  }

  /**
   * Búsqueda por similitud semántica (Coseno) con FILTRO OBLIGATORIO de empresa
   * SIN RESPALDO SILENCIOSO: Si Qdrant no está disponible, lanza VectorStoreUnavailableError.
   */
  public async searchSimilar(
    queryVector: number[],
    empresaId: string,
    limit: number = 5,
    minScore: number = 0.25,
    collectionName: string = this.defaultCollection
  ): Promise<SearchMatch[]> {
    if (!empresaId) {
      throw new Error('VIOLACION DE SEGURIDAD MULTIEMPRESA: No se permite búsqueda vectorial sin filtro obligatorio de empresa_id.');
    }

    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.qdrantClient) {
      throw new VectorStoreUnavailableError(
        'Búsqueda vectorial no disponible: El motor Qdrant no está activo en http://localhost:6333.'
      );
    }

    try {
      const clientAny = this.qdrantClient as any;
      const searchFn = clientAny.search || clientAny.query;
      if (typeof searchFn !== 'function') {
        throw new Error('El cliente de Qdrant no soporta el método search/query esperado.');
      }

      const searchResult = await searchFn.call(this.qdrantClient, collectionName, {
        vector: queryVector,
        limit,
        score_threshold: minScore,
        filter: {
          must: [
            {
              key: 'empresa_id',
              match: { value: empresaId },
            },
          ],
        },
      });

      if (Array.isArray(searchResult)) {
        return searchResult.map((r: any) => ({
          id: String(r.id),
          score: Number((r.score || 0).toFixed(4)),
          payload: r.payload as VectorPoint['payload'],
        }));
      }
      return [];
    } catch (err: any) {
      console.error('[QDRANT] Error en consulta vectorial:', err.message);
      throw err;
    }
  }
}

export const vectorStoreService = new VectorStoreService();
