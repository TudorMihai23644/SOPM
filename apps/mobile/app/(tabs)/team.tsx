import {
  createTeamSchema,
  joinTeamSchema,
  TEAM_MIN_MEMBERS_FOR_QUESTS,
  type MeDto,
  type QuestDto,
  type TeamDto,
  type TeamEvent,
  type TeamEventPayload,
} from '@deadlinehero/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { QuestCard, type QuestActions } from '../../src/components/QuestCard';
import { Body, Button, Card, Empty, Field, FormError, Label, Loading, Notice, Screen, StatBar, Title } from '../../src/components/ui';
import { api, ApiRequestError, fieldErrors } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { validate } from '../../src/lib/form';
import { useTeamRealtime } from '../../src/lib/realtime';
import { font, radius, space, useTheme } from '../../src/lib/theme';

const EVENT_MESSAGES: Partial<Record<TeamEvent, (p: TeamEventPayload) => string>> = {
  'team.member_joined': (p) => `${p.nickname ?? 'Un erou nou'} s-a alăturat echipei.`,
  'team.member_left': () => 'Un membru a părăsit echipa.',
  'team.level_up': (p) => `Echipa a urcat la nivelul ${p.level}!`,
  'quest.review_requested': () => 'Un coleg așteaptă validarea unui quest.',
};

const message = (error: unknown) => (error instanceof ApiRequestError ? error.message : 'Acțiunea nu a reușit.');

/** Fără echipă: creezi una sau intri cu un cod de invitație. */
function NoTeam({ onTeam }: { onTeam: (team: TeamDto) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  async function submit(kind: 'create' | 'join') {
    const { errors: clientErrors } = kind === 'create' ? validate(createTeamSchema, { name }) : validate(joinTeamSchema, { code });
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;
    setBusy(kind);
    try {
      onTeam(kind === 'create' ? await api.teams.create(name) : await api.teams.join(code));
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields.form ? { [kind === 'create' ? 'name' : 'code']: fields.form } : fields);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card>
        <Title size={18}>Întemeiază o ghildă</Title>
        <Body muted>Până la 4 membri. Primești un cod de invitație pe care îl trimiți colegilor.</Body>
        <Field label="Numele echipei" value={name} error={errors.name} maxLength={30} onChangeText={setName} />
        <Button title="Creează echipa" loading={busy === 'create'} onPress={() => void submit('create')} />
      </Card>
      <Card>
        <Title size={18}>Alătură-te unei ghilde</Title>
        <Field
          label="Cod de invitație"
          value={code}
          error={errors.code}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC234"
          onChangeText={(text) => setCode(text.toUpperCase())}
        />
        <Button title="Intră în echipă" variant="secondary" loading={busy === 'join'} onPress={() => void submit('join')} />
      </Card>
    </>
  );
}

function TeamPanel({ team, me }: { team: TeamDto; me: MeDto }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const isLeader = team.leaderId === me.id;
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['team'] });

  const leave = useMutation({
    mutationFn: api.teams.leave,
    onSuccess: () => {
      queryClient.setQueryData(['team'], { team: null });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => setError(message(e)),
  });
  const kick = useMutation({ mutationFn: api.teams.kick, onSuccess: refresh, onError: (e) => setError(message(e)) });
  const regenerate = useMutation({ mutationFn: api.teams.regenerateCode, onSuccess: refresh, onError: (e) => setError(message(e)) });

  return (
    <Card tone="gold">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Label>Ghilda</Label>
          <Title>{team.name}</Title>
          <Text style={{ color: colors.muted }}>
            Nivelul {team.level} · {team.members.length}/{team.maxMembers} membri
          </Text>
          <Text style={{ color: colors.muted }}>
            Bonusuri de grup azi: {team.groupBonusesToday}/{team.groupBonusesMax}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Label>Seif</Label>
          <Text accessibilityLabel={`Seiful echipei: ${team.vaultCoins} monede`} style={[font.display, { color: colors.gold, fontSize: 22 }]}>
            ◈ {team.vaultCoins}
          </Text>
        </View>
      </View>
      <StatBar label={`XP echipă · nivelul ${team.level}`} value={team.xpInLevel} max={team.xpToNextLevel} kind="xp" />

      <View style={{ gap: space.sm }}>
        <Label>Cod de invitație</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
          <Text
            selectable
            accessibilityLabel={`Codul de invitație: ${team.inviteCode.split('').join(' ')}`}
            style={[
              font.display,
              { color: colors.gold, fontSize: 22, letterSpacing: 6, borderWidth: 2, borderColor: colors.gold, borderRadius: radius.sm },
              { paddingHorizontal: space.md, paddingVertical: space.xs, backgroundColor: colors.bg },
            ]}
          >
            {team.inviteCode}
          </Text>
          <Button
            title="Trimite"
            variant="secondary"
            accessibilityLabel="Trimite codul de invitație"
            onPress={() => void Share.share({ message: `Intră în echipa „${team.name}” din DeadlineHero cu codul ${team.inviteCode}` })}
          />
          {isLeader && <Button title="Cod nou" variant="ghost" loading={regenerate.isPending} onPress={() => regenerate.mutate()} />}
        </View>
      </View>

      <Label>Membri</Label>
      {team.members.map((m) => (
        <View
          key={m.userId}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: 1, borderColor: colors.line, paddingTop: space.sm }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>
              {m.nickname}
              {m.userId === me.id ? ' (tu)' : ''}
              {m.role === 'LEADER' ? '  ♛ Lider' : ''}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>nivelul {m.level}</Text>
          </View>
          {isLeader && m.userId !== me.id && (
            <Button
              title="Scoate"
              variant="ghost"
              accessibilityLabel={`Scoate pe ${m.nickname} din echipă`}
              loading={kick.isPending && kick.variables === m.userId}
              onPress={() =>
                Alert.alert('Scoți membrul?', `${m.nickname} iese din echipă și din quest-urile deschise.`, [
                  { text: 'Renunță', style: 'cancel' },
                  { text: 'Scoate', style: 'destructive', onPress: () => kick.mutate(m.userId) },
                ])
              }
            />
          )}
        </View>
      ))}

      <FormError message={error ?? undefined} />
      <Button
        title="Părăsește echipa"
        variant="danger"
        loading={leave.isPending}
        onPress={() => {
          const note = isLeader && team.members.length > 1 ? ' Conducerea trece la cel mai vechi membru.' : '';
          Alert.alert('Părăsești echipa?', `Ieși din „${team.name}”.${note}`, [
            { text: 'Rămân', style: 'cancel' },
            { text: 'Părăsește', style: 'destructive', onPress: () => leave.mutate() },
          ]);
        }}
      />
    </Card>
  );
}

