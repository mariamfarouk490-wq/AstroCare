// X-ray hologram anatomy in BODY_FRAME (metres, feet at y = 0, facing +z, crew member's left = +x):
// glass shell material, procedural skeleton, heart, vessels, lungs, kidneys, dust particles, floor rings.
// Organs are tinted by the status of their body part (Normal green, Watch / Critical red).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STATUS_COLOR, fresnelMaterial, organMaterial } from './materials.js';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const v = (a) => new THREE.Vector3(...a);

function useMaterials() {
  return useMemo(
    () => ({
      bone: new THREE.MeshStandardMaterial({ color: '#e9eef2', emissive: '#9aa5b0', emissiveIntensity: 0.22, roughness: 0.6, metalness: 0.05, transparent: true, opacity: 0.78 }),
      rib: new THREE.MeshStandardMaterial({ color: '#e9eef2', emissive: '#9aa5b0', emissiveIntensity: 0.22, roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false }),
      skull: new THREE.MeshStandardMaterial({ color: '#e9eef2', emissive: '#aeb8c2', emissiveIntensity: 0.3, roughness: 0.5, transparent: true, opacity: 0.5, depthWrite: false }),
      socket: new THREE.MeshBasicMaterial({ color: '#000000' }),
      lung: fresnelMaterial({ color: '#cfd8e2', power: 1.8, rim: 0.28, base: 0.02 }),
    }),
    [],
  );
}

/* ---------- Bones ---------- */

/** A long bone between two points: shaft capsule + rounded ends. */
function Bone({ from, to, r, material, knob = 1.5 }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = v(from);
    const b = v(to);
    const dir = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <group>
      <mesh position={position} quaternion={quaternion} material={material}>
        <capsuleGeometry args={[r, Math.max(0.001, length - r * 2), 4, 10]} />
      </mesh>
      {knob > 0 && (
        <>
          <mesh position={from} material={material}>
            <sphereGeometry args={[r * knob, 12, 10]} />
          </mesh>
          <mesh position={to} material={material}>
            <sphereGeometry args={[r * knob, 12, 10]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** A curved bone or vessel along a Catmull-Rom curve. */
function Tube({ points, r, material, segments = 32 }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)), segments, r, 8, false), [points, r, segments]);
  return <mesh geometry={geometry} material={material} />;
}

function Ellipsoid({ at, scale, rotation, material, segments = 24 }) {
  return (
    <mesh position={at} scale={scale} rotation={rotation} material={material}>
      <sphereGeometry args={[1, segments, segments]} />
    </mesh>
  );
}

const SIDES = [-1, 1];

/** Rib i of side s: from the spine round the chest towards the sternum. */
function ribPoints(i, s) {
  const y = 1.45 - i * 0.042;
  const w = (0.16 - (1.36 - Math.min(y, 1.36)) * 0.12) * (i === 0 ? 0.62 : i === 1 ? 0.82 : 1);
  const drop = 0.05 + i * 0.006;
  const floating = i >= 8;
  const pts = [
    [s * 0.018, y, -0.052],
    [s * w * 0.8, y - 0.008, -0.045],
    [s * w, y - drop * 0.4, 0.0],
    [s * w * 0.82, y - drop * 0.8, floating ? 0.05 : 0.07],
  ];
  if (!floating) pts.push([s * 0.03, y - drop * (1.1 + i * 0.12), 0.093]);
  return pts;
}

