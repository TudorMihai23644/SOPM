import { applyHp, comboMultiplier, completionReward, currentStreak, levelChange, nextStreak } from '../src/rules';

const onTime = { difficulty: 'MEDIUM' as const, late: false, postponed: false, ageSeconds: 3600, streakDays: 0, staminaUsed: 0 };

describe('recompensa la finalizare', () => {
  it('dă valorile din tabel și +5 HP pentru o finalizare la timp', () => {
    expect(completionReward(onTime)).toMatchObject({ xp: 25, coins: 10, hp: 5, tooFast: false });
  });

  it('exemplul din Specificații: Mediu, la timp, serie de 4 zile → 30 XP', () => {
    expect(completionReward({ ...onTime, streakDays: 4 })).toMatchObject({ xp: 30, coins: 10, multiplier: 1.2 });
  });

  it('nu dă nimic sub 60 de secunde de la creare', () => {
    expect(completionReward({ ...onTime, ageSeconds: 59 })).toMatchObject({ xp: 0, coins: 0, hp: 0, tooFast: true });
  });

  it('dă 25% XP și 0 monede pentru o activitate restantă, fără COMBO', () => {
    expect(completionReward({ ...onTime, late: true, streakDays: 5 })).toMatchObject({ xp: 6, coins: 0, hp: 0, multiplier: 1 });
  });

  it('înjumătățește recompensa după o amânare', () => {
    expect(completionReward({ ...onTime, difficulty: 'HARD', postponed: true })).toMatchObject({ xp: 25, coins: 10 });
  });

  it('respectă plafonul Stamina; fără XP nu se dau nici monede, nici HP', () => {
    expect(completionReward({ ...onTime, staminaUsed: 140 })).toMatchObject({ xp: 10, coins: 10, staminaCapped: true });
    expect(completionReward({ ...onTime, staminaUsed: 150 })).toMatchObject({ xp: 0, coins: 0, hp: 0 });
  });
});

describe('COMBO', () => {
  it('crește cu 5% pe zi, cel mult ×1,5', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(3)).toBe(1.15);
    expect(comboMultiplier(10)).toBe(1.5);
    expect(comboMultiplier(40)).toBe(1.5);
  });

  it('seria crește doar în zile consecutive', () => {
    expect(nextStreak(0, null, '2026-12-15')).toBe(1);
    expect(nextStreak(3, '2026-12-15', '2026-12-15')).toBe(3);
    expect(nextStreak(3, '2026-12-14', '2026-12-15')).toBe(4);
    expect(nextStreak(3, '2026-12-13', '2026-12-15')).toBe(1);
    expect(nextStreak(9, '2026-12-31', '2027-01-01')).toBe(10);
  });

  it('seria afișată se pierde după o zi ratată', () => {
    expect(currentStreak(4, '2026-12-15', '2026-12-16')).toBe(4);
    expect(currentStreak(4, '2026-12-14', '2026-12-16')).toBe(0);
    expect(currentStreak(0, null, '2026-12-16')).toBe(0);
  });
});

describe('nivel și HP', () => {
  it('dă 25 de monede pentru fiecare nivel nou', () => {
    expect(levelChange(90, 110)).toEqual({ level: 2, levelsGained: 1, bonusCoins: 25 });
    expect(levelChange(0, 260)).toEqual({ level: 3, levelsGained: 2, bonusCoins: 50 });
    expect(levelChange(110, 120)).toEqual({ level: 2, levelsGained: 0, bonusCoins: 0 });
  });

  it('HP nu trece de 100', () => {
    expect(applyHp(98, 0, 5)).toEqual({ hp: 100, coinsLost: 0, ko: false });
  });

  it('la 0 HP: KO, −20% monede rotunjit în jos, HP revine la 50', () => {
    expect(applyHp(10, 99, -15)).toEqual({ hp: 50, coinsLost: 19, ko: true });
    expect(applyHp(10, 0, -10)).toEqual({ hp: 50, coinsLost: 0, ko: true });
  });
});
