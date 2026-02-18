/**
 * useObjectDetection.ts - Local Object Detection Hook
 * 
 * Provides real-time object detection using YOLO/DETR models.
 * Supports webcam, images, and video with bounding boxes.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useSkill } from './useSkill';
import type {
    ObjectDetectionInput,
    ObjectDetectionOutput,
    DetectedObject,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseObjectDetectionConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default confidence threshold */
    defaultThreshold?: number;
    /** Continuous detection mode */
    continuous?: boolean;
    /** Detection interval in ms (for continuous mode) */
    interval?: number;
    /** Called on each detection */
    onDetect?: (objects: DetectedObject[], imageDimensions: { width: number; height: number }) => void;
    /** Called on error */
    onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface UseObjectDetectionReturn {
    /** Detect objects in an image */
    detect: (
        image: string | ArrayBuffer | Blob,
        threshold?: number
    ) => Promise<DetectedObject[]>;
    /** Detect with full result */
    detectDetailed: (input: ObjectDetectionInput) => Promise<ObjectDetectionOutput>;
    /** Start webcam detection */
    startWebcam: (videoElement?: HTMLVideoElement) => Promise<void>;
    /** Stop webcam detection */
    stopWebcam: () => void;
    /** Detected objects */
    objects: DetectedObject[];
    /** Image dimensions */
    dimensions: { width: number; height: number } | null;
    /** Is currently detecting */
    isDetecting: boolean;
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
function validateInput(input: ObjectDetectionInput): string | null {
    if (!input.image) {
        return 'Image is required';
    }
    return null;
}

/**
 * useObjectDetection - Local object detection hook
 * 
 * Provides real-time object detection using YOLO/DETR models.
 * All processing happens locally in the browser.
 * 
 * @features
 * - Real-time detection
 * - Webcam support
 * - Bounding box coordinates
 * - Confidence scores
 * - Multiple object classes
 * 
 * @example
 * ```tsx
 * function Detector() {
 *   const { detect, startWebcam, stopWebcam, objects, isDetecting } = useObjectDetection({
 *     continuous: true,
 *     onDetect: (objs) => console.log('Detected:', objs),
 *   });
 * 
 *   return (
 *     <div>
 *       <video ref={videoRef} autoPlay playsInline />
 *       <button onClick={() => startWebcam(videoRef.current)}>
 *         {isDetecting ? 'Stop' : 'Start'} Webcam
 *       </button>
 *       {objects.map((obj, i) => (
 *         <div key={i}>{obj.label} ({obj.confidence.toFixed(2)})</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useObjectDetection(
    config: UseObjectDetectionConfig = {}
): UseObjectDetectionReturn {
    const {
        tier,
        autoLoad = false,
        defaultThreshold = 0.5,
        continuous = false,
        interval = 100,
        onDetect,
        onError,
    } = config;

    const [objects, setObjects] = useState<DetectedObject[]>([]);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isDetectingRef = useRef(false);
    const detectFnRef = useRef<((image: string) => Promise<DetectedObject[]>) | null>(null);

    const skillConfig = useMemo(
        () => ({
            skillType: 'object-detection' as const,
            tier,
            autoLoad,
            validateInput,
            onError: onError ? () => onError : undefined,
        }),
        [tier, autoLoad, onError]
    );

    const {
        execute,
        isLoading,
        progress,
        status,
        error,
        reset: resetSkill,
    } = useSkill<ObjectDetectionInput, ObjectDetectionOutput>(skillConfig);

    /**
     * Convert Blob/File to ArrayBuffer
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
     * Detect objects in an image
     */
    const detect = useCallback(
        async (
            image: string | ArrayBuffer | Blob,
            threshold?: number
        ): Promise<DetectedObject[]> => {
            const imageData = await getImageData(image);

            const input: ObjectDetectionInput = {
                image: imageData,
                threshold: threshold ?? defaultThreshold,
                returnBoundingBoxes: true,
            };

            const output = await execute(input);
            setObjects(output.objects);
            setDimensions(output.imageDimensions);

            onDetect?.(output.objects, output.imageDimensions);

            return output.objects;
        },
        [execute, defaultThreshold, getImageData, onDetect]
    );

    // Keep detect function in ref for use in processFrame
    useEffect(() => {
        detectFnRef.current = async (imageData: string) => {
            try {
                const input: ObjectDetectionInput = {
                    image: imageData,
                    threshold: defaultThreshold,
                    returnBoundingBoxes: true,
                };
                const output = await execute(input);
                setObjects(output.objects);
                setDimensions(output.imageDimensions);
                onDetect?.(output.objects, output.imageDimensions);
                return output.objects;
            } catch (error) {
                console.error('Detection error:', error);
                return [];
            }
        };
    }, [execute, defaultThreshold, onDetect]);

    /**
     * Detect with full result
     */
    const detectDetailed = useCallback(
        async (input: ObjectDetectionInput): Promise<ObjectDetectionOutput> => {
            const output = await execute({
                ...input,
                threshold: input.threshold ?? defaultThreshold,
                returnBoundingBoxes: true,
            });

            setObjects(output.objects);
            setDimensions(output.imageDimensions);

            return output;
        },
        [execute, defaultThreshold]
    );

    /**
     * Process frames from video - defined as a standalone function
     */
    useEffect(() => {
        const processFrame = async () => {
            if (!videoRef.current || !canvasRef.current || !isDetectingRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            // Draw current frame to canvas
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            // Get image data as base64
            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // Use the ref to call detect
            if (detectFnRef.current) {
                await detectFnRef.current(imageData);
            }

            // Schedule next frame if still detecting
            if (isDetectingRef.current && continuous) {
                timeoutRef.current = setTimeout(processFrame, interval);
            }
        };

        // Only start if detecting
        if (isDetecting && continuous) {
            processFrame();
        }

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isDetecting, continuous, interval]);

    /**
     * Start webcam detection
     */
    const startWebcam = useCallback(
        async (videoElement?: HTMLVideoElement) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });

                streamRef.current = stream;

                if (videoElement) {
                    videoRef.current = videoElement;
                } else {
                    // Create video element if not provided
                    videoRef.current = document.createElement('video');
                }

                videoRef.current!.srcObject = stream;
                await videoRef.current!.play();

                // Create canvas for frame capture
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas');
                }

                isDetectingRef.current = true;
                setIsDetecting(true);
            } catch (error) {
                onError?.(error as Error);
                throw error;
            }
        },
        [onError]
    );

    /**
     * Stop webcam detection
     */
    const stopWebcam = useCallback(() => {
        isDetectingRef.current = false;
        setIsDetecting(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            stopWebcam();
        };
    }, [stopWebcam]);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        stopWebcam();
        setObjects([]);
        setDimensions(null);
        resetSkill();
    }, [stopWebcam, resetSkill]);

    return {
        detect,
        detectDetailed,
        startWebcam,
        stopWebcam,
        objects,
        dimensions,
        isDetecting,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useObjectDetection;
