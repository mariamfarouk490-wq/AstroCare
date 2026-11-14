// Anatomical X-ray body from BodyParts3D meshes (public/models/anatomy, built by scripts/build-anatomy.mjs).
// BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan.
// The meshes are baked into BODY_FRAME, so they line up with body-parts.json and with each other.
//
// Only organs backed by the challenge data are shown; each one belongs to a body-parts.json id:
//   heart    ← heart, aorta / carotid / iliac arteries (CV_RISK, VTE), lungs (HYPOXIA, CO2)
//   brain    ← brain (BEHAVIORAL_HEALTH, SLEEP, CO2), eyes + optic nerves (SANS)
//   skeleton ← bones (BONE_FRACTURE, MUSCLE_RISK)
//   abdomen  ← kidneys, ureters, bladder (RENAL_STONE, URINARY_RETENTION), liver, pancreas, spleen
//              (MEDICATIONS, TOXIC, GLUCOSE, IMMUNE_RISK)
// Organs keep an anatomical colour; their status shows as a rim glow (soft green Normal, pulsing red Watch,
// strong red Critical). Selecting a part fades everything else so the part stands out.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { STATUS_COLOR, fresnelMaterial } from './materials.js';
import { Dust } from './XRayAnatomy.jsx';

const BASE = `${import.meta.env.BASE_URL}models/anatomy/`;
const FILES = ['skin', 'skeleton', 'heart', 'vessels', 'lungs', 'brain', 'eyes', 'kidneys', 'metabolic'];
FILES.forEach((f) => useGLTF.preload(`${BASE}${f}.glb`));
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const GREY = new THREE.Color('#5a5d63');
// The anatomy meshes are heavy (skeleton 171k, brain 128k triangles), so they never take part in raycasting.
// Hover and click go to small invisible ellipsoids fitted to each organ's bounds instead.
const NO_RAYCAST = () => null;
const HIT_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const HIT_GEOMETRY = new THREE.SphereGeometry(1, 16, 12);

const ORGANS = [
  { file: 'heart', part: 'heart', color: '#8e1b1d', roughness: 0.38, beat: true, hitScale: 1.2 },
  { file: 'vessels', part: 'heart', color: '#9c2422', roughness: 0.45, hit: false },
  { file: 'brain', part: 'brain', color: '#a88a8c', roughness: 0.6 },
  { file: 'eyes', part: 'brain', color: '#b9b3ab', roughness: 0.35 },
  { file: 'kidneys', part: 'abdomen', color: '#7a2020', roughness: 0.45, hitScale: 0.75 },
  { file: 'metabolic', part: 'abdomen', color: '#6b2a22', roughness: 0.55, opacity: 0.45, hitScale: 0.6 },
];

/** The single mesh geometry of a GLB in float positions with smooth normals. */
function useGeometry(file) {
  const { scene } = useGLTF(`${BASE}${file}.glb`);
  return useMemo(() => {
    let geometry;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || geometry) return;
      // Dequantize to float before baking the node transform (KHR_mesh_quantization stores int16).
      const src = o.geometry.attributes.position;
      const positions = new Float32Array(src.count * 3);
      for (let i = 0; i < src.count; i++) {
        positions[i * 3] = src.getX(i);
        positions[i * 3 + 1] = src.getY(i);
        positions[i * 3 + 2] = src.getZ(i);
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(o.geometry.index);
      geometry.applyMatrix4(o.matrixWorld);
    });
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }, [scene]);
}

const RIM = { Normal: 0.18, Watch: 0.75, Critical: 1.1, NoData: 0.1 };

function Organ({ spec, status, register, onSelect, onHover, heartRate }) {
  const geometry = useGeometry(spec.file);
  const pulse = useRef();
  const center = useMemo(() => geometry.boundingBox.getCenter(new THREE.Vector3()), [geometry]);
  const half = useMemo(() => geometry.boundingBox.getSize(new THREE.Vector3()).multiplyScalar(0.5 * (spec.hitScale ?? 1)), [geometry, spec.hitScale]);
  const surface = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: spec.color,
        roughness: spec.roughness,
        metalness: 0,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        sheen: 0.4,
        sheenColor: new THREE.Color('#ffb3a8'),
        transparent: true,
        opacity: spec.opacity ?? 1,
      }),
    [spec],
  );
  const rim = useMemo(() => fresnelMaterial({ color: STATUS_COLOR[status], power: 2.2, rim: RIM[status], base: status === 'Critical' ? 0.12 : 0 }), [status]);
  useEffect(() => register(spec.part, surface, rim, status), [register, spec.part, surface, rim, status]);
  useEffect(
    () => () => {
      surface.dispose();
      rim.dispose();
    },
    [surface, rim],
  );
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    let s = 1;
    if (spec.beat && !reduced()) {
      const phase = (clock.elapsedTime * ((heartRate || 60) / 60)) % 1;
      s += Math.max(0, Math.sin(phase * Math.PI * 2)) ** 6 * 0.045;
    }
    pulse.current.scale.setScalar(s);
  });
  const handlers = {
    onClick: (e) => {
      e.stopPropagation();
      onSelect(spec.part);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHover(spec.part);
    },
    onPointerOut: () => onHover(null),
  };
  // The hit volume sits OUTSIDE the beating group: a target that pulses under a still cursor
  // would toggle hover on every heartbeat.
  return (
    <group position={center}>
      <group ref={pulse}>
        <group position={center.clone().negate()}>
          <mesh geometry={geometry} material={surface} renderOrder={10} raycast={NO_RAYCAST} />
          <mesh geometry={geometry} material={rim} renderOrder={11} raycast={NO_RAYCAST} />
        </group>
      </group>
      {spec.hit !== false && <mesh geometry={HIT_GEOMETRY} material={HIT_MATERIAL} scale={half} {...handlers} />}
    </group>
  );
}

