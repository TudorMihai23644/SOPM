import {
  DIFFICULTY_LABELS,
  PARTICIPANT_STATUS_LABELS,
  QUEST_STATUS_LABELS,
  type ParticipantStatus,
  type QuestDto,
} from '@deadlinehero/shared';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { formatAgo, formatDateTime, formatRemaining } from '../lib/time';
import { space, useTheme, type Palette } from '../lib/theme';
import { Badge, Body, Button, Card, Field, Label } from './ui';

const STYLE: Record<ParticipantStatus, { icon: string; color: keyof Palette }> = {
  PENDING: { icon: '⚔', color: 'ink' },
  OVERDUE: { icon: '☠', color: 'blood' },
  AWAITING_REVIEW: { icon: '⌛', color: 'mana' },
  VALIDATED: { icon: '✓', color: 'heal' },
  EXCUSED: { icon: '–', color: 'muted' },
};

export interface QuestActions {
  done: (id: string) => Promise<unknown>;
  validate: (id: string, userId: string) => Promise<unknown>;
  reject: (id: string, userId: string, reason: string) => Promise<unknown>;
  excuse: (id: string, userId: string) => Promise<unknown>;
  cancel: (id: string) => Promise<unknown>;
}

export function QuestCard({
  quest,
  meId,
  isLeader,
  actions,
  haptics,
}: {
  quest: QuestDto;
  meId: string;
  isLeader: boolean;
  actions: QuestActions;
  haptics: boolean;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = quest.status === 'OPEN';
  const me = quest.participants.find((p) => p.userId === meId);
  const active = quest.participants.filter((p) => p.status !== 'EXCUSED');
  const validated = active.filter((p) => p.status === 'VALIDATED').length;
  const remaining = formatRemaining(quest.deadlineAt);

  async function run(key: string, action: () => Promise<unknown>, success = false) {
    setBusy(key);
    setError(null);
    try {
      await action();
      if (success && haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRejecting(null);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A apărut o eroare.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card tone={me?.status === 'OVERDUE' ? 'blood' : undefined}>
      <View style={{ gap: 2 }}>
        <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>
          {quest.title}
        </Text>
        <Text style={{ color: colors.muted }}>
          {DIFFICULTY_LABELS[quest.difficulty]} · {formatDateTime(quest.deadlineAt)}
          {quest.creatorNickname ? ` · de ${quest.creatorNickname}` : ''}
        </Text>
        {open ? (
          <Label color={remaining ? colors.ember : colors.blood}>{remaining ? `⧗ ${remaining}` : 'Timpul a expirat'}</Label>
        ) : (
          <Label color={quest.status === 'COMPLETED' ? colors.heal : colors.muted}>
            {quest.status === 'COMPLETED' ? '✓ ' : '✕ '}
            {QUEST_STATUS_LABELS[quest.status]}
            {quest.bonusGrantedAt ? '  ★ bonus de grup' : ''}
          </Label>
        )}
      </View>
      {quest.description ? <Body>{quest.description}</Body> : null}

      <Label>
        Validați: {validated} / {active.length}
      </Label>
      <View style={{ gap: space.sm }}>
        {quest.participants.map((p) => {
          const s = STYLE[p.status];
          const reviewable = open && p.status === 'AWAITING_REVIEW' && p.userId !== meId;
          return (
            <View key={p.userId} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: space.sm, gap: space.xs }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{p.userId === meId ? `${p.nickname} (tu)` : p.nickname}</Text>
                <Badge icon={s.icon} text={PARTICIPANT_STATUS_LABELS[p.status]} color={colors[s.color]} />
                {p.doneLate && <Text style={{ color: colors.ember, fontSize: 13 }}>după termen</Text>}
                {p.autoValidated && <Text style={{ color: colors.muted, fontSize: 13 }}>validat automat</Text>}
              </View>
              {p.status === 'AWAITING_REVIEW' && p.doneAt && (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Terminat {formatAgo(p.doneAt)}; se validează automat după 48 h (fără bonus).
                </Text>
              )}
              {p.validatorNickname && p.status === 'VALIDATED' && (
                <Text style={{ color: colors.muted, fontSize: 13 }}>Validat de {p.validatorNickname}</Text>
              )}
              {p.rejectReason && (p.status === 'PENDING' || p.status === 'OVERDUE') && (
                <Text style={{ color: colors.blood, fontSize: 13 }}>Respins: „{p.rejectReason}”</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {reviewable && (
                  <>
                    <Button
                      title="Validează"
                      loading={busy === `v-${p.userId}`}
                      onPress={() => void run(`v-${p.userId}`, () => actions.validate(quest.id, p.userId), true)}
                    />
                    <Button title="Respinge" variant="secondary" onPress={() => setRejecting(rejecting === p.userId ? null : p.userId)} />
                  </>
                )}
                {open && isLeader && p.userId !== meId && p.status !== 'VALIDATED' && p.status !== 'EXCUSED' && (
                  <Button
                    title="Scutește"
                    variant="ghost"
                    loading={busy === `e-${p.userId}`}
                    onPress={() =>
                      Alert.alert('Scutești participantul?', `Cerința de grup se va calcula fără ${p.nickname}.`, [
                        { text: 'Renunță', style: 'cancel' },
                        { text: 'Scutește', onPress: () => void run(`e-${p.userId}`, () => actions.excuse(quest.id, p.userId)) },
                      ])
                    }
                  />
                )}
              </View>
              {rejecting === p.userId && (
                <View style={{ gap: space.sm }}>
                  <Field label="Motivul respingerii" value={reason} onChangeText={setReason} maxLength={200} placeholder="De ce nu e gata?" />
                  <Button
                    title="Trimite respingerea"
                    variant="danger"
                    loading={busy === `r-${p.userId}`}
                    onPress={() => void run(`r-${p.userId}`, () => actions.reject(quest.id, p.userId, reason))}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {error && <Text style={{ color: colors.blood }}>✖ {error}</Text>}

      {open && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {me && (me.status === 'PENDING' || me.status === 'OVERDUE') && (
            <Button title="✓ Am terminat" loading={busy === 'done'} onPress={() => void run('done', () => actions.done(quest.id), true)} />
          )}
          {me?.status === 'AWAITING_REVIEW' && <Body muted>Aștepți validarea unui coleg.</Body>}
          {(quest.creatorId === meId || isLeader) && (
            <Button
              title="Anulează quest-ul"
              variant="ghost"
              loading={busy === 'cancel'}
              onPress={() =>
                Alert.alert('Anulezi quest-ul?', 'Recompensele deja validate rămân, dar nu se mai acordă bonus.', [
                  { text: 'Renunță', style: 'cancel' },
                  { text: 'Anulează quest-ul', style: 'destructive', onPress: () => void run('cancel', () => actions.cancel(quest.id)) },
                ])
              }
            />
          )}
        </View>
      )}
    </Card>
  );
}
