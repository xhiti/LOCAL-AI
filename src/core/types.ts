/**
 * @xhiti/local-ai - Core Types
 * Privacy-first AI skills for React applications
 * 
 * @author xhiti
 * @version 0.1.0
 */

// ============================================================================
// Model Tiers & Configuration
// ============================================================================

/**
 * Model tier configuration for performance/accuracy tradeoff
 * - 'lite': Optimized for speed, ~20MB, works on old devices
 * - 'standard': Balanced performance, ~80MB, good for most use cases  
 * - 'pro': Maximum accuracy, ~200MB+, requires WebGPU
 */
export type ModelTier = 'lite' | 'standard' | 'pro';

/**
 * Execution backend for AI inference
 */
export type ExecutionBackend = 'webgpu' | 'wasm' | 'cpu';

/**
 * Device capability detection result
 */
export interface DeviceCapabilities {
    /** Whether WebGPU is available */
    webgpu: boolean;
    /** Whether WebAssembly SIMD is available */
    wasmSimd: boolean;
    /** Estimated device memory in GB */
    estimatedMemory: number;
    /** Number of logical CPU cores */
    cpuCores: number;
    /** Recommended backend based on detection */
    recommendedBackend: ExecutionBackend;
    /** Whether the device supports all features */
    isSupported: boolean;
    /** Detected GPU vendor if available */
    gpuVendor?: string;
}

/**
 * Model configuration for the registry
 */
export interface ModelConfig {
    /** Unique identifier for the model */
    id: string;
    /** Human-readable name */
    name: string;
    /** Model description */
    description?: string;
    /** Hugging Face model ID */
    hfModelId: string;
    /** Model tier */
    tier: ModelTier;
    /** File size in bytes */
    fileSize: number;
    /** Required backend (undefined = any) */
    requiredBackend?: ExecutionBackend;
    /** Quantization level */
    quantization?: 'q4' | 'q8' | 'fp16' | 'fp32';
    /** Task type this model supports */
    taskType: SkillType;
    /** Whether this model is loaded */
    isLoaded?: boolean;
    /** Cache key for IndexedDB */
    cacheKey: string;
}

// ============================================================================
// Skill Types & Registry
// ============================================================================

/**
 * Available skill types in the registry
 */
export type SkillType =
    | 'summarization'
    | 'translation'
    | 'classification'
    | 'embeddings'
    | 'speech-recognition'
    | 'text-to-speech'
    | 'object-detection'
    | 'image-classification'
    | 'ocr'
    | 'image-segmentation'
    | 'zero-shot-classification'
    | 'feature-extraction'
    | 'fill-mask'
    | 'question-answering'
    | 'text-generation';

/**
 * Base skill configuration
 */
export interface SkillConfig<TInput = unknown, TOutput = unknown> {
    /** Skill type identifier */
    type: SkillType;
    /** Skill name for display */
    name: string;
    /** Description of what the skill does */
    description: string;
    /** Model tier to use */
    tier?: ModelTier;
    /** Custom model ID override */
    modelId?: string;
    /** Execution options */
    options?: SkillOptions;
    /** Input validator */
    validateInput?: (input: TInput) => boolean | string;
    /** Output transformer */
    transformOutput?: (output: unknown) => TOutput;
}

/**
 * Skill execution options
 */
export interface SkillOptions {
    /** Maximum execution time in ms */
    timeout?: number;
    /** Whether to cache results */
    cacheResults?: boolean;
    /** Cache TTL in seconds */
    cacheTTL?: number;
    /** Progress callback interval in ms */
    progressInterval?: number;
    /** Custom model parameters */
    modelParams?: Record<string, unknown>;
}

/**
 * Skill state returned by useSkill
 */
