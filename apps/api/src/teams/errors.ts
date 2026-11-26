import { HttpStatus } from '@nestjs/common';
import { TEAM_MAX_MEMBERS } from '@deadlinehero/shared';
import { AppError } from '../common/app-error';

export const TeamErrors = {
  noTeam: () => new AppError(HttpStatus.NOT_FOUND, 'NO_TEAM', 'Nu faci parte din nicio echipă'),
  alreadyInTeam: () => new AppError(HttpStatus.CONFLICT, 'ALREADY_IN_TEAM', 'Faci deja parte dintr-o echipă'),
  invalidCode: () =>
    new AppError(HttpStatus.NOT_FOUND, 'INVALID_INVITE_CODE', 'Nu există nicio echipă cu acest cod', [
      { path: 'code', message: 'Nu există nicio echipă cu acest cod' },
    ]),
  teamFull: () =>
    new AppError(HttpStatus.CONFLICT, 'TEAM_FULL', `Echipa are deja ${TEAM_MAX_MEMBERS} membri`, [
      { path: 'code', message: `Echipa are deja ${TEAM_MAX_MEMBERS} membri` },
    ]),
  leaderOnly: () => new AppError(HttpStatus.FORBIDDEN, 'LEADER_ONLY', 'Doar liderul echipei poate face asta'),
  memberNotFound: () => new AppError(HttpStatus.NOT_FOUND, 'MEMBER_NOT_FOUND', 'Membrul nu face parte din echipă'),
  cannotKickSelf: () =>
    new AppError(HttpStatus.CONFLICT, 'CANNOT_KICK_SELF', 'Nu te poți scoate singur; folosește „Părăsește echipa”'),
};

export const QuestErrors = {
  notFound: () => new AppError(HttpStatus.NOT_FOUND, 'QUEST_NOT_FOUND', 'Quest-ul nu există'),
  needsTwoMembers: () =>
    new AppError(HttpStatus.CONFLICT, 'TEAM_TOO_SMALL', 'Shared Quests cer o echipă de cel puțin 2 membri'),
  invalidParticipants: () =>
    new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Participanții trebuie să fie membri ai echipei', [
      { path: 'participantIds', message: 'Participanții trebuie să fie membri ai echipei' },
    ]),
  notOpen: () => new AppError(HttpStatus.CONFLICT, 'QUEST_NOT_OPEN', 'Quest-ul este deja încheiat sau anulat'),
  notParticipant: () => new AppError(HttpStatus.FORBIDDEN, 'NOT_PARTICIPANT', 'Nu participi la acest quest'),
  wrongState: (message: string) => new AppError(HttpStatus.CONFLICT, 'PARTICIPANT_WRONG_STATE', message),
  selfValidation: () => new AppError(HttpStatus.FORBIDDEN, 'SELF_VALIDATION', 'Nu îți poți valida propria completare'),
  cancelNotAllowed: () =>
    new AppError(HttpStatus.FORBIDDEN, 'CANCEL_NOT_ALLOWED', 'Doar creatorul sau liderul poate anula quest-ul'),
};
