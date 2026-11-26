import {
  createQuestSchema,
  DEFAULT_GAME_CONFIG,
  TEAM_MIN_MEMBERS_FOR_QUESTS,
  type CreateQuestInput,
  type Difficulty,
  type MyTeamResponse,
} from '@deadlinehero/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { DeadlineField } from '../src/components/DeadlineField';
import { DifficultyPicker } from '../src/components/DifficultyPicker';
import { Body, Button, Field, FormError, Label, Loading, Notice, Screen } from '../src/components/ui';
import { api, fieldErrors } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { validate } from '../src/lib/form';
import { defaultDeadline } from '../src/lib/queries';
import { radius, space, TOUCH, useTheme } from '../src/lib/theme';

/** Un Shared Quest: aceleași câmpuri ca o misiune, plus participanții (implicit toată echipa). */
export default function NewQuestScreen() {
  const { colors } = useTheme();
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const meId = state.status === 'authenticated' ? state.user.id : '';
  const team = useQuery<MyTeamResponse>({ queryKey: ['team'], queryFn: api.teams.mine });
  const members = team.data?.team?.members ?? [];

  const [values, setValues] = useState({
    title: '',
    description: '',
    deadline: defaultDeadline(),
    difficulty: 'MEDIUM' as Difficulty,
    excluded: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (team.isPending) return <Loading />;
  if (!team.data?.team || members.length < TEAM_MIN_MEMBERS_FOR_QUESTS) {
    return (
      <Screen edges={['bottom']}>
        <Notice tone="gold" message="E nevoie de o echipă cu cel puțin 2 membri." />
        <Button title="Înapoi" onPress={() => router.back()} />
      </Screen>
    );
  }

  const participantIds = members.map((m) => m.userId).filter((id) => !values.excluded.includes(id));
  const toggle = (userId: string) =>
    setValues((v) => ({
      ...v,
      excluded: v.excluded.includes(userId) ? v.excluded.filter((id) => id !== userId) : [...v.excluded, userId],
    }));

  const base = DEFAULT_GAME_CONFIG.difficulty[values.difficulty];
  const bonus = Math.floor(base.xp * DEFAULT_GAME_CONFIG.groupBonusXpRatio);

  async function submit() {
    const input: CreateQuestInput = {
      title: values.title,
      description: values.description,
      deadlineAt: values.deadline.toISOString(),
      difficulty: values.difficulty,
      participantIds,
    };
    const { errors: clientErrors } = validate(createQuestSchema, input);
    if (values.deadline.getTime() < Date.now() + DEFAULT_GAME_CONFIG.minDeadlineLeadSeconds * 1000) {
      clientErrors.deadlineAt ??= 'Termenul trebuie să fie în viitor';
    }
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setBusy(true);
    try {
      await api.quests.create(input);
      await queryClient.invalidateQueries({ queryKey: ['quests'] });
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
          autoFocus
          placeholder="Ex.: Prezentarea finală"
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
        <DifficultyPicker value={values.difficulty} error={errors.difficulty} onChange={(difficulty) => setValues({ ...values, difficulty })} />

        <View style={{ gap: space.xs }}>
          <Label>Participanți</Label>
          {members.map((m) => {
            const checked = participantIds.includes(m.userId);
            return (
              <Pressable
                key={m.userId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(m.userId)}
                style={{
                  minHeight: TOUCH,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingHorizontal: space.md,
                  borderWidth: 2,
                  borderRadius: radius.sm,
                  borderColor: checked ? colors.gold : colors.line,
                }}
              >
                <Text style={{ color: checked ? colors.gold : colors.muted, fontSize: 18 }}>{checked ? '☑' : '☐'}</Text>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>
                  {m.nickname}
                  {m.userId === meId ? ' (tu)' : ''}
                </Text>
                <Text style={{ color: colors.muted }}>nivelul {m.level}</Text>
              </Pressable>
            );
          })}
          {errors.participantIds && <Text style={{ color: colors.blood, fontSize: 14 }}>✖ {errors.participantIds}</Text>}
        </View>

        <Body muted>
          Fiecare primește {base.xp} XP după validarea unui coleg. Dacă toți termină la timp: încă +{bonus} XP de fiecare și aur în
          seiful echipei.
        </Body>
        <Button title="Lansează quest-ul" loading={busy} onPress={() => void submit()} />
        <Button title="Renunță" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