export interface SkillState<TOutput = unknown> {
    /** Execution result */
    result: TOutput | null;
    /** Whether the skill is currently executing */
    isLoading: boolean;
    /** Download/loading progress (0-100) */
    progress: number;
    /** Current status message */
    status: SkillStatus;
    /** Error if any occurred */
    error: Error | null;
    /** Execution time in ms */
    executionTime?: number;
    /** Whether the model is cached */
    isCached: boolean;
    /** Estimated time remaining in seconds */
    estimatedTimeRemaining?: number;
}

/**
 * Skill execution status
 */
export type SkillStatus =
    | 'idle'
    | 'checking-cache'
    | 'downloading'
    | 'loading'
    | 'ready'
    | 'executing'
    | 'success'
    | 'error';

/**
 * Skill execute function signature
 */
export type SkillExecuteFn<TInput, TOutput> = (
    input: TInput,
    options?: SkillOptions
) => Promise<TOutput>;

// ============================================================================
// Worker Communication Protocol
// ============================================================================

/**
 * Message types for worker communication
 */
export type WorkerMessageType =
    | 'init'
    | 'load-model'
    | 'execute'
    | 'abort'
    | 'status'
    | 'cache-check'
    | 'cache-clear'
    | 'dispose';

/**
 * Base worker message structure
 */
export interface WorkerMessage<T = unknown> {
    /** Unique message ID for response correlation */
    id: string;
    /** Message type */
    type: WorkerMessageType;
    /** Payload data */
    payload: T;
    /** Timestamp */
    timestamp: number;
}

/**
 * Worker response structure
 */
export interface WorkerResponse<T = unknown> {
    /** Correlation ID from original message */
    id: string;
    /** Whether the operation succeeded */
    success: boolean;
    /** Result data */
    data?: T;
    /** Error message if failed */
    error?: string;
    /** Execution metadata */
    meta?: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
    /** Execution time in ms */
    executionTime: number;
    /** Backend used */
    backend: ExecutionBackend;
    /** Memory used in MB */
    memoryUsed?: number;
    /** Model ID used */
    modelId: string;
    /** Whether result was from cache */
    fromCache?: boolean;
}

/**
 * Progress update from worker
 */
export interface ProgressUpdate {
    /** Message ID this progress relates to */
    id: string;
    /** Current progress (0-100) */
    progress: number;
    /** Current status */
    status: SkillStatus;
    /** Human-readable status message */
    message: string;
    /** Bytes loaded (for downloads) */
    loaded?: number;
    /** Total bytes */
    total?: number;
    /** Estimated time remaining in seconds */
    eta?: number;
}

// ============================================================================
// Specific Skill Interfaces
// ============================================================================

/**
 * Summarization skill input
 */
export interface SummarizeInput {
    /** Text to summarize */
    text: string;
    /** Maximum length of summary */
    maxLength?: number;
    /** Minimum length of summary */
    minLength?: number;
    /** Whether to return multiple summaries */
    numSummaries?: number;
}

/**
 * Summarization skill output
 */
export interface SummarizeOutput {
    /** Summary text */
    summary: string;
    /** Original text length */
    originalLength: number;
    /** Summary length */
    summaryLength: number;
    /** Compression ratio */
    compressionRatio: number;
}

/**
 * Translation skill input
 */
export interface TranslateInput {
    /** Text to translate */
    text: string;
    /** Source language code (auto-detect if not provided) */
    sourceLang?: string;
    /** Target language code */
    targetLang: string;
}

/**
 * Translation skill output
 */
export interface TranslateOutput {
    /** Translated text */
    translation: string;
    /** Detected source language */
    detectedSourceLang?: string;
    /** Confidence score */
    confidence?: number;
}

/**
 * Semantic search input
 */
export interface SemanticSearchInput {
    /** Search query */
    query: string;
    /** JSON array to search through */
    documents: Array<Record<string, unknown>>;
    /** Number of results to return */
    topK?: number;
    /** Fields to search in documents */
    searchFields?: string[];
    /** Minimum similarity threshold (0-1) */
    threshold?: number;
}

