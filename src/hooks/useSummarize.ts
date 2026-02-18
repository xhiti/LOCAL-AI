/**
 * useSummarize.ts - Local Text Summarization Hook
 * 
 * Provides offline text summarization using transformer models.
 * Supports multiple summary lengths and styles.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    SummarizeInput,
    SummarizeOutput,
    SkillOptions,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseSummarizeConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default maximum summary length */
    defaultMaxLength?: number;
    /** Default minimum summary length */
    defaultMinLength?: number;
    /** Called on successful summarization */
    onSuccess?: (result: SummarizeOutput, input: SummarizeInput) => void;
    /** Called on error */
    onError?: (error: Error, input: SummarizeInput) => void;
    /** Called when progress updates */
    onProgress?: (progress: { progress: number; status: string }) => void;
}

/**
 * Hook return type
 */
export interface UseSummarizeReturn {
    /** Summarize text */
    summarize: (text: string, options?: SummarizeOptions) => Promise<string>;
    /** Summarize with full result */
    summarizeDetailed: (
        input: SummarizeInput
    ) => Promise<SummarizeOutput>;
    /** Summary result */
    summary: string | null;
    /** Full result object */
    result: SummarizeOutput | null;
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
    /** Abort current operation */
    abort: () => void;
}

/**
 * Summarization options
 */
export interface SummarizeOptions {
    /** Maximum length of summary */
    maxLength?: number;
    /** Minimum length of summary */
    minLength?: number;
}

/**
 * Validate summarization input
 */
function validateInput(input: SummarizeInput): string | null {
    if (!input.text || typeof input.text !== 'string') {
        return 'Input text is required and must be a string';
    }
    if (input.text.trim().length < 50) {
        return 'Input text must be at least 50 characters for meaningful summarization';
    }
    if (input.text.length > 100000) {
        return 'Input text exceeds maximum length of 100,000 characters';
    }
    if (input.maxLength && input.maxLength < 10) {
        return 'Maximum length must be at least 10 characters';
    }
    if (input.minLength && input.maxLength && input.minLength >= input.maxLength) {
        return 'Minimum length must be less than maximum length';
    }
    return null;
}

/**
 * Transform worker result to SummarizeOutput
 */
function transformResult(
    result: unknown,
    input: SummarizeInput
): SummarizeOutput {
    const summaryText = typeof result === 'string'
        ? result
        : (result as { summary: string }).summary;

    return {
        summary: summaryText,
        originalLength: input.text.length,
        summaryLength: summaryText.length,
        compressionRatio: input.text.length / summaryText.length,
    };
}

/**
 * useSummarize - Local text summarization hook
 * 
 * Provides offline text summarization using transformer models.
 * All processing happens locally in the browser - no server required.
 * 
 * @features
 * - Zero server costs - runs entirely in browser
 * - 100% privacy - data never leaves device
 * - Smart caching - models download once
 * - Progress tracking - real-time download progress
 * - Configurable length - control summary detail
 * 
 * @example
 * ```tsx
 * function Summarizer() {
 *   const { summarize, summary, isLoading, progress } = useSummarize({
 *     tier: 'lite',
 *   });
 * 
 *   const handleClick = async () => {
 *     const result = await summarize(longArticle);
 *     console.log(result); // "Article summary..."
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleClick} disabled={isLoading}>
 *         {isLoading ? `Loading ${progress}%` : 'Summarize'}
 *       </button>
 *       {summary && <p>{summary}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSummarize(config: UseSummarizeConfig = {}): UseSummarizeReturn {
    const {
        tier,
        autoLoad = true,
        defaultMaxLength = 150,
        defaultMinLength = 30,
        onSuccess,
        onError,
        onProgress,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'summarization' as const,
            tier,
            autoLoad,
            validateInput,
            transformResult,
            onSuccess,
            onError,
            onProgress: onProgress
                ? (p: { progress: number; status: string; message: string }) =>
                    onProgress({ progress: p.progress, status: p.status })
                : undefined,
        }),
        [tier, autoLoad, onSuccess, onError, onProgress]
    );

    const {
        execute,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
        abort,
    } = useSkill<SummarizeInput, SummarizeOutput>(skillConfig);

    /**
     * Simple summarize function - returns just the summary string
     */
    const summarize = useCallback(
        async (text: string, options?: SummarizeOptions): Promise<string> => {
            const input: SummarizeInput = {
                text,
                maxLength: options?.maxLength ?? defaultMaxLength,
                minLength: options?.minLength ?? defaultMinLength,
            };

            const output = await execute(input);
            return output.summary;
        },
        [execute, defaultMaxLength, defaultMinLength]
    );

    /**
     * Detailed summarize function - returns full result object
     */
    const summarizeDetailed = useCallback(
        async (input: SummarizeInput): Promise<SummarizeOutput> => {
            const normalizedInput: SummarizeInput = {
                ...input,
                maxLength: input.maxLength ?? defaultMaxLength,
                minLength: input.minLength ?? defaultMinLength,
            };
            return execute(normalizedInput);
        },
        [execute, defaultMaxLength, defaultMinLength]
    );

    return {
        summarize,
        summarizeDetailed,
        summary: result?.summary ?? null,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
        abort,
    };
}

export default useSummarize;