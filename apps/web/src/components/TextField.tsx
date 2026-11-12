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
      <label htmlFor={id} className="block text-sm font-semibold tracking-wide text-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-11 w-full rounded-md border-2 bg-void/70 px-3 py-2 text-base text-ink outline-none transition placeholder:text-muted/60 focus:border-cyan focus:shadow-[0_0_10px_color-mix(in_srgb,var(--color-cyan)_45%,transparent)] ${
          error ? 'border-danger' : 'border-line'
        }`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
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
