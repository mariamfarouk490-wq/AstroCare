// Shared materials and status colours for the 3D body map.
import * as THREE from 'three';

export const STATUS_COLOR = { Normal: '#30d158', Watch: '#ff453a', Critical: '#ff453a', NoData: '#a1a1a6' };

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRESNEL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uRim;
  uniform float uBase;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    gl_FragColor = vec4(uColor * (uBase + f * uRim), 1.0);
  }
`;

/** Additive fresnel glass: bright at the silhouette, almost invisible face-on. */
export function fresnelMaterial({ color = '#dfe6ee', power = 2.4, rim = 0.85, base = 0.015 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uRim: { value: rim }, uBase: { value: base } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/** Glossy organ tinted by status (heart, kidneys). */
export function organMaterial(color, critical, { onTop = false } = {}) {
  return new THREE.MeshPhysicalMaterial({
    depthTest: !onTop,
    color,
    emissive: color,
    emissiveIntensity: critical ? 1.1 : 0.55,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.95,
    toneMapped: false,
  });
}
