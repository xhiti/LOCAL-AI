/**
 * worker.ts - AI Worker Engine
 * 
 * Singleton Web Worker that handles all AI inference using
 * @huggingface/transformers v3. Off-main-thread execution ensures
 * the UI stays at 60fps even during heavy model inference.
 * 
 * @xhiti/local-ai
 */

import type {
    WorkerMessage,
    WorkerResponse,
    ProgressUpdate,
    ModelConfig,
    SkillType,
    ExecutionBackend,
} from '../core/types';

// ============================================================================
// Types
// ============================================================================

interface LoadedModel {
    config: ModelConfig;
    pipeline: unknown;
    backend: ExecutionBackend;
    memoryUsage: number;
}

interface LoadModelPayload {
    modelConfig: ModelConfig;
    tier: string;
}

interface ExecutePayload {
    skillType: SkillType;
    input: unknown;
    options: Record<string, unknown>;
}

// ============================================================================
// Worker State
// ============================================================================

let loadedModels: Map<string, LoadedModel> = new Map();
let currentBackend: ExecutionBackend = 'wasm';
let debug = false;
let isInitialized = false;
let pipelines: any = null;

// ============================================================================
// Logging
// ============================================================================

function log(...args: unknown[]) {
    if (debug) {
        console.log('[AI Worker]', ...args);
    }
}

// ============================================================================
// Progress Reporting
// ============================================================================

function reportProgress(
    messageId: string,
    progress: number,
    status: ProgressUpdate['status'],
    message: string,
    extra?: Partial<ProgressUpdate>
) {
    const update: ProgressUpdate = {
        id: messageId,
        progress,
        status,
        message,
        ...extra,
    };
    self.postMessage(update);
}

// ============================================================================
// Initialize Transformers
// ============================================================================

async function initializeTransformers() {
    if (pipelines) return pipelines;

    try {
        // Dynamic import of @huggingface/transformers
        const transformers = await import('@huggingface/transformers');
        pipelines = transformers;

        // Configure for browser
        const { env } = transformers;
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        return transformers;
    } catch (error) {
        log('Failed to load transformers:', error);
        throw new Error('Failed to initialize AI engine. Please check your network connection.');
    }
}

// ============================================================================
// Load Model
// ============================================================================

async function loadModel(
    messageId: string,
    payload: LoadModelPayload
): Promise<{ modelId: string; cached: boolean }> {
    const { modelConfig } = payload;

    // Check if already loaded
    if (loadedModels.has(modelConfig.id)) {
        log(`Model ${modelConfig.id} already loaded`);
        return { modelId: modelConfig.id, cached: true };
    }

    reportProgress(messageId, 0, 'checking-cache', 'Checking cache...');

    try {
        const transformers = await initializeTransformers();

        reportProgress(messageId, 10, 'downloading', 'Downloading model...');

        // Get the appropriate pipeline function
        let pipelineFn: any;
        let taskName: string;

        switch (modelConfig.taskType) {
            case 'summarization':
                pipelineFn = transformers.pipeline;
                taskName = 'summarization';
                break;
            case 'translation':
                pipelineFn = transformers.pipeline;
                taskName = 'translation';
                break;
            case 'feature-extraction':
            case 'embeddings':
                pipelineFn = transformers.pipeline;
                taskName = 'feature-extraction';
                break;
            case 'zero-shot-classification':
            case 'classification':
                pipelineFn = transformers.pipeline;
                taskName = 'zero-shot-classification';
                break;
            case 'speech-recognition':
                pipelineFn = transformers.pipeline;
                taskName = 'automatic-speech-recognition';
                break;
            case 'text-to-speech':
                pipelineFn = transformers.pipeline;
                taskName = 'text-to-speech';
                break;
            case 'object-detection':
                pipelineFn = transformers.pipeline;
                taskName = 'object-detection';
                break;
            case 'image-classification':
                pipelineFn = transformers.pipeline;
                taskName = 'image-classification';
                break;
            case 'image-segmentation':
                pipelineFn = transformers.pipeline;
                taskName = 'image-segmentation';
                break;
            case 'ocr':
                pipelineFn = transformers.pipeline;
                taskName = 'image-to-text';
                break;
            case 'question-answering':
                pipelineFn = transformers.pipeline;
                taskName = 'question-answering';
                break;
            case 'fill-mask':
                pipelineFn = transformers.pipeline;
                taskName = 'fill-mask';
                break;
            case 'text-generation':
                pipelineFn = transformers.pipeline;
                taskName = 'text-generation';
                break;
            default:
                throw new Error(`Unknown task type: ${modelConfig.taskType}`);
        }

        // Load the pipeline with progress callback
        const pipeline = await pipelineFn(taskName, modelConfig.hfModelId, {
            progress_callback: (progress: any) => {
                if (progress.status === 'downloading') {
                    const percent = progress.progress ?? 0;
                    reportProgress(
                        messageId,
                        10 + (percent * 0.8), // 10-90% for download
                        'downloading',
                        `Downloading model... ${Math.round(percent)}%`,
                        {
                            loaded: progress.loaded,
                            total: progress.total,
                            eta: progress.eta,
                        }
                    );
                } else if (progress.status === 'loading') {
                    reportProgress(
                        messageId,
                        90 + (progress.progress * 0.1), // 90-100% for loading
                        'loading',
                        'Loading model into memory...'
                    );
                }
            },
            quantized: modelConfig.quantization !== 'fp32',
            // @ts-ignore - dtype option
            dtype: modelConfig.quantization === 'q4' ? 'q4' :
                modelConfig.quantization === 'q8' ? 'q8' : 'fp16',
        });

        reportProgress(messageId, 100, 'ready', 'Model ready');

        // Store the loaded model
        loadedModels.set(modelConfig.id, {
            config: modelConfig,
            pipeline,
            backend: currentBackend,
            memoryUsage: modelConfig.fileSize,
        });

        log(`Model ${modelConfig.id} loaded successfully`);

        return { modelId: modelConfig.id, cached: false };
    } catch (error) {
        log(`Failed to load model ${modelConfig.id}:`, error);
        throw error;
    }
}

