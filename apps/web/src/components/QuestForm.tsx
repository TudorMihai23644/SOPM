import {
  createQuestSchema,
  DEFAULT_GAME_CONFIG,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type CreateQuestInput,
  type Difficulty,
  type TeamMemberDto,
} from '@deadlinehero/shared';
import { useId, useState, type FormEvent } from 'react';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';
import { fromLocalInput, toLocalInput } from '../lib/time';
import { Button } from './Button';
import { TextField } from './TextField';

interface QuestFormProps {
  members: TeamMemberDto[];
  onSubmit: (values: CreateQuestInput) => Promise<unknown>;
  onCancel: () => void;
}

function defaultDeadline(): string {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

/** Formularul unui Shared Quest: aceleași câmpuri ca o activitate, plus participanții. */
export function QuestForm({ members, onSubmit, onCancel }: QuestFormProps) {
  const descriptionId = useId();
  const [values, setValues] = useState({
    title: '',
    description: '',
    deadline: defaultDeadline(),
    difficulty: 'MEDIUM' as Difficulty,
    participantIds: members.map((m) => m.userId),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const toggle = (userId: string) =>
    setValues((v) => ({
      ...v,
      participantIds: v.participantIds.includes(userId)
        ? v.participantIds.filter((id) => id !== userId)
        : [...v.participantIds, userId],
    }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: CreateQuestInput = {
      title: values.title,
      description: values.description,
      deadlineAt: fromLocalInput(values.deadline),
      difficulty: values.difficulty,
      participantIds: values.participantIds,
    };
    const { data, errors: clientErrors } = validate(createQuestSchema, payload);
    if (data && new Date(payload.deadlineAt).getTime() < Date.now() + DEFAULT_GAME_CONFIG.minDeadlineLeadSeconds * 1000) {
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

  const base = DEFAULT_GAME_CONFIG.difficulty[values.difficulty];
  const bonus = Math.floor(base.xp * DEFAULT_GAME_CONFIG.groupBonusXpRatio);

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <p role="alert" className="rounded-[3px] border-2 border-blood bg-blood/10 px-3 py-2 text-sm text-blood">
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
        onChange={(e) => setValues({ ...values, deadline: e.target.value })}
      />

      <fieldset>
        <legend className="mb-1.5 font-display text-xs font-bold tracking-wider text-muted uppercase">Dificultate</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map((difficulty) => (
            <label
              key={difficulty}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[3px] border-2 px-3 py-2 text-sm font-bold uppercase ${
                values.difficulty === difficulty ? 'border-gold bg-gold/10' : 'border-line hover:border-muted'
              }`}
            >
              <input
                type="radio"
                name="quest-difficulty"
                checked={values.difficulty === difficulty}
                onChange={() => setValues({ ...values, difficulty })}
                className="accent-[#d9ab4a]"
              />
              {DIFFICULTY_LABELS[difficulty]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Fiecare primește +{base.xp} XP la validare; dacă toți termină la timp, încă +{bonus} XP bonus de grup, iar seiful
          echipei crește cu ◈ {base.coins}.
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 font-display text-xs font-bold tracking-wider text-muted uppercase">
          Participanți (cel puțin 2)
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <label key={m.userId} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[3px] border-2 border-line px-3">
              <input
                type="checkbox"
                checked={values.participantIds.includes(m.userId)}
                onChange={() => toggle(m.userId)}
                className="h-4 w-4 accent-[#d9ab4a]"
              />
              <span className="font-bold">{m.nickname}</span>
              <span className="text-sm text-muted">nv. {m.level}</span>
            </label>
          ))}
        </div>
        {errors.participantIds && <p className="mt-1 text-sm text-blood">✖ {errors.participantIds}</p>}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={descriptionId} className="block font-display text-xs font-bold tracking-wider text-muted uppercase">
          Descriere <span className="font-normal normal-case">(opțional)</span>
        </label>
        <textarea
          id={descriptionId}
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          className="block w-full rounded-[3px] border-2 border-line bg-abyss/70 px-3 py-2 text-base text-ink outline-none focus:border-gold"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Renunță
        </Button>
        <Button type="submit" loading={submitting}>
          Lansează quest-ul
        </Button>
      </div>
    </form>
  );
}
