/**
 * useSmartCrop.ts - AI-Powered Image Cropping Hook
 * 
 * Automatically detect the subject of an image and suggest
 * optimal crop coordinates for thumbnails.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    SmartCropInput,
    SmartCropOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseSmartCropConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default aspect ratio */
    defaultAspectRatio?: number;
    /** Called on successful crop suggestion */
    onSuccess?: (result: SmartCropOutput, input: SmartCropInput) => void;
    /** Called on error */
    onError?: (error: Error, input: SmartCropInput) => void;
}

/**
 * Hook return type
 */
export interface UseSmartCropReturn {
    /** Get smart crop suggestion */
    getCrop: (
        image: string | ArrayBuffer | Blob,
        options?: CropOptions
    ) => Promise<SmartCropOutput>;
    /** Crop coordinates */
    crop: SmartCropOutput | null;
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
 * Crop options
 */
export interface CropOptions {
    /** Target aspect ratio (width/height) */
    aspectRatio?: number;
    /** Target width in pixels */
    width?: number;
    /** Target height in pixels */
    height?: number;
}

/**
 * Validate input
 */
function validateInput(input: SmartCropInput): string | null {
    if (!input.image) {
        return 'Image is required';
    }
    if (input.aspectRatio && input.aspectRatio <= 0) {
        return 'Aspect ratio must be positive';
    }
    return null;
}

/**
 * useSmartCrop - AI-powered image cropping hook
 * 
 * Automatically detect the subject of an image and suggest
 * optimal crop coordinates for thumbnails.
 * 
 * @features
 * - Subject detection
 * - Aspect ratio support
 * - Multiple target sizes
 * - Face-aware cropping
 * 
 * @example
 * ```tsx
 * function SmartCropper() {
 *   const { getCrop, crop, isLoading } = useSmartCrop();
 *   const [image, setImage] = useState<string | null>(null);
 * 
 *   const handleCrop = async () => {
 *     if (image) {
 *       const result = await getCrop(image, { aspectRatio: 16/9 });
 *       console.log('Crop:', result.crop);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleCrop} disabled={isLoading}>
 *         {isLoading ? 'Analyzing...' : 'Get Smart Crop'}
 *       </button>
 *       {crop && (
 *         <p>Suggested crop: x={crop.crop.x}, y={crop.crop.y}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSmartCrop(config: UseSmartCropConfig = {}): UseSmartCropReturn {
    const {
        tier,
        autoLoad = false,
        defaultAspectRatio = 1,
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
    } = useSkill<SmartCropInput, SmartCropOutput>(skillConfig);

    /**
     * Get smart crop suggestion
     */
    const getCrop = useCallback(
        async (
            image: string | ArrayBuffer | Blob,
            options?: CropOptions
        ): Promise<SmartCropOutput> => {
            // Convert Blob to ArrayBuffer if needed
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

            const input: SmartCropInput = {
                image: imageData,
                aspectRatio: options?.aspectRatio ?? defaultAspectRatio,
                width: options?.width,
                height: options?.height,
            };

            // For now, use object detection to find main subject
            // Then calculate crop based on subject position
            // This is a simplified implementation
            const output = await execute(input);

            return output;
        },
        [execute, defaultAspectRatio]
    );

    return {
        getCrop,
        crop: result,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useSmartCrop;
