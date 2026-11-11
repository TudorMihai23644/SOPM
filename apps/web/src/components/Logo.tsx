export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className={box} aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#4f46e5" />
        <path d="M16 6l3 7h7l-5.5 4.5 2 7.5L16 20.5 9.5 25l2-7.5L6 13h7z" fill="#fde68a" />
      </svg>
      <span className={`font-bold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>DeadlineHero</span>
    </span>
  );
}
