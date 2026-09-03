import fs from 'fs';
import path from 'path';

const animPath = path.resolve('public/models/animations/idle.glb');
const buffer = fs.readFileSync(animPath);
const chunk0Length = buffer.readUInt32LE(12);
const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('Nodes count:', gltf.nodes?.length);
console.log('Animations count:', gltf.animations?.length);
gltf.animations?.forEach((a, i) => {
  console.log(`Animation ${i}: name: "${a.name}", channels: ${a.channels?.length}, samplers: ${a.samplers?.length}`);
  const targetNodes = a.channels.slice(0, 10).map(c => gltf.nodes[c.target.node]?.name);
  console.log('First 10 target nodes:', targetNodes);
});
