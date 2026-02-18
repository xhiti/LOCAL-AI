/**
 * Hooks module exports
 */

// Base hook
export { useSkill } from './useSkill';
export type { UseSkillConfig, UseSkillReturn } from './useSkill';

// Text skills
export { useSummarize } from './useSummarize';
export type { UseSummarizeConfig, UseSummarizeReturn, SummarizeOptions } from './useSummarize';

export { useTranslate, LANGUAGE_CODES } from './useTranslate';
export type { UseTranslateConfig, UseTranslateReturn } from './useTranslate';

export { useClassify } from './useClassify';
export type { UseClassifyConfig, UseClassifyReturn } from './useClassify';

// Data skills
export { useSemanticSearch } from './useSemanticSearch';
export type { UseSemanticSearchConfig, UseSemanticSearchReturn, SearchOptions } from './useSemanticSearch';

// Audio skills
export { useTranscribe } from './useTranscribe';
export type { UseTranscribeConfig, UseTranscribeReturn, TranscribeOptions } from './useTranscribe';

export { useLocalTTS } from './useLocalTTS';
export type { UseLocalTTSConfig, UseLocalTTSReturn, SpeakOptions } from './useLocalTTS';

// Vision skills
export { useObjectDetection } from './useObjectDetection';
export type { UseObjectDetectionConfig, UseObjectDetectionReturn } from './useObjectDetection';

export { useOCR } from './useOCR';
export type { UseOCRConfig, UseOCRReturn } from './useOCR';

export { useSmartCrop } from './useSmartCrop';
export type { UseSmartCropConfig, UseSmartCropReturn, CropOptions } from './useSmartCrop';

export { useImagePrivacy } from './useImagePrivacy';
export type { UseImagePrivacyConfig, UseImagePrivacyReturn, PrivacyOptions } from './useImagePrivacy';

// Utility skills
export { useJSONExtractor } from './useJSONExtractor';
export type { UseJSONExtractorConfig, UseJSONExtractorReturn, SchemaDefinition } from './useJSONExtractor';

export { useA11yAutoAlt } from './useA11yAutoAlt';
export type { UseA11yAutoAltConfig, UseA11yAutoAltReturn } from './useA11yAutoAlt';
