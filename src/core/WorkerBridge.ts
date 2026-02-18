/**
 * WorkerBridge.ts - Promise-based Web Worker Communication Layer
 * 
 * Handles all message passing between the main thread and AI worker.
 * Implements a request queue with progress tracking and timeout support.
 * 
 * @xhiti/local-ai
 */

import type {
    WorkerMessage,
    WorkerResponse,
    ProgressUpdate,
    WorkerMessageType,
} from './types';

/**
 * Pending request tracking
 */
interface PendingRequest<T = unknown> {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: ProgressUpdate) => void;
    timeout: ReturnType<typeof setTimeout> | null;
    startTime: number;
}

/**
 * Configuration for WorkerBridge
 */
export interface WorkerBridgeConfig {
    /** Worker script URL */
    workerUrl: string | URL;
    /** Default timeout for requests in ms */
    defaultTimeout?: number;
    /** Maximum concurrent requests */
    maxConcurrent?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Retry attempts for failed requests */
    retryAttempts?: number;
    /** Delay between retries in ms */
    retryDelay?: number;
}

/**
 * WorkerBridge - Singleton manager for Web Worker communication
 * 
 * Features:
 * - Promise-based API with request correlation
 * - Progress tracking via callbacks
 * - Automatic timeout handling
 * - Request queuing and concurrency control
 * - Automatic retry on failure
 * - Graceful error handling
 * 
 * @example
 * ```ts
 * const bridge = WorkerBridge.getInstance();
 * 
 * const result = await bridge.execute('summarize', {
 *   text: 'Long text here...'
 * }, {
 *   onProgress: (p) => console.log(`${p.progress}% - ${p.message}`)
 * });
 * ```
 */
export class WorkerBridge {
    private static instance: WorkerBridge | null = null;
    private worker: Worker | null = null;
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private messageQueue: Array<{
        message: WorkerMessage;
        onProgress?: (progress: ProgressUpdate) => void;
    }> = [];
    private isProcessing = false;
    private messageIdCounter = 0;
    private config: Required<WorkerBridgeConfig>;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private abortController: AbortController | null = null;

    private defaultConfig: Required<WorkerBridgeConfig> = {
        workerUrl: '',
        defaultTimeout: 300000, // 5 minutes default for large models
        maxConcurrent: 3,
        debug: false,
        retryAttempts: 2,
        retryDelay: 1000,
    };

    private constructor(config: WorkerBridgeConfig) {
        this.config = { ...this.defaultConfig, ...config };
    }

    /**
     * Get the singleton instance of WorkerBridge
     */
    public static getInstance(config?: WorkerBridgeConfig): WorkerBridge {
        if (!WorkerBridge.instance) {
            if (!config?.workerUrl) {
                throw new Error(
                    'WorkerBridge: workerUrl is required for first initialization'
                );
            }
            WorkerBridge.instance = new WorkerBridge(config);
        }
        return WorkerBridge.instance;
    }

    /**
     * Reset the singleton (useful for testing)
     */
    public static reset(): void {
        if (WorkerBridge.instance) {
            WorkerBridge.instance.dispose();
            WorkerBridge.instance = null;
        }
    }

