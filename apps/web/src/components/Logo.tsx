export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-black tracking-wider ${size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-base sm:text-lg'}`}>
      <svg viewBox="0 0 24 24" className={size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'} aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Z" fill="#241c15" stroke="#d9ab4a" strokeWidth="1.5" />
        <path d="M12 6v11M8.5 9.5h7" stroke="#d0323b" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="glow-gold text-gold">Deadline</span>
      <span className="glow-blood text-blood">Hero</span>
    </span>
  );
}
