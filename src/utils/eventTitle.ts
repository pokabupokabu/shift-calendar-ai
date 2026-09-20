/** Fills the user's title template, e.g. "バイト｜{shiftType}" -> "バイト｜早番" (section 13). */
export function buildEventTitle(template: string, shiftType: string): string {
  return template.replace('{shiftType}', shiftType);
}
