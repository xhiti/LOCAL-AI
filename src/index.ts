/**
 * @xhiti/local-ai - Core Module Index
 * 
 * Privacy-first AI skills for React applications.
 * Zero backend, zero costs, 100% privacy.
 */

// Core Infrastructure
export { WorkerBridge } from './core/WorkerBridge';
export { ModelCache } from './core/ModelCache';
export { detectDeviceCapabilities, getRecommendedTier, isBackendAvailable } from './core/DeviceCapabilities';
export { MODEL_REGISTRY, getModelConfig, getModelsForSkill, formatModelSize } from './core/ModelRegistry';

// Types
export type {
    // Model & Device Types
    ModelTier,
    ExecutionBackend,
    DeviceCapabilities,
    ModelConfig,
    CacheConfig,

    // Skill Types
    SkillType,
    SkillConfig,
    SkillOptions,
    SkillState,
    SkillStatus,
    SkillExecuteFn,

    // Worker Types
    WorkerMessage,
    WorkerResponse,
    ProgressUpdate,
    ResponseMetadata,

    // Skill Input/Output Types
    SummarizeInput,
    SummarizeOutput,
    TranslateInput,
    TranslateOutput,
    SemanticSearchInput,
    SemanticSearchOutput,
    SemanticSearchResult,
    TranscribeInput,
    TranscribeOutput,
    TTSInput,
    TTSOutput,
    ObjectDetectionInput,
    ObjectDetectionOutput,
    DetectedObject,
    OCRInput,
    OCROutput,
    SmartCropInput,
    SmartCropOutput,
    ImagePrivacyInput,
    ImagePrivacyOutput,
    ClassifyInput,
    ClassifyOutput,
    JSONExtractInput,
    JSONExtractOutput,

    // Provider Types
    AIState,
    LocalAIProviderConfig,

    // Utility Types
    SkillInput,
    SkillOutput,
    EventCallback,
    Subscription,
} from './core/types';

// Provider
export {
    LocalAIProvider,
    useAIState,
    useIsAIReady,
    useDeviceCapabilities,
    useAIBackend,
    useMemoryUsage,
} from './provider/LocalAIProvider';

// Base Hook
export { useSkill } from './hooks/useSkill';
export type { UseSkillConfig, UseSkillReturn } from './hooks/useSkill';

// Text Skills
export { useSummarize } from './hooks/useSummarize';
export type { UseSummarizeConfig, UseSummarizeReturn, SummarizeOptions } from './hooks/useSummarize';

export { useTranslate, LANGUAGE_CODES } from './hooks/useTranslate';
export type { UseTranslateConfig, UseTranslateReturn } from './hooks/useTranslate';

export { useClassify } from './hooks/useClassify';
export type { UseClassifyConfig, UseClassifyReturn } from './hooks/useClassify';

// Data Skills
export { useSemanticSearch } from './hooks/useSemanticSearch';
export type { UseSemanticSearchConfig, UseSemanticSearchReturn, SearchOptions } from './hooks/useSemanticSearch';

// Audio Skills
export { useTranscribe } from './hooks/useTranscribe';
export type { UseTranscribeConfig, UseTranscribeReturn, TranscribeOptions } from './hooks/useTranscribe';

export { useLocalTTS } from './hooks/useLocalTTS';
export type { UseLocalTTSConfig, UseLocalTTSReturn, SpeakOptions } from './hooks/useLocalTTS';

// Vision Skills
export { useObjectDetection } from './hooks/useObjectDetection';
export type { UseObjectDetectionConfig, UseObjectDetectionReturn } from './hooks/useObjectDetection';

export { useOCR } from './hooks/useOCR';
export type { UseOCRConfig, UseOCRReturn } from './hooks/useOCR';

export { useSmartCrop } from './hooks/useSmartCrop';
export type { UseSmartCropConfig, UseSmartCropReturn, CropOptions } from './hooks/useSmartCrop';

export { useImagePrivacy } from './hooks/useImagePrivacy';
export type { UseImagePrivacyConfig, UseImagePrivacyReturn, PrivacyOptions } from './hooks/useImagePrivacy';

// Utility Skills
export { useJSONExtractor } from './hooks/useJSONExtractor';
export type { UseJSONExtractorConfig, UseJSONExtractorReturn, SchemaDefinition } from './hooks/useJSONExtractor';

export { useA11yAutoAlt } from './hooks/useA11yAutoAlt';
export type { UseA11yAutoAltConfig, UseA11yAutoAltReturn } from './hooks/useA11yAutoAlt';

// Components
export { AIStatus } from './components/AIStatus';
export type { AIStatusProps } from './components/AIStatus';
