import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/character.glb');
const buffer = fs.readFileSync(glbPath);
const chunk0Length = buffer.readUInt32LE(12);
const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('Scenes:', gltf.scenes);
if (gltf.scenes && gltf.scenes[0]) {
  const rootNodeIndices = gltf.scenes[0].nodes;
  console.log('Root nodes in scene 0:', rootNodeIndices);
  rootNodeIndices.forEach(idx => {
    console.log(`Root Node ${idx}:`, gltf.nodes[idx]);
  });
}
