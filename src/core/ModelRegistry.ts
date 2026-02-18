/**
 * ModelRegistry.ts - Central Model Configuration Registry
 * 
 * Defines all available models with their configurations,
 * download URLs, and tier mappings.
 * 
 * @xhiti/local-ai
 */

import type { ModelConfig, SkillType, ModelTier } from './types';

/**
 * Pre-configured models for each skill
 */
export const MODEL_REGISTRY: Record<SkillType, Record<ModelTier, ModelConfig>> = {
    // Text Summarization
    summarization: {
        lite: {
            id: 'summarizer-lite',
            name: 'DistilBART Summarizer (Lite)',
            description: 'Fast, lightweight summarization model for quick summaries',
            hfModelId: 'Xenova/distilbart-xsum-12-1',
            tier: 'lite',
            fileSize: 45_000_000, // ~45MB
            taskType: 'summarization',
            cacheKey: 'models/summarizer-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'summarizer-standard',
            name: 'BART Large CNN Summarizer',
            description: 'Balanced accuracy and speed for news articles',
            hfModelId: 'Xenova/bart-large-cnn',
            tier: 'standard',
            fileSize: 165_000_000, // ~165MB
            taskType: 'summarization',
            cacheKey: 'models/summarizer-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'summarizer-pro',
            name: 'LED Large Summarizer',
            description: 'Maximum accuracy for long documents',
            hfModelId: 'Xenova/led-large-16384-arxiv',
            tier: 'pro',
            fileSize: 450_000_000, // ~450MB
            taskType: 'summarization',
            requiredBackend: 'webgpu',
            cacheKey: 'models/summarizer-pro-v1',
            quantization: 'fp16',
        },
    },

    // Translation
    translation: {
        lite: {
            id: 'translator-lite',
            name: 'NLLB 200 Distilled (Lite)',
            description: '200+ languages, optimized for speed',
            hfModelId: 'Xenova/nllb-200-distilled-600M',
            tier: 'lite',
            fileSize: 85_000_000, // ~85MB
            taskType: 'translation',
            cacheKey: 'models/translator-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'translator-standard',
            name: 'NLLB 200 Distilled (Standard)',
            description: '200+ languages with better accuracy',
            hfModelId: 'Xenova/nllb-200-distilled-600M',
            tier: 'standard',
            fileSize: 170_000_000, // ~170MB (higher precision)
            taskType: 'translation',
            cacheKey: 'models/translator-standard-v1',
            quantization: 'fp16',
        },
        pro: {
            id: 'translator-pro',
            name: 'M2M100 1.2B',
            description: 'Highest quality multilingual translation',
            hfModelId: 'Xenova/m2m100_1.2B',
            tier: 'pro',
            fileSize: 520_000_000, // ~520MB
            taskType: 'translation',
            requiredBackend: 'webgpu',
            cacheKey: 'models/translator-pro-v1',
            quantization: 'fp16',
        },
    },

    // Classification
    classification: {
        lite: {
            id: 'classifier-lite',
            name: 'DistilBERT Classifier (Lite)',
            description: 'Fast text classification',
            hfModelId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
            tier: 'lite',
            fileSize: 65_000_000, // ~65MB
            taskType: 'classification',
            cacheKey: 'models/classifier-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'classifier-standard',
            name: 'BERT Base Classifier',
            description: 'Accurate zero-shot classification',
            hfModelId: 'Xenova/bert-base-multilingual-uncased-sentiment',
            tier: 'standard',
            fileSize: 210_000_000, // ~210MB
            taskType: 'zero-shot-classification',
            cacheKey: 'models/classifier-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'classifier-pro',
            name: 'DeBERTa V3 Classifier',
            description: 'State-of-the-art classification',
            hfModelId: 'Xenova/deberta-v3-base-tasksource-nli',
            tier: 'pro',
            fileSize: 380_000_000, // ~380MB
            taskType: 'zero-shot-classification',
            requiredBackend: 'webgpu',
            cacheKey: 'models/classifier-pro-v1',
            quantization: 'fp16',
        },
    },

    // Feature Extraction (Embeddings)
    'feature-extraction': {
        lite: {
            id: 'embeddings-lite',
            name: 'MiniLM Embeddings (Lite)',
            description: 'Fast semantic embeddings',
            hfModelId: 'Xenova/all-MiniLM-L6-v2',
            tier: 'lite',
            fileSize: 22_000_000, // ~22MB
            taskType: 'feature-extraction',
            cacheKey: 'models/embeddings-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'embeddings-standard',
            name: 'MPNet Base Embeddings',
            description: 'High-quality semantic embeddings',
            hfModelId: 'Xenova/all-mpnet-base-v2',
            tier: 'standard',
            fileSize: 105_000_000, // ~105MB
            taskType: 'feature-extraction',
            cacheKey: 'models/embeddings-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'embeddings-pro',
            name: 'E5 Large Embeddings',
            description: 'Best-in-class semantic embeddings',
            hfModelId: 'Xenova/e5-large-v2',
            tier: 'pro',
            fileSize: 335_000_000, // ~335MB
            taskType: 'feature-extraction',
            requiredBackend: 'webgpu',
            cacheKey: 'models/embeddings-pro-v1',
            quantization: 'fp16',
        },
    },

    // Speech Recognition
    'speech-recognition': {
        lite: {
            id: 'whisper-lite',
            name: 'Whisper Tiny (Lite)',
            description: 'Fast transcription, English optimized',
            hfModelId: 'Xenova/whisper-tiny.en',
            tier: 'lite',
            fileSize: 40_000_000, // ~40MB
            taskType: 'speech-recognition',
            cacheKey: 'models/whisper-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'whisper-standard',
            name: 'Whisper Base',
            description: 'Multilingual transcription',
            hfModelId: 'Xenova/whisper-base',
            tier: 'standard',
            fileSize: 75_000_000, // ~75MB
            taskType: 'speech-recognition',
            cacheKey: 'models/whisper-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'whisper-pro',
            name: 'Whisper Small',
            description: 'High-accuracy multilingual transcription',
            hfModelId: 'Xenova/whisper-small',
            tier: 'pro',
            fileSize: 240_000_000, // ~240MB
            taskType: 'speech-recognition',
            requiredBackend: 'webgpu',
            cacheKey: 'models/whisper-pro-v1',
            quantization: 'fp16',
        },
    },

    // Text-to-Speech
    'text-to-speech': {
        lite: {
            id: 'tts-lite',
            name: 'SpeechT5 TTS (Lite)',
            description: 'Basic text-to-speech',
            hfModelId: 'Xenova/speecht5_tts',
            tier: 'lite',
            fileSize: 110_000_000, // ~110MB
            taskType: 'text-to-speech',
            cacheKey: 'models/tts-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'tts-standard',
            name: 'SpeechT5 TTS (Standard)',
            description: 'Natural-sounding speech synthesis',
            hfModelId: 'Xenova/speecht5_tts',
            tier: 'standard',
            fileSize: 220_000_000, // ~220MB
            taskType: 'text-to-speech',
            cacheKey: 'models/tts-standard-v1',
            quantization: 'fp16',
        },
        pro: {
            id: 'tts-pro',
            name: 'VITS TTS (Pro)',
            description: 'High-quality voice synthesis',
            hfModelId: 'Xenova/vits_ljspeech',
            tier: 'pro',
            fileSize: 85_000_000, // ~85MB
            taskType: 'text-to-speech',
            cacheKey: 'models/tts-pro-v1',
            quantization: 'fp16',
        },
    },

    // Object Detection
    'object-detection': {
        lite: {
            id: 'detector-lite',
            name: 'YOLOv8 Nano (Lite)',
            description: 'Ultra-fast object detection',
            hfModelId: 'Xenova/yolos-tiny',
            tier: 'lite',
            fileSize: 25_000_000, // ~25MB
            taskType: 'object-detection',
            cacheKey: 'models/detector-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'detector-standard',
            name: 'YOLOS Small',
            description: 'Balanced detection accuracy',
            hfModelId: 'Xenova/yolos-small',
            tier: 'standard',
            fileSize: 95_000_000, // ~95MB
            taskType: 'object-detection',
            cacheKey: 'models/detector-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'detector-pro',
            name: 'DETR ResNet50',
            description: 'High-accuracy object detection',
            hfModelId: 'Xenova/detr-resnet-50',
            tier: 'pro',
            fileSize: 165_000_000, // ~165MB
            taskType: 'object-detection',
            requiredBackend: 'webgpu',
            cacheKey: 'models/detector-pro-v1',
            quantization: 'fp16',
        },
    },

    // Image Classification
    'image-classification': {
        lite: {
            id: 'image-classifier-lite',
            name: 'MobileNet V2 (Lite)',
            description: 'Fast image classification',
            hfModelId: 'Xenova/mobilenet_v2_1.0_224',
            tier: 'lite',
            fileSize: 14_000_000, // ~14MB
            taskType: 'image-classification',
            cacheKey: 'models/image-classifier-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'image-classifier-standard',
            name: 'ViT Base',
            description: 'Accurate image classification',
            hfModelId: 'Xenova/vit-base-patch16-224',
            tier: 'standard',
            fileSize: 85_000_000, // ~85MB
            taskType: 'image-classification',
            cacheKey: 'models/image-classifier-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'image-classifier-pro',
            name: 'ViT Large',
            description: 'Best image classification accuracy',
            hfModelId: 'Xenova/vit-large-patch16-224',
            tier: 'pro',
            fileSize: 310_000_000, // ~310MB
            taskType: 'image-classification',
            requiredBackend: 'webgpu',
            cacheKey: 'models/image-classifier-pro-v1',
            quantization: 'fp16',
        },
    },

    // OCR
    ocr: {
        lite: {
            id: 'ocr-lite',
            name: 'TrOCR Small (Lite)',
            description: 'Fast text recognition',
            hfModelId: 'Xenova/trocr-small-handwritten',
            tier: 'lite',
            fileSize: 80_000_000, // ~80MB
            taskType: 'ocr',
            cacheKey: 'models/ocr-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'ocr-standard',
            name: 'TrOCR Base',
            description: 'Accurate text recognition',
            hfModelId: 'Xenova/trocr-base-handwritten',
            tier: 'standard',
            fileSize: 180_000_000, // ~180MB
            taskType: 'ocr',
            cacheKey: 'models/ocr-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'ocr-pro',
            name: 'TrOCR Large',
            description: 'Best text recognition quality',
            hfModelId: 'Xenova/trocr-large-handwritten',
            tier: 'pro',
            fileSize: 420_000_000, // ~420MB
            taskType: 'ocr',
            requiredBackend: 'webgpu',
            cacheKey: 'models/ocr-pro-v1',
            quantization: 'fp16',
        },
    },

    // Image Segmentation
    'image-segmentation': {
        lite: {
            id: 'segmenter-lite',
            name: 'SegFormer B0 (Lite)',
            description: 'Fast semantic segmentation',
            hfModelId: 'Xenova/segformer-b0-finetuned-ade-512-512',
            tier: 'lite',
            fileSize: 15_000_000, // ~15MB
            taskType: 'image-segmentation',
            cacheKey: 'models/segmenter-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'segmenter-standard',
            name: 'SegFormer B2',
            description: 'Balanced segmentation',
            hfModelId: 'Xenova/segformer-b2-finetuned-ade-512-512',
            tier: 'standard',
            fileSize: 95_000_000, // ~95MB
            taskType: 'image-segmentation',
            cacheKey: 'models/segmenter-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'segmenter-pro',
            name: 'SegFormer B5',
            description: 'High-quality segmentation',
            hfModelId: 'Xenova/segformer-b5-finetuned-ade-640-640',
            tier: 'pro',
            fileSize: 185_000_000, // ~185MB
            taskType: 'image-segmentation',
            requiredBackend: 'webgpu',
            cacheKey: 'models/segmenter-pro-v1',
            quantization: 'fp16',
        },
    },

    // Zero-Shot Classification
    'zero-shot-classification': {
        lite: {
            id: 'zeroshot-lite',
            name: 'MiniLM Zero-Shot (Lite)',
            description: 'Fast zero-shot classification',
            hfModelId: 'Xenova/distilbert-base-uncased-mnli',
            tier: 'lite',
            fileSize: 65_000_000, // ~65MB
            taskType: 'zero-shot-classification',
            cacheKey: 'models/zeroshot-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'zeroshot-standard',
            name: 'BART MNLI',
            description: 'Accurate zero-shot classification',
            hfModelId: 'Xenova/bart-large-mnli',
            tier: 'standard',
            fileSize: 320_000_000, // ~320MB
            taskType: 'zero-shot-classification',
            cacheKey: 'models/zeroshot-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'zeroshot-pro',
            name: 'DeBERTa V3 NLI',
            description: 'Best zero-shot classification',
            hfModelId: 'Xenova/deberta-v3-large-tasksource-nli',
            tier: 'pro',
            fileSize: 750_000_000, // ~750MB
            taskType: 'zero-shot-classification',
            requiredBackend: 'webgpu',
            cacheKey: 'models/zeroshot-pro-v1',
            quantization: 'fp16',
        },
    },

    // Fill Mask
    'fill-mask': {
        lite: {
            id: 'fillmask-lite',
            name: 'DistilBERT MLM (Lite)',
            description: 'Fast masked language modeling',
            hfModelId: 'Xenova/distilbert-base-uncased',
            tier: 'lite',
            fileSize: 65_000_000, // ~65MB
            taskType: 'fill-mask',
            cacheKey: 'models/fillmask-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'fillmask-standard',
            name: 'BERT Base MLM',
            description: 'Accurate masked language modeling',
            hfModelId: 'Xenova/bert-base-uncased',
            tier: 'standard',
            fileSize: 210_000_000, // ~210MB
            taskType: 'fill-mask',
            cacheKey: 'models/fillmask-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'fillmask-pro',
            name: 'RoBERTa Large MLM',
            description: 'Best masked language modeling',
            hfModelId: 'Xenova/roberta-large',
            tier: 'pro',
            fileSize: 420_000_000, // ~420MB
            taskType: 'fill-mask',
            requiredBackend: 'webgpu',
            cacheKey: 'models/fillmask-pro-v1',
            quantization: 'fp16',
        },
    },

    // Question Answering
    'question-answering': {
        lite: {
            id: 'qa-lite',
            name: 'DistilBERT QA (Lite)',
            description: 'Fast question answering',
            hfModelId: 'Xenova/distilbert-base-uncased-distilled-squad',
            tier: 'lite',
            fileSize: 65_000_000, // ~65MB
            taskType: 'question-answering',
            cacheKey: 'models/qa-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'qa-standard',
            name: 'BERT QA',
            description: 'Accurate question answering',
            hfModelId: 'Xenova/bert-large-uncased-whole-word-masking-finetuned-squad',
            tier: 'standard',
            fileSize: 320_000_000, // ~320MB
            taskType: 'question-answering',
            cacheKey: 'models/qa-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'qa-pro',
            name: 'RoBERTa QA',
            description: 'Best question answering',
            hfModelId: 'Xenova/deepset/roberta-base-squad2',
            tier: 'pro',
            fileSize: 250_000_000, // ~250MB
            taskType: 'question-answering',
            requiredBackend: 'webgpu',
            cacheKey: 'models/qa-pro-v1',
            quantization: 'fp16',
        },
    },

    // Text Generation
    'text-generation': {
        lite: {
            id: 'generator-lite',
            name: 'GPT-2 Small (Lite)',
            description: 'Fast text generation',
            hfModelId: 'Xenova/gpt2',
            tier: 'lite',
            fileSize: 125_000_000, // ~125MB
            taskType: 'text-generation',
            cacheKey: 'models/generator-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'generator-standard',
            name: 'GPT-2 Medium',
            description: 'Better text generation',
            hfModelId: 'Xenova/gpt2-medium',
            tier: 'standard',
            fileSize: 350_000_000, // ~350MB
            taskType: 'text-generation',
            cacheKey: 'models/generator-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'generator-pro',
            name: 'GPT-2 Large',
            description: 'Best text generation',
            hfModelId: 'Xenova/gpt2-large',
            tier: 'pro',
            fileSize: 520_000_000, // ~520MB
            taskType: 'text-generation',
            requiredBackend: 'webgpu',
            cacheKey: 'models/generator-pro-v1',
            quantization: 'fp16',
        },
    },

    // Embeddings (alias for feature-extraction)
    embeddings: {
        lite: {
            id: 'embeddings-lite',
            name: 'MiniLM Embeddings (Lite)',
            description: 'Fast semantic embeddings',
            hfModelId: 'Xenova/all-MiniLM-L6-v2',
            tier: 'lite',
            fileSize: 22_000_000,
            taskType: 'feature-extraction',
            cacheKey: 'models/embeddings-lite-v1',
            quantization: 'q8',
        },
        standard: {
            id: 'embeddings-standard',
            name: 'MPNet Base Embeddings',
            description: 'High-quality semantic embeddings',
            hfModelId: 'Xenova/all-mpnet-base-v2',
            tier: 'standard',
            fileSize: 105_000_000,
            taskType: 'feature-extraction',
            cacheKey: 'models/embeddings-standard-v1',
            quantization: 'q8',
        },
        pro: {
            id: 'embeddings-pro',
            name: 'E5 Large Embeddings',
            description: 'Best-in-class semantic embeddings',
            hfModelId: 'Xenova/e5-large-v2',
            tier: 'pro',
            fileSize: 335_000_000,
            taskType: 'feature-extraction',
            requiredBackend: 'webgpu',
            cacheKey: 'models/embeddings-pro-v1',
            quantization: 'fp16',
        },
    },
};

/**
 * Get model configuration for a skill and tier
 */
export function getModelConfig(
    skillType: SkillType,
    tier: ModelTier = 'standard'
): ModelConfig {
    const skillModels = MODEL_REGISTRY[skillType];
    if (!skillModels) {
        throw new Error(`Unknown skill type: ${skillType}`);
    }
    return skillModels[tier];
}

/**
 * Get all models for a skill
 */
export function getModelsForSkill(skillType: SkillType): Record<ModelTier, ModelConfig> {
    return MODEL_REGISTRY[skillType];
}

/**
 * Get file size for a model tier in human-readable format
 */
export function formatModelSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default MODEL_REGISTRY;