export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`pixel inline-flex items-center gap-2 ${size === 'lg' ? 'text-xl sm:text-2xl' : 'text-xs sm:text-sm'}`}>
      <span className="glow-cyan text-cyan">DEADLINE</span>
      <span className="glow-pink text-pink">//</span>
      <span className="glow-gold text-gold">HERO</span>
    </span>
  );
}
