import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, Color, InstancedMesh, Object3D, PointLight, Vector3, type Mesh } from 'three';
import { onScene } from './events';

/** Torță: stâlp, flacără și o lumină care pâlpâie. */
export function Torch({ position }: { position: [number, number, number] }) {
  const light = useRef<PointLight>(null);
  const flame = useRef<Mesh>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    const flicker = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05 + Math.random() * 0.04;
    if (light.current) light.current.intensity = 9 * flicker;
    if (flame.current) flame.current.scale.setScalar(0.9 + (flicker - 0.85) * 2);
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.8, 8]} />
        <meshStandardMaterial color="#3a2a1d" roughness={1} />
      </mesh>
      <mesh ref={flame} position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 2, 0.2]} color="#ff9a3c" distance={7} decay={1.6} />
    </group>
  );
}

const COINS = 24;
const GRAVITY = -9;

/** Monede de aur care țâșnesc la o misiune îndeplinită la timp. */
export function CoinBurst({ origin }: { origin: [number, number, number] }) {
  const mesh = useRef<InstancedMesh>(null);
  const particles = useRef<{ p: Vector3; v: Vector3; spin: number }[]>([]);
  const age = useRef(Infinity);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(
    () =>
      onScene((event) => {
        if (event.type !== 'attack' || event.late) return;
        age.current = 0;
        particles.current = Array.from({ length: COINS }, () => ({
          p: new Vector3(...origin),
          v: new Vector3((Math.random() - 0.3) * 2.6, 3 + Math.random() * 2.5, (Math.random() - 0.5) * 2),
          spin: (Math.random() - 0.5) * 20,
        }));
      }),
    [origin],
  );

  useFrame((_, delta) => {
    if (!mesh.current) return;
    age.current += delta;
    const visible = age.current < 1.6;
    mesh.current.visible = visible;
    if (!visible) return;
    particles.current.forEach((particle, i) => {
      particle.v.y += GRAVITY * delta;
      particle.p.addScaledVector(particle.v, delta);
      if (particle.p.y < 0.03) {
        particle.p.y = 0.03;
        particle.v.set(particle.v.x * 0.5, -particle.v.y * 0.35, particle.v.z * 0.5);
      }
      dummy.position.copy(particle.p);
      dummy.rotation.set(Math.PI / 2, age.current * particle.spin, 0);
      dummy.scale.setScalar(Math.max(0, 1 - Math.max(0, age.current - 1.1) * 2));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COINS]} visible={false} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
      <meshStandardMaterial color="#e3b75a" metalness={0.9} roughness={0.25} emissive="#5a3a08" />
    </instancedMesh>
  );
}

/** Coloană de lumină aurie la nivel nou. */
export function LevelUpPillar({ position }: { position: [number, number, number] }) {
  const mesh = useRef<Mesh>(null);
  const [age, setAge] = useState(Infinity);
  const ageRef = useRef(Infinity);

  useEffect(
    () =>
      onScene((event) => {
        if (event.type === 'cheer') {
          ageRef.current = 0;
          setAge(0);
        }
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!mesh.current || ageRef.current > 2.4) return;
    ageRef.current += delta;
    const t = ageRef.current;
    mesh.current.scale.set(1 + t * 0.4, Math.min(1, t * 3), 1 + t * 0.4);
    (mesh.current.material as { opacity: number }).opacity = Math.max(0, 0.55 * (1 - t / 2.4));
    if (t > 2.4) setAge(Infinity);
  });

  if (age === Infinity) return null;
  return (
    <mesh ref={mesh} position={[position[0], 2.5, position[2]]}>
      <cylinderGeometry args={[0.55, 0.75, 5, 24, 1, true]} />
      <meshBasicMaterial color={new Color('#f0c76c')} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Camera tremură scurt când eroul e lovit. */
export function CameraShake() {
  const { camera } = useThree();
  const strength = useRef(0);
  const base = useRef<Vector3 | null>(null);

  useEffect(
    () =>
      onScene((event) => {
        if (event.type === 'hit' || event.type === 'ko') strength.current = event.type === 'ko' ? 0.25 : 0.12;
      }),
    [],
  );

  useFrame((_, delta) => {
    base.current ??= camera.position.clone();
    if (strength.current <= 0) return;
    strength.current = Math.max(0, strength.current - delta * 0.5);
    camera.position.set(
      base.current.x + (Math.random() - 0.5) * strength.current,
      base.current.y + (Math.random() - 0.5) * strength.current,
      base.current.z,
    );
    if (strength.current === 0) camera.position.copy(base.current);
  });
  return null;
}
