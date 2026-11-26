import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type QuestParticipant, type QuestStatus } from '@prisma/client';
import {
  DEFAULT_GAME_CONFIG,
  gameDayStart,
  groupBonus,
  teamLevelForXp,
  TEAM_MIN_MEMBERS_FOR_QUESTS,
  validatorReward,
  type CreateQuestData,
  type QuestDto,
  type TeamEvent,
  type TeamEventPayload,
} from '@deadlinehero/shared';
import { CLOCK, type Clock } from '../common/clock';
import { GameService } from '../game/game.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskErrors } from '../tasks/errors';
import { QuestErrors, TeamErrors } from './errors';
import { questInclude, toQuestDto, type QuestWithParticipants } from './mappers';
import { RealtimeGateway } from './realtime.gateway';

type Tx = Prisma.TransactionClient;
const config = DEFAULT_GAME_CONFIG;
const HOUR = 60 * 60 * 1000;
const BATCH_SIZE = 200;

/** Evenimente de trimis după ce tranzacția s-a încheiat cu succes. */
export type PendingEvents = { teamId: string; event: TeamEvent; payload?: Omit<TeamEventPayload, 'teamId'> }[];

/**
 * Shared Quests: creare, completare, validare de către un coleg, bonus de grup.
 * Fiecare schimbare rulează într-o tranzacție cu rândurile blocate (FOR UPDATE), ca două
 * validări simultane să nu acorde recompensa de două ori; tranzacția care validează ultimul
 * participant acordă și bonusul de grup.
 */
