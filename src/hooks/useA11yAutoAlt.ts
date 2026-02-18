/**
 * useA11yAutoAlt.ts - Automatic Alt Text Generation Hook
 * 
 * Automatically generate alt text for images to maintain
 * accessibility compliance without developer effort.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type { ModelTier } from '../core/types';

/**
 * Hook configuration
 */
export interface UseA11yAutoAltConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Maximum alt text length */
    maxLength?: number;
    /** Include confidence score */
    includeConfidence?: boolean;
    /** Called on successful generation */
    onSuccess?: (altText: string, imageData: string | ArrayBuffer) => void;
    /** Called on error */
    onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface UseA11yAutoAltReturn {
    /** Generate alt text for an image */
    generate: (image: string | ArrayBuffer | Blob) => Promise<string>;
    /** Generate with confidence score */
    generateWithConfidence: (
        image: string | ArrayBuffer | Blob
    ) => Promise<{ altText: string; confidence: number }>;
    /** Generated alt text */
    altText: string | null;
    /** Confidence score */
    confidence: number | null;
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
 * Input type for image classification
 */
interface ImageClassifyInput {
    image: string | ArrayBuffer;
}

/**
 * Validate input
 */
function validateInput(input: ImageClassifyInput): string | null {
    if (!input.image) {
        return 'Image is required';
    }
    return null;
}

/**
 * useA11yAutoAlt - Automatic alt text generation hook
 * 
 * Automatically generate alt text for images to maintain
 * accessibility compliance without developer effort.
 * 
 * @features
 * - Automatic description generation
 * - Confidence scores
 * - WCAG compliance
 * - Zero-config accessibility
 * 
 * @example
 * ```tsx
 * function AccessibleImage({ src }) {
 *   const { generate, altText, isLoading } = useA11yAutoAlt();
 * 
 *   useEffect(() => {
 *     generate(src);
 *   }, [src]);
 * 
 *   return (
 *     <img 
 *       src={src} 
 *       alt={altText ?? 'Loading description...'} 
 *     />
 *   );
 * }
 * ```
 */
export function useA11yAutoAlt(
    config: UseA11yAutoAltConfig = {}
): UseA11yAutoAltReturn {
    const {
        tier,
        autoLoad = false,
        maxLength = 100,
        includeConfidence = false,
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'image-classification' as const,
            tier,
            autoLoad,
            validateInput,
            onError: onError ? () => onError : undefined,
        }),
        [tier, autoLoad, onError]
    );

    const {
        execute,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
    } = useSkill<ImageClassifyInput, {
        classifications: Array<{ label: string; confidence: number }>
    }>(skillConfig);

    /**
     * Convert Blob to ArrayBuffer
     */
    const getImageData = useCallback(async (
        image: string | ArrayBuffer | Blob
    ): Promise<string | ArrayBuffer> => {
        if (typeof image === 'string') {
            return image;
        }
        if (image instanceof Blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = reject;
                reader.readAsArrayBuffer(image);
            });
        }
        return image;
    }, []);

    /**
     * Generate alt text
     */
    const generate = useCallback(
        async (image: string | ArrayBuffer | Blob): Promise<string> => {
            const imageData = await getImageData(image);

            const output = await execute({ image: imageData });

            // Combine top classifications into descriptive alt text
            const topLabels = output.classifications
                .slice(0, 3)
                .map((c) => c.label)
                .join(', ');

            const altText = `Image containing: ${topLabels}`.slice(0, maxLength);

            onSuccess?.(altText, imageData);

            return altText;
        },
        [execute, getImageData, maxLength, onSuccess]
    );

    /**
     * Generate with confidence
     */
    const generateWithConfidence = useCallback(
        async (
            image: string | ArrayBuffer | Blob
        ): Promise<{ altText: string; confidence: number }> => {
            const imageData = await getImageData(image);

            const output = await execute({ image: imageData });

            const top = output.classifications[0];
            const altText = top.label.slice(0, maxLength);

            return {
                altText,
                confidence: top.confidence,
            };
        },
        [execute, getImageData, maxLength]
    );

    return {
        generate,
        generateWithConfidence,
        altText: result?.classifications?.[0]?.label ?? null,
        confidence: result?.classifications?.[0]?.confidence ?? null,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useA11yAutoAlt;
