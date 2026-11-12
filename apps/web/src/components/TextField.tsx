import { useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Câmp de formular cu etichetă și mesaj de eroare legat pentru cititoarele de ecran. */
export function TextField({ label, error, hint, ...input }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-display text-xs font-bold tracking-wider text-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-11 w-full rounded-[3px] border-2 bg-abyss/80 px-3 py-2 text-base text-ink shadow-[inset_0_2px_6px_rgb(0_0_0/0.7)] outline-none transition placeholder:text-muted/60 focus:border-gold ${
          error ? 'border-blood' : 'border-line'
        }`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-blood">
          ✖ {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
