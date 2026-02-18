/**
 * useJSONExtractor.ts - Structured Data Extraction Hook
 * 
 * Extract structured JSON data from unstructured text.
 * Perfect for parsing emails, forms, and documents.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    JSONExtractInput,
    JSONExtractOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseJSONExtractorConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Called on successful extraction */
    onSuccess?: (result: JSONExtractOutput, input: JSONExtractInput) => void;
    /** Called on error */
    onError?: (error: Error, input: JSONExtractInput) => void;
}

/**
 * Hook return type
 */
export interface UseJSONExtractorReturn {
    /** Extract structured data from text */
    extract: <T extends Record<string, unknown>>(
        text: string,
        schema?: SchemaDefinition
    ) => Promise<T>;
    /** Extract with full result */
    extractDetailed: (input: JSONExtractInput) => Promise<JSONExtractOutput>;
    /** Extracted data */
    data: Record<string, unknown> | null;
    /** Confidence score */
    confidence: number | null;
    /** Missing fields */
    missingFields: string[];
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
 * Schema definition for extraction
 */
export type SchemaDefinition =
    | Record<string, 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone'>
    | string;

/**
 * Validate input
 */
function validateInput(input: JSONExtractInput): string | null {
    if (!input.text || typeof input.text !== 'string') {
        return 'Text is required';
    }
    if (!input.schema) {
        return 'Schema is required';
    }
    return null;
}

/**
 * useJSONExtractor - Structured data extraction hook
 * 
 * Extract structured JSON data from unstructured text.
 * Perfect for parsing emails, forms, and documents.
 * 
 * @features
 * - Schema-based extraction
 * - Multiple data types
 * - Confidence scores
 * - Missing field detection
 * 
 * @example
 * ```tsx
 * function EmailParser() {
 *   const { extract, data, isLoading } = useJSONExtractor();
 * 
 *   const parseEmail = async (emailContent: string) => {
 *     const result = await extract(emailContent, {
 *       sender_name: 'string',
 *       sender_email: 'email',
 *       meeting_date: 'date',
 *       meeting_topic: 'string',
 *     });
 *     
 *     console.log(result);
 *     // { sender_name: 'John Doe', sender_email: 'john@example.com', ... }
 *   };
 * 
 *   return (
 *     <button onClick={() => parseEmail(emailText)}>
 *       Parse Email
 *     </button>
 *   );
 * }
 * ```
 */
export function useJSONExtractor(
    config: UseJSONExtractorConfig = {}
): UseJSONExtractorReturn {
    const {
        tier,
        autoLoad = false,
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'question-answering' as const,
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
    } = useSkill<JSONExtractInput, JSONExtractOutput>(skillConfig);

    /**
     * Extract structured data from text
     */
    const extract = useCallback(
        async <T extends Record<string, unknown>>(
            text: string,
            schema?: SchemaDefinition
        ): Promise<T> => {
            const input: JSONExtractInput = {
                text,
                schema: schema ?? 'Extract all relevant structured data',
            };

            const output = await execute(input);
            return output.data as T;
        },
        [execute]
    );

    /**
     * Extract with full result
     */
    const extractDetailed = useCallback(
        async (input: JSONExtractInput): Promise<JSONExtractOutput> => {
            return execute(input);
        },
        [execute]
    );

    return {
        extract,
        extractDetailed,
        data: result?.data ?? null,
        confidence: result?.confidence ?? null,
        missingFields: result?.missingFields ?? [],
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useJSONExtractor;
