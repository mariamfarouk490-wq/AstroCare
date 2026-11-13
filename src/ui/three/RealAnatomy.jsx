// Anatomical X-ray body from BodyParts3D meshes (public/models/anatomy, built by scripts/build-anatomy.mjs).
// BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan.
// The meshes are already baked into BODY_FRAME, so they line up with body-parts.json and with each other.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { STATUS_COLOR, fresnelMaterial, organMaterial } from './materials.js';
import { Dust } from './XRayAnatomy.jsx';

const BASE = `${import.meta.env.BASE_URL}models/anatomy/`;
const ANATOMY_FILES = ['skin', 'skeleton', 'heart', 'vessels', 'lungs', 'kidneys'].map((n) => `${BASE}${n}.glb`);
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The single mesh geometry of a GLB, with normals (the files ship positions only). */
function useGeometry(url) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    let geometry;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (o.isMesh && !geometry) {
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
      }
    });
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }, [scene]);
}

function Heart({ status, heartRate, onSelect }) {
  const geometry = useGeometry(`${BASE}heart.glb`);
  const group = useRef();
  const material = useMemo(() => organMaterial(STATUS_COLOR[status], status === 'Critical', { onTop: true }), [status]);
  const center = useMemo(() => geometry.boundingBox.getCenter(new THREE.Vector3()), [geometry]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const phase = (clock.elapsedTime * ((heartRate || 60) / 60)) % 1;
    const beat = reduced() ? 0 : Math.max(0, Math.sin(phase * Math.PI * 2)) ** 6 * 0.08;
    group.current.scale.setScalar(1 + beat);
  });
  return (
    <group position={center} ref={group}>
      <mesh
        geometry={geometry}
        material={material}
        position={center.clone().negate()}
        renderOrder={10}
        onClick={(e) => {
          e.stopPropagation();
          onSelect('heart');
        }}
      />
    </group>
  );
}

export default function RealAnatomy({ statusOf, heartRate, dosePct, onSelect }) {
  const skin = useGeometry(`${BASE}skin.glb`);
  const skeleton = useGeometry(`${BASE}skeleton.glb`);
  const vessels = useGeometry(`${BASE}vessels.glb`);
  const lungs = useGeometry(`${BASE}lungs.glb`);
  const kidneys = useGeometry(`${BASE}kidneys.glb`);

  const heartStatus = statusOf('heart');
  const abdomen = statusOf('abdomen');
  const brain = statusOf('brain');
  const bones = statusOf('skeleton');
  const aura = statusOf('aura');

  const m = useMemo(
    () => ({
      shell: fresnelMaterial({ color: '#d6dde6', power: 3.2, rim: 0.2, base: 0.0 }),
      bone: new THREE.MeshStandardMaterial({
        color: '#eef2f5',
        emissive: bones === 'Normal' ? '#9aa5b0' : STATUS_COLOR[bones],
        emissiveIntensity: bones === 'Normal' ? 0.12 : 0.4,
        roughness: 0.6,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      boneRim: fresnelMaterial({ color: '#ffffff', power: 2.2, rim: 0.16, base: 0.0 }),
      lungs: fresnelMaterial({ color: '#cfd8e2', power: 1.6, rim: 0.3, base: 0.015 }),
      kidney: Object.assign(organMaterial(STATUS_COLOR[abdomen], abdomen === 'Critical'), abdomen === 'Normal' ? { opacity: 0.35, emissiveIntensity: 0.12 } : {}),
      brain: fresnelMaterial({ color: STATUS_COLOR[brain], power: 1.6, rim: brain === 'Normal' ? 0.12 : 0.5, base: brain === 'Normal' ? 0.0 : 0.05 }),
      aura: fresnelMaterial({ color: STATUS_COLOR[aura], power: 4, rim: 0.02 + Math.min(1, (dosePct ?? 0) / 100) * 0.25, base: 0 }),
    }),
    [bones, abdomen, brain, aura, dosePct],
  );
  const vessel = useMemo(() => new THREE.MeshBasicMaterial({ color: STATUS_COLOR[heartStatus], transparent: true, opacity: 0.85, depthTest: false, toneMapped: false }), [heartStatus]);
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);

  const click = (id) => (e) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <group>
      <mesh geometry={skin} material={m.shell} renderOrder={3} />
      <mesh geometry={skin} material={m.aura} scale={[1.03, 1.008, 1.04]} renderOrder={4} />
      <mesh geometry={skeleton} material={m.bone} renderOrder={1} onClick={click('skeleton')} />
      <mesh geometry={skeleton} material={m.boneRim} renderOrder={2} />
      <mesh geometry={lungs} material={m.lungs} renderOrder={2} />
      <mesh geometry={vessels} material={vessel} renderOrder={9} />
      <mesh geometry={kidneys} material={m.kidney} renderOrder={9} onClick={click('abdomen')} />
      <Heart status={heartStatus} heartRate={heartRate} onSelect={onSelect} />
      <mesh position={[0, 1.71, -0.005]} scale={[0.062, 0.055, 0.07]} material={m.brain} onClick={click('brain')}>
        <sphereGeometry args={[1, 32, 24]} />
      </mesh>
      <Dust />
    </group>
  );
}

ANATOMY_FILES.forEach((url) => useGLTF.preload(url));
