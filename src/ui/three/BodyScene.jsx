// 3D body map: a polished chrome figure, status hotspots from body-parts.json,
// slow orbit, and a camera that flies to a part's cameraTarget when it is selected.
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ProceduralBody from './ProceduralBody.jsx';
import { BODY_FRAME } from './bodyFrame.js';

const STATUS_COLOR = { Normal: '#30d158', Watch: '#ff453a', Critical: '#ff453a', NoData: '#a1a1a6' };
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useChrome() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#dfe1e6',
        metalness: 1,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.25,
      }),
    [],
  );
}

/** Studio light built from local light-formers (no HDR download, works offline). */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#2c2c30']} />
      <Lightformer form="rect" intensity={5} position={[0, 4, 2]} scale={[8, 1.6, 1]} />
      <Lightformer form="rect" intensity={3.5} position={[-4, 1.5, 1]} rotation-y={Math.PI / 2} scale={[4, 0.6, 1]} />
      <Lightformer form="rect" intensity={3.5} position={[4, 1.2, -1]} rotation-y={-Math.PI / 2} scale={[4, 0.6, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[0, 1, -4]} scale={[8, 3, 1]} />
      <Lightformer form="ring" intensity={1.4} position={[2, 3, 3]} scale={1.5} />
      <Lightformer form="rect" intensity={0.8} position={[0, -2, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
    </Environment>
  );
}

function Hotspot({ entry, selected, onSelect, hovered, onHover }) {
  const { part, status } = entry;
  const color = STATUS_COLOR[status];
  const core = useRef();
  const halo = useRef();
  const intensity = status === 'Critical' ? 2.6 : status === 'Watch' ? 1.1 : 0.9;
  const coreOpacity = status === 'Watch' ? 0.55 : 0.95;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = status === 'Normal' ? 1.4 : status === 'Watch' ? 2.4 : 4.2;
    const pulse = reducedMotion() ? 0.5 : (Math.sin(t * speed) + 1) / 2;
    if (halo.current) {
      halo.current.scale.setScalar(1 + pulse * (status === 'Normal' ? 0.15 : 0.45));
      halo.current.material.opacity = (status === 'Normal' ? 0.14 : 0.3) * (1 - pulse * 0.6);
    }
    if (core.current) core.current.material.emissiveIntensity = intensity * (0.75 + pulse * 0.25);
  });
  const r = part.radius * (selected || hovered ? 0.5 : 0.4);
  const handlers = {
    onClick: (e) => {
      e.stopPropagation();
      onSelect(part.id);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHover(part.id);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      onHover(null);
      document.body.style.cursor = '';
    },
  };
  return (
    <group position={part.position}>
      <mesh ref={core} {...handlers}>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} transparent opacity={coreOpacity} toneMapped={false} />
      </mesh>
      {status === 'Watch' && (
        <mesh>
          <torusGeometry args={[r * 1.55, r * 0.09, 12, 64]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
      <mesh ref={halo}>
        <sphereGeometry args={[r * 1.9, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Radiation "aura": a thin halo around the whole body plus a floor ring, tinted by status. */
function Aura({ entry, selected, onSelect }) {
  const color = STATUS_COLOR[entry.status];
  const ring = useRef();
  useFrame(({ clock }) => {
    if (ring.current && !reducedMotion()) ring.current.rotation.z = clock.elapsedTime * 0.15;
  });
  return (
    <group>
      <mesh
        position={[0, 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(entry.part.id);
        }}
      >
        <ringGeometry args={[0.46, 0.5, 96]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.9 : 0.5} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.565, 96, 1, 0, Math.PI * 1.4]} />
        <meshBasicMaterial color="#f5f5f7" transparent opacity={0.25} />
      </mesh>
      <mesh position={entry.part.position} scale={[0.42, 1, 0.3]}>
        <sphereGeometry args={[entry.part.radius, 48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.06 : 0.025} depthWrite={false} side={THREE.BackSide} />
      </mesh>
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

function Scene({ parts, selectedId, onSelect, onHover }) {
  const chrome = useChrome();
  const controls = useRef();
  const [hovered, setHoveredState] = useState(null);
  const setHovered = (id) => {
    setHoveredState(id);
    onHover?.(id);
  };
  const selected = parts.find((p) => p.part.id === selectedId);
  const aura = parts.find((p) => p.part.id === 'aura');
  return (
    <>
      <Studio />
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 4, 3]} intensity={0.6} />
      <group onPointerMissed={() => onSelect(null)}>
        <ProceduralBody material={chrome} />
        {parts
          .filter((p) => p.part.id !== 'aura')
          .map((p) => (
            <Hotspot key={p.part.id} entry={p} selected={p.part.id === selectedId} hovered={hovered === p.part.id} onSelect={onSelect} onHover={setHovered} />
          ))}
        {aura && <Aura entry={aura} selected={selectedId === 'aura'} onSelect={onSelect} />}
      </group>
      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={3} blur={2.6} far={1.2} color="#000" />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={0.7}
        maxDistance={4.6}
        minPolarAngle={0.35}
        maxPolarAngle={1.75}
        autoRotate={!selectedId && !reducedMotion()}
        autoRotateSpeed={0.55}
        target={BODY_FRAME.DEFAULT_CAMERA.lookAt}
      />
      <CameraRig target={selected?.part.cameraTarget} controls={controls} />
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

export default function BodyScene({ parts, selectedId, onSelect, onHover, fallback }) {
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <Canvas
          className="body-canvas"
          dpr={[1, 2]}
          camera={{ position: BODY_FRAME.DEFAULT_CAMERA.position, fov: 36, near: 0.05, far: 50 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        >
          <Scene parts={parts} selectedId={selectedId} onSelect={onSelect} onHover={onHover} />
        </Canvas>
      </Suspense>
    </SceneBoundary>
  );
}