function Skeleton({ m }) {
  const vertebrae = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const y = 0.97 + i * 0.024;
        const z = -0.055 + 0.018 * Math.sin(((y - 0.97) / 0.62) * Math.PI * 1.6);
        return { y, z, r: i > 20 ? 0.012 : 0.016 + (20 - i) * 0.0003 };
      }),
    [],
  );
  return (
    <group>
      {/* Skull */}
      <Ellipsoid at={[0, 1.705, -0.008]} scale={[0.078, 0.09, 0.085]} material={m.skull} segments={32} />
      <Ellipsoid at={[0, 1.628, 0.03]} scale={[0.052, 0.04, 0.05]} material={m.skull} />
      {SIDES.map((s) => (
        <Ellipsoid key={s} at={[s * 0.029, 1.672, 0.07]} scale={[0.017, 0.014, 0.012]} material={m.socket} segments={12} />
      ))}
      <Ellipsoid at={[0, 1.645, 0.078]} scale={[0.009, 0.012, 0.008]} material={m.socket} segments={10} />
      <Tube points={[[-0.045, 1.6, 0.02], [-0.03, 1.582, 0.055], [0, 1.578, 0.066], [0.03, 1.582, 0.055], [0.045, 1.6, 0.02]]} r={0.008} material={m.bone} />

      {/* Spine */}
      {vertebrae.map((b) => (
        <mesh key={b.y} position={[0, b.y, b.z]} material={m.bone}>
          <cylinderGeometry args={[b.r, b.r, 0.016, 10]} />
        </mesh>
      ))}

      {/* Ribcage */}
      {Array.from({ length: 10 }, (_, i) =>
        SIDES.map((s) => <Tube key={`${i}${s}`} points={ribPoints(i, s)} r={0.0055} material={m.rib} segments={28} />),
      )}
      <Bone from={[0, 1.42, 0.088]} to={[0, 1.23, 0.098]} r={0.012} material={m.bone} knob={1.1} />

      {SIDES.map((s) => (
        <group key={s}>
          {/* Shoulder girdle */}
          <Tube points={[[s * 0.02, 1.455, 0.075], [s * 0.09, 1.47, 0.05], [s * 0.18, 1.465, 0.0]]} r={0.0065} material={m.bone} />
          <Ellipsoid at={[s * 0.1, 1.37, -0.075]} scale={[0.055, 0.07, 0.01]} rotation={[0, 0, s * 0.2]} material={m.bone} />

          {/* Arm */}
          <Bone from={[s * 0.195, 1.395, 0]} to={[s * 0.255, 1.18, 0.002]} r={0.0105} material={m.bone} knob={1.7} />
          <Bone from={[s * 0.262, 1.17, 0.008]} to={[s * 0.318, 0.958, 0.016]} r={0.0065} material={m.bone} />
          <Bone from={[s * 0.25, 1.165, -0.006]} to={[s * 0.3, 0.955, -0.002]} r={0.0062} material={m.bone} />
          {[0, 1, 2, 3].map((k) => (
            <group key={k}>
              <Bone from={[s * (0.3 + k * 0.007), 0.935, 0.012]} to={[s * (0.302 + k * 0.016), 0.875, 0.014]} r={0.0035} material={m.bone} knob={1.3} />
              <Bone from={[s * (0.302 + k * 0.016), 0.868, 0.014]} to={[s * (0.304 + k * 0.017), 0.82 + (k === 3 ? 0.012 : 0), 0.014]} r={0.003} material={m.bone} knob={1.2} />
            </group>
          ))}
          <Bone from={[s * 0.29, 0.93, 0.02]} to={[s * 0.27, 0.875, 0.04]} r={0.0035} material={m.bone} knob={1.2} />

          {/* Pelvis */}
          <Ellipsoid at={[s * 0.088, 1.0, -0.01]} scale={[0.064, 0.05, 0.018]} rotation={[0.25, s * 0.35, s * 0.45]} material={m.rib} />
          <Tube points={[[s * 0.1, 0.95, 0.0], [s * 0.07, 0.915, 0.05], [s * 0.015, 0.905, 0.068]]} r={0.009} material={m.bone} />

          {/* Leg */}
          <mesh position={[s * 0.077, 0.935, 0.005]} material={m.bone}>
            <sphereGeometry args={[0.022, 16, 12]} />
          </mesh>
          <Bone from={[s * 0.088, 0.93, 0.004]} to={[s * 0.1, 0.52, 0.012]} r={0.0125} material={m.bone} knob={1.6} />
          <Ellipsoid at={[s * 0.1, 0.5, 0.048]} scale={[0.017, 0.02, 0.009]} material={m.bone} segments={14} />
          <Bone from={[s * 0.1, 0.48, 0.01]} to={[s * 0.102, 0.095, 0.004]} r={0.011} material={m.bone} knob={1.6} />
          <Bone from={[s * 0.124, 0.465, -0.01]} to={[s * 0.12, 0.09, -0.008]} r={0.0055} material={m.bone} knob={1.4} />
          {[-1, 0, 1, 2].map((k) => (
            <Bone key={k} from={[s * (0.1 + k * 0.006), 0.07, 0.02]} to={[s * (0.1 + k * 0.016), 0.025, 0.13 - Math.abs(k) * 0.008]} r={0.0045} material={m.bone} knob={1.2} />
          ))}
          <Bone from={[s * 0.1, 0.07, -0.02]} to={[s * 0.104, 0.03, -0.05]} r={0.012} material={m.bone} knob={1.1} />
        </group>
      ))}
      <Ellipsoid at={[0, 0.975, -0.052]} scale={[0.038, 0.06, 0.02]} material={m.bone} />
    </group>
  );
}

