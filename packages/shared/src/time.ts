/**
 * Calcule de timp pentru „ziua de joc”: intervalul 04:00–03:59 în fusul orar al utilizatorului,
 * ca cei care lucrează după miezul nopții să nu piardă ziua.
 */

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Data și ora locală a unui moment, în fusul orar dat. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Momentul (UTC) corespunzător unei ore locale dintr-un fus orar. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const first = offsetMs(new Date(guess), timeZone);
  const second = offsetMs(new Date(guess - first), timeZone);
  return new Date(guess - second);
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** Ziua de joc (AAAA-LL-ZZ) în care cade un moment. */
export function gameDayOf(now: Date, timeZone: string, startHour = 4): string {
  const p = zonedParts(now, timeZone);
  return p.hour < startHour ? isoDate(p.year, p.month, p.day - 1) : isoDate(p.year, p.month, p.day);
}

/** Momentul (UTC) în care a început ziua de joc curentă. */
export function gameDayStart(now: Date, timeZone: string, startHour = 4): Date {
  const [year, month, day] = gameDayOf(now, timeZone, startHour).split('-').map(Number);
  return zonedTimeToUtc(year, month, day, startHour, timeZone);
}
