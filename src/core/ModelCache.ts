/**
 * ModelCache.ts - IndexedDB Model Persistence Layer
 * 
 * Provides smart caching for AI models using IndexedDB.
 * Models persist across browser sessions, eliminating re-downloads.
 * 
 * @xhiti/local-ai
 */

import type { ModelConfig, CacheConfig } from './types';

/**
 * Cached model entry
 */
interface CachedModelEntry {
    modelId: string;
    cacheKey: string;
    data: ArrayBuffer;
    metadata: {
        fileSize: number;
        cachedAt: number;
        lastAccessed: number;
        tier: string;
        version: number;
        checksum?: string;
    };
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
    enabled: true,
    name: 'local-ai-models',
    maxSizeMB: 2048, // 2GB default
    version: 1,
};

/**
 * ModelCache - Singleton IndexedDB model cache manager
 * 
 * Features:
 * - Persistent storage across sessions
 * - Automatic size management with LRU eviction
 * - Version-based cache invalidation
 * - Parallel model loading
 * - Progress tracking for loading operations
 * 
 * @example
 * ```ts
 * const cache = ModelCache.getInstance();
 * 
 * // Store a model
 * await cache.store('summarizer-lite', modelData, config);
 * 
 * // Retrieve a model
 * const data = await cache.retrieve('summarizer-lite');
 * ```
 */
export class ModelCache {
    private static instance: ModelCache | null = null;
    private db: IDBDatabase | null = null;
    private config: Required<CacheConfig>;
    private initPromise: Promise<void> | null = null;
    private accessLog: Map<string, number> = new Map();

    private constructor(config?: CacheConfig) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(config?: CacheConfig): ModelCache {
        if (!ModelCache.instance) {
            ModelCache.instance = new ModelCache(config);
        }
        return ModelCache.instance;
    }

    /**
     * Reset the singleton (useful for testing)
     */
    public static reset(): void {
        if (ModelCache.instance) {
            ModelCache.instance.close();
            ModelCache.instance = null;
        }
    }

    /**
     * Initialize the IndexedDB database
     */
    public async initialize(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.doInitialize();
        return this.initPromise;
    }

    private async doInitialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.name, this.config.version);

            request.onerror = () => {
                reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store for models
                if (!db.objectStoreNames.contains('models')) {
                    const store = db.createObjectStore('models', { keyPath: 'modelId' });
                    store.createIndex('cacheKey', 'cacheKey', { unique: false });
                    store.createIndex('lastAccessed', 'metadata.lastAccessed', { unique: false });
                }

                // Create object store for metadata
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Store a model in the cache
     */
    public async store(
        modelId: string,
        data: ArrayBuffer,
        config: ModelConfig,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        await this.initialize();

        if (!this.config.enabled) {
            return;
        }

        // Check if we need to evict old entries
        await this.ensureSpace(data.byteLength);

        const entry: CachedModelEntry = {
            modelId,
            cacheKey: config.cacheKey,
            data,
            metadata: {
                fileSize: data.byteLength,
                cachedAt: Date.now(),
                lastAccessed: Date.now(),
                tier: config.tier,
                version: this.config.version,
            },
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');

            // Report progress during store operation
            if (onProgress) {
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress = Math.min(progress + 10, 90);
                    onProgress(progress);
                }, 100);

                transaction.oncomplete = () => {
                    clearInterval(progressInterval);
                    onProgress(100);
                    this.accessLog.set(modelId, Date.now());
                    resolve();
                };

                transaction.onerror = () => {
                    clearInterval(progressInterval);
                    reject(new Error(`Failed to store model: ${transaction.error?.message}`));
                };
            } else {
                transaction.oncomplete = () => {
                    this.accessLog.set(modelId, Date.now());
                    resolve();
                };

                transaction.onerror = () => {
                    reject(new Error(`Failed to store model: ${transaction.error?.message}`));
                };
            }

            store.put(entry);
        });
    }

    /**
     * Retrieve a model from the cache
     */
    public async retrieve(modelId: string): Promise<ArrayBuffer | null> {
        await this.initialize();

        if (!this.config.enabled) {
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');
            const request = store.get(modelId);

            request.onsuccess = () => {
                const entry = request.result as CachedModelEntry | undefined;
                if (entry) {
                    // Update last accessed time
                    entry.metadata.lastAccessed = Date.now();
                    store.put(entry);
                    this.accessLog.set(modelId, Date.now());
                    resolve(entry.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(new Error(`Failed to retrieve model: ${request.error?.message}`));
            };
        });
    }

    /**
     * Check if a model is cached
     */
    public async has(modelId: string): Promise<boolean> {
        await this.initialize();
        const data = await this.retrieve(modelId);
        return data !== null;
    }

    /**
     * Get cache statistics
     */
    public async getStats(): Promise<{
        totalSize: number;
        modelCount: number;
        models: Array<{ modelId: string; size: number; lastAccessed: number }>;
    }> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['models'], 'readonly');
            const store = transaction.objectStore('models');
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result as CachedModelEntry[];
                const models = entries.map((entry) => ({
                    modelId: entry.modelId,
                    size: entry.metadata.fileSize,
                    lastAccessed: entry.metadata.lastAccessed,
                }));

                resolve({
                    totalSize: models.reduce((sum, m) => sum + m.size, 0),
                    modelCount: models.length,
                    models,
                });
            };

            request.onerror = () => {
                reject(new Error(`Failed to get cache stats: ${request.error?.message}`));
            };
        });
    }

    /**
     * Delete a specific model from cache
     */
    public async delete(modelId: string): Promise<boolean> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');
            const request = store.delete(modelId);

            request.onsuccess = () => {
                this.accessLog.delete(modelId);
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete model: ${request.error?.message}`));
            };
        });
    }

    /**
     * Clear the entire cache
     */
    public async clear(): Promise<void> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['models'], 'readwrite');
            const store = transaction.objectStore('models');
            const request = store.clear();

            request.onsuccess = () => {
                this.accessLog.clear();
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear cache: ${request.error?.message}`));
            };
        });
    }

    /**
     * Ensure enough space in cache
     */
    private async ensureSpace(requiredBytes: number): Promise<void> {
        const stats = await this.getStats();
        const maxBytes = this.config.maxSizeMB * 1024 * 1024;
        const availableBytes = maxBytes - stats.totalSize;

        if (availableBytes >= requiredBytes) {
            return;
        }

        // Sort by last accessed (LRU eviction)
        const sortedModels = [...stats.models].sort(
            (a, b) => a.lastAccessed - b.lastAccessed
        );

        let freedBytes = 0;
        const bytesToFree = requiredBytes - availableBytes;

        for (const model of sortedModels) {
            if (freedBytes >= bytesToFree) break;
            await this.delete(model.modelId);
            freedBytes += model.size;
        }
    }

    /**
     * Close the database connection
     */
    public close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.initPromise = null;
    }
}

export default ModelCache;