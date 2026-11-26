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
import { useCallback, useState, type FormEvent } from 'react';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { QuestCard, type QuestActions } from '../components/QuestCard';
import { QuestForm } from '../components/QuestForm';
import { StatBar } from '../components/StatBar';
import { TextField } from '../components/TextField';
import { api } from '../lib/api';
import { serverErrors, validate, type FieldErrors } from '../lib/form-errors';
import { useTeamRealtime } from '../lib/realtime';

const EVENT_MESSAGES: Partial<Record<TeamEvent, (p: TeamEventPayload) => string>> = {
  'team.member_joined': (p) => `${p.nickname ?? 'Un erou nou'} s-a alăturat echipei.`,
  'team.member_left': () => 'Un membru a părăsit echipa.',
  'team.level_up': (p) => `Echipa a urcat la nivelul ${p.level}!`,
  'quest.review_requested': () => 'Un coleg așteaptă validarea unui quest.',
};

/** Fără echipă: creezi una sau intri cu un cod de invitație. */
function NoTeam({ onTeam }: { onTeam: (team: TeamDto) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ create: FieldErrors; join: FieldErrors }>({ create: {}, join: {} });
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  async function submit(kind: 'create' | 'join', event: FormEvent) {
    event.preventDefault();
    const { data, errors: clientErrors } =
      kind === 'create' ? validate(createTeamSchema, { name }) : validate(joinTeamSchema, { code });
    setErrors((e) => ({ ...e, [kind]: clientErrors }));
    if (!data) return;
    setBusy(kind);
    try {
      onTeam(kind === 'create' ? await api.teams.create(name) : await api.teams.join(code));
    } catch (error) {
      setErrors((e) => ({ ...e, [kind]: serverErrors(error) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="panel panel-ornate space-y-4 p-6" onSubmit={(e) => void submit('create', e)} noValidate>
        <h2 className="font-display text-lg font-bold text-gold">Întemeiază o ghildă</h2>
        <p className="text-sm text-muted">Devii lider și primești un cod de 6 caractere pe care îl dai colegilor (2–4 membri).</p>
        {errors.create.form && <p role="alert" className="text-sm text-blood">✖ {errors.create.form}</p>}
        <TextField label="Numele echipei" value={name} maxLength={30} error={errors.create.name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="w-full" loading={busy === 'create'}>
          Creează echipa
        </Button>
      </form>
      <form className="panel panel-ornate space-y-4 p-6" onSubmit={(e) => void submit('join', e)} noValidate>
        <h2 className="font-display text-lg font-bold text-gold">Alătură-te unei ghilde</h2>
        <p className="text-sm text-muted">Cere codul de invitație liderului echipei.</p>
        {errors.join.form && <p role="alert" className="text-sm text-blood">✖ {errors.join.form}</p>}
        <TextField
          label="Cod de invitație"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          error={errors.join.code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button type="submit" variant="secondary" className="w-full" loading={busy === 'join'}>
          Intră în echipă
        </Button>
      </form>
    </div>
  );
}

function TeamPanel({ team, me }: { team: TeamDto; me: MeDto }) {
  const queryClient = useQueryClient();
  const isLeader = team.leaderId === me.id;
  const [copied, setCopied] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['team'] });

  const leave = useMutation({
    mutationFn: api.teams.leave,
    onSuccess: () => {
      queryClient.setQueryData(['team'], { team: null });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const kick = useMutation({ mutationFn: api.teams.kick, onSuccess: refresh });
  const regenerate = useMutation({ mutationFn: api.teams.regenerateCode, onSuccess: refresh });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fără acces la clipboard: codul rămâne vizibil pe ecran.
    }
  }

  return (
    <section className="panel panel-ornate p-5" aria-labelledby="team-name">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.3em] text-muted uppercase">Ghilda</p>
          <h2 id="team-name" className="glow-gold font-display text-2xl font-bold text-gold">
            {team.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Nivelul {team.level} · {team.members.length}/{team.maxMembers} membri · bonusuri de grup azi: {team.groupBonusesToday}/
            {team.groupBonusesMax}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xs tracking-wider text-muted uppercase">Seiful echipei</p>
          <p className="font-display text-2xl font-bold text-gold tabular-nums">◈ {team.vaultCoins}</p>
        </div>
      </div>

      <div className="mt-4">
        <StatBar label={`XP echipă · nivelul ${team.level}`} value={team.xpInLevel} max={team.xpToNextLevel} color="xp" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="font-display text-xs tracking-wider text-muted uppercase">Cod de invitație</span>
        <code className="rounded-[3px] border-2 border-gold/60 bg-abyss px-3 py-1.5 font-display text-lg font-bold tracking-[0.4em] text-gold">
          {team.inviteCode}
        </code>
        <Button variant="secondary" onClick={() => void copyCode()} aria-live="polite">
          {copied ? 'Copiat ✓' : 'Copiază'}
        </Button>
        {isLeader && (
          <Button variant="ghost" loading={regenerate.isPending} onClick={() => regenerate.mutate()}>
            Cod nou
          </Button>
        )}
      </div>

      <h3 className="mt-6 font-display text-sm font-bold tracking-wider text-muted uppercase">Membri</h3>
      <ul className="mt-2 divide-y divide-line rounded-[3px] border border-line">
        {team.members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              <span className="font-bold">{m.nickname}</span>
              {m.userId === me.id && <span className="text-muted"> (tu)</span>}
              <span className="ml-2 text-sm text-muted">nivelul {m.level}</span>
              {m.role === 'LEADER' && <span className="ml-2 text-sm font-bold text-gold">♛ Lider</span>}
            </span>
            {isLeader && m.userId !== me.id && (
              <Button
                variant="ghost"
                loading={kick.isPending && kick.variables === m.userId}
                onClick={() => window.confirm(`Scoți pe ${m.nickname} din echipă?`) && kick.mutate(m.userId)}
              >
                Scoate
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end">
        <Button
          variant="danger"
          loading={leave.isPending}
          onClick={() => {
            const note = isLeader && team.members.length > 1 ? ' Conducerea trece la cel mai vechi membru.' : '';
            if (window.confirm(`Părăsești echipa „${team.name}”?${note}`)) leave.mutate();
          }}
        >
          Părăsește echipa
        </Button>
      </div>
    </section>
  );
}

function QuestBoard({ team, me }: { team: TeamDto; me: MeDto }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const quests = useQuery({ queryKey: ['quests'], queryFn: api.quests.list, refetchInterval: 60_000 });

  const apply = useCallback(
    (quest: QuestDto) => {
      queryClient.setQueryData<QuestDto[]>(['quests'], (list) => list?.map((q) => (q.id === quest.id ? quest : q)));
      void queryClient.invalidateQueries({ queryKey: ['quests'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    [queryClient],
  );

  const actions: QuestActions = {
    done: async (id) => apply(await api.quests.done(id)),
    validate: async (id, userId) => apply(await api.quests.validate(id, userId)),
    reject: async (id, userId, reason) => apply(await api.quests.reject(id, userId, reason)),
    excuse: async (id, userId) => apply(await api.quests.excuse(id, userId)),
    cancel: async (id) => apply(await api.quests.cancel(id)),
  };

  const list = quests.data ?? [];
  const reviews = list.flatMap((q) =>
    q.status === 'OPEN' ? q.participants.filter((p) => p.status === 'AWAITING_REVIEW' && p.userId !== me.id).map((p) => ({ q, p })) : [],
  );
  const open = list.filter((q) => q.status === 'OPEN');
  const closed = list.filter((q) => q.status !== 'OPEN');
  const tooSmall = team.members.length < TEAM_MIN_MEMBERS_FOR_QUESTS;

  return (
    <section aria-labelledby="quests-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="quests-title" className="glow-gold font-display text-xl font-bold text-gold">
          Shared Quests
        </h2>
        <Button onClick={() => setCreating(true)} disabled={tooSmall} title={tooSmall ? 'E nevoie de cel puțin 2 membri' : undefined}>
          + Quest nou
        </Button>
      </div>
      {tooSmall && (
        <p className="panel border-dashed p-4 text-sm text-muted">
          Shared Quests cer cel puțin 2 membri, ca să existe cine să valideze. Dă codul de invitație unui coleg.
        </p>
      )}

      {reviews.length > 0 && (
        <div className="panel border-mana/60 p-4" role="region" aria-label="Cereri de validare">
          <h3 className="font-display text-sm font-bold tracking-wider text-mana uppercase">
            ⌛ Așteaptă validarea ta ({reviews.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {reviews.map(({ q, p }) => (
              <li key={`${q.id}-${p.userId}`}>
                <strong>{p.nickname}</strong> a terminat „{q.title}”. Validează sau respinge mai jos (+5 XP pentru tine, de cel mult 3 ori
                pe zi).
              </li>
            ))}
          </ul>
        </div>
      )}

      {quests.isPending ? (
        <p role="status" className="font-display text-muted">
          Se adună ghilda…
        </p>
      ) : quests.isError ? (
        <p role="alert" className="text-blood">
          ✖ Quest-urile nu s-au putut încărca.
        </p>
      ) : open.length === 0 && closed.length === 0 ? (
        !tooSmall && (
          <div className="panel border-dashed p-8 text-center text-muted">
            <p>Niciun quest încă. Lansați primul, termenul comun vă ține pe toți în formă.</p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              + Quest nou
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="space-y-4">
            {open.map((q) => (
              <QuestCard key={q.id} quest={q} meId={me.id} isLeader={team.leaderId === me.id} actions={actions} />
            ))}
          </div>
          {closed.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer font-display text-sm font-bold tracking-wider text-muted uppercase">
                Încheiate și anulate ({closed.length})
              </summary>
              <div className="mt-3 space-y-4">
                {closed.map((q) => (
                  <QuestCard key={q.id} quest={q} meId={me.id} isLeader={team.leaderId === me.id} actions={actions} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <Modal open={creating} title="Shared Quest nou" onClose={() => setCreating(false)}>
        <QuestForm
          members={team.members}
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            await api.quests.create(values);
            await queryClient.invalidateQueries({ queryKey: ['quests'] });
            setCreating(false);
          }}
        />
      </Modal>
    </section>
  );
}

export function TeamPage({ initialUser }: { initialUser: MeDto }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const { data: me = initialUser } = useQuery({ queryKey: ['me'], queryFn: api.me, initialData: initialUser });
  const team = useQuery({ queryKey: ['team'], queryFn: api.teams.mine });

  const onEvent = useCallback(
    (event: TeamEvent, payload: TeamEventPayload) => {
      const message = EVENT_MESSAGES[event];
      if (event === 'team.member_left' && payload.userId === me.id) {
        setNotice('Ai fost scos din echipă.');
        return;
      }
      if (message && payload.userId !== me.id) setNotice(message(payload));
    },
    [me.id],
  );
  useTeamRealtime(onEvent);

  return (
    <div className="min-h-screen pb-16">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-6">
        <div>
          <h1 className="glow-gold font-display text-2xl font-bold text-gold">Echipa</h1>
          <p className="mt-1 text-muted">Sarcini comune, validate de colegi, cu bonus de grup când toată lumea termină la timp.</p>
        </div>
        <p role="status" aria-live="polite" className={notice ? 'panel border-gold/60 px-4 py-2 text-sm text-gold' : 'sr-only'}>
          {notice}
        </p>
        {team.isPending ? (
          <p role="status" className="font-display text-muted">
            Se caută ghilda…
          </p>
        ) : team.isError ? (
          <p role="alert" className="text-blood">
            ✖ Echipa nu s-a putut încărca.
          </p>
        ) : team.data.team ? (
          <>
            <TeamPanel team={team.data.team} me={me} />
            <QuestBoard team={team.data.team} me={me} />
          </>
        ) : (
          <NoTeam
            onTeam={(created) => {
              queryClient.setQueryData(['team'], { team: created });
              void queryClient.invalidateQueries({ queryKey: ['me'] });
            }}
          />
        )}
      </main>
    </div>
  );
}
