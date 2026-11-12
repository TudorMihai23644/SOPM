import { ContactShadows, Sparkles } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { Enemy, Knight } from './Characters';
import { CameraShake, CoinBurst, LevelUpPillar, Torch } from './Effects';
import { onScene } from './events';

export interface SceneEnemy {
  id: string;
  boss: boolean;
}

interface ShownEnemy extends SceneEnemy {
  dying: boolean;
  strike: number;
}

const KNIGHT_AT: [number, number, number] = [-2.1, 0, 0.3];
const SLOTS: [number, number, number][] = [
  [0.9, 0, 0.3],
  [2.2, 0, -0.6],
  [2.9, 0, 0.9],
];
const MAX_ENEMIES = SLOTS.length;

/** Ține scheleții pe scenă puțin după ce misiunea lor e rezolvată, cât să se prăbușească. */
function useShownEnemies(enemies: SceneEnemy[]): ShownEnemy[] {
  const [shown, setShown] = useState<ShownEnemy[]>([]);
  const key = enemies.map((e) => `${e.id}:${e.boss}`).join(',');

  useEffect(() => {
    const incoming = new Map(enemies.slice(0, MAX_ENEMIES).map((e) => [e.id, e]));
    setShown((current) => {
      const kept = current.map((e) => (incoming.has(e.id) ? e : { ...e, dying: true }));
      const added = [...incoming.values()]
        .filter((e) => !current.some((c) => c.id === e.id))
        .map((e) => ({ ...e, dying: false, strike: 0 }));
      return [...kept, ...added].slice(0, MAX_ENEMIES + 2);
    });
    const timer = setTimeout(() => setShown((current) => current.filter((e) => !e.dying)), 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Când eroul pierde viață, primul schelet viu lovește.
  useEffect(
    () =>
      onScene((event) => {
        if (event.type !== 'hit' && event.type !== 'ko') return;
        setShown((current) => {
          const index = current.findIndex((e) => !e.dying);
          return index < 0 ? current : current.map((e, i) => (i === index ? { ...e, strike: e.strike + 1 } : e));
        });
      }),
    [],
  );

  return shown;
}

/** Pe ecrane înguste camera se dă înapoi, ca toți să încapă în cadru. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    // Distanța camerei crește pe măsură ce cadrul se îngustează.
    const distance = aspect < 1.4 ? 12.5 : aspect < 2 ? 10 : aspect < 2.8 ? 8.6 : 7.6;
    camera.position.set(0.3, 1.9, distance);
    camera.lookAt(0.3, 0.75, 0);
  }, [camera, size]);
  return null;
}

function Dungeon() {
  return (
    <>
      <color attach="background" args={['#0b0907']} />
      <fog attach="fog" args={['#0b0907', 7, 15]} />
      <ambientLight intensity={0.5} color="#8a7a66" />
      <directionalLight
        position={[-3, 6, 4]}
        intensity={1.5}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <hemisphereLight args={['#4a3a28', '#0b0907', 0.4]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#2a221b" roughness={1} />
      </mesh>
      <mesh position={[0, 3, -3.5]}>
        <planeGeometry args={[22, 7]} />
        <meshStandardMaterial color="#17120e" roughness={1} />
      </mesh>

      <Torch position={[-3.4, 0, -2.2]} />
      <Torch position={[3.8, 0, -2.2]} />
      <Sparkles count={40} scale={[10, 3.5, 4]} position={[0, 1.8, -1]} size={2.2} speed={0.35} color="#e07b2a" opacity={0.7} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={12} blur={2.4} far={3} />
    </>
  );
}

export default function HeroScene({ enemies }: { enemies: SceneEnemy[] }) {
  const shown = useShownEnemies(enemies);
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 38, near: 0.1, far: 40 }} aria-hidden="true">
      <ResponsiveCamera />
      <CameraShake />
      <Dungeon />
      <Suspense fallback={null}>
        <Knight position={KNIGHT_AT} />
        {shown.map((enemy, i) => (
          <Enemy key={enemy.id} boss={enemy.boss} dying={enemy.dying} strike={enemy.strike} position={SLOTS[i % SLOTS.length]} />
        ))}
      </Suspense>
      <CoinBurst origin={[KNIGHT_AT[0] + 0.6, 1.1, KNIGHT_AT[2]]} />
      <LevelUpPillar position={KNIGHT_AT} />
    </Canvas>
  );
}
