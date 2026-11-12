import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { onScene } from './events';
import { useAnimator } from './useAnimator';

const KNIGHT = '/models/knight.glb';
const MINION = '/models/skeleton-minion.glb';
const WARRIOR = '/models/skeleton-warrior.glb';

function useModel(url: string) {
  const { scene, animations } = useGLTF(url);
  // Fiecare personaj are propria copie, ca animațiile să nu se amestece.
  const model = useMemo(() => {
    const copy = clone(scene);
    copy.traverse((object) => {
      if ((object as Mesh).isMesh) object.castShadow = true;
    });
    return copy;
  }, [scene]);
  return { model, animations };
}

/** Cavalerul: stă în gardă, atacă la o misiune îndeplinită, se clatină la lovituri, cade la 0 viață. */
export function Knight({ position }: { position: [number, number, number] }) {
  const group = useRef<Group>(null);
  const { model, animations } = useModel(KNIGHT);
  const { actions, mixer } = useAnimations(animations, group);
  const { loop, once } = useAnimator(actions, mixer, 'Idle');

  useEffect(() => {
    loop();
    return onScene((event) => {
      if (event.type === 'attack') once('1H_Melee_Attack_Chop');
      if (event.type === 'hit') once('Hit_A');
      if (event.type === 'cheer') setTimeout(() => once('Cheer'), 600);
      if (event.type === 'ko') {
        once('Death_A', {
          hold: true,
          then: () => setTimeout(() => once('Lie_StandUp'), 1800),
        });
      }
    });
  }, [loop, once]);

  return (
    <group ref={group} position={position} rotation={[0, Math.PI / 2.4, 0]}>
      <primitive object={model} />
    </group>
  );
}

interface EnemyProps {
  boss: boolean;
  position: [number, number, number];
  dying: boolean;
  /** Crește când acest schelet trebuie să lovească. */
  strike: number;
}

/** Un schelet pentru o misiune ratată: răsare din pământ, atacă, se prăbușește când misiunea e rezolvată. */
export function Enemy({ boss, position, dying, strike }: EnemyProps) {
  const group = useRef<Group>(null);
  const { model, animations } = useModel(boss ? WARRIOR : MINION);
  const { actions, mixer } = useAnimations(animations, group);
  const { once } = useAnimator(actions, mixer, 'Idle_Combat');

  useEffect(() => {
    once('Spawn_Ground_Skeletons');
  }, [once]);

  useEffect(() => {
    if (strike > 0 && !dying) once('1H_Melee_Attack_Chop');
  }, [strike, dying, once]);

  useEffect(() => {
    if (dying) once('Hit_A', { then: () => once('Death_C_Skeletons', { hold: true }) });
  }, [dying, once]);


  return (
    <group ref={group} position={position} rotation={[0, -Math.PI / 2.4, 0]} scale={boss ? 1.25 : 1}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(KNIGHT);
useGLTF.preload(MINION);
useGLTF.preload(WARRIOR);
