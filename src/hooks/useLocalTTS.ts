/**
 * useLocalTTS.ts - Local Text-to-Speech Hook
 * 
 * Provides offline text-to-speech synthesis using SpeechT5/Kokoro models.
 * Natural-sounding voices that work without internet.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback, useRef, useState } from 'react';
import { useSkill } from './useSkill';
import type {
    TTSInput,
    TTSOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseLocalTTSConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default voice */
    defaultVoice?: string;
    /** Default speech rate */
    defaultRate?: number;
    /** Default pitch */
    defaultPitch?: number;
    /** Auto-play on synthesize */
    autoPlay?: boolean;
    /** Called on successful synthesis */
    onSuccess?: (result: TTSOutput, input: TTSInput) => void;
    /** Called on error */
    onError?: (error: Error, input: TTSInput) => void;
}

/**
 * Hook return type
 */
export interface UseLocalTTSReturn {
    /** Synthesize speech */
    speak: (text: string, options?: SpeakOptions) => Promise<TTSOutput>;
    /** Speak and play audio */
    speakAndPlay: (text: string, options?: SpeakOptions) => Promise<void>;
    /** Play the last synthesized audio */
    play: () => Promise<void>;
    /** Stop playback */
    stop: () => void;
    /** Pause playback */
    pause: () => void;
    /** Resume playback */
    resume: () => void;
    /** Synthesized audio */
    audio: ArrayBuffer | null;
    /** Audio URL for playback */
    audioUrl: string | null;
    /** Duration in seconds */
    duration: number | null;
    /** Is currently playing */
    isPlaying: boolean;
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
}

/**
 * Speak options
 */
export interface SpeakOptions {
    /** Voice ID */
    voice?: string;
    /** Speech rate (0.5-2.0) */
    rate?: number;
    /** Pitch adjustment */
    pitch?: number;
    /** Output format */
    format?: 'wav' | 'mp3' | 'ogg';
}

/**
 * Validate TTS input
 */
function validateInput(input: TTSInput): string | null {
    if (!input.text || typeof input.text !== 'string') {
        return 'Text is required for synthesis';
    }
    if (input.text.trim().length === 0) {
        return 'Text cannot be empty';
    }
    if (input.text.length > 10000) {
        return 'Text exceeds maximum length of 10,000 characters';
    }
    if (input.rate && (input.rate < 0.5 || input.rate > 2.0)) {
        return 'Rate must be between 0.5 and 2.0';
    }
    return null;
}

/**
 * useLocalTTS - Local text-to-speech hook
 * 
 * Provides offline text-to-speech synthesis.
 * All processing happens locally in the browser.
 * 
 * @features
 * - Natural-sounding voices
 * - Adjustable rate and pitch
 * - Multiple output formats
 * - Built-in audio player
 * - Zero server costs
 * 
 * @example
 * ```tsx
 * function Speaker() {
 *   const { speakAndPlay, speak, isPlaying, isLoading, stop } = useLocalTTS();
 * 
 *   return (
 *     <div>
 *       <button 
 *         onClick={() => speakAndPlay('Hello, world!')}
 *         disabled={isLoading || isPlaying}
 *       >
 *         {isLoading ? 'Loading...' : isPlaying ? 'Playing...' : 'Speak'}
 *       </button>
 *       {isPlaying && <button onClick={stop}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLocalTTS(config: UseLocalTTSConfig = {}): UseLocalTTSReturn {
    const {
        tier,
        autoLoad = false,
        defaultVoice,
        defaultRate = 1.0,
        defaultPitch = 1.0,
        autoPlay = false,
        onSuccess,
        onError,
    } = config;

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const skillConfig = useMemo(
        () => ({
            skillType: 'text-to-speech' as const,
            tier,
            autoLoad,
            validateInput,
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
        reset: resetSkill,
    } = useSkill<TTSInput, TTSOutput>(skillConfig);

    /**
     * Create audio URL from ArrayBuffer
     */
    const createAudioUrl = useCallback((audio: ArrayBuffer, mimeType: string): string => {
        // Revoke old URL
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }

        const blob = new Blob([audio], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        return url;
    }, [audioUrl]);

    /**
     * Synthesize speech
     */
    const speak = useCallback(
        async (text: string, options?: SpeakOptions): Promise<TTSOutput> => {
            const input: TTSInput = {
                text,
                voice: options?.voice ?? defaultVoice,
                rate: options?.rate ?? defaultRate,
                pitch: options?.pitch ?? defaultPitch,
                format: options?.format ?? 'wav',
            };

            const output = await execute(input);

            // Create audio URL
            const url = createAudioUrl(output.audio, output.mimeType);

            // Auto-play if configured
            if (autoPlay) {
                const audio = new Audio(url);
                await audio.play();
            }

            return output;
        },
        [execute, defaultVoice, defaultRate, defaultPitch, autoPlay, createAudioUrl]
    );

    /**
     * Speak and play audio
     */
    const speakAndPlay = useCallback(
        async (text: string, options?: SpeakOptions): Promise<void> => {
            const output = await speak(text, options);
            const currentUrl = audioUrl || URL.createObjectURL(new Blob([output.audio]));

            if (!currentUrl) return;

            // Stop any existing playback
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            // Create new audio element
            const audio = new Audio(currentUrl);
            audioRef.current = audio;
            setIsPlaying(true);

            return new Promise((resolve, reject) => {
                audio.onended = () => {
                    setIsPlaying(false);
                    resolve();
                };

                audio.onerror = () => {
                    setIsPlaying(false);
                    reject(new Error('Audio playback failed'));
                };

                audio.play().catch(reject);
            });
        },
        [speak, audioUrl]
    );

    /**
     * Play the last synthesized audio
     */
    const play = useCallback(async (): Promise<void> => {
        if (!audioUrl) {
            throw new Error('No audio available. Call speak() first.');
        }

        if (audioRef.current) {
            await audioRef.current.play();
            return;
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setIsPlaying(true);

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                setIsPlaying(false);
                resolve();
            };

            audio.onerror = () => {
                setIsPlaying(false);
                reject(new Error('Audio playback failed'));
            };

            audio.play().catch(reject);
        });
    }, [audioUrl]);

    /**
     * Stop playback
     */
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, []);

    /**
     * Pause playback
     */
    const pause = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    /**
     * Resume playback
     */
    const resume = useCallback(async () => {
        if (audioRef.current) {
            await audioRef.current.play();
            setIsPlaying(true);
        }
    }, []);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        stop();
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        audioRef.current = null;
        setIsPlaying(false);
        resetSkill();
    }, [stop, audioUrl, resetSkill]);

    return {
        speak,
        speakAndPlay,
        play,
        stop,
        pause,
        resume,
        audio: result?.audio ?? null,
        audioUrl,
        duration: result?.duration ?? null,
        isPlaying,
        isLoading,
        progress,
        status,
        error,
        reset,
    };
}

export default useLocalTTS;
