/** Marcaj pentru actualizările de profil care nu trebuie să declanșeze efecte (de exemplu Undo). */
let silent = false;

export function markSilentUpdate(): void {
  silent = true;
}

export function consumeSilentUpdate(): boolean {
  const value = silent;
  silent = false;
  return value;
}
