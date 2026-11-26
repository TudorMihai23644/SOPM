import { capByStamina, groupBonus, validatorReward } from '../src/rules';
import { createQuestSchema, joinTeamSchema, teamLevelForXp, teamXpToNextLevel } from '../src/teams';

describe('nivelul echipei', () => {
  it('cere 200 + 100 × (L − 1) XP per nivel', () => {
    expect([1, 2, 3].map(teamXpToNextLevel)).toEqual([200, 300, 400]);
  });

  it('calculează nivelul și progresul', () => {
    expect(teamLevelForXp(0)).toEqual({ level: 1, xpInLevel: 0, xpNeeded: 200 });
    expect(teamLevelForXp(199)).toEqual({ level: 1, xpInLevel: 199, xpNeeded: 200 });
    expect(teamLevelForXp(200)).toEqual({ level: 2, xpInLevel: 0, xpNeeded: 300 });
    expect(teamLevelForXp(550)).toEqual({ level: 3, xpInLevel: 50, xpNeeded: 400 });
  });
});

describe('recompense de echipă', () => {
  it('bonusul de grup este 50% din XP-ul de bază, sub Stamina', () => {
    expect(groupBonus('MEDIUM', 0)).toEqual({ xp: 12, vaultCoins: 10, teamXp: 25 });
    expect(groupBonus('HARD', 0)).toEqual({ xp: 25, vaultCoins: 20, teamXp: 50 });
    expect(groupBonus('HARD', 140).xp).toBe(10);
    expect(groupBonus('HARD', 150).xp).toBe(0);
  });

  it('validatorul primește 5 XP de cel mult 3 ori pe zi', () => {
    expect(validatorReward(0, 0)).toBe(5);
    expect(validatorReward(2, 0)).toBe(5);
    expect(validatorReward(3, 0)).toBe(0);
    expect(validatorReward(0, 148)).toBe(2);
  });

  it('plafonul Stamina nu dă niciodată XP negativ', () => {
    expect(capByStamina(10, 200)).toBe(0);
  });
});

describe('scheme de echipă', () => {
  it('codul de invitație se normalizează la majuscule', () => {
    expect(joinTeamSchema.parse({ code: ' abc234 ' })).toEqual({ code: 'ABC234' });
    expect(joinTeamSchema.safeParse({ code: 'ABC' }).success).toBe(false);
  });

  it('un quest cere cel puțin 2 participanți, dacă sunt aleși', () => {
    const base = { title: 'Proiect', deadlineAt: '2026-12-20T10:00:00.000Z', difficulty: 'MEDIUM' };
    expect(createQuestSchema.safeParse(base).success).toBe(true);
    expect(
      createQuestSchema.safeParse({ ...base, participantIds: ['5b0f3c2e-4e1a-4b8a-9a43-0c2f1d1f4a11'] }).success,
    ).toBe(false);
  });
});