function QuestBoard({ team, me, haptics }: { team: TeamDto; me: MeDto; haptics: boolean }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const quests = useQuery({ queryKey: ['quests'], queryFn: api.quests.list, refetchInterval: 60_000 });
  const tooSmall = team.members.length < TEAM_MIN_MEMBERS_FOR_QUESTS;

  const apply = (quest: QuestDto) => {
    queryClient.setQueryData<QuestDto[]>(['quests'], (list) => list?.map((q) => (q.id === quest.id ? quest : q)));
    void queryClient.invalidateQueries({ queryKey: ['me'] });
    void queryClient.invalidateQueries({ queryKey: ['team'] });
  };
  const actions: QuestActions = {
    done: async (id) => apply(await api.quests.done(id)),
    validate: async (id, userId) => apply(await api.quests.validate(id, userId)),
    reject: async (id, userId, reason) => apply(await api.quests.reject(id, userId, reason)),
    excuse: async (id, userId) => apply(await api.quests.excuse(id, userId)),
    cancel: async (id) => apply(await api.quests.cancel(id)),
  };

  const list = quests.data ?? [];
  const open = list.filter((q) => q.status === 'OPEN');
  const closed = list.filter((q) => q.status !== 'OPEN');
  const card = (q: QuestDto) => (
    <QuestCard key={q.id} quest={q} meId={me.id} isLeader={team.leaderId === me.id} actions={actions} haptics={haptics} />
  );

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <Title size={20}>Shared Quests</Title>
        <Button title="+ Quest" disabled={tooSmall} accessibilityLabel="Shared Quest nou" onPress={() => router.push('/quest-new')} />
      </View>
      {tooSmall && <Body muted>E nevoie de cel puțin 2 membri. Trimite codul de invitație colegilor.</Body>}
      {quests.isPending ? (
        <Loading />
      ) : quests.isError ? (
        <Empty text="Quest-urile nu s-au putut încărca." action={<Button title="Încearcă din nou" onPress={() => void quests.refetch()} />} />
      ) : list.length === 0 ? (
        !tooSmall && <Empty text="Niciun quest încă. Lansează primul și terminați-l împreună pentru bonusul de grup." />
      ) : (
        <>
          {open.map(card)}
          {closed.length > 0 && <Label color={colors.muted}>Încheiate</Label>}
          {closed.map(card)}
        </>
      )}
    </View>
  );
}

export default function TeamScreen() {
  const { state } = useAuth();
  const { settings } = useTheme();
  const queryClient = useQueryClient();
  const initialUser = state.status === 'authenticated' ? state.user : undefined;
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });
  const team = useQuery({ queryKey: ['team'], queryFn: api.teams.mine });
  const [notice, setNotice] = useState<string | null>(null);
  const meId = me.data?.id;

  const onEvent = useCallback(
    (event: TeamEvent, payload: TeamEventPayload) => {
      if (event === 'team.member_left' && payload.userId === meId) {
        setNotice('Ai fost scos din echipă.');
        return;
      }
      const text = EVENT_MESSAGES[event];
      if (text && payload.userId !== meId) setNotice(text(payload));
    },
    [meId],
  );
  useTeamRealtime(Boolean(team.data?.team), onEvent);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['team'] });
    void queryClient.invalidateQueries({ queryKey: ['quests'] });
  };

  return (
    <Screen refreshing={team.isRefetching} onRefresh={refresh}>
      <Title size={26}>Echipa</Title>
      <Body muted>Sarcini comune, validate de colegi, cu bonus de grup când toată lumea termină la timp.</Body>
      <Notice tone="gold" message={notice} />
      {team.isPending || !me.data ? (
        <Loading text="Se caută ghilda…" />
      ) : team.isError ? (
        <Empty text="Echipa nu s-a putut încărca." action={<Button title="Încearcă din nou" onPress={() => void team.refetch()} />} />
      ) : team.data.team ? (
        <>
          <TeamPanel team={team.data.team} me={me.data} />
          <QuestBoard team={team.data.team} me={me.data} haptics={!settings.calm} />
        </>
      ) : (
        <NoTeam
          onTeam={(created) => {
            queryClient.setQueryData(['team'], { team: created });
            void queryClient.invalidateQueries({ queryKey: ['me'] });
          }}
        />
      )}
    </Screen>
  );
}
