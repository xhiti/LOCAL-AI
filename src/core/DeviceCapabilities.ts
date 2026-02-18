/**
 * DeviceCapabilities.ts - Hardware Detection Module
 * 
 * Detects user hardware capabilities to determine optimal execution backend.
 * Supports WebGPU, WASM SIMD, and CPU fallback strategies.
 * 
 * @xhiti/local-ai
 */

import type { DeviceCapabilities, ExecutionBackend } from './types';

/**
 * Detect device capabilities for AI inference
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    // Run all detection in parallel for speed
    const [webgpu, wasmSimd, memory, cpuCores, gpuInfo] = await Promise.all([
        detectWebGPU(),
        detectWASMSimd(),
        estimateMemory(),
        Promise.resolve(getCpuCores()),
        detectGPUInfo(),
    ]);

    const isSupported = webgpu || wasmSimd;
    const recommendedBackend = determineRecommendedBackend(webgpu, wasmSimd, memory);

    return {
        webgpu,
        wasmSimd,
        estimatedMemory: memory,
        cpuCores,
        recommendedBackend,
        isSupported,
        gpuVendor: gpuInfo?.vendor,
    };
}

/**
 * Detect WebGPU support
 */
async function detectWebGPU(): Promise<boolean> {
    // Check if running in browser
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
        return false;
    }

    const gpu = (navigator as any).gpu;
    if (!gpu) {
        return false;
    }

    try {
        const adapter = await gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (!adapter) {
            return false;
        }

        // Check for required features
        const device = await adapter.requestDevice();
        if (!device) {
            return false;
        }

        // Clean up
        device.destroy();
        return true;
    } catch {
        return false;
    }
}

/**
 * Detect WebAssembly SIMD support
 */
async function detectWASMSimd(): Promise<boolean> {
    // Check if running in browser
    if (typeof WebAssembly === 'undefined') {
        return false;
    }

    try {
        // SIMD detection via feature detection
        const simdTest = new Uint8Array([
            0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10,
            10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
        ]);

        const wasmModule = await WebAssembly.compile(simdTest);
        await WebAssembly.instantiate(wasmModule);
        return true;
    } catch {
        return false;
    }
}

/**
 * Estimate device memory in GB
 */
async function estimateMemory(): Promise<number> {
    // Use deviceMemory API if available
    if ('deviceMemory' in navigator) {
        return (navigator as Navigator & { deviceMemory: number }).deviceMemory;
    }

    // Fallback: estimate based on performance characteristics
    try {
        const start = performance.now();

        // Try to allocate and access different sizes to estimate memory
        const testSizes = [64, 128, 256, 512, 1024, 2048, 4096];
        let maxSuccessfulSize = 256; // Default assumption

        for (const sizeMB of testSizes) {
            try {
                const size = sizeMB * 1024 * 1024;
                const buffer = new ArrayBuffer(size);

                // Touch memory to ensure it's allocated
                const view = new Uint8Array(buffer);
                for (let i = 0; i < view.length; i += 4096) {
                    view[i] = 1;
                }

                maxSuccessfulSize = sizeMB;
            } catch {
                break;
            }
        }

        const elapsed = performance.now() - start;

        // Estimate based on what we could allocate
        // This is a rough heuristic
        return Math.min(maxSuccessfulSize / 1024 * 2, 8); // Cap at 8GB
    } catch {
        // Conservative default
        return 4;
    }
}

/**
 * Get number of CPU cores
 */
function getCpuCores(): number {
    if ('hardwareConcurrency' in navigator) {
        return navigator.hardwareConcurrency || 4;
    }
    return 4; // Default assumption
}

/**
 * Detect GPU information via WebGPU
 */
async function detectGPUInfo(): Promise<GPUAdapterInfo | null> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
        return null;
    }

    try {
        const gpu = (navigator as any).gpu;
        if (!gpu) return null;

        const adapter = await gpu.requestAdapter();
        if (!adapter) return null;

        // Get adapter info
        const info = await adapter.requestAdapterInfo();
        return {
            vendor: info.vendor || 'unknown',
            architecture: info.architecture || 'unknown',
            device: info.device || 'unknown',
            description: info.description || 'unknown',
        };
    } catch {
        return null;
    }
}

/**
 * Determine the recommended backend
 */
function determineRecommendedBackend(
    webgpu: boolean,
    wasmSimd: boolean,
    memory: number
): ExecutionBackend {
    // WebGPU is preferred for larger models
    if (webgpu) {
        return 'webgpu';
    }

    // WASM SIMD is good for smaller models
    if (wasmSimd) {
        return 'wasm';
    }

    // CPU fallback
    return 'cpu';
}

/**
 * Check if a specific backend is available
 */
export async function isBackendAvailable(backend: ExecutionBackend): Promise<boolean> {
    const capabilities = await detectDeviceCapabilities();

    switch (backend) {
        case 'webgpu':
            return capabilities.webgpu;
        case 'wasm':
            return capabilities.wasmSimd;
        case 'cpu':
            return true;
        default:
            return false;
    }
}

/**
 * Get estimated inference time for a model size
 */
export function estimateInferenceTime(
    modelSizeMB: number,
    backend: ExecutionBackend,
    textLength: number = 500
): number {
    // Rough estimates based on benchmarks
    const baseTimes: Record<ExecutionBackend, number> = {
        webgpu: 0.5,  // ms per token per MB
        wasm: 2.0,    // ms per token per MB
        cpu: 5.0,     // ms per token per MB
    };

    const tokensPerChar = 0.25; // Approximate
    const tokens = textLength * tokensPerChar;

    return Math.round(modelSizeMB * baseTimes[backend] * tokens);
}

/**
 * Get recommended model tier based on device capabilities
 */
export function getRecommendedTier(capabilities: DeviceCapabilities): 'lite' | 'standard' | 'pro' {
    if (!capabilities.isSupported) {
        return 'lite'; // Safe default
    }

    // High-end device
    if (capabilities.webgpu && capabilities.estimatedMemory >= 8) {
        return 'pro';
    }

    // Mid-range device
    if (capabilities.wasmSimd && capabilities.estimatedMemory >= 4) {
        return 'standard';
    }

    // Low-end device
    return 'lite';
}

export default detectDeviceCapabilities;
