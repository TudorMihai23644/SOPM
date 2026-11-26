import type { Quest, QuestParticipant, Team, TeamMember, User } from '@prisma/client';
import { DEFAULT_GAME_CONFIG, TEAM_MAX_MEMBERS, teamLevelForXp, type QuestDto, type TeamDto } from '@deadlinehero/shared';

const HOUR = 60 * 60 * 1000;
type Nick = Pick<User, 'id' | 'nickname'>;

export type TeamWithMembers = Team & { members: (TeamMember & { user: Pick<User, 'nickname' | 'level'> })[] };
export type QuestWithParticipants = Quest & {
  creator: Nick | null;
  participants: (QuestParticipant & { user: Nick; validator: Nick | null })[];
};

export const teamInclude = {
  members: { include: { user: { select: { nickname: true, level: true } } } },
} as const;

export const questInclude = {
  creator: { select: { id: true, nickname: true } },
  participants: {
    include: {
      user: { select: { id: true, nickname: true } },
      validator: { select: { id: true, nickname: true } },
    },
  },
} as const;

/** Liderul primul, apoi membrii în ordinea intrării. */
export function toTeamDto(team: TeamWithMembers, groupBonusesToday: number): TeamDto {
  const progress = teamLevelForXp(team.teamXp);
  const members = [...team.members].sort(
    (a, b) => Number(b.role === 'LEADER') - Number(a.role === 'LEADER') || a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  return {
    id: team.id,
    name: team.name,
    inviteCode: team.inviteCode,
    leaderId: team.leaderId,
    level: team.level,
    teamXp: team.teamXp,
    xpInLevel: progress.xpInLevel,
    xpToNextLevel: progress.xpNeeded,
    vaultCoins: team.vaultCoins,
    members: members.map((m) => ({
      userId: m.userId,
      nickname: m.user.nickname,
      level: m.user.level,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    maxMembers: TEAM_MAX_MEMBERS,
    groupBonusesToday,
    groupBonusesMax: DEFAULT_GAME_CONFIG.groupBonusesPerTeamPerDay,
  };
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

export function toQuestDto(quest: QuestWithParticipants): QuestDto {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    deadlineAt: quest.deadlineAt.toISOString(),
    difficulty: quest.difficulty,
    status: quest.status,
    creatorId: quest.creatorId,
    creatorNickname: quest.creator?.nickname ?? null,
    createdAt: quest.createdAt.toISOString(),
    completedAt: iso(quest.completedAt),
    bonusGrantedAt: iso(quest.bonusGrantedAt),
    participants: [...quest.participants]
      .sort((a, b) => a.user.nickname.localeCompare(b.user.nickname))
      .map((p) => ({
        userId: p.userId,
        nickname: p.user.nickname,
        status: p.status,
        doneAt: iso(p.doneAt),
        doneLate: p.doneLate,
        validatorId: p.validatorId,
        validatorNickname: p.validator?.nickname ?? null,
        validatedAt: iso(p.validatedAt),
        rejectReason: p.rejectReason,
        autoValidated: p.autoValidated,
        autoValidateAt:
          p.status === 'AWAITING_REVIEW' && p.doneAt
            ? new Date(p.doneAt.getTime() + DEFAULT_GAME_CONFIG.reviewTimeoutHours * HOUR).toISOString()
            : null,
      })),
  };
}
