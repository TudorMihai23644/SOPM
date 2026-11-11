import { levelForTotalXp, levelProgress, totalXpForLevel, xpToNextLevel } from '../src/level';

describe('nivel', () => {
  it('cere 100, 150, 200 XP pentru primele niveluri', () => {
    expect([1, 2, 3].map(xpToNextLevel)).toEqual([100, 150, 200]);
  });

  it('calculează XP-ul total până la un nivel', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(250);
    expect(totalXpForLevel(5)).toBe(700);
  });

  it('suma pașilor este egală cu formula închisă', () => {
    let sum = 0;
    for (let level = 1; level < 30; level += 1) {
      expect(totalXpForLevel(level)).toBe(sum);
      sum += xpToNextLevel(level);
    }
  });

  it('găsește nivelul pentru un total de XP, inclusiv la praguri', () => {
    expect(levelForTotalXp(0)).toBe(1);
    expect(levelForTotalXp(99)).toBe(1);
    expect(levelForTotalXp(100)).toBe(2);
    expect(levelForTotalXp(699)).toBe(4);
    expect(levelForTotalXp(700)).toBe(5);
  });

  it('dă progresul în nivelul curent', () => {
    expect(levelProgress(130)).toEqual({ level: 2, xpInLevel: 30, xpNeeded: 150 });
  });

  it('respinge valori invalide', () => {
    expect(() => levelForTotalXp(-1)).toThrow(RangeError);
    expect(() => levelForTotalXp(1.5)).toThrow(RangeError);
    expect(() => xpToNextLevel(0)).toThrow(RangeError);
  });
});
