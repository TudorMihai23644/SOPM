import { useCallback, useEffect, useRef } from 'react';
import { LoopOnce, LoopRepeat, type AnimationAction, type AnimationMixer } from 'three';

type Actions = Record<string, AnimationAction | null>;

/**
 * Controlează animațiile unui personaj: una în buclă (repaus) și altele o singură dată,
 * după care personajul revine la repaus sau rămâne în ultima poză (de exemplu căzut).
 */
export function useAnimator(actions: Actions, mixer: AnimationMixer, idle: string) {
  const current = useRef<AnimationAction | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const fadeTo = useCallback((action: AnimationAction, fade = 0.2) => {
    if (current.current && current.current !== action) current.current.fadeOut(fade);
    action.reset().fadeIn(fade).play();
    current.current = action;
  }, []);

  const loop = useCallback(
    (name: string = idle) => {
      const action = actions[name];
      if (!action) return;
      action.setLoop(LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      pending.current = null;
      fadeTo(action, 0.3);
    },
    [actions, idle, fadeTo],
  );

  /** Joacă o animație o dată; apoi `then` (implicit: revine la repaus). `hold` păstrează ultima poză. */
  const once = useCallback(
    (name: string, options: { then?: () => void; hold?: boolean } = {}) => {
      const action = actions[name];
      if (!action) return;
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      pending.current = options.hold ? (options.then ?? null) : (options.then ?? (() => loop()));
      fadeTo(action, 0.15);
    },
    [actions, fadeTo, loop],
  );

  useEffect(() => {
    const onFinished = (event: { action: AnimationAction }) => {
      if (event.action !== current.current) return;
      const next = pending.current;
      pending.current = null;
      next?.();
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer]);

  return { loop, once };
}
