import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

const VARIANTS = {
  primary:
    'border-gold bg-gradient-to-b from-[#e3b75a] to-[#9c6d22] text-abyss shadow-[0_0_14px_rgb(217_171_74/0.35)] hover:from-[#f0c76c] hover:to-[#b0802c]',
  secondary: 'border-line bg-panel-2 text-ink hover:border-gold hover:text-gold',
  danger: 'border-blood bg-gradient-to-b from-[#d84047] to-[#7d1a20] text-ink hover:from-[#e5525a]',
  ghost: 'border-transparent bg-transparent text-muted hover:text-gold',
};

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-[3px] border-2 px-4 py-2 font-display text-sm font-bold tracking-wider uppercase transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Se încarcă…' : children}
    </button>
  );
}
