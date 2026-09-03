import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/player.glb');
const buf = fs.readFileSync(glbPath);

const chunk0Length = buf.readUInt32LE(12);
const jsonBuffer = buf.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('GLTF JSON summary:');
console.log('- Images count:', gltf.images?.length);
console.log('- Textures count:', gltf.textures?.length);
console.log('- Materials count:', gltf.materials?.length);
console.log('- Buffers count:', gltf.buffers?.length, 'total byteLength:', gltf.buffers?.[0]?.byteLength);

gltf.images?.forEach((img, i) => {
  const bv = gltf.bufferViews[img.bufferView];
  console.log(`  Image ${i}: name: "${img.name}", mimeType: ${img.mimeType}, size: ${bv?.byteLength} bytes (${((bv?.byteLength || 0) / 1024 / 1024).toFixed(2)} MB)`);
});
