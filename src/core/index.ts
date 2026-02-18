/**
 * Core module exports
 */

export { WorkerBridge } from './WorkerBridge';
export { ModelCache } from './ModelCache';
export {
    detectDeviceCapabilities,
    getRecommendedTier,
    isBackendAvailable,
    estimateInferenceTime,
} from './DeviceCapabilities';
export {
    MODEL_REGISTRY,
    getModelConfig,
    getModelsForSkill,
    formatModelSize
} from './ModelRegistry';

export * from './types';