/* ---------- Organs and vessels ---------- */

const AORTA = [[0.02, 1.37, 0.04], [0.03, 1.43, 0.03], [0.0, 1.44, -0.01], [-0.012, 1.38, -0.035], [-0.01, 1.2, -0.035], [0.0, 1.03, -0.03], [0.0, 0.99, -0.02]];
const CAROTIDS = SIDES.map((s) => [[s * 0.012, 1.43, 0.02], [s * 0.022, 1.5, 0.025], [s * 0.026, 1.58, 0.02], [s * 0.03, 1.63, 0.0]]);
const ILIACS = SIDES.map((s) => [[0, 0.99, -0.02], [s * 0.04, 0.95, 0.0], [s * 0.075, 0.9, 0.025], [s * 0.095, 0.75, 0.03], [s * 0.1, 0.55, 0.02]]);
const RENAL = SIDES.map((s) => [[0, 1.08, -0.032], [s * 0.035, 1.082, -0.035], [s * 0.052, 1.08, -0.04]]);
const URETERS = SIDES.map((s) => [[s * 0.055, 1.06, -0.035], [s * 0.04, 1.0, -0.01], [s * 0.02, 0.96, 0.03], [s * 0.01, 0.95, 0.045]]);


function Heart({ status, heartRate, onSelect }) {
  const group = useRef();
  const material = useMemo(() => organMaterial(STATUS_COLOR[status], status === 'Critical'), [status]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const bps = (heartRate || 60) / 60;
    const phase = (clock.elapsedTime * bps) % 1;
    const beat = reduced() ? 0 : Math.max(0, Math.sin(phase * Math.PI * 2)) ** 6 * 0.09;
    group.current.scale.setScalar(1.25 * (1 + beat));
  });
  return (
    <group
      ref={group}
      position={[0.035, 1.325, 0.06]}
      rotation={[0.2, 0.3, -0.45]}
      scale={1.25}
      onClick={(e) => {
        e.stopPropagation();
        onSelect('heart');
      }}
    >
      <Ellipsoid at={[0, 0, 0]} scale={[0.045, 0.06, 0.042]} material={material} segments={32} />
      <Ellipsoid at={[-0.018, 0.028, 0.006]} scale={[0.03, 0.032, 0.03]} material={material} />
      <Ellipsoid at={[0.02, 0.026, -0.004]} scale={[0.026, 0.03, 0.028]} material={material} />
      <Ellipsoid at={[0.004, -0.04, 0.004]} scale={[0.03, 0.035, 0.03]} material={material} />
    </group>
  );
}

function Organs({ statusOf, heartRate, onSelect, m }) {
  const heartStatus = statusOf('heart');
  const vessel = useMemo(() => new THREE.MeshBasicMaterial({ color: STATUS_COLOR[heartStatus], transparent: true, opacity: 0.75, toneMapped: false }), [heartStatus]);
  const abdomen = statusOf('abdomen');
  const kidney = useMemo(() => organMaterial(STATUS_COLOR[abdomen], abdomen === 'Critical'), [abdomen]);
  const brain = statusOf('brain');
  const brainMat = useMemo(() => fresnelMaterial({ color: STATUS_COLOR[brain], power: 1.4, rim: brain === 'Normal' ? 0.35 : 0.9, base: brain === 'Normal' ? 0.04 : 0.12 }), [brain]);
  const click = (id) => (e) => {
    e.stopPropagation();
    onSelect(id);
  };
  return (
    <group>
      {SIDES.map((s) => (
        <Ellipsoid key={s} at={[s * 0.072, 1.33, -0.005]} scale={[0.062, 0.115, 0.06]} material={m.lung} />
      ))}
      <Heart status={heartStatus} heartRate={heartRate} onSelect={onSelect} />
      <Tube points={AORTA} r={0.0075} material={vessel} />
      {CAROTIDS.map((p, i) => (
        <Tube key={`c${i}`} points={p} r={0.0045} material={vessel} />
      ))}
      {ILIACS.map((p, i) => (
        <Tube key={`i${i}`} points={p} r={0.005} material={vessel} />
      ))}
      <group onClick={click('brain')}>
        <Ellipsoid at={[0, 1.712, -0.006]} scale={[0.066, 0.058, 0.074]} material={brainMat} segments={32} />
      </group>
      <group onClick={click('abdomen')}>
        {SIDES.map((s) => (
          <Ellipsoid key={s} at={[s * 0.06, 1.075, -0.04]} scale={[0.02, 0.032, 0.016]} rotation={[0, 0, s * 0.25]} material={kidney} />
        ))}
        {RENAL.map((p, i) => (
          <Tube key={`r${i}`} points={p} r={0.003} material={vessel} segments={8} />
        ))}
        {URETERS.map((p, i) => (
          <Tube key={`u${i}`} points={p} r={0.0022} material={kidney} segments={16} />
        ))}
        <Ellipsoid at={[0, 0.95, 0.045]} scale={[0.025, 0.018, 0.02]} material={kidney} />
      </group>
    </group>
  );
}

