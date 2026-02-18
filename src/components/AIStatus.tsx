/**
 * AIStatus.tsx - Visual Debugger Component
 * 
 * A Shadcn-styled component that shows download progress,
 * GPU memory usage, and "Brain" health status.
 * 
 * @xhiti/local-ai
 */

'use client';

import React, { useMemo } from 'react';
import { useAIState } from '../provider/LocalAIProvider';
import { formatModelSize } from '../core/ModelRegistry';
import type { DeviceCapabilities, ExecutionBackend } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export interface AIStatusProps {
    /** Show detailed information */
    detailed?: boolean;
    /** Show memory usage */
    showMemory?: boolean;
    /** Show loaded models */
    showModels?: boolean;
    /** Show device capabilities */
    showCapabilities?: boolean;
    /** Custom class name */
    className?: string;
    /** Compact mode */
    compact?: boolean;
    /** Theme variant */
    variant?: 'default' | 'card' | 'inline';
}

// ============================================================================
// Utility Functions
// ============================================================================

function getBackendLabel(backend: ExecutionBackend): string {
    switch (backend) {
        case 'webgpu':
            return 'WebGPU';
        case 'wasm':
            return 'WASM';
        case 'cpu':
            return 'CPU';
        default:
            return backend;
    }
}

function getBackendColor(backend: ExecutionBackend): string {
    switch (backend) {
        case 'webgpu':
            return 'text-green-500';
        case 'wasm':
            return 'text-yellow-500';
        case 'cpu':
            return 'text-orange-500';
        default:
            return 'text-gray-500';
    }
}

function getStatusColor(isInitialized: boolean, error: Error | null): string {
    if (error) return 'bg-red-500';
    if (isInitialized) return 'bg-green-500';
    return 'bg-yellow-500 animate-pulse';
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Status indicator dot
 */
function StatusDot({
    color,
    pulse = false
}: {
    color: string;
    pulse?: boolean;
}) {
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
        />
    );
}

/**
 * Progress bar component
 */
function ProgressBar({
    progress,
    className = ''
}: {
    progress: number;
    className?: string;
}) {
    return (
        <div className={`h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
            <div
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
        </div>
    );
}

/**
 * Badge component
 */
function Badge({
    children,
    variant = 'default'
}: {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error';
}) {
    const colors = {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[variant]}`}>
            {children}
        </span>
    );
}

/**
 * Card component
 */
function Card({
    children,
    className = ''
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className}`}>
            {children}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AIStatus - Visual debugger for local AI state
 * 
 * Displays real-time information about:
 * - Initialization status
 * - Current backend (WebGPU/WASM/CPU)
 * - Memory usage
 * - Loaded models
 * - Device capabilities
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <LocalAIProvider>
 *       <AIStatus detailed showMemory showModels />
 *       <MainContent />
 *     </LocalAIProvider>
 *   );
 * }
 * ```
 */
export function AIStatus({
    detailed = false,
    showMemory = true,
    showModels = true,
    showCapabilities = false,
    className = '',
    compact = false,
    variant = 'default',
}: AIStatusProps) {
    const {
        isInitialized,
        isInitializing,
        capabilities,
        currentBackend,
        loadedModels,
        loadingModels,
        memoryUsage,
        error,
    } = useAIState();

    const modelCount = loadedModels.size;
    const loadingCount = loadingModels.size;

    // Calculate memory display
    const memoryDisplay = useMemo(() => {
        return formatBytes(memoryUsage);
    }, [memoryUsage]);

    // Render inline variant
    if (variant === 'inline') {
        return (
            <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
                <StatusDot
                    color={getStatusColor(isInitialized, error)}
                    pulse={isInitializing}
                />
                <span className={getBackendColor(currentBackend)}>
                    {getBackendLabel(currentBackend)}
                </span>
                {showMemory && (
                    <span className="text-gray-500">
                        {memoryDisplay}
                    </span>
                )}
                {modelCount > 0 && (
                    <Badge variant="success">
                        {modelCount} model{modelCount !== 1 ? 's' : ''}
                    </Badge>
                )}
            </div>
        );
    }

    // Render compact variant
    if (compact) {
        return (
            <div className={`flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 ${className}`}>
                <div className="flex items-center gap-2">
                    <StatusDot
                        color={getStatusColor(isInitialized, error)}
                        pulse={isInitializing}
                    />
                    <span className="font-medium text-sm">
                        {error ? 'Error' : isInitialized ? 'Ready' : isInitializing ? 'Initializing...' : 'Offline'}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={getBackendColor(currentBackend)}>
                        {getBackendLabel(currentBackend)}
                    </span>
                    <span>•</span>
                    <span>{memoryDisplay}</span>
                </div>
            </div>
        );
    }

    // Render full variant
    return (
        <Card className={`p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                    <h3 className="font-semibold">Local AI</h3>
                </div>

                <div className="flex items-center gap-2">
                    <StatusDot
                        color={getStatusColor(isInitialized, error)}
                        pulse={isInitializing}
                    />
                    <span className="text-sm">
                        {error ? 'Error' : isInitialized ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {error.message}
                    </p>
                </div>
            )}

            {/* Initializing State */}
            {isInitializing && (
                <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Initializing AI engine...</p>
                    <ProgressBar progress={50} />
                </div>
            )}

            {/* Status Grid */}
            {isInitialized && (
                <div className="space-y-3">
                    {/* Backend */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Backend</span>
                        <Badge variant={currentBackend === 'webgpu' ? 'success' : 'warning'}>
                            {getBackendLabel(currentBackend)}
                        </Badge>
                    </div>

                    {/* Memory */}
                    {showMemory && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Memory Usage</span>
                            <span className="text-sm font-mono">{memoryDisplay}</span>
                        </div>
                    )}

                    {/* Models */}
                    {showModels && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Loaded Models</span>
                            <div className="flex items-center gap-2">
                                {loadingCount > 0 && (
                                    <Badge variant="warning">{loadingCount} loading</Badge>
                                )}
                                {modelCount > 0 ? (
                                    <Badge variant="success">{modelCount}</Badge>
                                ) : (
                                    <span className="text-sm text-gray-400">None</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Loaded Models List */}
                    {detailed && showModels && modelCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 mb-2">Models</p>
                            <div className="space-y-1">
                                {Array.from(loadedModels.values()).map((model) => (
                                    <div
                                        key={model.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="truncate">{model.name}</span>
                                        <span className="text-xs text-gray-400">
                                            {formatModelSize(model.fileSize)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Device Capabilities */}
                    {detailed && showCapabilities && capabilities && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 mb-2">Device</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">GPU: </span>
                                    <span className={capabilities.webgpu ? 'text-green-500' : 'text-red-500'}>
                                        {capabilities.webgpu ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">WASM: </span>
                                    <span className={capabilities.wasmSimd ? 'text-green-500' : 'text-red-500'}>
                                        {capabilities.wasmSimd ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Cores: </span>
                                    <span>{capabilities.cpuCores}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">RAM: </span>
                                    <span>{capabilities.estimatedMemory}GB</span>
                                </div>
                            </div>
                            {capabilities.gpuVendor && (
                                <p className="text-xs text-gray-400 mt-2">
                                    GPU: {capabilities.gpuVendor}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}

export default AIStatus;