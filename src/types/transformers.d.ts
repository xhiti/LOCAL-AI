/**
 * Type declarations for @huggingface/transformers
 * 
 * These are minimal type declarations for the transformers.js library.
 * Full types are provided by the package itself.
 */

declare module '@huggingface/transformers' {
    /**
     * Pipeline function type
     */
    export type PipelineType =
        | 'summarization'
        | 'translation'
        | 'feature-extraction'
        | 'zero-shot-classification'
        | 'automatic-speech-recognition'
        | 'text-to-speech'
        | 'object-detection'
        | 'image-classification'
        | 'image-segmentation'
        | 'image-to-text'
        | 'question-answering'
        | 'fill-mask'
        | 'text-generation';

    /**
     * Progress callback info
     */
    export interface ProgressInfo {
        status: 'downloading' | 'loading' | 'done';
        file?: string;
        progress?: number;
        loaded?: number;
        total?: number;
        eta?: number;
    }

    /**
     * Pipeline options
     */
    export interface PipelineOptions {
        progress_callback?: (progress: ProgressInfo) => void;
        quantized?: boolean;
        dtype?: 'q4' | 'q8' | 'fp16' | 'fp32';
    }

    /**
     * Summarization result
     */
    export interface SummarizationResult {
        summary_text: string;
    }

    /**
     * Translation result
     */
    export interface TranslationResult {
        translation_text: string;
    }

    /**
     * Feature extraction result
     */
    export interface FeatureExtractionResult {
        data: Float32Array | number[];
        dims: number[];
    }

    /**
     * Zero-shot classification result
     */
    export interface ZeroShotClassificationResult {
        labels: string[];
        scores: number[];
        sequence: string;
    }

    /**
     * Speech recognition result
     */
    export interface SpeechRecognitionResult {
        text: string;
        chunks?: Array<{
            text: string;
            timestamp: [number, number];
        }>;
        language?: string;
    }

    /**
     * TTS result
     */
    export interface TTSResult {
        audio: Float32Array | ArrayBuffer;
        sampling_rate: number;
    }

    /**
     * Object detection result
     */
    export interface ObjectDetectionResult {
        label: string;
        score: number;
        box: {
            xmin: number;
            ymin: number;
            xmax: number;
            ymax: number;
        };
    }

    /**
     * Image classification result
     */
    export interface ImageClassificationResult {
        label: string;
        score: number;
    }

    /**
     * Question answering result
     */
    export interface QuestionAnsweringResult {
        answer: string;
        score: number;
        start: number;
        end: number;
    }

    /**
     * Fill mask result
     */
    export interface FillMaskResult {
        score: number;
        token: number;
        token_str: string;
        sequence: string;
    }

    /**
     * Text generation result
     */
    export interface TextGenerationResult {
        generated_text: string;
    }

    /**
     * Pipeline function overloads
     */
    export function pipeline(
        task: 'summarization',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, options?: Record<string, unknown>) => Promise<SummarizationResult | SummarizationResult[]>>;

    export function pipeline(
        task: 'translation',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, options?: Record<string, unknown>) => Promise<TranslationResult | TranslationResult[]>>;

    export function pipeline(
        task: 'feature-extraction',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string | string[], options?: Record<string, unknown>) => Promise<FeatureExtractionResult>>;

    export function pipeline(
        task: 'zero-shot-classification',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, labels: string[], options?: Record<string, unknown>) => Promise<ZeroShotClassificationResult>>;

    export function pipeline(
        task: 'automatic-speech-recognition',
        model?: string,
        options?: PipelineOptions
    ): Promise<(audio: ArrayBuffer | string, options?: Record<string, unknown>) => Promise<SpeechRecognitionResult>>;

    export function pipeline(
        task: 'text-to-speech',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, options?: Record<string, unknown>) => Promise<TTSResult>>;

    export function pipeline(
        task: 'object-detection',
        model?: string,
        options?: PipelineOptions
    ): Promise<(image: ArrayBuffer | string, options?: Record<string, unknown>) => Promise<ObjectDetectionResult[]>>;

    export function pipeline(
        task: 'image-classification',
        model?: string,
        options?: PipelineOptions
    ): Promise<(image: ArrayBuffer | string, options?: Record<string, unknown>) => Promise<ImageClassificationResult[]>>;

    export function pipeline(
        task: 'question-answering',
        model?: string,
        options?: PipelineOptions
    ): Promise<(question: string, context: string, options?: Record<string, unknown>) => Promise<QuestionAnsweringResult>>;

    export function pipeline(
        task: 'fill-mask',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, options?: Record<string, unknown>) => Promise<FillMaskResult[]>>;

    export function pipeline(
        task: 'text-generation',
        model?: string,
        options?: PipelineOptions
    ): Promise<(text: string, options?: Record<string, unknown>) => Promise<TextGenerationResult | TextGenerationResult[]>>;

    export function pipeline(
        task: PipelineType,
        model?: string,
        options?: PipelineOptions
    ): Promise<(...args: unknown[]) => Promise<unknown>>;

    /**
     * Environment configuration
     */
    export const env: {
        allowLocalModels: boolean;
        useBrowserCache: boolean;
        localModelPath?: string;
        remoteHost?: string;
        remotePathTemplate?: string;
    };
}
