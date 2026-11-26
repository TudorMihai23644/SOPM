import {
  createTaskSchema,
  DEFAULT_GAME_CONFIG,
  DIFFICULTY_LABELS,
  updateTaskSchema,
  type Difficulty,
  type Page,
  type TaskDto,
  type UpdateTaskInput,
} from '@deadlinehero/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { DeadlineField } from '../src/components/DeadlineField';
import { DifficultyPicker } from '../src/components/DifficultyPicker';
import { Body, Button, Field, FormError, Notice, Screen } from '../src/components/ui';
import { api, fieldErrors } from '../src/lib/api';
import { validate } from '../src/lib/form';
import { ACTIVE_TASKS_KEY, defaultDeadline, refreshTaskData } from '../src/lib/queries';

/** Crearea unei misiuni, sau editarea ei când primește ?id=. */
export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const task = id ? queryClient.getQueryData<Page<TaskDto>>(ACTIVE_TASKS_KEY)?.items.find((t) => t.id === id) : undefined;

  const [values, setValues] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    deadline: task ? new Date(task.deadlineAt) : defaultDeadline(),
    difficulty: (task?.difficulty ?? 'MEDIUM') as Difficulty,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (id && !task) {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="gold" message="Misiunea nu mai este activă." />
        <Button title="Înapoi" onPress={() => router.back()} />
      </Screen>
    );
  }

  const deadlineChanged = task ? new Date(task.deadlineAt).getTime() !== values.deadline.getTime() : false;
  const postponing = task && deadlineChanged && values.deadline.getTime() > new Date(task.deadlineAt).getTime();

  async function submit() {
    const deadlineAt = values.deadline.toISOString();
    const tooSoon = values.deadline.getTime() < Date.now() + DEFAULT_GAME_CONFIG.minDeadlineLeadSeconds * 1000;
    let clientErrors: Record<string, string>;
    let send: () => Promise<unknown>;

    if (task) {
      const patch: UpdateTaskInput = {};
      if (values.title !== task.title) patch.title = values.title;
      if (values.description !== (task.description ?? '')) patch.description = values.description;
      if (deadlineChanged) patch.deadlineAt = deadlineAt;
      if (Object.keys(patch).length === 0) return router.back();
      clientErrors = validate(updateTaskSchema, patch).errors;
      send = () => api.tasks.update(task.id, patch);
    } else {
      const input = { title: values.title, description: values.description, deadlineAt, difficulty: values.difficulty };
      clientErrors = validate(createTaskSchema, input).errors;
      send = () => api.tasks.create(input);
    }
    if ((!task || deadlineChanged) && tooSoon) clientErrors.deadlineAt ??= 'Termenul trebuie să fie în viitor';
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setBusy(true);
    try {
      await send();
      await refreshTaskData(queryClient);
      router.back();
    } catch (error) {
      setErrors(fieldErrors(error));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <FormError message={errors.form} />
        <Field
          label="Titlu"
          value={values.title}
          error={errors.title}
          maxLength={120}
          autoFocus={!task}
          placeholder="Ex.: Proiect SOPM, capitolul 3"
          onChangeText={(title) => setValues({ ...values, title })}
        />
        <Field
          label="Descriere (opțional)"
          value={values.description}
          error={errors.description}
          maxLength={2000}
          multiline
          onChangeText={(description) => setValues({ ...values, description })}
        />
        <DeadlineField value={values.deadline} error={errors.deadlineAt} onChange={(deadline) => setValues({ ...values, deadline })} />
        {task ? (
          <Body muted>
            {postponing
              ? task.postponesLeft > 0
                ? `Amânare: recompensa scade la ${DEFAULT_GAME_CONFIG.postponeMultiplier * 100}%. Mai poți amâna de ${task.postponesLeft} ori.`
                : 'Nu mai poți amâna această misiune.'
              : `Dificultatea (${DIFFICULTY_LABELS[values.difficulty]}) nu se mai schimbă după creare.`}
          </Body>
        ) : (
          <DifficultyPicker value={values.difficulty} error={errors.difficulty} onChange={(difficulty) => setValues({ ...values, difficulty })} />
        )}
        <Button title={task ? 'Salvează' : 'Adaugă misiunea'} loading={busy} onPress={() => void submit()} />
        <Button title="Renunță" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
