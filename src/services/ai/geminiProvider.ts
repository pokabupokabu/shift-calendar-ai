import { env } from '@/config/env';
import type { ShiftAnalysisResult } from '@/models';

import type { AIProvider, AnalyzeShiftImagesInput } from './types';

/**
 * Phase 1 target implementation: send the shift table image(s) straight to
 * the Gemini API from the client and parse its JSON response into a
 * ShiftAnalysisResult. Left unimplemented here — this file exists so the
 * AIProvider wiring (env, factory, call sites) can be built and tested
 * end-to-end before the actual prompt/parsing work starts.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  constructor(private readonly apiKey: string = env.ai.geminiApiKey) {}

  async analyzeShiftImages(_input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to .env (see .env.example).');
    }
    throw new Error('GeminiProvider.analyzeShiftImages is not implemented yet (Phase 1).');
  }
}
