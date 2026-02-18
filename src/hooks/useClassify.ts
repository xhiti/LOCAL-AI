/**
 * useClassify.ts - Local Text Classification Hook
 * 
 * Provides zero-shot text classification that works with any
 * category labels. Perfect for categorizing user feedback,
 * support tickets, content moderation, etc.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    ClassifyInput,
    ClassifyOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseClassifyConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default categories */
    defaultCategories?: string[];
    /** Called on successful classification */
    onSuccess?: (result: ClassifyOutput, input: ClassifyInput) => void;
    /** Called on error */
    onError?: (error: Error, input: ClassifyInput) => void;
}

/**
 * Hook return type
 */
export interface UseClassifyReturn {
    /** Classify text into categories */
    classify: (
        text: string,
        categories?: string[]
    ) => Promise<string>;
    /** Classify with confidence score */
    classifyWithScore: (
        text: string,
        categories?: string[]
    ) => Promise<{ category: string; confidence: number }>;
    /** Classify with all scores */
    classifyDetailed: (input: ClassifyInput) => Promise<ClassifyOutput>;
    /** Predicted category */
    category: string | null;
    /** Confidence score */
    confidence: number | null;
    /** Full result object */
    result: ClassifyOutput | null;
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
 * Validate input
 */
function validateInput(input: ClassifyInput): string | null {
    if (!input.text || typeof input.text !== 'string') {
        return 'Text is required';
    }
    if (!input.categories || input.categories.length === 0) {
        return 'Categories are required';
    }
    if (input.categories.length > 100) {
        return 'Maximum 100 categories allowed';
    }
    return null;
}

/**
 * Transform result
 */
function transformResult(result: unknown, input: ClassifyInput): ClassifyOutput {
    const data = result as {
        category?: string;
        confidence?: number;
        allScores?: Array<{ category: string; score: number }>;
        labels?: string[];
        scores?: number[];
    };

    // Handle different result formats
    if (data.labels && data.scores) {
        return {
            category: data.labels[0],
            confidence: data.scores[0],
            allScores: data.labels.map((label, i) => ({
                category: label,
                score: data.scores![i],
            })),
        };
    }

    return {
        category: data.category ?? '',
        confidence: data.confidence ?? 0,
        allScores: data.allScores,
    };
}

/**
 * useClassify - Local text classification hook
 * 
 * Provides zero-shot text classification that works with any
 * category labels. No training required.
 * 
 * @features
 * - Zero-shot classification
 * - Custom categories
 * - Confidence scores
 * - Multi-label support
 * 
 * @example
 * ```tsx
 * function FeedbackClassifier() {
 *   const { classifyWithScore, category, confidence, isLoading } = useClassify({
 *     defaultCategories: ['bug', 'feature', 'question', 'praise'],
 *   });
 * 
 *   const handleClassify = async (text: string) => {
 *     const result = await classifyWithScore(text);
 *     console.log(`${result.category} (${result.confidence})`);
 *   };
 * 
 *   return (
 *     <div>
 *       <textarea onChange={e => handleClassify(e.target.value)} />
 *       {category && <p>Category: {category} ({confidence?.toFixed(2)})</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClassify(config: UseClassifyConfig = {}): UseClassifyReturn {
    const {
        tier,
        autoLoad = false,
        defaultCategories = [],
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'zero-shot-classification' as const,
            tier,
            autoLoad,
            validateInput,
            transformResult,
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
    } = useSkill<ClassifyInput, ClassifyOutput>(skillConfig);

    /**
     * Classify text - returns just the category
     */
    const classify = useCallback(
        async (
            text: string,
            categories?: string[]
        ): Promise<string> => {
            const input: ClassifyInput = {
                text,
                categories: categories ?? defaultCategories,
                returnAllScores: false,
            };

            const output = await execute(input);
            return output.category;
        },
        [execute, defaultCategories]
    );

    /**
     * Classify with score
     */
    const classifyWithScore = useCallback(
        async (
            text: string,
            categories?: string[]
        ): Promise<{ category: string; confidence: number }> => {
            const input: ClassifyInput = {
                text,
                categories: categories ?? defaultCategories,
                returnAllScores: false,
            };

            const output = await execute(input);
            return {
                category: output.category,
                confidence: output.confidence,
            };
        },
        [execute, defaultCategories]
    );

    /**
     * Classify with all scores
     */
    const classifyDetailed = useCallback(
        async (input: ClassifyInput): Promise<ClassifyOutput> => {
            const normalizedInput: ClassifyInput = {
                ...input,
                categories: input.categories ?? defaultCategories,
                returnAllScores: input.returnAllScores ?? true,
            };
            return execute(normalizedInput);
        },
        [execute, defaultCategories]
    );

    return {
        classify,
        classifyWithScore,
        classifyDetailed,
        category: result?.category ?? null,
        confidence: result?.confidence ?? null,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useClassify;
