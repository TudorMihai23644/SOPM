import { TEAM_EVENTS, type TeamEvent, type TeamEventPayload } from '@deadlinehero/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from './api';
import { SERVER_ORIGIN } from './config';

/**
 * Actualizări în timp real pentru echipă (Socket.IO, camera team:{id}). Evenimentele doar
 * semnalează o schimbare; datele se reîncarcă din API, deci și după reconectare sunt corecte.
 */
export function useTeamRealtime(enabled: boolean, onEvent?: (event: TeamEvent, payload: TeamEventPayload) => void): void {
  const queryClient = useQueryClient();
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['quests'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    const socket = io(SERVER_ORIGIN, {
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket'],
    });
    socket.on('connect', refresh);
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && !cancelled) {
        refreshSession()
          .then(() => !cancelled && socket.connect())
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
      socket.disconnect();
    };
  }, [enabled, queryClient]);
}
