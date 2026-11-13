// The ONE coordinate frame shared by body-parts.json, ProceduralBody and any glTF model.
// Units: metres. Feet at y = 0, top of head at y = HEIGHT. Body faces +z (toward the default camera).
// The crew member's LEFT side is +x (so the heart sits at a small positive x).
export const BODY_FRAME = Object.freeze({
  HEIGHT: 1.8,
  CENTER: [0, 0.9, 0],
  DEFAULT_CAMERA: { position: [0, 1.0, 3.4], lookAt: [0, 0.9, 0] },
});

/**
 * Fit a loaded glTF scene into BODY_FRAME: scale to HEIGHT, feet on y = 0, centred on x/z.
 * Call once after useGLTF(): fitToBodyFrame(scene, THREE). Hotspots then line up with body-parts.json.
 */
export function fitToBodyFrame(object3d, THREE) {
  const box = new THREE.Box3().setFromObject(object3d);
  const size = box.getSize(new THREE.Vector3());
  const scale = BODY_FRAME.HEIGHT / size.y;
  object3d.scale.multiplyScalar(scale);
  const fitted = new THREE.Box3().setFromObject(object3d);
  const center = fitted.getCenter(new THREE.Vector3());
  object3d.position.x -= center.x;
  object3d.position.z -= center.z;
  object3d.position.y -= fitted.min.y;
  return object3d;
}
