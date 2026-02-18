/**
 * useTranslate.ts - Local Translation Hook
 * 
 * Provides offline translation supporting 100+ languages using NLLB models.
 * All processing happens locally - no API calls required.
 * 
 * @xhiti/local-ai
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useSkill } from './useSkill';
import type {
    TranslateInput,
    TranslateOutput,
    ModelTier,
} from '../core/types';

/**
 * Hook configuration
 */
export interface UseTranslateConfig {
    /** Model tier to use */
    tier?: ModelTier;
    /** Auto-load model on mount */
    autoLoad?: boolean;
    /** Default target language */
    defaultTargetLang?: string;
    /** Called on successful translation */
    onSuccess?: (result: TranslateOutput, input: TranslateInput) => void;
    /** Called on error */
    onError?: (error: Error, input: TranslateInput) => void;
}

/**
 * Hook return type
 */
export interface UseTranslateReturn {
    /** Translate text */
    translate: (
        text: string,
        targetLang: string,
        sourceLang?: string
    ) => Promise<string>;
    /** Translate with full result */
    translateDetailed: (input: TranslateInput) => Promise<TranslateOutput>;
    /** Translation result */
    translation: string | null;
    /** Full result object */
    result: TranslateOutput | null;
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
 * Validate translation input
 */
function validateInput(input: TranslateInput): string | null {
    if (!input.text || typeof input.text !== 'string') {
        return 'Input text is required and must be a string';
    }
    if (input.text.trim().length === 0) {
        return 'Input text cannot be empty';
    }
    if (input.text.length > 50000) {
        return 'Input text exceeds maximum length of 50,000 characters';
    }
    if (!input.targetLang) {
        return 'Target language is required';
    }
    return null;
}

/**
 * Transform worker result to TranslateOutput
 */
function transformResult(
    result: unknown,
    input: TranslateInput
): TranslateOutput {
    const data = result as { translation: string; detectedLanguage?: string };

    return {
        translation: data.translation,
        detectedSourceLang: data.detectedLanguage,
        confidence: 0.9, // Placeholder - could be enhanced
    };
}

/**
 * useTranslate - Local translation hook
 * 
 * Provides offline translation supporting 100+ languages.
 * All processing happens locally in the browser using NLLB models.
 * 
 * @features
 * - 100+ languages supported
 * - Auto language detection
 * - Zero server costs
 * - 100% privacy
 * 
 * @example
 * ```tsx
 * function Translator() {
 *   const { translate, translation, isLoading } = useTranslate();
 * 
 *   const handleTranslate = async () => {
 *     const result = await translate('Hello world', 'fra');
 *     console.log(result); // "Bonjour le monde"
 *   };
 * 
 *   return (
 *     <button onClick={handleTranslate} disabled={isLoading}>
 *       Translate to French
 *     </button>
 *   );
 * }
 * ```
 */
export function useTranslate(config: UseTranslateConfig = {}): UseTranslateReturn {
    const {
        tier,
        autoLoad = true,
        defaultTargetLang,
        onSuccess,
        onError,
    } = config;

    const skillConfig = useMemo(
        () => ({
            skillType: 'translation' as const,
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
    } = useSkill<TranslateInput, TranslateOutput>(skillConfig);

    /**
     * Simple translate function - returns just the translation string
     */
    const translate = useCallback(
        async (
            text: string,
            targetLang: string,
            sourceLang?: string
        ): Promise<string> => {
            const input: TranslateInput = {
                text,
                targetLang: targetLang ?? defaultTargetLang ?? 'eng_Latn',
                sourceLang,
            };

            const output = await execute(input);
            return output.translation;
        },
        [execute, defaultTargetLang]
    );

    /**
     * Detailed translate function - returns full result object
     */
    const translateDetailed = useCallback(
        async (input: TranslateInput): Promise<TranslateOutput> => {
            const normalizedInput: TranslateInput = {
                ...input,
                targetLang: input.targetLang ?? defaultTargetLang ?? 'eng_Latn',
            };
            return execute(normalizedInput);
        },
        [execute, defaultTargetLang]
    );

    return {
        translate,
        translateDetailed,
        translation: result?.translation ?? null,
        result,
        isLoading,
        progress,
        status,
        error,
        reset,
        abort,
    };
}

/**
 * Language code mapping for common languages
 * Uses NLLB language codes
 */
export const LANGUAGE_CODES = {
    albanian: 'als_Latn',
    english: 'eng_Latn',
    spanish: 'spa_Latn',
    french: 'fra_Latn',
    german: 'deu_Latn',
    italian: 'ita_Latn',
    portuguese: 'por_Latn',
    russian: 'rus_Cyrl',
    chinese: 'zho_Hans',
    japanese: 'jpn_Jpan',
    korean: 'kor_Hang',
    arabic: 'ara_Arab',
    hindi: 'hin_Deva',
    bengali: 'ben_Beng',
    turkish: 'tur_Latn',
    vietnamese: 'vie_Latn',
    thai: 'tha_Thai',
    dutch: 'nld_Latn',
    polish: 'pol_Latn',
    ukrainian: 'ukr_Cyrl',
    greek: 'ell_Grek',
    hebrew: 'heb_Hebr',
    indonesian: 'ind_Latn',
    swedish: 'swe_Latn',
    norwegian: 'nob_Latn',
    danish: 'dan_Latn',
    finnish: 'fin_Latn',
} as const;

export default useTranslate;