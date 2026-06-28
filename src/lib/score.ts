// AI overall score (0–100) → display grade (DESIGN_SPEC §4 shows "A−").
export function gradeOf(overall: number): string {
  if (overall >= 93) return 'A';
  if (overall >= 90) return 'A−';
  if (overall >= 87) return 'B+';
  if (overall >= 83) return 'B';
  if (overall >= 80) return 'B−';
  if (overall >= 75) return 'C+';
  if (overall >= 70) return 'C';
  return 'C−';
}

export function shortName(name: string): string {
  return name.split(' — ')[0];
}

export function monogram(name: string): string {
  return shortName(name).charAt(0).toUpperCase();
}
