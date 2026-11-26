import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MeDto, UpdateProfileInput } from '@deadlinehero/shared';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../common/app-error';
import { CLOCK, type Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import type { PendingEvents } from '../teams/quests.service';
import { RealtimeGateway } from '../teams/realtime.gateway';
import { TeamsService } from '../teams/teams.service';
import { UsersService } from './users.service';

/** Profil, export de date și ștergerea contului (cerințele GDPR din specificații). */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly teams: TeamsService,
    private readonly realtime: RealtimeGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async update(userId: string, data: UpdateProfileInput): Promise<MeDto> {
    try {
      await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(HttpStatus.CONFLICT, 'NICKNAME_TAKEN', 'Porecla este deja folosită', [
          { path: 'nickname', message: 'Porecla este deja folosită' },
        ]);
      }
      throw error;
    }
    return this.users.getMe(userId);
  }

  /**
   * Ștergerea contului: activitățile, istoricul, registrul și sesiunile se șterg în cascadă;
   * din echipă se iese cu aceeași regulă ca la plecare.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    await this.auth.verifyPassword(userId, password);
    const events: PendingEvents = [];
    const teamId = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.teamMember.findUnique({ where: { userId } });
      if (membership) await this.teams.removeMember(tx, membership.teamId, userId, events);
      await tx.user.delete({ where: { id: userId } });
      return membership?.teamId ?? null;
    });
    if (teamId) this.realtime.moveUser(userId, teamId, null);
    for (const e of events) this.realtime.emit(e.teamId, e.event, e.payload);
  }

  /** Exportul JSON cu toate datele personale ale utilizatorului (fără hash-uri și tokenuri). */
  async export(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        timezone: true,
        xpTotal: true,
        level: true,
        hp: true,
        coins: true,
        streakDays: true,
        createdAt: true,
      },
    });
    const [tasks, history, ledger, stamina, membership, participation] = await Promise.all([
      this.prisma.task.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.historyLog.findMany({ where: { userId }, orderBy: [{ at: 'asc' }, { seq: 'asc' }] }),
      this.prisma.rewardLedger.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.dailyStamina.findMany({ where: { userId }, orderBy: { gameDay: 'asc' } }),
      this.prisma.teamMember.findUnique({
        where: { userId },
        include: { team: { select: { id: true, name: true, level: true } } },
      }),
      this.prisma.questParticipant.findMany({
        where: { userId },
        include: { quest: { select: { id: true, title: true, deadlineAt: true, difficulty: true, status: true } } },
      }),
    ]);

    return {
      exportedAt: this.clock.now().toISOString(),
      format: 'deadlinehero-export-v1',
      profile: user,
      tasks,
      history: history.map(({ seq, ...entry }) => ({ ...entry, seq: Number(seq) })),
      rewardLedger: ledger,
      dailyStamina: stamina.map((s) => ({ gameDay: s.gameDay.toISOString().slice(0, 10), xpAwarded: s.xpAwarded })),
      team: membership ? { ...membership.team, role: membership.role, joinedAt: membership.joinedAt } : null,
      questParticipation: participation,
    };
  }
}
