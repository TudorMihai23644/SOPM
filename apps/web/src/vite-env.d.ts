/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresa API-ului în producție; în dezvoltare, Vite trimite /api către localhost:3000. */
  readonly VITE_API_URL?: string;
}
