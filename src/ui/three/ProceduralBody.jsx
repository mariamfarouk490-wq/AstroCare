// Low-poly fallback body built from primitives in BODY_FRAME (see bodyFrame.js).
// Used while astronaut.glb is missing; hotspot positions in body-parts.json are measured on THIS body.
import { BODY_FRAME } from './bodyFrame.js';

// [x, y, z] centres + sizes, all in metres
export const PROCEDURAL_PARTS = {
  head: { position: [0, 1.66, 0], radius: 0.11 },
  neck: { position: [0, 1.52, 0], radius: 0.045, length: 0.08 },
  torso: { position: [0, 1.24, 0], radius: 0.17, length: 0.34 }, // y 0.90 → 1.58
  pelvis: { position: [0, 0.96, 0], scale: [0.19, 0.1, 0.13] },
  armL: { position: [0.27, 1.13, 0], radius: 0.05, length: 0.5 },
  armR: { position: [-0.27, 1.13, 0], radius: 0.05, length: 0.5 },
  legL: { position: [0.1, 0.47, 0], radius: 0.07, length: 0.8 }, // y 0.0 → 0.94
  legR: { position: [-0.1, 0.47, 0], radius: 0.07, length: 0.8 },
};

function Capsule({ position, radius, length, material }) {
  return (
    <mesh position={position} castShadow>
      <capsuleGeometry args={[radius, length, 6, 16]} />
      {material}
    </mesh>
  );
}

export default function ProceduralBody({ color = '#F5F2EC', opacity = 0.9, wireframe = false }) {
  const material = <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} transparent opacity={opacity} wireframe={wireframe} />;
  const p = PROCEDURAL_PARTS;
  return (
    <group name="procedural-body" userData={{ frame: BODY_FRAME }}>
      <mesh position={p.head.position} castShadow>
        <sphereGeometry args={[p.head.radius, 24, 24]} />
        {material}
      </mesh>
      <Capsule {...p.neck} material={material} />
      <Capsule {...p.torso} material={material} />
      <mesh position={p.pelvis.position} scale={p.pelvis.scale} castShadow>
        <sphereGeometry args={[1, 20, 20]} />
        {material}
      </mesh>
      <Capsule {...p.armL} material={material} />
      <Capsule {...p.armR} material={material} />
      <Capsule {...p.legL} material={material} />
      <Capsule {...p.legR} material={material} />
    </group>
  );
}
