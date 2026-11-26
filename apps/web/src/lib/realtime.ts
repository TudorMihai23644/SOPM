import { TEAM_EVENTS, type TeamEvent, type TeamEventPayload } from '@deadlinehero/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, refreshSession } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? undefined;

/**
 * Actualizări în timp real pentru echipă. Evenimentele spun doar ce s-a schimbat;
 * datele se reîncarcă din API, deci la reconectare starea e mereu cea corectă.
 */
export function useTeamRealtime(onEvent?: (event: TeamEvent, payload: TeamEventPayload) => void): void {
  const queryClient = useQueryClient();
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['quests'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    socket = io(SOCKET_URL, {
      // Tokenul se citește la fiecare (re)conectare, ca să fie mereu cel proaspăt.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', refresh);
    socket.on('disconnect', (reason) => {
      // Serverul închide conexiunea când tokenul a expirat: se reînnoiește și se reconectează.
      if (reason === 'io server disconnect' && !cancelled) {
        refreshSession()
          .then(() => socket?.connect())
          .catch(() => undefined);
      }
    });
    for (const event of TEAM_EVENTS) {
      socket.on(event, (payload: TeamEventPayload) => {
        refresh();
        handler.current?.(event, payload);
      });
    }

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [queryClient]);
}
