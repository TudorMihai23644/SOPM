import {
  DIFFICULTY_LABELS,
  PARTICIPANT_STATUS_LABELS,
  QUEST_STATUS_LABELS,
  type ParticipantStatus,
  type QuestDto,
  type QuestParticipantDto,
} from '@deadlinehero/shared';
import { useState } from 'react';
import { formatDateTime, formatRelative } from '../lib/time';
import { Button } from './Button';
import { Countdown } from './Countdown';

const PARTICIPANT_STYLE: Record<ParticipantStatus, { icon: string; className: string }> = {
  PENDING: { icon: '⚔', className: 'border-line text-ink' },
  OVERDUE: { icon: '☠', className: 'border-blood text-blood' },
  AWAITING_REVIEW: { icon: '⌛', className: 'border-mana text-mana' },
  VALIDATED: { icon: '✓', className: 'border-heal/60 text-heal' },
  EXCUSED: { icon: '–', className: 'border-line text-muted' },
};

function ParticipantBadge({ status }: { status: ParticipantStatus }) {
  const { icon, className } = PARTICIPANT_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-[2px] border bg-abyss/60 px-1.5 py-0.5 font-display text-[11px] font-bold tracking-wider uppercase ${className}`}>
      <span aria-hidden="true">{icon}</span>
      {PARTICIPANT_STATUS_LABELS[status]}
    </span>
  );
}

export interface QuestActions {
  done: (questId: string) => Promise<unknown>;
  validate: (questId: string, userId: string) => Promise<unknown>;
  reject: (questId: string, userId: string, reason: string) => Promise<unknown>;
  excuse: (questId: string, userId: string) => Promise<unknown>;
  cancel: (questId: string) => Promise<unknown>;
}

interface QuestCardProps {
  quest: QuestDto;
  meId: string;
  isLeader: boolean;
  actions: QuestActions;
}

/** Un Shared Quest: progresul fiecărui participant și acțiunile disponibile pentru utilizatorul curent. */
export function QuestCard({ quest, meId, isLeader, actions }: QuestCardProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = quest.status === 'OPEN';
  const me = quest.participants.find((p) => p.userId === meId);
  const active = quest.participants.filter((p) => p.status !== 'EXCUSED');
  const validated = active.filter((p) => p.status === 'VALIDATED').length;

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      setRejecting(null);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A apărut o eroare.');
    } finally {
      setBusy(null);
    }
  }

  const canReview = (p: QuestParticipantDto) => open && p.status === 'AWAITING_REVIEW' && p.userId !== meId;

  return (
    <article className="panel p-4" aria-labelledby={`quest-${quest.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`quest-${quest.id}`} className="font-display text-lg font-bold break-words text-ink">
            {quest.title}
          </h3>
          <p className="text-sm text-muted">
            {DIFFICULTY_LABELS[quest.difficulty]} · termen {formatDateTime(quest.deadlineAt)}
            {quest.creatorNickname ? ` · lansat de ${quest.creatorNickname}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {open ? (
            <Countdown deadline={quest.deadlineAt} />
          ) : (
            <span className={`font-display text-xs font-bold tracking-wider uppercase ${quest.status === 'COMPLETED' ? 'text-heal' : 'text-muted'}`}>
              {quest.status === 'COMPLETED' ? '✓ ' : '✕ '}
              {QUEST_STATUS_LABELS[quest.status]}
            </span>
          )}
          {quest.bonusGrantedAt && <span className="text-xs font-bold text-gold">★ Bonus de grup</span>}
        </div>
      </header>

      {quest.description && <p className="mt-2 text-sm break-words whitespace-pre-line text-ink/90">{quest.description}</p>}

      <p className="mt-3 font-display text-xs tracking-wider text-muted uppercase">
        Validați: {validated} / {active.length}
      </p>
      <ul className="mt-2 divide-y divide-line rounded-[3px] border border-line">
        {quest.participants.map((p) => (
          <li key={p.userId} className="px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-bold">{p.userId === meId ? `${p.nickname} (tu)` : p.nickname}</span>
                <ParticipantBadge status={p.status} />
                {p.doneLate && <span className="text-xs text-ember">după termen</span>}
                {p.autoValidated && <span className="text-xs text-muted">validat automat</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {canReview(p) && (
                  <>
                    <Button
                      variant="primary"
                      loading={busy === `validate-${p.userId}`}
                      onClick={() => void run(`validate-${p.userId}`, () => actions.validate(quest.id, p.userId))}
                    >
                      Validează
                    </Button>
                    <Button variant="secondary" onClick={() => setRejecting(rejecting === p.userId ? null : p.userId)}>
                      Respinge
                    </Button>
                  </>
                )}
                {open && isLeader && p.status !== 'VALIDATED' && p.status !== 'EXCUSED' && p.userId !== meId && (
                  <Button
                    variant="ghost"
                    loading={busy === `excuse-${p.userId}`}
                    onClick={() => {
                      if (window.confirm(`Scutești pe ${p.nickname} de acest quest? Cerința de grup se va calcula fără el.`)) {
                        void run(`excuse-${p.userId}`, () => actions.excuse(quest.id, p.userId));
                      }
                    }}
                  >
                    Scutește
                  </Button>
                )}
              </div>
            </div>
            {p.status === 'AWAITING_REVIEW' && p.autoValidateAt && (
              <p className="mt-1 text-xs text-muted">Se validează automat {formatRelative(p.autoValidateAt)} (fără bonus de grup).</p>
            )}
            {p.status === 'VALIDATED' && p.validatorNickname && (
              <p className="mt-1 text-xs text-muted">Validat de {p.validatorNickname}</p>
            )}
            {p.rejectReason && (p.status === 'PENDING' || p.status === 'OVERDUE') && (
              <p className="mt-1 text-xs text-blood">Respins: „{p.rejectReason}”</p>
            )}
            {rejecting === p.userId && (
              <form
                className="mt-2 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(`reject-${p.userId}`, () => actions.reject(quest.id, p.userId, reason));
                }}
              >
                <label className="sr-only" htmlFor={`reason-${quest.id}-${p.userId}`}>
                  Motivul respingerii
                </label>
                <input
                  id={`reason-${quest.id}-${p.userId}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="De ce nu e gata? (obligatoriu)"
                  maxLength={200}
                  className="min-h-11 min-w-0 flex-1 rounded-[3px] border-2 border-line bg-abyss/80 px-3 text-ink outline-none focus:border-gold"
                />
                <Button type="submit" variant="danger" loading={busy === `reject-${p.userId}`}>
                  Trimite
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-2 text-sm text-blood">
          ✖ {error}
        </p>
      )}

      {open && (
        <footer className="mt-3 flex flex-wrap gap-2">
          {me && (me.status === 'PENDING' || me.status === 'OVERDUE') && (
            <Button loading={busy === 'done'} onClick={() => void run('done', () => actions.done(quest.id))}>
              ✓ Am terminat
            </Button>
          )}
          {me?.status === 'AWAITING_REVIEW' && <p className="text-sm text-mana">Ai terminat; aștepți validarea unui coleg.</p>}
          {(quest.creatorId === meId || isLeader) && (
            <Button
              variant="ghost"
              loading={busy === 'cancel'}
              onClick={() => {
                if (window.confirm('Anulezi quest-ul? Recompensele deja validate rămân, dar nu se mai acordă bonus.')) {
                  void run('cancel', () => actions.cancel(quest.id));
                }
              }}
            >
              Anulează quest-ul
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}
