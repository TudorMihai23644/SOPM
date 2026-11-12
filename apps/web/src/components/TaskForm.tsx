import {
  createTaskSchema,
  DEFAULT_GAME_CONFIG,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  updateTaskSchema,
  type Difficulty,
  type TaskDto,
} from '@deadlinehero/shared';
import { useId, useState, type FormEvent } from 'react';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';
import { fromLocalInput, toLocalInput } from '../lib/time';
import { Button } from './Button';
import { TextField } from './TextField';

interface TaskFormProps {
  /** Activitatea editată; lipsește la creare. */
  task?: TaskDto;
  onSubmit: (values: Record<string, unknown>) => Promise<unknown>;
  onCancel: () => void;
}

const DIFFICULTY_HINTS: Record<Difficulty, string> = Object.fromEntries(
  DIFFICULTIES.map((d) => {
    const v = DEFAULT_GAME_CONFIG.difficulty[d];
    return [d, `+${v.xp} XP · ◇${v.coins} · −${v.hpLoss} HP dacă ratezi`];
  }),
) as Record<Difficulty, string>;

function defaultDeadline(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

export function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const descriptionId = useId();
  const [values, setValues] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    deadline: task ? toLocalInput(new Date(task.deadlineAt)) : defaultDeadline(),
    difficulty: (task?.difficulty ?? 'MEDIUM') as Difficulty,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const deadlineAt = fromLocalInput(values.deadline);
    const minDeadline = Date.now() + DEFAULT_GAME_CONFIG.minDeadlineLeadSeconds * 1000;
    const deadlineChanged = !task || new Date(deadlineAt).getTime() !== new Date(task.deadlineAt).getTime();

    const payload: Record<string, unknown> = task
      ? {
          title: values.title,
          description: values.description,
          ...(deadlineChanged ? { deadlineAt } : {}),
        }
      : { title: values.title, description: values.description, deadlineAt, difficulty: values.difficulty };

    const { data, errors: clientErrors } = task
      ? validate(updateTaskSchema, payload)
      : validate(createTaskSchema, payload);
    if (data && deadlineChanged && new Date(deadlineAt).getTime() < minDeadline) {
      clientErrors.deadlineAt = 'Termenul trebuie să fie în viitor';
    }
    setErrors(clientErrors);
    if (!data || Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors(serverErrors(error));
    } finally {
      setSubmitting(false);
    }
  }

  const postponeHint = task
    ? task.postponesLeft > 0
      ? `Mutarea termenului mai târziu contează ca amânare (îți mai rămân ${task.postponesLeft}) și înjumătățește recompensa.`
      : 'Ai folosit ambele amânări; termenul se mai poate doar apropia.'
    : undefined;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <p role="alert" className="rounded-md border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      )}
      <TextField
        label="Titlu"
        value={values.title}
        maxLength={120}
        error={errors.title}
        autoFocus
        onChange={(e) => setValues({ ...values, title: e.target.value })}
      />
      <TextField
        label="Termen"
        type="datetime-local"
        value={values.deadline}
        error={errors.deadlineAt}
        hint={postponeHint}
        onChange={(e) => setValues({ ...values, deadline: e.target.value })}
      />

      {task ? (
        <p className="text-sm text-muted">
          Dificultate: <strong className="text-ink">{DIFFICULTY_LABELS[task.difficulty]}</strong> (nu se mai poate schimba)
        </p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold tracking-wide text-muted uppercase">Dificultate</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {DIFFICULTIES.map((difficulty) => (
              <label
                key={difficulty}
                className={`flex min-h-11 cursor-pointer flex-col rounded-md border-2 px-3 py-2 text-sm transition ${
                  values.difficulty === difficulty
                    ? 'border-pink bg-pink/10 shadow-[0_0_10px_color-mix(in_srgb,var(--color-pink)_40%,transparent)]'
                    : 'border-line hover:border-muted'
                }`}
              >
                <span className="flex items-center gap-2 font-bold uppercase">
                  <input
                    type="radio"
                    name="difficulty"
                    value={difficulty}
                    checked={values.difficulty === difficulty}
                    onChange={() => setValues({ ...values, difficulty })}
                    className="accent-pink"
                  />
                  {difficulty === 'HARD' ? '☠ Boss' : DIFFICULTY_LABELS[difficulty]}
                </span>
                <span className="mt-1 text-xs text-muted">{DIFFICULTY_HINTS[difficulty]}</span>
              </label>
            ))}
          </div>
          {errors.difficulty && <p className="mt-1 text-sm text-danger">✖ {errors.difficulty}</p>}
        </fieldset>
      )}

      <div className="space-y-1.5">
        <label htmlFor={descriptionId} className="block text-sm font-semibold tracking-wide text-muted uppercase">
          Descriere <span className="font-normal normal-case">(opțional)</span>
        </label>
        <textarea
          id={descriptionId}
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          className="block w-full rounded-md border-2 border-line bg-void/70 px-3 py-2 text-base text-ink outline-none focus:border-cyan"
        />
        {errors.description && <p className="text-sm text-danger">✖ {errors.description}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Renunță
        </Button>
        <Button type="submit" loading={submitting}>
          {task ? 'Salvează' : 'Acceptă misiunea'}
        </Button>
      </div>
    </form>
  );
}