export default function RealAnatomy({ statusOf, heartRate, dosePct, selectedId, hoverRef, onSelect, onHover }) {
  const skin = useGeometry('skin');
  const skeleton = useGeometry('skeleton');
  const lungs = useGeometry('lungs');

  const bones = statusOf('skeleton');
  const aura = statusOf('aura');
  const m = useMemo(
    () => ({
      shell: fresnelMaterial({ color: '#c9d0d8', power: 4, rim: 0.16, base: 0 }),
      aura: fresnelMaterial({ color: STATUS_COLOR[aura], power: 5, rim: 0.015 + Math.min(1, (dosePct ?? 0) / 100) * 0.2, base: 0 }),
      bone: new THREE.MeshStandardMaterial({ color: '#c3c8cf', roughness: 0.7, transparent: true, opacity: 0.3, depthWrite: false }),
      boneRim: fresnelMaterial({ color: bones === 'Normal' ? '#e8ecf0' : STATUS_COLOR[bones], power: 2.4, rim: bones === 'Normal' ? 0.1 : 0.35, base: 0 }),
      lungs: fresnelMaterial({ color: '#d7b7b5', power: 1.8, rim: 0.14, base: 0.008 }),
    }),
    [bones, aura, dosePct],
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  const mats = useRef(m);
  useEffect(() => {
    mats.current = m;
  }, [m]);

  // Every organ material, with the body part it belongs to (filled by <Organ>).
  const organs = useRef(new Map());
  const register = useMemo(
    () => (part, surface, rim, status) => {
      organs.current.set(surface.uuid, { part, surface, rim, status, base: surface.opacity, color: surface.color.clone(), rimBase: rim.uniforms.uRim.value });
      return () => organs.current.delete(surface.uuid);
    },
    [],
  );

  const fade = useRef(1);
  useFrame(({ clock }, dt) => {
    const k = reduced() ? 1 : 1 - Math.exp(-dt * 6);
    const focused = Boolean(selectedId);
    const t = clock.elapsedTime;
    for (const o of organs.current.values()) {
      const target = !focused || o.part === selectedId ? 1 : 0.15;
      const f = THREE.MathUtils.lerp(o.surface.userData.fade ?? 1, target, k);
      o.surface.userData.fade = f;
      o.surface.opacity = o.base * f;
      o.surface.color.copy(o.color).lerp(GREY, 1 - f);
      o.surface.depthWrite = f > 0.9;
      // Gentle status breathing (Watch slow, Critical faster). Hover adds a steady glow on top
      // instead of multiplying the pulse, so a hovered organ never throbs harder.
      const breathe = o.status === 'Normal' ? 1 : 0.88 + 0.12 * Math.sin(t * (o.status === 'Critical' ? 3.2 : 1.6));
      o.hover = THREE.MathUtils.lerp(o.hover ?? 0, hoverRef.current === o.part ? 1 : 0, k);
      o.rim.uniforms.uRim.value = o.rimBase * breathe * (o.part === selectedId ? 1.3 : 1) + 0.22 * o.hover;
      o.rim.uniforms.uFade.value = f * f;
    }
    // skin, bones and lungs dim while another part is in focus
    fade.current = THREE.MathUtils.lerp(fade.current, focused ? 0.25 : 1, k);
    const boneFocus = selectedId === 'skeleton';
    const mm = mats.current;
    mm.shell.uniforms.uFade.value = fade.current;
    mm.aura.uniforms.uFade.value = selectedId === 'aura' ? 4 : fade.current;
    mm.bone.opacity = 0.3 * (boneFocus ? 2 : fade.current);
    mm.boneRim.uniforms.uFade.value = boneFocus ? 2.5 : fade.current;
    mm.lungs.uniforms.uFade.value = selectedId === 'heart' ? 1 : fade.current;
  });


  return (
    <group>
      <mesh geometry={skin} material={m.shell} renderOrder={20} raycast={NO_RAYCAST} />
      <mesh geometry={skin} material={m.aura} scale={[1.03, 1.008, 1.04]} renderOrder={21} raycast={NO_RAYCAST} />
      <mesh geometry={skeleton} material={m.bone} renderOrder={1} raycast={NO_RAYCAST} />
      <mesh geometry={skeleton} material={m.boneRim} renderOrder={2} raycast={NO_RAYCAST} />
      <mesh geometry={lungs} material={m.lungs} renderOrder={3} raycast={NO_RAYCAST} />
      {ORGANS.map((spec) => (
        <Organ key={spec.file} spec={spec} status={statusOf(spec.part)} register={register} onSelect={onSelect} onHover={onHover} heartRate={heartRate} />
      ))}
      <Dust />
    </group>
  );
}
