import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env';

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
  // Almacenamiento vectorial en memoria local de respaldo si Qdrant no está corriendo
  private localVectorStore: Map<string, Map<string, VectorPoint>> = new Map();

  constructor() {
    this.initQdrant();
  }

  private async initQdrant(): Promise<void> {
    try {
      this.qdrantClient = new QdrantClient({
        url: env.QDRANT_URL || 'http://localhost:6333',
        apiKey: env.QDRANT_API_KEY || undefined,
        checkCompatibility: false,
      });

      // Validar si Qdrant responde
      const collections = await this.qdrantClient.getCollections();
      this.isQdrantReachable = true;
      console.log('[QDRANT] Conexión establecida con Qdrant Vector Engine en', env.QDRANT_URL);
      await this.ensureCollection(this.defaultCollection, 384);
    } catch {
      this.isQdrantReachable = false;
      console.log('[VECTOR_STORE] Qdrant no está activo en', env.QDRANT_URL, '— Operando con Motor Vectorial Local en Memoria/MySQL.');
    }
  }

  public isQdrantActive(): boolean {
    return this.isQdrantReachable;
  }

  public async ensureCollection(collectionName: string = this.defaultCollection, vectorSize: number = 384): Promise<void> {
    if (this.isQdrantReachable && this.qdrantClient) {
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
        console.warn(`[QDRANT] Error verificando colección ${collectionName}:`, err.message);
      }
    }

    if (!this.localVectorStore.has(collectionName)) {
      this.localVectorStore.set(collectionName, new Map());
    }
  }

  /**
   * Inserta o actualiza vectores con metadatos
   */
  public async upsertVectors(
    points: VectorPoint[],
    collectionName: string = this.defaultCollection
  ): Promise<void> {
    if (points.length === 0) return;

    // 1. Guardar en Qdrant si está activo
    if (this.isQdrantReachable && this.qdrantClient) {
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
        console.warn('[QDRANT] Error en upsert Qdrant, persistiendo en almacén local:', err.message);
      }
    }

    // 2. Siempre mantener copia en el almacén local para resiliencia y consultas inmediatas
    if (!this.localVectorStore.has(collectionName)) {
      this.localVectorStore.set(collectionName, new Map());
    }
    const store = this.localVectorStore.get(collectionName)!;
    for (const p of points) {
      store.set(p.id, p);
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

    if (this.isQdrantReachable && this.qdrantClient) {
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
        console.warn('[QDRANT] Error eliminando vectores en Qdrant:', err.message);
      }
    }

    const store = this.localVectorStore.get(collectionName);
    if (store) {
      for (const [id, p] of store.entries()) {
        if (p.payload.empresa_id === empresaId && p.payload.documento_id === documentoId) {
          store.delete(id);
        }
      }
    }
  }

  /**
   * Búsqueda por similitud semántica (Coseno) con FILTRO OBLIGATORIO de empresa
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

    // 1. Intentar con Qdrant si está activo
    if (this.isQdrantReachable && this.qdrantClient) {
      try {
        const clientAny = this.qdrantClient as any;
        const searchFn = clientAny.search || clientAny.query;
        if (typeof searchFn === 'function') {
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

          if (Array.isArray(searchResult) && searchResult.length > 0) {
            return searchResult.map((r: any) => ({
              id: String(r.id),
              score: Number((r.score || 0).toFixed(4)),
              payload: r.payload as VectorPoint['payload'],
            }));
          }
        }
      } catch (err: any) {
        console.warn('[QDRANT] Error en búsqueda Qdrant, utilizando motor local:', err.message);
      }
    }

    // 2. Motor Local en Memoria con filtrado estricto por empresa_id
    const store = this.localVectorStore.get(collectionName);
    if (!store || store.size === 0) return [];

    const matches: SearchMatch[] = [];

    for (const point of store.values()) {
      // FILTRO ESTRICTO MULTIEMPRESA
      if (point.payload.empresa_id !== empresaId) continue;

      const sim = this.cosineSimilarity(queryVector, point.vector);
      if (sim >= minScore) {
        matches.push({
          id: point.id,
          score: Number(sim.toFixed(4)),
          payload: point.payload,
        });
      }
    }

    // Ordenar de mayor a menor similitud
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const vectorStoreService = new VectorStoreService();
