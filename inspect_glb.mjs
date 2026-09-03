import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/character.glb');
const buffer = fs.readFileSync(glbPath);

// Read GLB header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

console.log('GLB Magic:', magic.toString(16), 'Version:', version, 'Length:', length);

// Chunk 0 (JSON)
const chunk0Length = buffer.readUInt32LE(12);
const chunk0Type = buffer.readUInt32LE(16);
const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('Nodes count:', gltf.nodes?.length);
console.log('Meshes count:', gltf.meshes?.length);
console.log('Skins count:', gltf.skins?.length);
console.log('Animations count:', gltf.animations?.length);

if (gltf.nodes) {
  console.log('First 25 nodes:');
  gltf.nodes.slice(0, 25).forEach((n, i) => {
    console.log(`Node ${i}: "${n.name}" translation: ${JSON.stringify(n.translation)} rotation: ${JSON.stringify(n.rotation)} scale: ${JSON.stringify(n.scale)} mesh: ${n.mesh} skin: ${n.skin}`);
  });
}

if (gltf.skins) {
  console.log('Skins:');
  gltf.skins.forEach((s, i) => {
    console.log(`Skin ${i}: "${s.name}" joints count: ${s.joints?.length}`);
    const jointNames = s.joints?.map(j => gltf.nodes[j]?.name);
    console.log('Joint names:', jointNames);
  });
}

if (gltf.animations) {
  console.log('Animations:');
  gltf.animations.forEach((a, i) => {
    console.log(`Animation ${i}: "${a.name}" channels: ${a.channels?.length}`);
  });
}

if (gltf.meshes) {
  console.log('Meshes:');
  gltf.meshes.forEach((m, i) => {
    console.log(`Mesh ${i}: "${m.name}" primitives: ${m.primitives?.length}`);
  });
}