// ============================================================================
// Execute Task
// ============================================================================

async function executeTask(
    messageId: string,
    payload: ExecutePayload
): Promise<unknown> {
    const { skillType, input, options } = payload;

    // Find loaded model for this skill type
    let loadedModel: LoadedModel | undefined;
    for (const model of loadedModels.values()) {
        if (model.config.taskType === skillType) {
            loadedModel = model;
            break;
        }
    }

    if (!loadedModel) {
        throw new Error(`No model loaded for skill type: ${skillType}`);
    }

    log(`Executing ${skillType}...`, { input, options });

    const startTime = Date.now();
    const pipeline = loadedModel.pipeline as any;

    try {
        let result: any;

        switch (skillType) {
            case 'summarization': {
                const summarizeInput = input as { text: string; maxLength?: number; minLength?: number };
                result = await pipeline(summarizeInput.text, {
                    max_length: summarizeInput.maxLength ?? 150,
                    min_length: summarizeInput.minLength ?? 30,
                    do_sample: false,
                });
                // Extract summary text from result
                const summaryText = Array.isArray(result) ? result[0]?.summary_text : result.summary_text;
                result = { summary: summaryText };
                break;
            }

            case 'translation': {
                const translateInput = input as {
                    text: string;
                    sourceLang?: string;
                    targetLang: string;
                };
                result = await pipeline(translateInput.text, {
                    src_lang: translateInput.sourceLang,
                    tgt_lang: translateInput.targetLang,
                });
                const translationText = Array.isArray(result)
                    ? result[0]?.translation_text
                    : result.translation_text;
                result = { translation: translationText };
                break;
            }

            case 'feature-extraction':
            case 'embeddings': {
                const embedInput = input as { text: string | string[] };
                result = await pipeline(embedInput.text, {
                    pooling: 'mean',
                    normalize: true,
                });
                // Convert tensor to array
                const embedding = Array.isArray(result)
                    ? result
                    : Array.from(result.data || result);
                result = { embedding };
                break;
            }

            case 'zero-shot-classification':
            case 'classification': {
                const classifyInput = input as {
                    text: string;
                    categories: string[];
                    returnAllScores?: boolean;
                };
                result = await pipeline(classifyInput.text, classifyInput.categories);
                if (result.labels && result.scores) {
                    result = {
                        category: result.labels[0],
                        confidence: result.scores[0],
                        allScores: result.labels.map((label: string, i: number) => ({
                            category: label,
                            score: result.scores[i],
                        })),
                    };
                }
                break;
            }

            case 'speech-recognition': {
                const transcribeInput = input as {
                    audio: string | ArrayBuffer;
                    language?: string;
                    removeFillers?: boolean;
                };
                let audioData: any = transcribeInput.audio;

                // Handle base64 audio
                if (typeof audioData === 'string' && audioData.startsWith('data:')) {
                    // Convert base64 to blob URL or Float32Array
                    const response = await fetch(audioData);
                    audioData = await response.arrayBuffer();
                }

                result = await pipeline(audioData, {
                    language: transcribeInput.language,
                    return_timestamps: true,
                });

                let text = result.text || '';

                // Remove filler words if requested
                if (transcribeInput.removeFillers) {
                    const fillerWords = /\b(um|uh|like|you know|so|basically|actually|literally)\b/gi;
                    text = text.replace(fillerWords, '').replace(/\s+/g, ' ').trim();
                }

                result = {
                    text,
                    chunks: result.chunks || result.segments,
                    detectedLanguage: result.language,
                };
                break;
            }

            case 'text-to-speech': {
                const ttsInput = input as {
                    text: string;
                    voice?: string;
                    rate?: number;
                };
                result = await pipeline(ttsInput.text);
                // Result is audio tensor
                result = {
                    audio: result.audio || result,
                    sampleRate: result.sampling_rate || 16000,
                };
                break;
            }

            case 'object-detection': {
                const detectInput = input as {
                    image: string | ArrayBuffer;
                    threshold?: number;
                };
                result = await pipeline(detectInput.image, {
                    threshold: detectInput.threshold ?? 0.5,
                });
                result = {
                    objects: result.map((obj: any) => ({
                        label: obj.label,
                        confidence: obj.score,
                        box: obj.box,
                    })),
                };
                break;
            }

            case 'image-classification': {
                const classifyInput = input as { image: string | ArrayBuffer };
                result = await pipeline(classifyInput.image);
                result = {
                    classifications: result.map((r: any) => ({
                        label: r.label,
                        confidence: r.score,
                    })),
                };
                break;
            }

            case 'ocr': {
                const ocrInput = input as { image: string | ArrayBuffer };
                result = await pipeline(ocrInput.image);
                const text = Array.isArray(result)
                    ? result.map((r: any) => r.generated_text).join('\n')
                    : result.generated_text || result.text || String(result);
                result = { text };
                break;
            }

            case 'image-segmentation': {
                const segmentInput = input as { image: string | ArrayBuffer };
                result = await pipeline(segmentInput.image);
                result = {
                    segments: result.map((seg: any) => ({
                        label: seg.label,
                        mask: seg.mask,
                        score: seg.score,
                    })),
                };
                break;
            }

            case 'question-answering': {
                const qaInput = input as { question: string; context: string };
                result = await pipeline(qaInput.question, qaInput.context);
                result = {
                    answer: result.answer,
                    confidence: result.score,
                    start: result.start,
                    end: result.end,
                };
                break;
            }

            case 'fill-mask': {
                const maskInput = input as { text: string };
                result = await pipeline(maskInput.text);
                result = {
                    predictions: result.map((r: any) => ({
                        token: r.token_str,
                        score: r.score,
                        sequence: r.sequence,
                    })),
                };
                break;
            }

            case 'text-generation': {
                const genInput = input as {
                    text: string;
                    maxLength?: number;
                    temperature?: number;
                };
                result = await pipeline(genInput.text, {
                    max_new_tokens: genInput.maxLength ?? 100,
                    temperature: genInput.temperature ?? 0.7,
                });
                const generatedText = Array.isArray(result)
                    ? result[0]?.generated_text
                    : result.generated_text;
                result = { text: generatedText };
                break;
            }

            default:
                throw new Error(`Unknown skill type: ${skillType}`);
        }

        const executionTime = Date.now() - startTime;
        log(`Execution completed in ${executionTime}ms`);

        return result;
    } catch (error) {
        log(`Execution failed:`, error);
        throw error;
    }
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(event: MessageEvent) {
    const message = event.data as WorkerMessage;
    const { id, type, payload } = message;

    log(`Received message: ${type} (${id})`);

    try {
        let data: any;

        switch (type) {
            case 'init': {
                debug = (payload as any)?.debug ?? false;
                await initializeTransformers();
                isInitialized = true;
                data = { initialized: true };
                break;
            }

            case 'load-model': {
                data = await loadModel(id, payload as LoadModelPayload);
                break;
            }

            case 'execute': {
                data = await executeTask(id, payload as ExecutePayload);
                break;
            }

            case 'status': {
                data = {
                    initialized: isInitialized,
                    loadedModels: Array.from(loadedModels.keys()),
                    memoryUsage: Array.from(loadedModels.values()).reduce(
                        (sum, m) => sum + m.memoryUsage,
                        0
                    ),
                    backend: currentBackend,
                };
                break;
            }

            case 'cache-check': {
                const { modelId } = payload as { modelId: string };
                data = loadedModels.has(modelId);
                break;
            }

            case 'cache-clear': {
                loadedModels.clear();
                data = { cleared: true };
                break;
            }

            case 'dispose': {
                const { modelId } = payload as { modelId?: string };
                if (modelId) {
                    loadedModels.delete(modelId);
                } else {
                    loadedModels.clear();
                }
                data = { disposed: true };
                break;
            }

            case 'abort': {
                // Handle abort - in practice, we'd need to track and cancel running operations
                log('Abort requested');
                data = { aborted: true };
                break;
            }

            default:
                throw new Error(`Unknown message type: ${type}`);
        }

        const response: WorkerResponse = {
            id,
            success: true,
            data,
        };
        self.postMessage(response);
    } catch (error) {
        const response: WorkerResponse = {
            id,
            success: false,
            error: (error as Error).message || 'Unknown error',
        };
        self.postMessage(response);
    }
}

// ============================================================================
// Worker Setup
// ============================================================================

self.onmessage = handleMessage;

// Log worker start
log('AI Worker initialized');