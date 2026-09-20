/** A single shift as returned directly by the AI, before it's assigned a local id (section 6). */
export interface RawAiShift {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  shiftType: string;
  isOvernight: boolean;
  confidence: number; // 0..1
}

export interface UserMatchCandidate {
  /** The text the AI found in the shift table that might be the user's row, e.g. "永尾". */
  rowLabel: string;
  confidence: number;
}

/**
 * The AI never decides on its own which row is the user's when unsure (section 7).
 * 'ambiguous' means the app must ask the user to pick from candidates before
 * any shift in this result can be trusted.
 */
export interface UserMatchResult {
  status: 'matched' | 'ambiguous' | 'not_found';
  candidates: UserMatchCandidate[];
}

export interface AiAnalysisWarning {
  code: string;
  message: string;
}

/** The structured JSON contract every AIProvider implementation must return (section 6). */
export interface ShiftAnalysisResult {
  shifts: RawAiShift[];
  userMatch: UserMatchResult;
  warnings: AiAnalysisWarning[];
  /** Which uploaded image (by local uri or index) this result came from, for multi-image uploads. */
  sourceImage?: string;
}
