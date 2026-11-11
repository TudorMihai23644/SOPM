const relative = new Intl.RelativeTimeFormat('ro', { numeric: 'auto' });
const absolute = new Intl.DateTimeFormat('ro-RO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** „peste 3 ore”, „acum 2 zile”. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') return relative.format(Math.round(diff / ms), unit);
  }
  return '';
}

export function formatDateTime(iso: string): string {
  return absolute.format(new Date(iso));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Valoare pentru <input type="datetime-local">, în ora locală a browserului. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Din <input type="datetime-local"> în ISO (UTC); șir gol dacă valoarea lipsește. */
export function fromLocalInput(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
