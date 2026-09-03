import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/character.glb');
const buffer = fs.readFileSync(glbPath);
const chunk0Length = buffer.readUInt32LE(12);
const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('Animations:', gltf.animations?.map(a => a.name));
console.log('Meshes in nodes:');
gltf.nodes.forEach((n, i) => {
  if (n.mesh !== undefined) {
    console.log(`Node ${i}: "${n.name}", mesh index: ${n.mesh}, skin: ${n.skin}`);
  }
});
