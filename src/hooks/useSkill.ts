/**
 * useSkill.ts - Base Hook for All AI Skills
 * 
 * Provides a consistent, type-safe API for all AI skills.
 * Handles model loading, execution, and state management.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    SkillState,
    SkillStatus,
    SkillOptions,
    SkillType,
    ModelTier,
    ProgressUpdate,
} from '../core/types';
import { useAIState } from '../provider/LocalAIProvider';

/**
 * Skill hook configuration
 */
export interface UseSkillConfig<TInput, TOutput> {
    /** Skill type identifier */
    skillType: SkillType;
    /** Default options for this skill */
    defaultOptions?: SkillOptions;
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Transform result before returning */
    transformResult?: (result: unknown, input: TInput) => TOutput;
    /** Validate input before execution */
    validateInput?: (input: TInput) => string | boolean | null;
    /** Called on successful execution */
    onSuccess?: (result: TOutput, input: TInput) => void;
    /** Called on error */
    onError?: (error: Error, input: TInput) => void;
    /** Called when execution starts */
    onStart?: (input: TInput) => void;
    /** Called when progress updates */
    onProgress?: (progress: ProgressUpdate) => void;
}

/**
 * Skill hook return type
 */
export interface UseSkillReturn<TInput, TOutput> {
    /** Execute the skill */
    execute: (input: TInput, options?: SkillOptions) => Promise<TOutput>;
    /** Current result */
    result: TOutput | null;
    /** Loading state */
    isLoading: boolean;
    /** Progress percentage (0-100) */
    progress: number;
    /** Current status */
    status: SkillStatus;
    /** Error if any */
    error: Error | null;
    /** Whether the model is cached */
    isCached: boolean;
    /** Reset the skill state */
    reset: () => void;
    /** Abort current execution */
    abort: () => void;
    /** Estimated time remaining */
    eta: number | undefined;
}

/**
 * Create initial skill state
 */
function createInitialSkillState<T>(): SkillState<T> {
    return {
        result: null,
        isLoading: false,
        progress: 0,
        status: 'idle',
        error: null,
        isCached: false,
    };
}

/**
 * useSkill - Base hook for all AI skills
 * 
 * Features:
 * - Type-safe execution with generics
 * - Automatic model loading
 * - Progress tracking
 * - Error handling
 * - Abort support
 * - Result transformation
 * - Input validation
 * 
 * @example
 * ```tsx
 * const { execute, result, isLoading, progress } = useSkill<SummarizeInput, SummarizeOutput>({
 *   skillType: 'summarization',
 *   tier: 'lite',
 * });
 * 
 * const summary = await execute({ text: 'Long text...' });
 * ```
 */
