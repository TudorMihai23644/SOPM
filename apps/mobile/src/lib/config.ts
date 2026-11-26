import Constants from 'expo-constants';

/**
 * Adresa API-ului. În producție vine din EXPO_PUBLIC_API_URL. În dezvoltare, telefonul
 * (Expo Go) ajunge la calculator pe IP-ul din rețeaua locală, pe care îl știm din adresa
 * serverului Expo (hostUri, de forma „192.168.1.20:8081”); API-ul ascultă pe portul 3000.
 */
function resolveServerOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000`;
}

export const SERVER_ORIGIN = resolveServerOrigin();
export const API_URL = `${SERVER_ORIGIN}/api/v1`;
