import fs from 'fs';
import path from 'path';

const glbPath = path.resolve('public/models/character.glb');
const buffer = fs.readFileSync(glbPath);
const chunk0Length = buffer.readUInt32LE(12);
const jsonBuffer = buffer.subarray(20, 20 + chunk0Length);
const gltf = JSON.parse(jsonBuffer.toString('utf8'));

console.log('Materials:', gltf.materials?.length);
gltf.materials?.forEach((m, i) => {
  console.log(`Material ${i}: "${m.name}" pbr:`, m.pbrMetallicRoughness);
});
console.log('Textures:', gltf.textures?.length);
console.log('Images:', gltf.images?.length);
gltf.images?.forEach((img, i) => {
  console.log(`Image ${i}: name: "${img.name}", mimeType: "${img.mimeType}", bufferView: ${img.bufferView}`);
});
