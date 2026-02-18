/**
 * useImagePrivacy.ts - Image Privacy Protection Hook
 * 
 * Automatically detect and blur sensitive content like faces
 * and license plates before uploading to servers.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    ImagePrivacyInput,
    ImagePrivacyOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseImagePrivacyConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default blur intensity */
    defaultBlurIntensity?: number;
    /** Default types to blur */
    defaultBlurTypes?: Array<'face' | 'license-plate' | 'text' | 'qrcode'>;
    /** Called on successful processing */
    onSuccess?: (result: ImagePrivacyOutput, input: ImagePrivacyInput) => void;
    /** Called on error */
    onError?: (error: Error, input: ImagePrivacyInput) => void;
}

/**
 * Hook return type
 */
export interface UseImagePrivacyReturn {
    /** Process image to blur sensitive content */
    process: (
        image: string | ArrayBuffer | Blob,
        options?: PrivacyOptions
    ) => Promise<ImagePrivacyOutput>;
    /** Check if image contains sensitive content */
    detect: (
        image: string | ArrayBuffer | Blob
    ) => Promise<Array<{ type: string; confidence: number }>>;
    /** Processed image (base64) */
    processedImage: string | null;
    /** Detected regions */
    detectedRegions: Array<{
        type: string;
        confidence: number;
        box: { x: number; y: number; width: number; height: number };
    }>;
    /** Whether content was blurred */
    wasProcessed: boolean;
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
 * Privacy options
 */
export interface PrivacyOptions {
    /** Types of content to blur */
    blurTypes?: Array<'face' | 'license-plate' | 'text' | 'qrcode'>;
    /** Blur intensity (1-20) */
    blurIntensity?: number;
}

/**
 * Validate input
 */
function validateInput(input: ImagePrivacyInput): string | null {
    if (!input.image) {
        return 'Image is required';
    }
    return null;
}

/**
 * useImagePrivacy - Image privacy protection hook
 * 
 * Automatically detect and blur sensitive content in images.
 * Perfect for privacy-conscious applications.
 * 
 * @features
 * - Face detection and blurring
 * - License plate detection
 * - Text/QR code blurring
 * - Configurable blur intensity
 * 
 * @example
 * ```tsx
 * function PrivacyUploader() {
 *   const { process, processedImage, isLoading } = useImagePrivacy();
 *   const [image, setImage] = useState<string | null>(null);
 * 
 *   const handlePrivacyProcess = async () => {
 *     const result = await process(image, {
 *       blurTypes: ['face', 'license-plate'],
 *       blurIntensity: 15,
 *     });
 *     
 *     if (result.wasProcessed) {
 *       // Upload safe image
 *       uploadToServer(result.processedImage);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {processedImage && <img src={processedImage} />}
 *       <button onClick={handlePrivacyProcess}>
 *         Blur Sensitive Content
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useImagePrivacy(
    config: UseImagePrivacyConfig = {}
): UseImagePrivacyReturn {
    const {
        tier,
        autoLoad = false,
        defaultBlurIntensity = 10,
        defaultBlurTypes = ['face', 'license-plate'],
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'object-detection' as const,
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
    } = useSkill<ImagePrivacyInput, ImagePrivacyOutput>(skillConfig);

    /**
     * Process image to blur sensitive content
     */
    const process = useCallback(
        async (
            image: string | ArrayBuffer | Blob,
            options?: PrivacyOptions
        ): Promise<ImagePrivacyOutput> => {
            // Convert Blob to ArrayBuffer
            let imageData: string | ArrayBuffer;
            if (image instanceof Blob) {
                imageData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as ArrayBuffer);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(image);
                });
            } else {
                imageData = image;
            }

            const input: ImagePrivacyInput = {
                image: imageData,
                blurTypes: options?.blurTypes ?? defaultBlurTypes,
                blurIntensity: options?.blurIntensity ?? defaultBlurIntensity,
            };

            return execute(input);
        },
        [execute, defaultBlurTypes, defaultBlurIntensity]
    );

    /**
     * Detect sensitive content without processing
     */
    const detect = useCallback(
        async (
            image: string | ArrayBuffer | Blob
        ): Promise<Array<{ type: string; confidence: number }>> => {
            const output = await process(image, {
                blurTypes: ['face', 'license-plate', 'text', 'qrcode'],
                blurIntensity: 1, // Minimal blur just to detect
            });

            return output.detectedRegions.map((region) => ({
                type: region.type,
                confidence: region.confidence,
            }));
        },
        [process]
    );

    return {
        process,
        detect,
        processedImage: result?.processedImage ?? null,
        detectedRegions: result?.detectedRegions ?? [],
        wasProcessed: result?.wasProcessed ?? false,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useImagePrivacy;