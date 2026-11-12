import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

const VARIANTS = {
  primary:
    'border-pink bg-pink text-void shadow-[0_0_14px_color-mix(in_srgb,var(--color-pink)_60%,transparent)] hover:bg-[#ff7be3]',
  secondary: 'border-cyan bg-transparent text-cyan hover:bg-cyan/10',
  danger: 'border-danger bg-danger text-void hover:bg-[#ff7088]',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-panel-2 hover:text-ink',
};

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border-2 px-4 py-2 font-bold tracking-wide uppercase transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Se încarcă…' : children}
    </button>
  );
}
