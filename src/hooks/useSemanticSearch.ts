/**
 * useSemanticSearch.ts - Local Vector Embeddings Search Hook
 * 
 * Provides semantic search capabilities using local embeddings.
 * Search JSON arrays by meaning, not just keywords.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useSkill } from './useSkill';
import { useAIState } from '../provider/LocalAIProvider';
import type {
    SemanticSearchInput,
    SemanticSearchOutput,
    SemanticSearchResult,
    ModelTier,
    ProgressUpdate,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseSemanticSearchConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default number of results */
    defaultTopK?: number;
    /** Default similarity threshold */
    defaultThreshold?: number;
    /** Called on successful search */
    onSuccess?: (result: SemanticSearchOutput, input: SemanticSearchInput) => void;
    /** Called on error */
    onError?: (error: Error, input: SemanticSearchInput) => void;
}

/**
 * Hook return type
 */
export interface UseSemanticSearchReturn {
    /** Search documents by query */
    search: (
        query: string,
        documents: Array<Record<string, unknown>>,
        options?: SearchOptions
    ) => Promise<SemanticSearchResult[]>;
    /** Search with full result */
    searchDetailed: (input: SemanticSearchInput) => Promise<SemanticSearchOutput>;
    /** Index documents for faster search */
    index: (documents: Array<Record<string, unknown>>) => Promise<void>;
    /** Clear the index */
    clearIndex: () => void;
    /** Search results */
    results: SemanticSearchResult[] | null;
    /** Full result object */
    result: SemanticSearchOutput | null;
    /** Number of indexed documents */
    indexedCount: number;
    /** Loading state */
    isLoading: boolean;
    /** Progress percentage */
    progress: number;
    /** Status message */
    status: string;
    /** Error if any */
    error: Error | null;
    /** Reset state */
    reset: () => void;
}

/**
 * Search options
 */
export interface SearchOptions {
    /** Number of results to return */
    topK?: number;
    /** Minimum similarity threshold */
    threshold?: number;
    /** Fields to search in documents */
    searchFields?: string[];
}

/**
 * Document with pre-computed embedding
 */
interface IndexedDocument {
    document: Record<string, unknown>;
    embedding: number[];
    index: number;
}

/**
 * Validate search input
 */
