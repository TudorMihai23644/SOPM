import { DEFAULT_GAME_CONFIG, DIFFICULTIES } from '../src/config';

describe('configurația implicită', () => {
  it('are valori pentru toate dificultățile, crescătoare', () => {
    const xp = DIFFICULTIES.map((d) => DEFAULT_GAME_CONFIG.difficulty[d].xp);
    expect(xp).toEqual([10, 25, 50]);
  });

  it('păstrează limitele din specificații', () => {
    expect(DEFAULT_GAME_CONFIG.staminaDailyXp).toBe(150);
    expect(DEFAULT_GAME_CONFIG.minCompletionSeconds).toBe(60);
    expect(DEFAULT_GAME_CONFIG.maxPostpones).toBe(2);
  });
});
