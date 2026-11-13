// Builds public/models/anatomy/*.glb from BodyParts3D STL meshes.
//
// Source: BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan
//   https://dbarchive.biosciencedbc.jp/en/bodyparts3d/ (STL mirror: github.com/Kevin-Mattheus-Moerman/BodyParts3D)
//
// Usage: node scripts/build-anatomy.mjs <dir with FMA*.stl> <parts_list_e.txt>
//
// Every group gets ONE shared transform, so all meshes stay aligned with each other and with BODY_FRAME:
// BodyParts3D is in mm, Z up, face toward -Y, crew member's left = +X  →  metres, Y up, face +Z,
// feet at y = 0, height 1.8 m (src/ui/three/bodyFrame.js), centred on x/z by the skin bounds.
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { weld, simplify, quantize, meshopt, reorder, dedup, prune, join as joinPrimitives, flatten } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [stlDir, partsFile] = process.argv.slice(2);
if (!stlDir || !partsFile) {
  console.error('Usage: node scripts/build-anatomy.mjs <stl dir> <parts_list_e.txt>');
  process.exit(1);
}
const OUT = 'public/models/anatomy';
const HEIGHT = 1.8;

const names = Object.fromEntries(
  readFileSync(partsFile, 'utf8')
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split('\t'))
    .filter((r) => r[1]),
);

const BONE = /\b(bone|vertebra|rib|costal cartilage|sternum|manubrium|xiphoid process|femur|tibia|fibula|humerus|radius|ulna|clavicle|scapula|patella|sacrum|coccyx|mandible|phalanx|metacarpal|metatarsal|talus|calcaneus|cuneiform|cuboid|navicular|ethmoid|vomer|maxilla|nasal concha|hamate|capitate|lunate|scaphoid|pisiform|trapezium|trapezoid|triquetral|atlas|axis)\b/i;
const NOT_BONE = /muscle|head of|gyrus|tract|ligament|joint|disk|tendon|stylohyoid|mylohyoid|geniohyoid|sesamoid|^(left|right) costal cartilage$/i;

const exists = (id) => {
  try {
    return statSync(join(stlDir, `${id}.stl`)).size > 84;
  } catch {
    return false;
  }
};

// group → [FMA ids], simplify ratio (share of triangles kept)
const GROUPS = {
  skeleton: { ids: Object.keys(names).filter((id) => BONE.test(names[id]) && !NOT_BONE.test(names[id]) && exists(id)), ratio: 0.09 },
  heart: { ids: ['FMA7274'], ratio: 0.05 },
  lungs: { ids: ['FMA7333', 'FMA7337', 'FMA7370', 'FMA7371', 'FMA7383'], ratio: 0.06 },
  vessels: { ids: ['FMA3736', 'FMA3768', 'FMA3784', 'FMA3941', 'FMA4058', 'FMA14765', 'FMA14766', 'FMA18806', 'FMA18807', 'FMA18809', 'FMA18810'], ratio: 0.35 },
  kidneys: { ids: ['FMA7204', 'FMA7205'], ratio: 0.25 },
  skin: { ids: ['FMA7163'], ratio: 0.025 },
};

/** Binary STL → Float32Array of triangle positions (mm, BodyParts3D axes). */
function readStl(id) {
  const b = readFileSync(join(stlDir, `${id}.stl`));
  const n = b.readUInt32LE(80);
  const out = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) out[i * 9 + k] = b.readFloatLE(84 + i * 50 + 12 + k * 4);
  return out;
}

// Shared transform from the skin bounds.
const skin = readStl('FMA7163');
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < skin.length; i++) {
  const a = i % 3;
  if (skin[i] < min[a]) min[a] = skin[i];
  if (skin[i] > max[a]) max[a] = skin[i];
}
const scale = HEIGHT / (max[2] - min[2]);
const cx = (min[0] + max[0]) / 2;
const cy = (min[1] + max[1]) / 2;
/** (x, y, z) mm Z-up face -Y → (x, z, -y) m Y-up face +Z, feet on 0, centred. */
function toBodyFrame(p) {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    out[i] = (p[i] - cx) * scale;
    out[i + 1] = (p[i + 2] - min[2]) * scale;
    out[i + 2] = -(p[i + 1] - cy) * scale;
  }
  return out;
}

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
mkdirSync(OUT, { recursive: true });

for (const [group, { ids, ratio }] of Object.entries(GROUPS)) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(group);
  const mesh = doc.createMesh(group);
  const material = doc.createMaterial(group);
  let triangles = 0;
  for (const id of ids) {
    const positions = toBodyFrame(id === 'FMA7163' ? skin : readStl(id));
    triangles += positions.length / 9;
    const accessor = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);
    mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', accessor).setMaterial(material));
  }
  scene.addChild(doc.createNode(group).setMesh(mesh));
  await doc.transform(
    dedup(),
    weld({ tolerance: 0.0001 }),
    flatten(),
    joinPrimitives({ keepNamed: false }),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002, lockBorder: false }),
    prune(),
    reorder({ encoder: MeshoptEncoder }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const file = join(OUT, `${group}.glb`);
  await io.write(file, doc);
  const kept = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  console.log(`${group}: ${ids.length} parts, ${triangles} → ${Math.round(kept)} triangles, ${(statSync(file).size / 1024).toFixed(0)} KB`);
}
console.log(`scale ${scale.toFixed(6)} m/mm, skin height ${(max[2] - min[2]).toFixed(0)} mm`);
