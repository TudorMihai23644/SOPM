/** Evenimente de joc pentru scena 3D: interfața le emite, scena le joacă. */
export type SceneEvent =
  | { type: 'attack'; late: boolean; taskId: string }
  | { type: 'hit' }
  | { type: 'ko' }
  | { type: 'cheer' };

const target = new EventTarget();

export function emitScene(event: SceneEvent): void {
  target.dispatchEvent(new CustomEvent('scene', { detail: event }));
}

export function onScene(handler: (event: SceneEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<SceneEvent>).detail);
  target.addEventListener('scene', listener);
  return () => target.removeEventListener('scene', listener);
}

/** Scena 3D se folosește doar dacă browserul are WebGL. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
