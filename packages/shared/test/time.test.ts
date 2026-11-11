import { gameDayOf, gameDayStart, zonedTimeToUtc } from '../src/time';

const RO = 'Europe/Bucharest';

describe('ziua de joc', () => {
  it('începe la 04:00 ora locală', () => {
    // 02:30 în București (iarna, UTC+2) aparține încă zilei precedente.
    expect(gameDayOf(new Date('2026-12-15T00:30:00Z'), RO)).toBe('2026-12-14');
    // 04:00 locală = 02:00 UTC: începe ziua nouă.
    expect(gameDayOf(new Date('2026-12-15T02:00:00Z'), RO)).toBe('2026-12-15');
  });

  it('dă începutul zilei de joc în UTC', () => {
    expect(gameDayStart(new Date('2026-12-15T10:00:00Z'), RO).toISOString()).toBe('2026-12-15T02:00:00.000Z');
    expect(gameDayStart(new Date('2026-12-15T01:00:00Z'), RO).toISOString()).toBe('2026-12-14T02:00:00.000Z');
  });

  it('ține cont de ora de vară', () => {
    // Iulie: București e UTC+3, deci 04:00 locală = 01:00 UTC.
    expect(gameDayStart(new Date('2026-07-01T12:00:00Z'), RO).toISOString()).toBe('2026-07-01T01:00:00.000Z');
  });

  it('trece corect peste începutul lunii', () => {
    expect(gameDayOf(new Date('2026-12-01T00:00:00Z'), RO)).toBe('2026-11-30');
  });

  it('funcționează și pentru alte fusuri orare', () => {
    expect(zonedTimeToUtc(2026, 3, 10, 4, 'America/New_York').toISOString()).toBe('2026-03-10T08:00:00.000Z');
    expect(gameDayOf(new Date('2026-03-10T07:59:00Z'), 'America/New_York')).toBe('2026-03-09');
  });
});