/**
 * Semantic search result item
 */
export interface SemanticSearchResult {
    /** Matching document */
    document: Record<string, unknown>;
    /** Similarity score (0-1) */
    score: number;
    /** Index in original array */
    index: number;
}

/**
 * Semantic search output
 */
export interface SemanticSearchOutput {
    /** Search results sorted by relevance */
    results: SemanticSearchResult[];
    /** Query embedding vector */
    queryEmbedding?: number[];
    /** Total documents searched */
    totalDocuments: number;
    /** Search execution time in ms */
    searchTime: number;
}

/**
 * Speech recognition input
 */
export interface TranscribeInput {
    /** Audio data (base64 or ArrayBuffer) */
    audio: string | ArrayBuffer;
    /** Language code (auto-detect if not provided) */
    language?: string;
    /** Whether to remove filler words */
    removeFillers?: boolean;
    /** Whether to add punctuation */
    addPunctuation?: boolean;
    /** Whether to enable word-level timestamps */
    wordTimestamps?: boolean;
}

/**
 * Speech recognition output
 */
export interface TranscribeOutput {
    /** Transcribed text */
    text: string;
    /** Detected language */
    detectedLanguage?: string;
    /** Language confidence */
    languageConfidence?: number;
    /** Word-level timestamps */
    words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
    }>;
    /** Segments with timestamps */
    segments?: Array<{
        text: string;
        start: number;
        end: number;
    }>;
    /** Whether filler words were removed */
    fillersRemoved?: boolean;
}

/**
 * Text-to-speech input
 */
export interface TTSInput {
    /** Text to synthesize */
    text: string;
    /** Voice ID or name */
    voice?: string;
    /** Speech rate (0.5-2.0) */
    rate?: number;
    /** Pitch adjustment */
    pitch?: number;
    /** Output format */
    format?: 'wav' | 'mp3' | 'ogg';
}

/**
 * Text-to-speech output
 */
export interface TTSOutput {
    /** Audio data as ArrayBuffer */
    audio: ArrayBuffer;
    /** Audio duration in seconds */
    duration: number;
    /** Sample rate */
    sampleRate: number;
    /** MIME type */
    mimeType: string;
}

/**
 * Object detection input
 */
export interface ObjectDetectionInput {
    /** Image data (base64, URL, or ArrayBuffer) */
    image: string | ArrayBuffer | Blob;
    /** Confidence threshold (0-1) */
    threshold?: number;
    /** Whether to return bounding boxes */
    returnBoundingBoxes?: boolean;
}

/**
 * Detected object
 */
export interface DetectedObject {
    /** Object label */
    label: string;
    /** Confidence score */
    confidence: number;
    /** Bounding box */
    box: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Object ID for tracking */
    id?: string;
}

/**
 * Object detection output
 */
export interface ObjectDetectionOutput {
    /** Detected objects */
    objects: DetectedObject[];
    /** Processing time in ms */
    processingTime: number;
    /** Image dimensions */
    imageDimensions: {
        width: number;
        height: number;
    };
}

/**
 * OCR input
 */
export interface OCRInput {
    /** Image data */
    image: string | ArrayBuffer | Blob;
    /** Language hint */
    language?: string;
    /** Whether to return bounding boxes */
    returnBoundingBoxes?: boolean;
}

/**
 * OCR output
 */
