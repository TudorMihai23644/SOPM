/** XP necesar pentru a trece de la nivelul `level` la `level + 1`: 100, 150, 200 ... */
export function xpToNextLevel(level: number): number {
  assertLevel(level);
  return 100 + 50 * (level - 1);
}

/** XP total necesar pentru a ajunge la nivelul `level`: 25 × (L − 1) × (L + 2). */
export function totalXpForLevel(level: number): number {
  assertLevel(level);
  return 25 * (level - 1) * (level + 2);
}

/** Nivelul corespunzător unui total de XP. */
export function levelForTotalXp(totalXp: number): number {
  if (!Number.isInteger(totalXp) || totalXp < 0) {
    throw new RangeError('XP-ul total trebuie să fie un întreg ≥ 0');
  }
  let level = 1;
  while (totalXpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}

/** Progresul în nivelul curent, pentru bara de XP. */
export function levelProgress(totalXp: number): { level: number; xpInLevel: number; xpNeeded: number } {
  const level = levelForTotalXp(totalXp);
  return { level, xpInLevel: totalXp - totalXpForLevel(level), xpNeeded: xpToNextLevel(level) };
}

function assertLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError('Nivelul trebuie să fie un întreg ≥ 1');
  }
}
