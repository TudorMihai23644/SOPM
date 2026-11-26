import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import {
  DEFAULT_GAME_CONFIG,
  gameDayStart,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  TEAM_MAX_MEMBERS,
  type MyTeamResponse,
  type TeamDto,
} from '@deadlinehero/shared';
import { CLOCK, type Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { TeamErrors } from './errors';
import { teamInclude, toTeamDto } from './mappers';
import { QuestsService, type PendingEvents } from './quests.service';
import { RealtimeGateway } from './realtime.gateway';

type Tx = Prisma.TransactionClient;

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  return code;
}

const isUniqueViolation = (error: unknown, field?: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002' &&
  (!field || String(error.meta?.target ?? '').includes(field));

/** Echipe (Guild) de 1–4 membri; un utilizator face parte dintr-o singură echipă. */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quests: QuestsService,
    private readonly realtime: RealtimeGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getMine(userId: string): Promise<MyTeamResponse> {
    const membership = await this.prisma.teamMember.findUnique({ where: { userId } });
    if (!membership) return { team: null };
    return { team: await this.load(this.prisma, membership.teamId, userId) };
  }

  async create(userId: string, name: string): Promise<TeamDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const team = await this.prisma.$transaction(async (tx) => {
          if (await tx.teamMember.findUnique({ where: { userId } })) throw TeamErrors.alreadyInTeam();
          const created = await tx.team.create({
            data: {
              name,
              inviteCode: generateInviteCode(),
              leaderId: userId,
              createdAt: this.clock.now(),
              members: { create: { userId, role: 'LEADER', joinedAt: this.clock.now() } },
            },
          });
          return this.load(tx, created.id, userId);
        });
        this.realtime.moveUser(userId, null, team.id);
        return team;
      } catch (error) {
        if (isUniqueViolation(error, 'user_id')) throw TeamErrors.alreadyInTeam();
        // Cod de invitație deja folosit: se încearcă altul.
        if (!isUniqueViolation(error, 'invite_code')) throw error;
      }
    }
    throw new Error('Nu s-a putut genera un cod de invitație unic');
  }

  /** Intrare prin cod; în aceeași tranzacție se verifică locurile libere și echipa curentă. */
  async join(userId: string, code: string): Promise<TeamDto> {
    try {
      const team = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM teams WHERE invite_code = ${code} FOR UPDATE`;
        if (rows.length === 0) throw TeamErrors.invalidCode();
        const teamId = rows[0].id;
        if (await tx.teamMember.findUnique({ where: { userId } })) throw TeamErrors.alreadyInTeam();
        if ((await tx.teamMember.count({ where: { teamId } })) >= TEAM_MAX_MEMBERS) throw TeamErrors.teamFull();
        await tx.teamMember.create({ data: { teamId, userId, role: 'MEMBER', joinedAt: this.clock.now() } });
        return this.load(tx, teamId, userId);
      });
      const nickname = team.members.find((m) => m.userId === userId)?.nickname;
      this.realtime.moveUser(userId, null, team.id);
      this.realtime.emit(team.id, 'team.member_joined', { userId, nickname });
      return team;
    } catch (error) {
      if (isUniqueViolation(error, 'user_id')) throw TeamErrors.alreadyInTeam();
      throw error;
    }
  }

  async leave(userId: string): Promise<void> {
    const events: PendingEvents = [];
    const teamId = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.teamMember.findUnique({ where: { userId } });
      if (!membership) throw TeamErrors.noTeam();
      await this.removeMember(tx, membership.teamId, userId, events);
      return membership.teamId;
    });
    this.afterRemoval(teamId, userId, events);
  }

  /** Liderul scoate un membru din echipă. */
  async kick(leaderId: string, targetId: string): Promise<TeamDto> {
    if (leaderId === targetId) throw TeamErrors.cannotKickSelf();
    const events: PendingEvents = [];
    const team = await this.prisma.$transaction(async (tx) => {
      const teamId = await this.assertLeader(tx, leaderId);
      const target = await tx.teamMember.findUnique({ where: { userId: targetId } });
      if (!target || target.teamId !== teamId) throw TeamErrors.memberNotFound();
      await this.removeMember(tx, teamId, targetId, events);
      return this.load(tx, teamId, leaderId);
    });
    this.afterRemoval(team.id, targetId, events);
    return team;
  }

  async regenerateCode(leaderId: string): Promise<TeamDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const team = await this.prisma.$transaction(async (tx) => {
          const teamId = await this.assertLeader(tx, leaderId);
          await tx.team.update({ where: { id: teamId }, data: { inviteCode: generateInviteCode() } });
          return this.load(tx, teamId, leaderId);
        });
        this.realtime.emit(team.id, 'team.updated');
        return team;
      } catch (error) {
        if (!isUniqueViolation(error, 'invite_code')) throw error;
      }
    }
    throw new Error('Nu s-a putut genera un cod de invitație unic');
  }

  /**
   * Plecarea dintr-o echipă (și la ștergerea contului): participările deschise devin scutite,
   * conducerea trece la cel mai vechi membru, iar echipa fără membri se șterge.
   */
  async removeMember(tx: Tx, teamId: string, userId: string, events: PendingEvents): Promise<void> {
    await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
    await this.quests.excuseLeavingMember(tx, teamId, userId, events);
    await tx.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });

    const remaining = await tx.teamMember.findMany({ where: { teamId }, orderBy: { joinedAt: 'asc' } });
    if (remaining.length === 0) {
      await tx.team.delete({ where: { id: teamId } });
      return;
    }
    const team = await tx.team.findUniqueOrThrow({ where: { id: teamId } });
    if (team.leaderId === userId) {
      const next = remaining[0];
      await tx.teamMember.update({ where: { teamId_userId: { teamId, userId: next.userId } }, data: { role: 'LEADER' } });
      await tx.team.update({ where: { id: teamId }, data: { leaderId: next.userId } });
    }
    events.push({ teamId, event: 'team.member_left', payload: { userId } });
  }

  private afterRemoval(teamId: string, userId: string, events: PendingEvents): void {
    this.realtime.moveUser(userId, teamId, null);
    this.realtime.notifyUser(userId, 'team.member_left', { teamId, userId });
    for (const e of events) this.realtime.emit(e.teamId, e.event, e.payload);
  }

  private async assertLeader(tx: Tx, userId: string): Promise<string> {
    const membership = await tx.teamMember.findUnique({ where: { userId } });
    if (!membership) throw TeamErrors.noTeam();
    if (membership.role !== 'LEADER') throw TeamErrors.leaderOnly();
    return membership.teamId;
  }

  private async load(client: Tx | PrismaService, teamId: string, viewerId: string): Promise<TeamDto> {
    const [team, viewer] = await Promise.all([
      client.team.findUniqueOrThrow({ where: { id: teamId }, include: teamInclude }),
      client.user.findUniqueOrThrow({ where: { id: viewerId }, select: { timezone: true } }),
    ]);
    const since = gameDayStart(this.clock.now(), viewer.timezone, DEFAULT_GAME_CONFIG.gameDayStartHour);
    const bonusesToday = await client.quest.count({ where: { teamId, bonusGrantedAt: { gte: since } } });
    return toTeamDto(team, bonusesToday);
  }
}
