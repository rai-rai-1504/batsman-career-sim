import fs from 'fs';
import path from 'path';

const files = [
  'standing_idle.glb',
  'standing_jump_running.glb',
  'baseball_idle.glb',
  'baseball_pitching.glb',
  'baseball_strike.glb'
];

for (const file of files) {
  const animPath = path.resolve('public/models/animations', file);
  const buffer = fs.readFileSync(animPath);
  const chunk0Length = buffer.readUInt32LE(12);
  const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
  const gltf = JSON.parse(jsonBuffer.toString('utf8'));

  console.log(`\n=== ${file} ===`);
  console.log('Nodes count:', gltf.nodes?.length);
  console.log('Animations count:', gltf.animations?.length);
  gltf.animations?.forEach((a, i) => {
    console.log(`  Anim ${i}: "${a.name}" channels: ${a.channels?.length} samplers: ${a.samplers?.length}`);
  });
}