@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
    private readonly realtime: RealtimeGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(userId: string): Promise<QuestDto[]> {
    const membership = await this.membership(this.prisma, userId);
    await this.markOverdue(membership.teamId);
    const quests = await this.prisma.quest.findMany({
      where: { teamId: membership.teamId },
      include: questInclude,
      orderBy: [{ deadlineAt: 'asc' }],
      take: 100,
    });
    // Întâi cele deschise (după termen), apoi cele încheiate, cele mai recente primele.
    const open = quests.filter((q) => q.status === 'OPEN');
    const closed = quests
      .filter((q) => q.status !== 'OPEN')
      .sort((a, b) => (b.completedAt ?? b.deadlineAt).getTime() - (a.completedAt ?? a.deadlineAt).getTime())
      .slice(0, 30);
    return [...open, ...closed].map(toQuestDto);
  }

  async create(userId: string, data: CreateQuestData): Promise<QuestDto> {
    const now = this.clock.now();
    const deadline = new Date(data.deadlineAt);
    if (deadline.getTime() < now.getTime() + config.minDeadlineLeadSeconds * 1000) throw TaskErrors.deadlineTooSoon();
    return this.run(async (tx, events) => {
      const membership = await this.membership(tx, userId);
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${membership.teamId}::uuid FOR UPDATE`;
      const members = await tx.teamMember.findMany({ where: { teamId: membership.teamId } });
      if (members.length < TEAM_MIN_MEMBERS_FOR_QUESTS) throw QuestErrors.needsTwoMembers();

      const memberIds = new Set(members.map((m) => m.userId));
      const participantIds = [...new Set(data.participantIds ?? [...memberIds])];
      if (participantIds.length < TEAM_MIN_MEMBERS_FOR_QUESTS || participantIds.some((id) => !memberIds.has(id))) {
        throw QuestErrors.invalidParticipants();
      }

      const quest = await tx.quest.create({
        data: {
          teamId: membership.teamId,
          creatorId: userId,
          title: data.title,
          description: data.description ?? null,
          deadlineAt: deadline,
          difficulty: data.difficulty,
          createdAt: now,
          participants: { create: participantIds.map((id) => ({ userId: id })) },
        },
        include: questInclude,
      });
      events.push({ teamId: membership.teamId, event: 'quest.updated', payload: { questId: quest.id } });
      return toQuestDto(quest);
    });
  }

  /** Participantul apasă „Terminat”: starea lui devine „Așteaptă validare”. */
  done(userId: string, questId: string): Promise<QuestDto> {
    return this.mutate(userId, questId, async (tx, quest, now, events) => {
      this.assertOpen(quest);
      const participant = await this.lockParticipant(tx, questId, userId);
      if (!participant) throw QuestErrors.notParticipant();
      if (participant.status !== 'PENDING' && participant.status !== 'OVERDUE') {
        throw QuestErrors.wrongState('Ai marcat deja quest-ul ca terminat');
      }
      await tx.questParticipant.update({
        where: { questId_userId: { questId, userId } },
        data: {
          status: 'AWAITING_REVIEW',
          doneAt: now,
          doneLate: participant.status === 'OVERDUE' || now > quest.deadlineAt,
          rejectReason: null,
        },
      });
      events.push({ teamId: quest.teamId, event: 'quest.review_requested', payload: { questId, userId } });
    });
  }

  /** Validare de către un coleg (diferit de autorul completării). */
  validate(actorId: string, questId: string, targetId: string): Promise<QuestDto> {
    return this.mutate(actorId, questId, async (tx, quest, now, events) => {
      this.assertOpen(quest);
      if (actorId === targetId) throw QuestErrors.selfValidation();
      const participant = await this.lockParticipant(tx, questId, targetId);
      if (!participant) throw TeamErrors.memberNotFound();
      if (participant.status !== 'AWAITING_REVIEW') throw QuestErrors.wrongState('Completarea nu așteaptă validare');

      await this.approve(tx, quest, participant, now, actorId);

      // Recompensa validatorului: +5 XP, de cel mult 3 ori pe zi de joc.
      const actor = await this.game.lockUser(tx, actorId);
      const since = gameDayStart(now, actor.timezone, config.gameDayStartHour);
      const validationsToday = await tx.questParticipant.count({
        where: { validatorId: actorId, autoValidated: false, validatedAt: { gte: since }, NOT: { questId, userId: targetId } },
      });
      const xp = validatorReward(validationsToday, 0);
      if (xp > 0) {
        await this.game.grantXp(tx, actorId, xp, 'VALIDATOR_REWARD', { refType: 'QUEST_REVIEW', refId: `${questId}:${targetId}` }, now);
      }
      await this.settle(tx, quest.id, now, events, since);
      events.push({ teamId: quest.teamId, event: 'quest.updated', payload: { questId, userId: targetId } });
    });
  }

  /** Respingere cu motiv: participantul revine la „În lucru” (sau „Restant”, dacă termenul a trecut). */
  reject(actorId: string, questId: string, targetId: string, reason: string): Promise<QuestDto> {
    return this.mutate(actorId, questId, async (tx, quest, now, events) => {
      this.assertOpen(quest);
      if (actorId === targetId) throw QuestErrors.selfValidation();
      const participant = await this.lockParticipant(tx, questId, targetId);
      if (!participant) throw TeamErrors.memberNotFound();
      if (participant.status !== 'AWAITING_REVIEW') throw QuestErrors.wrongState('Completarea nu așteaptă validare');

      const overdue = now >= quest.deadlineAt;
      await tx.questParticipant.update({
        where: { questId_userId: { questId, userId: targetId } },
        data: {
          status: overdue ? 'OVERDUE' : 'PENDING',
          doneAt: null,
          doneLate: false,
          rejectReason: reason,
          ...(overdue ? { overdueAt: quest.deadlineAt } : {}),
        },
      });
      if (overdue) await this.penalize(tx, quest.id, quest.difficulty, targetId);
      events.push({ teamId: quest.teamId, event: 'quest.updated', payload: { questId, userId: targetId } });
    });
  }

  /** Liderul scutește un participant inactiv; cerința de grup se calculează fără el. */
  excuse(actorId: string, questId: string, targetId: string): Promise<QuestDto> {
    return this.mutate(actorId, questId, async (tx, quest, now, events, role) => {
      this.assertOpen(quest);
      if (role !== 'LEADER') throw TeamErrors.leaderOnly();
      const participant = await this.lockParticipant(tx, questId, targetId);
      if (!participant) throw TeamErrors.memberNotFound();
      if (participant.status === 'VALIDATED' || participant.status === 'EXCUSED') {
        throw QuestErrors.wrongState('Participantul este deja validat sau scutit');
      }
      await tx.questParticipant.update({
        where: { questId_userId: { questId, userId: targetId } },
        data: { status: 'EXCUSED' },
      });
      await this.settle(tx, quest.id, now, events);
      events.push({ teamId: quest.teamId, event: 'quest.updated', payload: { questId, userId: targetId } });
    });
  }

  /** Anulare de către creator sau lider; recompensele personale deja validate rămân. */
  cancel(actorId: string, questId: string): Promise<QuestDto> {
    return this.mutate(actorId, questId, async (tx, quest, now, events, role) => {
      this.assertOpen(quest);
      if (quest.creatorId !== actorId && role !== 'LEADER') throw QuestErrors.cancelNotAllowed();
      await tx.quest.update({ where: { id: quest.id }, data: { status: 'CANCELLED', completedAt: now } });
      events.push({ teamId: quest.teamId, event: 'quest.updated', payload: { questId } });
    });
  }

  /**
   * Când un membru pleacă din echipă: participările lui încă nevalidate devin scutite,
   * iar quest-urile afectate se reevaluează. Rulează în tranzacția plecării.
   */
  async excuseLeavingMember(tx: Tx, teamId: string, userId: string, events: PendingEvents): Promise<void> {
    const now = this.clock.now();
    const rows = await tx.questParticipant.findMany({
      where: { userId, status: { notIn: ['VALIDATED', 'EXCUSED'] }, quest: { teamId, status: 'OPEN' } },
      select: { questId: true },
    });
    for (const { questId } of rows) {
      await tx.questParticipant.update({ where: { questId_userId: { questId, userId } }, data: { status: 'EXCUSED' } });
      await this.settle(tx, questId, now, events);
      events.push({ teamId, event: 'quest.updated', payload: { questId } });
    }
  }

  /**
   * Job-ul quest-overdue-scan (și evaluarea la citire): participanții încă „În lucru” la
   * quest-uri cu termenul trecut devin „Restant” și pierd HP o singură dată.
   */
  async markOverdue(teamId?: string, now: Date = this.clock.now()): Promise<number> {
    let total = 0;
    for (;;) {
      const due = await this.prisma.questParticipant.findMany({
        where: { status: 'PENDING', quest: { status: 'OPEN', deadlineAt: { lte: now }, ...(teamId ? { teamId } : {}) } },
        select: { questId: true, userId: true },
        take: BATCH_SIZE,
      });
      for (const row of due) {
        const done = await this.prisma.$transaction(async (tx) => {
          const locked = await tx.$queryRaw<{ quest_id: string }[]>`
            SELECT quest_id FROM quest_participants
            WHERE quest_id = ${row.questId}::uuid AND user_id = ${row.userId}::uuid AND status = 'PENDING'::"ParticipantStatus"
            FOR UPDATE SKIP LOCKED`;
          if (locked.length === 0) return null;
          const quest = await tx.quest.findUniqueOrThrow({ where: { id: row.questId } });
          await tx.questParticipant.update({
            where: { questId_userId: row },
            data: { status: 'OVERDUE', overdueAt: quest.deadlineAt },
          });
          await this.penalize(tx, quest.id, quest.difficulty, row.userId);
          return quest.teamId;
        });
        if (done) {
          total += 1;
          this.realtime.emit(done, 'quest.updated', { questId: row.questId, userId: row.userId });
        }
      }
      if (due.length < BATCH_SIZE) return total;
    }
  }

  /** Job-ul review-timeout: completările nevalidate de peste 48 h se validează automat (fără bonus de grup). */
  async autoValidate(now: Date = this.clock.now()): Promise<number> {
    const cutoff = new Date(now.getTime() - config.reviewTimeoutHours * HOUR);
    const due = await this.prisma.questParticipant.findMany({
      where: { status: 'AWAITING_REVIEW', doneAt: { lte: cutoff }, quest: { status: 'OPEN' } },
      select: { questId: true, userId: true },
      take: BATCH_SIZE,
    });
    let total = 0;
    for (const row of due) {
      const events: PendingEvents = [];
      const done = await this.prisma.$transaction(async (tx) => {
        const quest = await this.lockQuest(tx, row.questId);
        if (!quest || quest.status !== 'OPEN') return false;
        const participant = await this.lockParticipant(tx, row.questId, row.userId);
        if (!participant || participant.status !== 'AWAITING_REVIEW' || !participant.doneAt || participant.doneAt > cutoff) {
          return false;
        }
        await this.approve(tx, quest, participant, now, null);
        await this.settle(tx, quest.id, now, events);
        events.push({ teamId: quest.teamId, event: 'quest.updated', payload: { questId: quest.id, userId: row.userId } });
        return true;
      });
      if (done) total += 1;
      this.flush(events);
    }
    return total;
  }

  /** Validează completarea și acordă recompensa personală (calculul din „Regulile jocului”). */
  private async approve(
    tx: Tx,
    quest: { id: string; createdAt: Date; difficulty: QuestWithParticipants['difficulty'] },
    participant: QuestParticipant,
    now: Date,
    validatorId: string | null,
  ): Promise<void> {
    await tx.questParticipant.update({
      where: { questId_userId: { questId: quest.id, userId: participant.userId } },
      data: { status: 'VALIDATED', validatorId, validatedAt: now, autoValidated: validatorId === null, rejectReason: null },
    });
    const doneAt = participant.doneAt ?? now;
    await this.game.grantPersonalReward(
      tx,
      participant.userId,
      {
        difficulty: quest.difficulty,
        late: participant.doneLate,
        postponed: false,
        ageSeconds: (doneAt.getTime() - quest.createdAt.getTime()) / 1000,
      },
      { refType: 'QUEST', refId: `${quest.id}:${participant.userId}` },
      'QUEST_VALIDATED',
      now,
    );
  }

  /**
   * Încheie quest-ul când toți participanții rămași sunt validați. Bonusul de grup se acordă
   * doar dacă toți au terminat la timp, nimeni n-a fost validat automat și echipa n-a atins
   * plafonul de 3 bonusuri pe zi.
   */
  private async settle(tx: Tx, questId: string, now: Date, events: PendingEvents, dayStart?: Date): Promise<void> {
    const quest = await tx.quest.findUniqueOrThrow({ where: { id: questId }, include: { participants: true } });
    if (quest.status !== 'OPEN') return;
    const active = quest.participants.filter((p) => p.status !== 'EXCUSED');
    if (active.length === 0) {
      await tx.quest.update({ where: { id: questId }, data: { status: 'CANCELLED', completedAt: now } });
      return;
    }
    if (!active.every((p) => p.status === 'VALIDATED')) return;

    const since = dayStart ?? new Date(now.getTime() - 24 * HOUR);
    const bonusesToday = await tx.quest.count({ where: { teamId: quest.teamId, bonusGrantedAt: { gte: since } } });
    const eligible =
      active.length >= TEAM_MIN_MEMBERS_FOR_QUESTS &&
      active.every((p) => !p.doneLate && !p.autoValidated) &&
      bonusesToday < config.groupBonusesPerTeamPerDay;

    const status: QuestStatus = 'COMPLETED';
    if (!eligible) {
      await tx.quest.update({ where: { id: questId }, data: { status, completedAt: now } });
      return;
    }

    const bonus = groupBonus(quest.difficulty, 0);
    for (const p of active) {
      await this.game.grantXp(tx, p.userId, bonus.xp, 'GROUP_BONUS', { refType: 'QUEST', refId: questId }, now);
    }
    await tx.$queryRaw`SELECT id FROM teams WHERE id = ${quest.teamId}::uuid FOR UPDATE`;
    const team = await tx.team.findUniqueOrThrow({ where: { id: quest.teamId } });
    const level = teamLevelForXp(team.teamXp + bonus.teamXp).level;
    await tx.team.update({
      where: { id: team.id },
      data: { teamXp: { increment: bonus.teamXp }, vaultCoins: { increment: bonus.vaultCoins }, level },
    });
    await tx.quest.update({ where: { id: questId }, data: { status, completedAt: now, bonusGrantedAt: now } });
    events.push({ teamId: team.id, event: 'team.updated' });
    if (level > team.level) events.push({ teamId: team.id, event: 'team.level_up', payload: { level } });
  }

  private async penalize(tx: Tx, questId: string, difficulty: QuestWithParticipants['difficulty'], userId: string) {
    const participant = await tx.questParticipant.findUniqueOrThrow({ where: { questId_userId: { questId, userId } } });
    if (participant.hpPenaltyApplied) return;
    await this.game.penalizeHp(tx, userId, difficulty, { refType: 'QUEST', refId: `${questId}:${userId}` });
    await tx.questParticipant.update({ where: { questId_userId: { questId, userId } }, data: { hpPenaltyApplied: true } });
  }

  /** Rulează o acțiune pe un quest al echipei utilizatorului, cu rândul quest-ului blocat. */
  private async mutate(
    userId: string,
    questId: string,
    change: (
      tx: Tx,
      quest: NonNullable<Awaited<ReturnType<QuestsService['lockQuest']>>>,
      now: Date,
      events: PendingEvents,
      role: 'LEADER' | 'MEMBER',
    ) => Promise<void>,
  ): Promise<QuestDto> {
    const now = this.clock.now();
    return this.run(async (tx, events) => {
      const membership = await this.membership(tx, userId);
      const quest = await this.lockQuest(tx, questId);
      // Quest-ul altei echipe arată ca unul inexistent.
      if (!quest || quest.teamId !== membership.teamId) throw QuestErrors.notFound();
      await change(tx, quest, now, events, membership.role);
      return toQuestDto(await tx.quest.findUniqueOrThrow({ where: { id: questId }, include: questInclude }));
    });
  }

  private async run<T>(work: (tx: Tx, events: PendingEvents) => Promise<T>): Promise<T> {
    const events: PendingEvents = [];
    const result = await this.prisma.$transaction((tx) => work(tx, events));
    this.flush(events);
    return result;
  }

  private flush(events: PendingEvents): void {
    for (const e of events) this.realtime.emit(e.teamId, e.event, e.payload);
  }

  private async membership(client: Tx | PrismaService, userId: string) {
    const membership = await client.teamMember.findUnique({ where: { userId } });
    if (!membership) throw TeamErrors.noTeam();
    return membership;
  }

  private async lockQuest(tx: Tx, questId: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM quests WHERE id = ${questId}::uuid FOR UPDATE`;
    if (rows.length === 0) return null;
    return tx.quest.findUniqueOrThrow({ where: { id: questId } });
  }

  private async lockParticipant(tx: Tx, questId: string, userId: string): Promise<QuestParticipant | null> {
    const rows = await tx.$queryRaw<{ quest_id: string }[]>`
      SELECT quest_id FROM quest_participants WHERE quest_id = ${questId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
    if (rows.length === 0) return null;
    return tx.questParticipant.findUniqueOrThrow({ where: { questId_userId: { questId, userId } } });
  }

  private assertOpen(quest: { status: QuestStatus }): void {
    if (quest.status !== 'OPEN') throw QuestErrors.notOpen();
  }
}