export function useSkill<TInput, TOutput>(
    config: UseSkillConfig<TInput, TOutput>
): UseSkillReturn<TInput, TOutput> {
    const {
        skillType,
        defaultOptions,
        tier: configTier,
        autoLoad = true,
        transformResult,
        validateInput,
        onSuccess,
        onError,
        onStart,
        onProgress,
    } = config;

    const {
        isInitialized,
        bridge,
        loadModel,
        isModelLoaded,
        defaultTier,
        debug,
    } = useAIState();

    const tier = configTier ?? defaultTier;
    const [state, setState] = useState<SkillState<TOutput>>(createInitialSkillState);
    const abortControllerRef = useRef<AbortController | null>(null);
    const executeIdRef = useRef(0);

    /**
     * Log debug messages
     */
    const log = useCallback(
        (...args: unknown[]) => {
            if (debug) {
                console.log(`[useSkill:${skillType}]`, ...args);
            }
        },
        [debug, skillType]
    );

    /**
     * Handle progress updates
     */
    const handleProgress = useCallback(
        (progress: ProgressUpdate) => {
            setState((prev) => ({
                ...prev,
                progress: progress.progress,
                status: progress.status,
                eta: progress.eta,
            }));

            if (onProgress) {
                onProgress(progress);
            }
        },
        [onProgress]
    );

    /**
     * Load the model for this skill
     */
    const ensureModelLoaded = useCallback(async () => {
        if (!isInitialized) {
            throw new Error('AI provider not initialized');
        }

        if (!isModelLoaded(skillType)) {
            log('Loading model...');
            setState((prev) => ({
                ...prev,
                isLoading: true,
                status: 'loading',
                progress: 0,
            }));

            await loadModel(skillType, tier, handleProgress);
        }
    }, [isInitialized, isModelLoaded, skillType, loadModel, tier, handleProgress, log]);

    /**
     * Execute the skill
     */
    const execute = useCallback(
        async (input: TInput, options?: SkillOptions): Promise<TOutput> => {
            const executeId = ++executeIdRef.current;

            log('Executing...', { input, options });

            // Validate input
            if (validateInput) {
                const validation = validateInput(input);
                if (validation === false || typeof validation === 'string') {
                    const error = new Error(
                        typeof validation === 'string'
                            ? validation
                            : 'Input validation failed'
                    );
                    setState((prev) => ({
                        ...prev,
                        error,
                        status: 'error',
                        isLoading: false,
                    }));
                    onError?.(error, input);
                    throw error;
                }
            }

            // Create abort controller
            abortControllerRef.current = new AbortController();

            try {
                // Ensure model is loaded
                await ensureModelLoaded();

                // Check if aborted
                if (abortControllerRef.current.signal.aborted) {
                    throw new Error('Execution aborted');
                }

                // Check if this execute call is still the latest
                if (executeId !== executeIdRef.current) {
                    throw new Error('Superseded by newer execution');
                }

                // Update state
                setState((prev) => ({
                    ...prev,
                    isLoading: true,
                    status: 'executing',
                    progress: 0,
                    error: null,
                }));

                onStart?.(input);

                // Execute on worker
                const mergedOptions = { ...defaultOptions, ...options };
                const result = await bridge!.execute<TOutput>(
                    'execute',
                    {
                        skillType,
                        input,
                        options: mergedOptions,
                    },
                    {
                        signal: abortControllerRef.current.signal,
                        onProgress: handleProgress,
                    }
                );

                // Check if this execute call is still the latest
                if (executeId !== executeIdRef.current) {
                    throw new Error('Superseded by newer execution');
                }

                // Transform result if needed
                const finalResult = transformResult ? transformResult(result, input) : result;

                // Update state
                setState({
                    result: finalResult,
                    isLoading: false,
                    progress: 100,
                    status: 'success',
                    error: null,
                    isCached: true,
                });

                log('Execution complete', { result: finalResult });
                onSuccess?.(finalResult, input);

                return finalResult;
            } catch (error) {
                // Check if this execute call is still the latest
                if (executeId !== executeIdRef.current) {
                    throw error;
                }

                const err = error as Error;
                log('Execution failed', error);

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    status: 'error',
                    error: err,
                }));

                onError?.(err, input);
                throw err;
            }
        },
        [
            skillType,
            defaultOptions,
            ensureModelLoaded,
            bridge,
            handleProgress,
            transformResult,
            validateInput,
            onSuccess,
            onError,
            onStart,
            log,
        ]
    );

    /**
     * Reset skill state
     */
    const reset = useCallback(() => {
        log('Resetting state');
        abortControllerRef.current?.abort();
        setState(createInitialSkillState());
    }, [log]);

    /**
     * Abort current execution
     */
    const abort = useCallback(() => {
        log('Aborting');
        abortControllerRef.current?.abort();
        setState((prev) => ({
            ...prev,
            isLoading: false,
            status: 'idle',
        }));
    }, [log]);

    /**
     * Auto-load model on mount if configured
     */
    useEffect(() => {
        if (autoLoad && isInitialized && !isModelLoaded(skillType)) {
            ensureModelLoaded().catch((error) => {
                log('Auto-load failed', error);
            });
        }
    }, [autoLoad, isInitialized, isModelLoaded, skillType, ensureModelLoaded, log]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    return {
        execute,
        result: state.result,
        isLoading: state.isLoading,
        progress: state.progress,
        status: state.status,
        error: state.error,
        isCached: state.isCached,
        reset,
        abort,
        eta: state.estimatedTimeRemaining,
    };
}

export default useSkill;