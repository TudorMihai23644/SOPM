import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { TeamEvent, TeamEventPayload } from '@deadlinehero/shared';
import type { Server, Socket } from 'socket.io';
import { TokensService } from '../auth/tokens.service';
import { PrismaService } from '../prisma/prisma.service';

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim());

/**
 * Actualizări în timp real, doar pentru echipe: fiecare client intră în camera user:{id}
 * și, dacă are echipă, în camera team:{id}. Evenimentele spun doar „ce s-a schimbat”;
 * clientul își reîncarcă datele din API (și la reconectare).
 */
@WebSocketGateway({ cors: { origin: corsOrigins, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger('realtime');
  @WebSocketServer() server?: Server;

  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = (client.handshake.auth as { token?: unknown } | undefined)?.token;
      if (typeof token !== 'string') throw new Error('fără token');
      const { sub } = await this.tokens.verifyAccessToken(token);
      const userId = await this.tokens.assertUserExists(sub);
      const membership = await this.prisma.teamMember.findUnique({ where: { userId } });
      await client.join(`user:${userId}`);
      if (membership) await client.join(`team:${membership.teamId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emit(teamId: string, event: TeamEvent, payload: Omit<TeamEventPayload, 'teamId'> = {}): void {
    this.server?.to(`team:${teamId}`).emit(event, { teamId, ...payload } satisfies TeamEventPayload);
  }

  /** Mută conexiunile deschise ale unui utilizator în camera noii echipe (sau le scoate). */
  moveUser(userId: string, fromTeamId: string | null, toTeamId: string | null): void {
    if (!this.server) return;
    if (fromTeamId) this.server.in(`user:${userId}`).socketsLeave(`team:${fromTeamId}`);
    if (toTeamId) this.server.in(`user:${userId}`).socketsJoin(`team:${toTeamId}`);
    this.logger.debug(`utilizatorul ${userId}: ${fromTeamId ?? '-'} -> ${toTeamId ?? '-'}`);
  }

  /** Anunță un utilizator pe toate dispozitivele lui (de exemplu, când e scos din echipă). */
  notifyUser(userId: string, event: TeamEvent, payload: TeamEventPayload): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
