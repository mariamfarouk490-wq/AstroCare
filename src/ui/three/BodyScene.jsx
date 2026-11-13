// 3D body map: an X-ray hologram (glass shell, skeleton, heart, vessels, dust, floor rings),
// status-tinted organs and hotspots from body-parts.json, slow float and orbit,
// and a camera that flies to a part's cameraTarget when it is selected.
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import ProceduralBody from './ProceduralBody.jsx';
import XRayAnatomy, { Platform } from './XRayAnatomy.jsx';
import { STATUS_COLOR, fresnelMaterial } from './materials.js';
import { BODY_FRAME } from './bodyFrame.js';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Click target + status marker. Normal: soft green dot. Watch: pulsing red ring. Critical: strong red. */
function Hotspot({ entry, selected, hovered, onSelect, onHover }) {
  const { part, status } = entry;
  const color = STATUS_COLOR[status];
  const ring = useRef();
  const halo = useRef();
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const speed = status === 'Normal' ? 1.2 : status === 'Watch' ? 2.4 : 4.2;
    const pulse = reducedMotion() ? 0.5 : (Math.sin(t * speed) + 1) / 2;
    if (ring.current) {
      ring.current.quaternion.copy(camera.quaternion);
      ring.current.scale.setScalar(1 + pulse * (status === 'Normal' ? 0.08 : 0.35));
      ring.current.material.opacity = status === 'Normal' ? 0.5 : 0.95 - pulse * 0.5;
    }
    if (halo.current) halo.current.material.opacity = (status === 'Normal' ? 0.1 : status === 'Watch' ? 0.18 : 0.35) * (1 - pulse * 0.5);
  });
  const r = part.radius * (selected || hovered ? 0.42 : 0.34);
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
      <mesh ref={ring}>
        <ringGeometry args={[r * 0.82, r, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {status !== 'Watch' && (
        <mesh>
          <sphereGeometry args={[r * 0.32, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
      <mesh ref={halo}>
        <sphereGeometry args={[r * 1.6, 24, 24]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
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
    const t = target ?? BODY_FRAME.DEFAULT_CAMERA;
    goal.current.position.set(...t.position);
    goal.current.lookAt.set(...t.lookAt);
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
  const [hovered, setHoveredState] = useState(null);
  const [interacting, setInteracting] = useState(false);
  const setHovered = (id) => {
    setHoveredState(id);
    onHover?.(id);
  };
  const selected = parts.find((p) => p.part.id === selectedId);
  const statusOf = (id) => parts.find((p) => p.part.id === id)?.status ?? 'Normal';

  useFrame(({ clock }) => {
    if (!body.current || reducedMotion()) return;
    body.current.position.y = 0.012 + Math.sin(clock.elapsedTime * 0.6) * 0.008;
  });
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
          <ProceduralBody material={shell} />
          <XRayAnatomy statusOf={statusOf} heartRate={heartRate} onSelect={onSelect} />
          <Aura status={statusOf('aura')} dosePct={dosePct} />
          {parts
            .filter((p) => p.part.id !== 'aura')
            .map((p) => (
              <Hotspot key={p.part.id} entry={p} selected={p.part.id === selectedId} hovered={hovered === p.part.id} onSelect={onSelect} onHover={setHovered} />
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
        autoRotate={!selectedId && !interacting && !reducedMotion()}
        autoRotateSpeed={0.45}
        target={BODY_FRAME.DEFAULT_CAMERA.lookAt}
      />
      <CameraRig target={selected?.part.cameraTarget} controls={controls} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.2} radius={0.7} />
        <Vignette offset={0.3} darkness={0.65} />
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
          camera={{ position: BODY_FRAME.DEFAULT_CAMERA.position, fov: 36, near: 0.05, far: 50 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        >
          <Scene parts={parts} selectedId={selectedId} onSelect={onSelect} onHover={onHover} heartRate={heartRate} dosePct={dosePct} />
        </Canvas>
      </Suspense>
    </SceneBoundary>
  );
}