export interface OCROutput {
    /** Extracted text */
    text: string;
    /** Detected blocks */
    blocks: Array<{
        text: string;
        confidence: number;
        box: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    /** Detected language */
    detectedLanguage?: string;
}

/**
 * Smart crop input
 */
export interface SmartCropInput {
    /** Image data */
    image: string | ArrayBuffer | Blob;
    /** Target aspect ratio */
    aspectRatio?: number;
    /** Target width */
    width?: number;
    /** Target height */
    height?: number;
}

/**
 * Smart crop output
 */
export interface SmartCropOutput {
    /** Crop coordinates */
    crop: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Detected subject */
    subject?: DetectedObject;
    /** Confidence of crop */
    confidence: number;
}

/**
 * Image privacy (face/license plate detection) input
 */
export interface ImagePrivacyInput {
    /** Image data */
    image: string | ArrayBuffer | Blob;
    /** Types of content to blur */
    blurTypes?: Array<'face' | 'license-plate' | 'text' | 'qrcode'>;
    /** Blur intensity (1-20) */
    blurIntensity?: number;
}

/**
 * Image privacy output
 */
export interface ImagePrivacyOutput {
    /** Processed image (base64) */
    processedImage: string;
    /** Detected sensitive regions */
    detectedRegions: Array<{
        type: string;
        confidence: number;
        box: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    /** Whether any content was blurred */
    wasProcessed: boolean;
}

/**
 * Classification input
 */
export interface ClassifyInput {
    /** Text to classify */
    text: string;
    /** Possible categories */
    categories: string[];
    /** Whether to return scores for all categories */
    returnAllScores?: boolean;
}

/**
 * Classification output
 */
export interface ClassifyOutput {
    /** Predicted category */
    category: string;
    /** Confidence score */
    confidence: number;
    /** Scores for all categories */
    allScores?: Array<{
        category: string;
        score: number;
    }>;
}

/**
 * JSON extraction input
 */
export interface JSONExtractInput {
    /** Text to extract from */
    text: string;
    /** Expected schema (JSON schema or description) */
    schema: Record<string, unknown> | string;
}

/**
 * JSON extraction output
 */
export interface JSONExtractOutput {
    /** Extracted structured data */
    data: Record<string, unknown>;
    /** Confidence of extraction */
    confidence: number;
    /** Fields that could not be extracted */
    missingFields?: string[];
}

// ============================================================================
// Provider & Context Types
// ============================================================================

/**
 * Global AI state
 */
export interface AIState {
    /** Whether the provider is initialized */
    isInitialized: boolean;
    /** Whether initialization is in progress */
    isInitializing: boolean;
    /** Device capabilities */
    capabilities: DeviceCapabilities | null;
    /** Current backend being used */
    currentBackend: ExecutionBackend;
    /** Loaded models */
    loadedModels: Map<string, ModelConfig>;
    /** Currently loading models */
    loadingModels: Set<string>;
    /** Total memory used by models in MB */
    memoryUsage: number;
    /** Error state */
    error: Error | null;
}

/**
 * Provider configuration
 */
export interface LocalAIProviderConfig {
    /** Default model tier */
    defaultTier?: ModelTier;
    /** Preferred backend (auto-detected if not provided) */
    preferredBackend?: ExecutionBackend;
    /** Maximum memory to use in MB */
    maxMemoryMB?: number;
    /** Whether to enable debug logging */
    debug?: boolean;
    /** Whether to preload default models */
    preloadModels?: SkillType[];
    /** Custom model configurations */
    modelOverrides?: Partial<Record<SkillType, ModelConfig>>;
    /** Cache configuration */
    cacheConfig?: CacheConfig;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Whether caching is enabled */
    enabled: boolean;
    /** Cache name in IndexedDB */
    name?: string;
    /** Maximum cache size in MB */
    maxSizeMB?: number;
    /** Cache version for invalidation */
    version?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract input type from skill config
 */
export type SkillInput<T extends SkillConfig> = T extends SkillConfig<infer I>
    ? I
    : never;

/**
 * Extract output type from skill config
 */
export type SkillOutput<T extends SkillConfig> = T extends SkillConfig<
    unknown,
    infer O
>
    ? O
    : never;

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type-safe event callback
 */
export type EventCallback<T = void> = (data: T) => void;

/**
 * Subscription returned by event listeners
 */
export interface Subscription {
    unsubscribe: () => void;
}
