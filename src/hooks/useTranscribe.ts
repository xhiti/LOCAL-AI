/**
 * useTranscribe.ts - Local Speech Recognition Hook
 * 
 * Provides offline speech-to-text using Whisper models.
 * Supports 100+ languages, filler word removal, and word timestamps.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    TranscribeInput,
    TranscribeOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseTranscribeConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default language (auto-detect if not provided) */
    defaultLanguage?: string;
    /** Remove filler words by default */
    removeFillersByDefault?: boolean;
    /** Called on successful transcription */
    onSuccess?: (result: TranscribeOutput, input: TranscribeInput) => void;
    /** Called on error */
    onError?: (error: Error, input: TranscribeInput) => void;
}

/**
 * Hook return type
 */
export interface UseTranscribeReturn {
    /** Transcribe audio */
    transcribe: (
        audio: string | ArrayBuffer | Blob,
        options?: TranscribeOptions
    ) => Promise<string>;
    /** Transcribe with full result */
    transcribeDetailed: (input: TranscribeInput) => Promise<TranscribeOutput>;
    /** Transcribe from microphone */
    transcribeFromMic: (durationMs?: number) => Promise<string>;
    /** Transcription result */
    transcript: string | null;
    /** Full result object */
    result: TranscribeOutput | null;
    /** Loading state */
    isLoading: boolean;
    /** Progress percentage */
    progress: number;
    /** Status message */
    status: string;
    /** Error if any */
    error: Error | null;
    /** Reset state */
    reset: () => void;
    /** Abort current operation */
    abort: () => void;
}

/**
 * Transcription options
 */
export interface TranscribeOptions {
    /** Language code */
    language?: string;
    /** Remove filler words */
    removeFillers?: boolean;
    /** Add punctuation */
    addPunctuation?: boolean;
    /** Enable word timestamps */
    wordTimestamps?: boolean;
}

/**
 * Validate transcription input
 */
function validateInput(input: TranscribeInput): string | null {
    if (!input.audio) {
        return 'Audio data is required';
    }
    return null;
}

/**
 * Transform worker result to TranscribeOutput
 */
function transformResult(
    result: unknown,
    input: TranscribeInput
): TranscribeOutput {
    const data = result as {
        text: string;
        chunks?: Array<{ text: string; start: number; end: number }>;
        detectedLanguage?: string;
    };

    // Convert chunks to words if available
    const words = data.chunks?.flatMap((chunk) => {
        const wordsInChunk = chunk.text.trim().split(/\s+/);
        const duration = chunk.end - chunk.start;
        const wordDuration = duration / wordsInChunk.length;

        return wordsInChunk.map((word, i) => ({
            word,
            start: chunk.start + i * wordDuration,
            end: chunk.start + (i + 1) * wordDuration,
            confidence: 0.9,
        }));
    });

    return {
        text: data.text,
        detectedLanguage: data.detectedLanguage,
        segments: data.chunks,
        words,
        fillersRemoved: input.removeFillers,
    };
}

/**
 * useTranscribe - Local speech recognition hook
 * 
 * Provides offline speech-to-text using Whisper models.
 * All processing happens locally in the browser.
 * 
 * @features
 * - 100+ languages supported
 * - Automatic language detection
 * - Word-level timestamps
 * - Filler word removal
 * - Microphone input support
 * 
 * @example
 * ```tsx
 * function Transcriber() {
 *   const { transcribe, transcribeFromMic, transcript, isLoading } = useTranscribe();
 * 
 *   const handleFile = async (file: File) => {
 *     const text = await transcribe(await file.arrayBuffer());
 *     console.log(text);
 *   };
 * 
 *   const handleMic = async () => {
 *     const text = await transcribeFromMic(5000); // 5 seconds
 *     console.log(text);
 *   };
 * 
 *   return (
 *     <div>
 *       <input type="file" accept="audio/*" onChange={e => handleFile(e.target.files[0])} />
 *       <button onClick={handleMic} disabled={isLoading}>
 *         Record 5 seconds
 *       </button>
 *       {transcript && <p>{transcript}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranscribe(config: UseTranscribeConfig = {}): UseTranscribeReturn {
    const {
        tier,
        autoLoad = false, // Don't auto-load by default due to model size
        defaultLanguage,
        removeFillersByDefault = false,
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'speech-recognition' as const,
            tier,
            autoLoad,
            validateInput,
            transformResult,
            onSuccess,
            onError,
        }),
        [tier, autoLoad, onSuccess, onError]
    );

    const {
        execute,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
        abort,
    } = useSkill<TranscribeInput, TranscribeOutput>(skillConfig);

    /**
     * Convert Blob to ArrayBuffer
     */
    const blobToArrayBuffer = useCallback(async (blob: Blob): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }, []);

    /**
     * Transcribe audio - returns just the text
     */
    const transcribe = useCallback(
        async (
            audio: string | ArrayBuffer | Blob,
            options?: TranscribeOptions
        ): Promise<string> => {
            let audioData: string | ArrayBuffer;

            if (audio instanceof Blob) {
                audioData = await blobToArrayBuffer(audio);
            } else {
                audioData = audio;
            }

            const input: TranscribeInput = {
                audio: audioData,
                language: options?.language ?? defaultLanguage,
                removeFillers: options?.removeFillers ?? removeFillersByDefault,
                addPunctuation: options?.addPunctuation ?? true,
                wordTimestamps: options?.wordTimestamps ?? false,
            };

            const output = await execute(input);
            return output.text;
        },
        [execute, defaultLanguage, removeFillersByDefault, blobToArrayBuffer]
    );

    /**
     * Transcribe with full result
     */
    const transcribeDetailed = useCallback(
        async (input: TranscribeInput): Promise<TranscribeOutput> => {
            const normalizedInput: TranscribeInput = {
                ...input,
                language: input.language ?? defaultLanguage,
                removeFillers: input.removeFillers ?? removeFillersByDefault,
            };
            return execute(normalizedInput);
        },
        [execute, defaultLanguage, removeFillersByDefault]
    );

    /**
     * Transcribe from microphone
     */
    const transcribeFromMic = useCallback(
        async (durationMs: number = 5000): Promise<string> => {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                },
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });

            const chunks: Blob[] = [];

            return new Promise((resolve, reject) => {
                mediaRecorder.ondataavailable = (e) => {
                    chunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    stream.getTracks().forEach((track) => track.stop());

                    try {
                        const text = await transcribe(blob);
                        resolve(text);
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (event) => {
                    reject(new Error('Recording failed'));
                };

                mediaRecorder.start();
                setTimeout(() => mediaRecorder.stop(), durationMs);
            });
        },
        [transcribe]
    );

    return {
        transcribe,
        transcribeDetailed,
        transcribeFromMic,
        transcript: result?.text ?? null,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
        abort,
    };
}

export default useTranscribe;