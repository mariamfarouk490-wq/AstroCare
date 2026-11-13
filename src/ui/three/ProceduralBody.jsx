// Smooth procedural human figure in BODY_FRAME (metres, feet at y = 0, facing +z, crew member's left = +x).
// Limbs and trunk are lofted along Catmull-Rom curves through elliptical cross-sections.
// The hotspot positions in body-parts.json line up with this figure.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BODY_FRAME } from './bodyFrame.js';

// Each section: [height along the limb (m), half-width x, half-depth z]
const TRUNK = [[0.88, 0.075, 0.06], [0.94, 0.145, 0.115], [1.01, 0.163, 0.12], [1.09, 0.127, 0.098], [1.18, 0.135, 0.108], [1.29, 0.18, 0.13], [1.39, 0.2, 0.12], [1.445, 0.18, 0.075], [1.48, 0.066, 0.052], [1.56, 0.043, 0.045]];
const LEG = [[0.12, 0.026, 0.029], [0.22, 0.034, 0.04], [0.35, 0.058, 0.055], [0.44, 0.05, 0.048], [0.54, 0.044, 0.046], [0.65, 0.057, 0.065], [0.8, 0.075, 0.075], [0.94, 0.085, 0.085], [0.98, 0.065, 0.07]];
const ARM = [[0, 0.025, 0.026], [0.08, 0.032, 0.033], [0.16, 0.043, 0.038], [0.23, 0.037, 0.036], [0.28, 0.042, 0.041], [0.36, 0.053, 0.049], [0.46, 0.062, 0.061], [0.5, 0.048, 0.049]];
const FINGER = [[0, 0.004, 0.005], [0.018, 0.007, 0.007], [0.036, 0.008, 0.008], [0.06, 0.009, 0.008]];
const THUMB = [[0, 0.006, 0.006], [0.025, 0.01, 0.01], [0.055, 0.013, 0.012]];

function loft(sections, steps = 64, around = 48) {
  const curve = new THREE.CatmullRomCurve3(sections.map(([h, rx, rz]) => new THREE.Vector3(h, rx, rz)));
  const positions = [];
  const indices = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps);
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI * 2;
      positions.push(p.y * Math.cos(a), p.x, p.z * Math.sin(a));
      if (i && j) {
        const k = i * (around + 1) + j;
        indices.push(k, k - around - 1, k - 1, k - 1, k - around - 1, k - around - 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function Lofted({ sections, material, ...props }) {
  const geometry = useMemo(() => loft(sections), [sections]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} {...props} />;
}

function Ellipsoid({ at, scale, material }) {
  return (
    <mesh position={at} scale={scale} material={material}>
      <sphereGeometry args={[1, 48, 32]} />
    </mesh>
  );
}

export default function ProceduralBody({ material }) {
  return (
    <group name="procedural-body" userData={{ frame: BODY_FRAME }}>
      <Lofted sections={TRUNK} material={material} />
      <Ellipsoid at={[0, 1.685, -0.005]} scale={[0.095, 0.115, 0.092]} material={material} />
      <Ellipsoid at={[0, 1.61, 0.028]} scale={[0.074, 0.062, 0.068]} material={material} />
      <Ellipsoid at={[0, 1.658, 0.088]} scale={[0.017, 0.034, 0.027]} material={material} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Ellipsoid at={[s * 0.097, 1.665, 0]} scale={[0.014, 0.033, 0.022]} material={material} />
          <Ellipsoid at={[s * 0.088, 1.36, 0.09]} scale={[0.085, 0.05, 0.03]} material={material} />
          <Ellipsoid at={[s * 0.191, 1.419, 0]} scale={[0.063, 0.063, 0.07]} material={material} />
          <group position={[s * 0.325, 0.94, 0.005]} rotation={[0, 0, s * 0.27]}>
            <Lofted sections={ARM} material={material} />
          </group>
          <Ellipsoid at={[s * 0.33, 0.902, 0.013]} scale={[0.036, 0.055, 0.023]} material={material} />
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[s * (0.304 + i * 0.016), 0.812 + (i === 3 ? 0.012 : 0), 0.014]} rotation={[0, 0, s * (i - 1.5) * 0.07]}>
              <Lofted sections={FINGER} material={material} />
            </group>
          ))}
          <group position={[s * 0.28, 0.88, 0.025]} rotation={[0, 0, -s * 0.5]}>
            <Lofted sections={THUMB} material={material} />
          </group>
          <group position={[s * 0.098, 0, 0]}>
            <Lofted sections={LEG} material={material} />
          </group>
          <Ellipsoid at={[s * 0.102, 0.065, 0.045]} scale={[0.045, 0.045, 0.108]} material={material} />
        </group>
      ))}
    </group>
  );
}
