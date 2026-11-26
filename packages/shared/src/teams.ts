import { z } from 'zod';
import type { Difficulty } from './config';
import { difficultySchema, taskDeadlineSchema, taskDescriptionSchema, taskTitleSchema } from './tasks';

/** Limitele unei echipe (Guild), din specificații. */
export const TEAM_MIN_MEMBERS_FOR_QUESTS = 2;
export const TEAM_MAX_MEMBERS = 4;
export const INVITE_CODE_LENGTH = 6;
/** Fără caractere ușor de confundat (0/O, 1/I/L). */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const teamNameSchema = z
  .string({ error: 'Numele echipei este obligatoriu' })
  .trim()
  .min(3, { error: 'Numele echipei trebuie să aibă cel puțin 3 caractere' })
  .max(30, { error: 'Numele echipei poate avea cel mult 30 de caractere' });

export const createTeamSchema = z.object({ name: teamNameSchema });
export type CreateTeamInput = z.input<typeof createTeamSchema>;

export const joinTeamSchema = z.object({
  code: z
    .string({ error: 'Introduceți codul de invitație' })
    .trim()
    .toUpperCase()
    .length(INVITE_CODE_LENGTH, { error: `Codul are ${INVITE_CODE_LENGTH} caractere` }),
});
export type JoinTeamInput = z.input<typeof joinTeamSchema>;

export const createQuestSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
  deadlineAt: taskDeadlineSchema,
  difficulty: difficultySchema,
  /** Lipsă = toți membrii echipei. Altfel, cel puțin 2 membri. */
  participantIds: z
    .array(z.uuid({ error: 'Participant invalid' }))
    .min(TEAM_MIN_MEMBERS_FOR_QUESTS, { error: 'Alegeți cel puțin 2 participanți' })
    .max(TEAM_MAX_MEMBERS)
    .optional(),
});
export type CreateQuestInput = z.input<typeof createQuestSchema>;
export type CreateQuestData = z.output<typeof createQuestSchema>;

export const rejectCompletionSchema = z.object({
  reason: z
    .string({ error: 'Scrieți motivul respingerii' })
    .trim()
    .min(3, { error: 'Motivul trebuie să aibă cel puțin 3 caractere' })
    .max(200, { error: 'Motivul poate avea cel mult 200 de caractere' }),
});
export type RejectCompletionInput = z.input<typeof rejectCompletionSchema>;

export const TEAM_ROLES = ['LEADER', 'MEMBER'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const QUEST_STATUSES = ['OPEN', 'COMPLETED', 'CANCELLED'] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const PARTICIPANT_STATUSES = ['PENDING', 'OVERDUE', 'AWAITING_REVIEW', 'VALIDATED', 'EXCUSED'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  OPEN: 'Deschis',
  COMPLETED: 'Încheiat',
  CANCELLED: 'Anulat',
};

export const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  PENDING: 'În lucru',
  OVERDUE: 'Restant',
  AWAITING_REVIEW: 'Așteaptă validare',
  VALIDATED: 'Validat',
  EXCUSED: 'Scutit',
};

/** XP-ul de nivel al echipei: de la L la L+1 sunt necesari 200 + 100 × (L − 1). */
export function teamXpToNextLevel(level: number): number {
  return 200 + 100 * (level - 1);
}

/** Nivelul echipei pentru un total de XP de echipă. */
export function teamLevelForXp(teamXp: number): { level: number; xpInLevel: number; xpNeeded: number } {
  let level = 1;
  let remaining = Math.max(0, Math.floor(teamXp));
  while (remaining >= teamXpToNextLevel(level)) {
    remaining -= teamXpToNextLevel(level);
    level += 1;
  }
  return { level, xpInLevel: remaining, xpNeeded: teamXpToNextLevel(level) };
}

export interface TeamMemberDto {
  userId: string;
  nickname: string;
  level: number;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamDto {
  id: string;
  name: string;
  /** Codul de invitație e vizibil doar membrilor. */
  inviteCode: string;
  leaderId: string;
  level: number;
  teamXp: number;
  xpInLevel: number;
  xpToNextLevel: number;
  vaultCoins: number;
  members: TeamMemberDto[];
  maxMembers: number;
  /** Bonusuri de grup acordate azi / maximum pe zi. */
  groupBonusesToday: number;
  groupBonusesMax: number;
}

export interface MyTeamResponse {
  team: TeamDto | null;
}

export interface QuestParticipantDto {
  userId: string;
  nickname: string;
  status: ParticipantStatus;
  doneAt: string | null;
  doneLate: boolean;
  validatorId: string | null;
  validatorNickname: string | null;
  validatedAt: string | null;
  rejectReason: string | null;
  autoValidated: boolean;
  /** Când se validează automat, dacă așteaptă validare. */
  autoValidateAt: string | null;
}

export interface QuestDto {
  id: string;
  title: string;
  description: string | null;
  deadlineAt: string;
  difficulty: Difficulty;
  status: QuestStatus;
  creatorId: string | null;
  creatorNickname: string | null;
  createdAt: string;
  completedAt: string | null;
  bonusGrantedAt: string | null;
  participants: QuestParticipantDto[];
}

/** Evenimentele în timp real din camera team:{id}. */
export const TEAM_EVENTS = [
  'quest.updated',
  'quest.review_requested',
  'team.updated',
  'team.member_joined',
  'team.member_left',
  'team.level_up',
] as const;
export type TeamEvent = (typeof TEAM_EVENTS)[number];

export interface TeamEventPayload {
  teamId: string;
  questId?: string;
  userId?: string;
  nickname?: string;
  level?: number;
}