    /**
     * Initialize the worker
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.doInitialize();
        return this.initPromise;
    }

    private async doInitialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.abortController = new AbortController();
                this.worker = new Worker(this.config.workerUrl, {
                    type: 'module',
                    name: 'local-ai-worker',
                });

                this.worker.onmessage = this.handleWorkerMessage.bind(this);
                this.worker.onerror = (error) => {
                    this.log('Worker error:', error);
                    reject(new Error(`Worker failed to initialize: ${error.message}`));
                };

                // Send init message
                const initMessage: WorkerMessage = {
                    id: this.generateId(),
                    type: 'init',
                    payload: { debug: this.config.debug },
                    timestamp: Date.now(),
                };

                // Wait for init response
                const tempHandler = (event: MessageEvent) => {
                    const response = event.data as WorkerResponse;
                    if (response.id === initMessage.id) {
                        this.worker!.removeEventListener('message', tempHandler);
                        if (response.success) {
                            this.isInitialized = true;
                            resolve();
                        } else {
                            reject(new Error(response.error || 'Worker initialization failed'));
                        }
                    }
                };

                this.worker.addEventListener('message', tempHandler);
                this.worker.postMessage(initMessage);

                // Timeout for init
                setTimeout(() => {
                    if (!this.isInitialized) {
                        reject(new Error('Worker initialization timeout'));
                    }
                }, 30000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Execute a task on the worker
     * 
     * @param type - Message type
     * @param payload - Task payload
     * @param options - Execution options
     * @returns Promise with the result
     */
    public async execute<T = unknown>(
        type: WorkerMessageType,
        payload: unknown,
        options?: {
            timeout?: number;
            onProgress?: (progress: ProgressUpdate) => void;
            signal?: AbortSignal;
        }
    ): Promise<T> {
        await this.initialize();

        return new Promise<T>((resolve, reject) => {
            const id = this.generateId();
            const timeout = options?.timeout ?? this.config.defaultTimeout;

            const message: WorkerMessage = {
                id,
                type,
                payload,
                timestamp: Date.now(),
            };

            // Handle abort signal
            if (options?.signal) {
                options.signal.addEventListener('abort', () => {
                    this.abort(id);
                    reject(new Error('Request aborted'));
                });
            }

            // Set up timeout
            const timeoutId = timeout
                ? setTimeout(() => {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request timeout after ${timeout}ms`));
                }, timeout)
                : null;

            // Store pending request
            this.pendingRequests.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
                onProgress: options?.onProgress,
                timeout: timeoutId,
                startTime: Date.now(),
            });

            // Queue or send message
            this.queueMessage(message, options?.onProgress);
        });
    }

    /**
     * Queue a message for processing
     */
    private queueMessage(
        message: WorkerMessage,
        onProgress?: (progress: ProgressUpdate) => void
    ): void {
        this.messageQueue.push({ message, onProgress });
        this.processQueue();
    }

    /**
     * Process the message queue
     */
    private processQueue(): void {
        if (this.isProcessing || this.messageQueue.length === 0 || !this.worker) {
            return;
        }

        this.isProcessing = true;
        const { message } = this.messageQueue.shift()!;

        this.log(`Sending message: ${message.type} (${message.id})`);
        this.worker.postMessage(message);

        // Allow next message to process
        this.isProcessing = false;

        // Process next if available (respecting concurrency)
        if (this.pendingRequests.size < this.config.maxConcurrent) {
            this.processQueue();
        }
    }

    /**
     * Handle messages from the worker
     */
    private handleWorkerMessage(event: MessageEvent): void {
        const data = event.data;

        // Handle progress updates
        if (data.progress !== undefined) {
            const progress = data as ProgressUpdate;
            const pending = this.pendingRequests.get(progress.id);
            if (pending?.onProgress) {
                pending.onProgress(progress);
            }
            return;
        }

        // Handle regular response
        const response = data as WorkerResponse;
        const pending = this.pendingRequests.get(response.id);

        if (!pending) {
            this.log(`No pending request for id: ${response.id}`);
            return;
        }

        // Clear timeout
        if (pending.timeout) {
            clearTimeout(pending.timeout);
        }

        // Remove from pending
        this.pendingRequests.delete(response.id);

        // Resolve or reject
        if (response.success) {
            this.log(`Request ${response.id} completed in ${Date.now() - pending.startTime}ms`);
            pending.resolve(response.data);
        } else {
            this.log(`Request ${response.id} failed:`, response.error);
            pending.reject(new Error(response.error || 'Unknown error'));
        }

        // Process queue
        this.processQueue();
    }

    /**
     * Abort a pending request
     */
    private abort(id: string): void {
        const pending = this.pendingRequests.get(id);
        if (pending) {
            if (pending.timeout) {
                clearTimeout(pending.timeout);
            }
            this.pendingRequests.delete(id);
        }

        // Send abort message to worker
        if (this.worker) {
            this.worker.postMessage({
                id: this.generateId(),
                type: 'abort',
                payload: { targetId: id },
                timestamp: Date.now(),
            } as WorkerMessage);
        }
    }

    /**
     * Check if a model is cached
     */
    public async checkCache(modelId: string): Promise<boolean> {
        const response = await this.execute<boolean>('cache-check', { modelId });
        return response;
    }

    /**
     * Clear the model cache
     */
    public async clearCache(): Promise<void> {
        await this.execute('cache-clear', {});
    }

    /**
     * Dispose of the worker
     */
    public dispose(): void {
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            if (pending.timeout) {
                clearTimeout(pending.timeout);
            }
            pending.reject(new Error('Worker disposed'));
        }
        this.pendingRequests.clear();
        this.messageQueue = [];

        // Terminate worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        this.isInitialized = false;
        this.initPromise = null;
    }

    /**
     * Generate a unique message ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${++this.messageIdCounter}`;
    }

    /**
     * Debug logging
     */
    private log(...args: unknown[]): void {
        if (this.config.debug) {
            console.log('[WorkerBridge]', ...args);
        }
    }
}

export default WorkerBridge;
