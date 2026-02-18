/**
 * useOCR.ts - Local Optical Character Recognition Hook
 * 
 * Provides offline text extraction from images using TrOCR models.
 * Extract text from receipts, documents, business cards, etc.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    OCRInput,
    OCROutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseOCRConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default language hint */
    defaultLanguage?: string;
    /** Called on successful extraction */
    onSuccess?: (result: OCROutput, input: OCRInput) => void;
    /** Called on error */
    onError?: (error: Error, input: OCRInput) => void;
}

/**
 * Hook return type
 */
export interface UseOCRReturn {
    /** Extract text from image */
    extract: (image: string | ArrayBuffer | Blob) => Promise<string>;
    /** Extract with full result including bounding boxes */
    extractDetailed: (input: OCRInput) => Promise<OCROutput>;
    /** Extract from file input event */
    extractFromFile: (file: File) => Promise<OCROutput>;
    /** Extracted text */
    text: string | null;
    /** Full result object */
    result: OCROutput | null;
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
function validateInput(input: OCRInput): string | null {
    if (!input.image) {
        return 'Image is required';
    }
    return null;
}

/**
 * Transform result
 */
function transformResult(result: unknown, input: OCRInput): OCROutput {
    const data = result as { text: string; blocks?: any[] };

    return {
        text: data.text,
        blocks: data.blocks ?? [],
        detectedLanguage: input.language,
    };
}

/**
 * useOCR - Local OCR hook
 * 
 * Provides offline text extraction from images.
 * All processing happens locally in the browser.
 * 
 * @features
 * - Handwriting support
 * - Printed text support
 * - Receipt/document extraction
 * - Multi-language support
 * - Bounding box coordinates
 * 
 * @example
 * ```tsx
 * function OCRDemo() {
 *   const { extract, extractFromFile, text, isLoading } = useOCR();
 * 
 *   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       const result = await extractFromFile(file);
 *       console.log('Extracted:', result.text);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <input type="file" accept="image/*" onChange={handleFile} />
 *       {isLoading && <p>Processing...</p>}
 *       {text && <pre>{text}</pre>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOCR(config: UseOCRConfig = {}): UseOCRReturn {
    const {
        tier,
        autoLoad = false,
        defaultLanguage,
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'ocr' as const,
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
    } = useSkill<OCRInput, OCROutput>(skillConfig);

    /**
     * Convert Blob to ArrayBuffer
     */
    const blobToArrayBuffer = useCallback(async (blob: Blob): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }, []);

    /**
     * Get image data
     */
    const getImageData = useCallback(async (
        image: string | ArrayBuffer | Blob
    ): Promise<string | ArrayBuffer> => {
        if (typeof image === 'string') {
            return image;
        }
        if (image instanceof Blob) {
            return blobToArrayBuffer(image);
        }
        return image;
    }, [blobToArrayBuffer]);

    /**
     * Extract text - returns just the text
     */
    const extract = useCallback(
        async (image: string | ArrayBuffer | Blob): Promise<string> => {
            const imageData = await getImageData(image);

            const input: OCRInput = {
                image: imageData,
                language: defaultLanguage,
                returnBoundingBoxes: false,
            };

            const output = await execute(input);
            return output.text;
        },
        [execute, defaultLanguage, getImageData]
    );

    /**
     * Extract with full result
     */
    const extractDetailed = useCallback(
        async (input: OCRInput): Promise<OCROutput> => {
            const normalizedInput: OCRInput = {
                ...input,
                language: input.language ?? defaultLanguage,
            };
            return execute(normalizedInput);
        },
        [execute, defaultLanguage]
    );

    /**
     * Extract from file
     */
    const extractFromFile = useCallback(
        async (file: File): Promise<OCROutput> => {
            const imageData = await getImageData(file);

            return execute({
                image: imageData,
                language: defaultLanguage,
                returnBoundingBoxes: true,
            });
        },
        [execute, defaultLanguage, getImageData]
    );

    return {
        extract,
        extractDetailed,
        extractFromFile,
        text: result?.text ?? null,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useOCR;
