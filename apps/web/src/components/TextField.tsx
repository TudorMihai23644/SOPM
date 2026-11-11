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
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm outline-none transition focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 ${
          error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
        }`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