/* ---------- Dust ---------- */

// Volumes the particles fill: [centre, half-size]
const VOLUMES = [
  [[0, 1.2, 0], [0.15, 0.3, 0.1]],
  [[0, 1.68, 0], [0.08, 0.1, 0.08]],
  [[0.26, 1.15, 0], [0.06, 0.25, 0.04]],
  [[-0.26, 1.15, 0], [0.06, 0.25, 0.04]],
  [[0.1, 0.5, 0], [0.06, 0.45, 0.06]],
  [[-0.1, 0.5, 0], [0.06, 0.45, 0.06]],
];

function buildDust() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const a = [];
  for (let i = 0; i < 900; i++) {
    const [c, h] = VOLUMES[i % VOLUMES.length];
    let x, y, z;
    do {
      x = rand();
      y = rand();
      z = rand();
    } while (x * x + y * y + z * z > 1);
    a.push(c[0] + x * h[0], c[1] + y * h[1], c[2] + z * h[2]);
  }
  const b = [];
  for (let i = 0; i < 450; i++) b.push(rand() * 0.8, 0.95 + rand() * 0.95, rand() * 0.6);
  const g1 = new THREE.BufferGeometry();
  g1.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(b, 3));
  return [g1, g2];
}

export function Dust() {
  const inner = useRef();
  const outer = useRef();
  const [innerGeo, outerGeo] = useMemo(() => buildDust(), []);
  useFrame(({ clock }) => {
    if (reduced()) return;
    const t = clock.elapsedTime;
    if (inner.current) inner.current.material.opacity = 0.55 + Math.sin(t * 1.3) * 0.15;
    if (outer.current) {
      outer.current.rotation.y = t * 0.03;
      outer.current.position.y = Math.sin(t * 0.4) * 0.02;
    }
  });
  return (
    <group>
      <points ref={inner} geometry={innerGeo}>
        <pointsMaterial color="#ffffff" size={0.0055} sizeAttenuation transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={outer} geometry={outerGeo}>
        <pointsMaterial color="#d8dee6" size={0.004} sizeAttenuation transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/* ---------- Floor platform ---------- */

export function Platform({ auraStatus, selected, onSelect }) {
  const dashed = useRef();
  const glow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,0.35)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  useFrame(({ clock }) => {
    if (dashed.current && !reduced()) dashed.current.rotation.z = clock.elapsedTime * 0.12;
  });
  const ring = (r, w, opacity, color = '#f5f5f7') => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
      <ringGeometry args={[r, r + w, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
  const aura = STATUS_COLOR[auraStatus];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[0.72, 96]} />
        <meshStandardMaterial color="#060608" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {ring(0.24, 0.004, 0.7)}
      {ring(0.36, 0.0025, 0.45)}
      <mesh ref={dashed} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.44, 0.447, 128, 1, 0, Math.PI * 1.35]} />
        <meshBasicMaterial color="#f5f5f7" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {ring(0.52, 0.003, 0.3)}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.004, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect('aura');
        }}
      >
        <ringGeometry args={[0.6, selected ? 0.63 : 0.612, 128]} />
        <meshBasicMaterial color={aura} transparent opacity={selected ? 0.95 : 0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Skeleton + organs + vessels + dust, with a slow idle float and breathing. */
export default function XRayAnatomy({ statusOf, heartRate, onSelect }) {
  const m = useMaterials();
  const chest = useRef();
  useFrame(({ clock }) => {
    if (!chest.current || reduced()) return;
    const breath = Math.sin(clock.elapsedTime * 1.4) * 0.008;
    chest.current.scale.set(1 + breath, 1, 1 + breath * 1.6);
  });
  return (
    <group>
      <group ref={chest}>
        <Skeleton m={m} />
      </group>
      <Organs statusOf={statusOf} heartRate={heartRate} onSelect={onSelect} m={m} />
      <Dust />
    </group>
  );
}