function validateInput(input: SemanticSearchInput): string | null {
    if (!input.query || typeof input.query !== 'string') {
        return 'Search query is required';
    }
    if (!input.documents || !Array.isArray(input.documents)) {
        return 'Documents must be an array';
    }
    if (input.documents.length === 0) {
        return 'Documents array cannot be empty';
    }
    if (input.documents.length > 10000) {
        return 'Maximum 10,000 documents allowed';
    }
    return null;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Extract text from document for embedding
 */
function extractDocumentText(
    doc: Record<string, unknown>,
    fields?: string[]
): string {
    if (fields && fields.length > 0) {
        return fields
            .map(f => String(doc[f] ?? ''))
            .filter(Boolean)
            .join(' ');
    }

    return Object.values(doc)
        .filter(v => typeof v === 'string' || typeof v === 'number')
        .map(String)
        .join(' ');
}

/**
 * useSemanticSearch - Local semantic search hook
 * 
 * Provides semantic search capabilities using local embeddings.
 * Search JSON arrays by meaning, not just keywords.
 * 
 * @features
 * - Meaning-based search
 * - Pre-indexing for fast repeated searches
 * - Configurable similarity threshold
 * - Works with any JSON data
 * 
 * @example
 * ```tsx
 * function SearchDemo() {
 *   const { search, results, index, indexedCount, isLoading } = useSemanticSearch();
 *   const docs = [
 *     { title: 'Machine Learning Guide', content: 'Introduction to ML...' },
 *     { title: 'Cooking Tips', content: 'How to make pasta...' },
 *   ];
 * 
 *   useEffect(() => {
 *     index(docs);
 *   }, []);
 * 
 *   const handleSearch = async () => {
 *     await search('artificial intelligence', docs);
 *   };
 * 
 *   return (
 *     <div>
 *       <p>Indexed: {indexedCount} documents</p>
 *       <button onClick={handleSearch}>Search</button>
 *       {results?.map((r, i) => (
 *         <div key={i}>{r.document.title} ({r.score})</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSemanticSearch(
    config: UseSemanticSearchConfig = {}
): UseSemanticSearchReturn {
    const {
        tier,
        autoLoad = true,
        defaultTopK = 5,
        defaultThreshold = 0.5,
        onSuccess,
        onError,
    } = config;

    const { bridge, isInitialized } = useAIState();
    const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([]);
    const embeddingCache = useRef<Map<string, number[]>>(new Map());

    const skillConfig = useMemo(
        () => ({
            skillType: 'feature-extraction' as const,
            tier,
            autoLoad,
            validateInput,
            onSuccess,
            onError,
        }),
        [tier, autoLoad, onSuccess, onError]
    );

    const {
        execute,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
    } = useSkill<SemanticSearchInput, SemanticSearchOutput>(skillConfig);

    /**
     * Get embedding for text
     */
    const getEmbedding = useCallback(
        async (text: string): Promise<number[]> => {
            // Check cache
            const cached = embeddingCache.current.get(text);
            if (cached) return cached;

            if (!bridge) {
                throw new Error('AI provider not initialized');
            }

            const result = await bridge.execute<{ embedding: number[] }>(
                'execute',
                {
                    skillType: 'feature-extraction',
                    input: { text },
                    options: {},
                }
            );

            const embedding = result.embedding;
            embeddingCache.current.set(text, embedding);
            return embedding;
        },
        [bridge]
    );

    /**
     * Index documents for faster search
     */
    const index = useCallback(
        async (documents: Array<Record<string, unknown>>) => {
            const indexed: IndexedDocument[] = [];

            for (let i = 0; i < documents.length; i++) {
                const text = extractDocumentText(documents[i]);
                const embedding = await getEmbedding(text);
                indexed.push({
                    document: documents[i],
                    embedding,
                    index: i,
                });
            }

            setIndexedDocs(indexed);
        },
        [getEmbedding]
    );

    /**
     * Clear the index
     */
    const clearIndex = useCallback(() => {
        setIndexedDocs([]);
        embeddingCache.current.clear();
    }, []);

    /**
     * Search documents by query
     */
    const search = useCallback(
        async (
            query: string,
            documents: Array<Record<string, unknown>>,
            options?: SearchOptions
        ): Promise<SemanticSearchResult[]> => {
            const topK = options?.topK ?? defaultTopK;
            const threshold = options?.threshold ?? defaultThreshold;
            const searchFields = options?.searchFields;

            // Use indexed docs if available and same documents
            let docsToSearch: IndexedDocument[];

            if (
                indexedDocs.length === documents.length &&
                indexedDocs.length > 0
            ) {
                docsToSearch = indexedDocs;
            } else {
                // Index on the fly
                docsToSearch = [];
                for (let i = 0; i < documents.length; i++) {
                    const text = extractDocumentText(documents[i], searchFields);
                    const embedding = await getEmbedding(text);
                    docsToSearch.push({
                        document: documents[i],
                        embedding,
                        index: i,
                    });
                }
            }

            // Get query embedding
            const queryEmbedding = await getEmbedding(query);

            // Calculate similarities
            const results = docsToSearch
                .map((doc) => ({
                    document: doc.document,
                    score: cosineSimilarity(queryEmbedding, doc.embedding),
                    index: doc.index,
                }))
                .filter((r) => r.score >= threshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            return results;
        },
        [indexedDocs, getEmbedding, defaultTopK, defaultThreshold]
    );

    /**
     * Search with full result
     */
    const searchDetailed = useCallback(
        async (input: SemanticSearchInput): Promise<SemanticSearchOutput> => {
            const startTime = Date.now();

            const results = await search(input.query, input.documents, {
                topK: input.topK ?? defaultTopK,
                threshold: input.threshold ?? defaultThreshold,
                searchFields: input.searchFields,
            });

            return {
                results,
                totalDocuments: input.documents.length,
                searchTime: Date.now() - startTime,
            };
        },
        [search, defaultTopK, defaultThreshold]
    );

    return {
        search,
        searchDetailed,
        index,
        clearIndex,
        results: result?.results ?? null,
        result,
        indexedCount: indexedDocs.length,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useSemanticSearch;