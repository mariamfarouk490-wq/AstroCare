// 3D body map: an X-ray hologram (glass shell, skeleton, heart, vessels, dust, floor rings),
// status-tinted organs and hotspots from body-parts.json, slow float and orbit,
// and a camera that flies to a part's cameraTarget when it is selected.
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import ProceduralBody from './ProceduralBody.jsx';
import XRayAnatomy, { Platform } from './XRayAnatomy.jsx';
import RealAnatomy from './RealAnatomy.jsx';
import { STATUS_COLOR, fresnelMaterial } from './materials.js';

/** Front-facing full body, slightly from below (like the reference render). */
const HOME = { position: [0, 0.78, 3.7], lookAt: [0, 0.93, 0] };
const NO_RAYCAST = () => null;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Click target + status marker. Normal: soft green dot. Watch: pulsing red ring. Critical: strong red. */
function Hotspot({ entry, selected, hoverRef, onSelect, onHover }) {
  const { part, status } = entry;
  const color = STATUS_COLOR[status];
  const marker = useRef();
  const ring = useRef();
  const halo = useRef();
  const show = useRef(selected ? 1 : 0);
  // Hover is read from a ref every frame: hovering never re-renders React or rebuilds geometry.
  useFrame(({ camera }, dt) => {
    const on = selected || hoverRef.current === part.id;
    show.current = THREE.MathUtils.lerp(show.current, on ? 1 : 0, 1 - Math.exp(-dt * 10));
    if (marker.current) {
      marker.current.visible = show.current > 0.02;
      marker.current.scale.setScalar(0.8 + 0.2 * show.current);
    }
    // Steady marker: no size or opacity pulsing (a throbbing ring under the cursor reads as shaking).
    if (ring.current) {
      ring.current.quaternion.copy(camera.quaternion);
      ring.current.material.opacity = (status === 'Normal' ? 0.55 : 0.9) * show.current;
    }
    if (halo.current) halo.current.material.opacity = (status === 'Normal' ? 0.08 : status === 'Watch' ? 0.14 : 0.24) * show.current;
  });
  const r = part.radius * 0.42;
  return (
    <group position={part.position}>
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(part.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(part.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[part.radius * 0.9, 12, 12]} />
      </mesh>
      <group ref={marker} visible={selected}>
        <mesh ref={ring} raycast={NO_RAYCAST}>
          <ringGeometry args={[r * 0.82, r, 48]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {status !== 'Watch' && (
          <mesh raycast={NO_RAYCAST}>
            <sphereGeometry args={[r * 0.32, 16, 16]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )}
        <mesh ref={halo} raycast={NO_RAYCAST}>
          <sphereGeometry args={[r * 1.6, 24, 24]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

/** Radiation aura: a faint outer shell whose glow follows the cumulative dose. */
function Aura({ status, dosePct }) {
  const material = useMemo(
    () => fresnelMaterial({ color: STATUS_COLOR[status], power: 3, rim: 0.04 + Math.min(1, (dosePct ?? 0) / 100) * 0.3, base: 0 }),
    [status, dosePct],
  );
  return (
    <group scale={[1.04, 1.012, 1.06]}>
      <ProceduralBody material={material} />
    </group>
  );
}

/** Flies the camera and orbit target to the selected part, then hands control back to the user. */
function CameraRig({ target, controls }) {
  const { camera } = useThree();
  const flying = useRef(false);
  const goal = useRef({ position: new THREE.Vector3(), lookAt: new THREE.Vector3() });
  useEffect(() => {
    const t = target ?? HOME;
    goal.current.position.set(...t.position);
    goal.current.lookAt.set(...t.lookAt);
    if (target) {
      // Pull back a little and shift the organ left of centre, clear of the side sheet.
      const look = goal.current.lookAt;
      const offset = goal.current.position.clone().sub(look).multiplyScalar(1.45);
      const right = new THREE.Vector3().crossVectors(offset.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
      const shift = right.multiplyScalar(offset.length() * 0.07);
      look.add(shift);
      goal.current.position.copy(look).add(offset);
    }
    flying.current = true;
  }, [target]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!flying.current || !c) return;
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 4);
    camera.position.lerp(goal.current.position, k);
    c.target.lerp(goal.current.lookAt, k);
    c.update();
    if (camera.position.distanceTo(goal.current.position) < 0.005) flying.current = false;
  });
  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const stop = () => (flying.current = false);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [controls]);
  return null;
}

function Scene({ parts, selectedId, onSelect, onHover, heartRate, dosePct }) {
  const shell = useMemo(() => fresnelMaterial({ color: '#d6dde6', power: 2.8, rim: 0.42, base: 0.006 }), []);
  const controls = useRef();
  const body = useRef();
  const [interacting, setInteracting] = useState(false);
  // Stable hover: switch to a new part at once, but wait a moment before clearing it, so moving
  // between neighbouring hit areas never flickers the highlight or the label.
  const hoverRef = useRef(null);
  const clearTimer = useRef();
  const setHovered = useCallback(
    (id) => {
      clearTimeout(clearTimer.current);
      const apply = (next) => {
        if (hoverRef.current === next) return;
        hoverRef.current = next;
        onHover?.(next);
      };
      if (id) apply(id);
      else clearTimer.current = setTimeout(() => apply(null), 120);
    },
    [onHover],
  );
  useEffect(() => () => clearTimeout(clearTimer.current), []);
  const selected = parts.find((p) => p.part.id === selectedId);
  const statusOf = (id) => parts.find((p) => p.part.id === id)?.status ?? 'Normal';
  // Procedural X-ray body: shown while the anatomy models load, and if they fail.
  const procedural = (
    <>
      <ProceduralBody material={shell} />
      <XRayAnatomy statusOf={statusOf} heartRate={heartRate} onSelect={onSelect} />
      <Aura status={statusOf('aura')} dosePct={dosePct} />
    </>
  );

  useFrame(({ clock }) => {
    if (!body.current || reducedMotion()) return;
    body.current.position.y = 0.012 + Math.sin(clock.elapsedTime * 0.6) * 0.008;
    // slow sway that stays mostly front-facing; stops once the user takes the camera or opens a part
    const sway = selectedId || interacting ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.45;
    body.current.rotation.y += (sway - body.current.rotation.y) * 0.03;
  });
  // Orbit target is set once here. Passing it as a prop re-applied it on every render and snapped the camera.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.target.set(...HOME.lookAt);
    c.update();
  }, []);
  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const on = () => setInteracting(true);
    c.addEventListener('start', on);
    return () => c.removeEventListener('start', on);
  }, []);

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.6} />
      <directionalLight position={[-2, 1.5, -1]} intensity={0.6} color="#cfd8e2" />
      <pointLight position={[0.2, 1.35, 0.6]} intensity={0.6} distance={1.2} color="#ffffff" />
      <group onPointerMissed={() => onSelect(null)}>
        <group ref={body}>
          <SceneBoundary fallback={procedural}>
            <Suspense fallback={procedural}>
              <RealAnatomy statusOf={statusOf} heartRate={heartRate} dosePct={dosePct} selectedId={selectedId} hoverRef={hoverRef} onSelect={onSelect} onHover={setHovered} />
            </Suspense>
          </SceneBoundary>
          {parts
            .filter((p) => p.part.id !== 'aura')
            .map((p) => (
              <Hotspot key={p.part.id} entry={p} selected={p.part.id === selectedId} hoverRef={hoverRef} onSelect={onSelect} onHover={setHovered} />
            ))}
        </group>
        <Platform auraStatus={statusOf('aura')} selected={selectedId === 'aura'} onSelect={onSelect} />
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={0.6}
        maxDistance={4.6}
        minPolarAngle={0.35}
        maxPolarAngle={1.75}
      />
      <CameraRig target={selected?.part.cameraTarget} controls={controls} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.7} />
        <Vignette offset={0.35} darkness={0.55} />
      </EffectComposer>
    </>
  );
}

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function BodyScene({ parts, selectedId, onSelect, onHover, heartRate, dosePct, fallback }) {
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <Canvas
          className="body-canvas"
          dpr={[1, 1.5]}
          camera={{ position: HOME.position, fov: 34, near: 0.05, far: 50 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        >
          <Scene parts={parts} selectedId={selectedId} onSelect={onSelect} onHover={onHover} heartRate={heartRate} dosePct={dosePct} />
        </Canvas>
      </Suspense>
    </SceneBoundary>
  );
}
