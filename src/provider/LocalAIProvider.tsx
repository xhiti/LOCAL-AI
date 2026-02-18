/**
 * LocalAIProvider.tsx - React Context Provider for Local AI
 * 
 * Provides global state management for AI skills, worker lifecycle,
 * and model loading coordination.
 * 
 * @xhiti/local-ai
 */

'use client';

import React, {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react';
import type {
    AIState,
    LocalAIProviderConfig,
    DeviceCapabilities,
    ExecutionBackend,
    ModelConfig,
    SkillType,
    ModelTier,
    ProgressUpdate,
} from '../core/types';
import { WorkerBridge } from '../core/WorkerBridge';
import { ModelCache } from '../core/ModelCache';
import { detectDeviceCapabilities } from '../core/DeviceCapabilities';
import { getModelConfig } from '../core/ModelRegistry';

// ============================================================================
// Context Types
// ============================================================================

interface LocalAIContextValue extends AIState {
    /** Initialize the provider manually */
    initialize: () => Promise<void>;
    /** Load a model */
    loadModel: (
        skillType: SkillType,
        tier?: ModelTier,
        onProgress?: (progress: ProgressUpdate) => void
    ) => Promise<void>;
    /** Unload a model */
    unloadModel: (modelId: string) => Promise<void>;
    /** Check if a model is loaded */
    isModelLoaded: (skillType: SkillType) => boolean;
    /** Get the worker bridge instance */
    bridge: WorkerBridge | null;
    /** Clear all cached models */
    clearCache: () => Promise<void>;
    /** Default tier for new skills */
    defaultTier: ModelTier;
    /** Debug mode */
    debug: boolean;
}

// ============================================================================
// Reducer
// ============================================================================

type AIAction =
    | { type: 'INIT_START' }
    | { type: 'INIT_SUCCESS'; capabilities: DeviceCapabilities; backend: ExecutionBackend }
    | { type: 'INIT_ERROR'; error: Error }
    | { type: 'MODEL_LOAD_START'; modelId: string }
    | { type: 'MODEL_LOAD_SUCCESS'; model: ModelConfig }
    | { type: 'MODEL_LOAD_ERROR'; modelId: string; error: Error }
    | { type: 'MODEL_UNLOAD'; modelId: string }
    | { type: 'MEMORY_UPDATE'; memory: number }
    | { type: 'RESET' };

function aiReducer(state: AIState, action: AIAction): AIState {
    switch (action.type) {
        case 'INIT_START':
            return { ...state, isInitializing: true, error: null };

        case 'INIT_SUCCESS':
            return {
                ...state,
                isInitialized: true,
                isInitializing: false,
                capabilities: action.capabilities,
                currentBackend: action.backend,
                error: null,
            };

        case 'INIT_ERROR':
            return {
                ...state,
                isInitializing: false,
                error: action.error,
            };

        case 'MODEL_LOAD_START':
            return {
                ...state,
                loadingModels: new Set(state.loadingModels).add(action.modelId),
            };

        case 'MODEL_LOAD_SUCCESS': {
            const newLoadedModels = new Map(state.loadedModels);
            newLoadedModels.set(action.model.id, action.model);
            const loadingModels = new Set(state.loadingModels);
            loadingModels.delete(action.model.id);
            return {
                ...state,
                loadedModels: newLoadedModels,
                loadingModels,
            };
        }

        case 'MODEL_LOAD_ERROR': {
            const loadingModels = new Set(state.loadingModels);
            loadingModels.delete(action.modelId);
            return {
                ...state,
                loadingModels,
                error: action.error,
            };
        }

        case 'MODEL_UNLOAD': {
            const newLoadedModels = new Map(state.loadedModels);
            newLoadedModels.delete(action.modelId);
            return {
                ...state,
                loadedModels: newLoadedModels,
            };
        }

        case 'MEMORY_UPDATE':
            return { ...state, memoryUsage: action.memory };

        case 'RESET':
            return createInitialState();

        default:
            return state;
    }
}

// ============================================================================
// Initial State
// ============================================================================

function createInitialState(): AIState {
    return {
        isInitialized: false,
        isInitializing: false,
        capabilities: null,
        currentBackend: 'wasm',
        loadedModels: new Map(),
        loadingModels: new Set(),
        memoryUsage: 0,
        error: null,
    };
}

// ============================================================================
// Context
// ============================================================================

const LocalAIContext = createContext<LocalAIContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

const DEFAULT_CONFIG: Required<LocalAIProviderConfig> = {
    defaultTier: 'standard',
    preferredBackend: 'webgpu',
    maxMemoryMB: 2048,
    debug: false,
    preloadModels: [],
    modelOverrides: {},
    cacheConfig: {
        enabled: true,
        name: 'local-ai-models',
        maxSizeMB: 2048,
        version: 1,
    },
};

/**
 * LocalAIProvider - Root provider for @xhiti/local-ai
 * 
 * Features:
 * - Automatic device capability detection
 * - Web Worker lifecycle management
 * - Model loading coordination
 * - Memory usage tracking
 * - Progress reporting for downloads
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <LocalAIProvider config={{ defaultTier: 'lite', debug: true }}>
 *       <MyApp />
 *     </LocalAIProvider>
 *   );
 * }
 * ```
 */
export function LocalAIProvider({
    children,
    config,
}: {
    children: React.ReactNode;
    config?: LocalAIProviderConfig;
}) {
    const fullConfig = useMemo(
        () => ({ ...DEFAULT_CONFIG, ...config }),
        [config]
    );

    const [state, dispatch] = useReducer(aiReducer, null, createInitialState);
    const bridgeRef = useRef<WorkerBridge | null>(null);
    const cacheRef = useRef<ModelCache | null>(null);

    /**
     * Initialize the provider
     */
    const initialize = useCallback(async () => {
        if (state.isInitialized || state.isInitializing) return;

        dispatch({ type: 'INIT_START' });

        try {
            // Detect device capabilities
            const capabilities = await detectDeviceCapabilities();

            if (!capabilities.isSupported) {
                throw new Error(
                    'Your browser does not support the required features for local AI. ' +
                    'Please use a modern browser with WebAssembly or WebGPU support.'
                );
            }

            // Determine backend
            let backend: ExecutionBackend = fullConfig.preferredBackend;
            if (backend === 'webgpu' && !capabilities.webgpu) {
                backend = capabilities.wasmSimd ? 'wasm' : 'cpu';
            }

            // Initialize cache
            cacheRef.current = ModelCache.getInstance(fullConfig.cacheConfig);
            await cacheRef.current.initialize();

            // Initialize worker bridge
            const workerUrl = new URL('../worker/index.js', import.meta.url);
            bridgeRef.current = WorkerBridge.getInstance({
                workerUrl,
                debug: fullConfig.debug,
            });
            await bridgeRef.current.initialize();

            dispatch({ type: 'INIT_SUCCESS', capabilities, backend });

            if (fullConfig.debug) {
                console.log('[LocalAI] Initialized:', {
                    backend,
                    capabilities,
                });
            }

            // Preload models if configured
            if (fullConfig.preloadModels.length > 0) {
                for (const skillType of fullConfig.preloadModels) {
                    try {
                        const modelConfig = getModelConfig(skillType, fullConfig.defaultTier);
                        await bridgeRef.current.execute('load-model', {
                            modelConfig,
                            tier: fullConfig.defaultTier,
                        });
                    } catch (error) {
                        if (fullConfig.debug) {
                            console.warn(`[LocalAI] Failed to preload ${skillType}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            dispatch({ type: 'INIT_ERROR', error: error as Error });
            if (fullConfig.debug) {
                console.error('[LocalAI] Initialization failed:', error);
            }
        }
    }, [state.isInitialized, state.isInitializing, fullConfig]);

    /**
     * Load a model
     */
    const loadModel = useCallback(
        async (
            skillType: SkillType,
            tier: ModelTier = fullConfig.defaultTier,
            onProgress?: (progress: ProgressUpdate) => void
        ) => {
            if (!bridgeRef.current) {
                throw new Error('Provider not initialized');
            }

            // Get model config, potentially with overrides
            let modelConfig = getModelConfig(skillType, tier);
            if (fullConfig.modelOverrides[skillType]) {
                modelConfig = { ...modelConfig, ...fullConfig.modelOverrides[skillType] };
            }

            // Check if already loaded
            if (state.loadedModels.has(modelConfig.id)) {
                return;
            }

            // Check if currently loading
            if (state.loadingModels.has(modelConfig.id)) {
                return;
            }

            dispatch({ type: 'MODEL_LOAD_START', modelId: modelConfig.id });

            try {
                await bridgeRef.current.execute(
                    'load-model',
                    {
                        modelConfig,
                        tier,
                    },
                    { onProgress }
                );

                dispatch({ type: 'MODEL_LOAD_SUCCESS', model: modelConfig });

                if (fullConfig.debug) {
                    console.log(`[LocalAI] Model loaded: ${modelConfig.id}`);
                }
            } catch (error) {
                dispatch({
                    type: 'MODEL_LOAD_ERROR',
                    modelId: modelConfig.id,
                    error: error as Error,
                });
                throw error;
            }
        },
        [state.loadedModels, state.loadingModels, fullConfig]
    );

    /**
     * Unload a model
     */
    const unloadModel = useCallback(
        async (modelId: string) => {
            if (!bridgeRef.current) return;

            try {
                await bridgeRef.current.execute('dispose', { modelId });
                dispatch({ type: 'MODEL_UNLOAD', modelId });
            } catch (error) {
                if (fullConfig.debug) {
                    console.error(`[LocalAI] Failed to unload ${modelId}:`, error);
                }
            }
        },
        [fullConfig.debug]
    );

    /**
     * Check if a model is loaded
     */
    const isModelLoaded = useCallback(
        (skillType: SkillType): boolean => {
            // Check if any tier of this skill is loaded
            for (const model of state.loadedModels.values()) {
                if (model.taskType === skillType) {
                    return true;
                }
            }
            return false;
        },
        [state.loadedModels]
    );

    /**
     * Clear cache
     */
    const clearCache = useCallback(async () => {
        if (cacheRef.current) {
            await cacheRef.current.clear();
        }
        if (bridgeRef.current) {
            await bridgeRef.current.clearCache();
        }
    }, []);

    /**
     * Initialize on mount
     */
    useEffect(() => {
        initialize();

        return () => {
            if (bridgeRef.current) {
                bridgeRef.current.dispose();
                bridgeRef.current = null;
            }
            if (cacheRef.current) {
                cacheRef.current.close();
                cacheRef.current = null;
            }
            WorkerBridge.reset();
            ModelCache.reset();
        };
    }, [initialize]);

    /**
     * Context value
     */
    const value = useMemo<LocalAIContextValue>(
        () => ({
            ...state,
            initialize,
            loadModel,
            unloadModel,
            isModelLoaded,
            bridge: bridgeRef.current,
            clearCache,
            defaultTier: fullConfig.defaultTier,
            debug: fullConfig.debug,
        }),
        [
            state,
            initialize,
            loadModel,
            unloadModel,
            isModelLoaded,
            clearCache,
            fullConfig.defaultTier,
            fullConfig.debug,
        ]
    );

    return (
        <LocalAIContext.Provider value={value}>
            {children}
        </LocalAIContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the LocalAI context
 * 
 * @throws Error if used outside of LocalAIProvider
 */
export function useAIState(): LocalAIContextValue {
    const context = useContext(LocalAIContext);
    if (!context) {
        throw new Error('useAIState must be used within a LocalAIProvider');
    }
    return context;
}

/**
 * Check if the provider is ready
 */
export function useIsAIReady(): boolean {
    const { isInitialized, isInitializing, error } = useAIState();
    return isInitialized && !isInitializing && !error;
}

/**
 * Access device capabilities
 */
export function useDeviceCapabilities(): DeviceCapabilities | null {
    const { capabilities } = useAIState();
    return capabilities;
}

/**
 * Access current backend
 */
export function useAIBackend(): ExecutionBackend {
    const { currentBackend } = useAIState();
    return currentBackend;
}

/**
 * Access memory usage
 */
export function useMemoryUsage(): number {
    const { memoryUsage } = useAIState();
    return memoryUsage;
}

export default LocalAIProvider;