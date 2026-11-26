const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];
const DAYS = ['dum.', 'lun.', 'mar.', 'mie.', 'joi', 'vin.', 'sâm.'];
const pad = (n: number) => String(n).padStart(2, '0');

/** „lun. 15 dec., 18:00” (fără Intl.RelativeTimeFormat, care lipsește pe unele motoare JS). */
export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Timpul rămas până la termen: „2z 05h”, „03:14:09”, sau null dacă a trecut. */
export function formatRemaining(deadline: string, now = Date.now()): string | null {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}z ${pad(hours)}h`;
  return `${pad(hours)}:${pad(minutes)}:${pad(total % 60)}`;
}

/** „acum 5 min”, „acum 3 ore”, „ieri”. */
export function formatAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'chiar acum';
  if (minutes < 60) return `acum ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ieri' : `acum ${days} zile`;
}
