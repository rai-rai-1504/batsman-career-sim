import fs from 'fs';
import path from 'path';

function createTinyPng() {
  // 1x1 transparent/neutral PNG (67 bytes)
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

async function optimizeGlb() {
  const inputPath = path.resolve('public/models/player.glb');
  const outPath = path.resolve('public/models/player_optimized.glb');
  const buf = fs.readFileSync(inputPath);

  const chunk0Length = buf.readUInt32LE(12);
  const jsonBuffer = buf.subarray(20, 20 + chunk0Length);
  const gltf = JSON.parse(jsonBuffer.toString('utf8'));

  const binChunkOffset = 20 + chunk0Length;
  const binChunkLength = buf.readUInt32LE(binChunkOffset);
  const binBuffer = buf.subarray(binChunkOffset + 8, binChunkOffset + 8 + binChunkLength);

  console.log(`Original GLB size: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Original binBuffer size: ${(binBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Create clean GLTF with lightweight images
  const tinyPng = createTinyPng();
  
  // Rebuild binary buffer with geometry/animations only
  const newBufferViews = [];
  const newBuffers = [];
  let currentOffset = 0;

  // Keep non-image bufferViews
  const imageBvIndices = new Set((gltf.images || []).map(img => img.bufferView));

  const bvOffsetMap = new Map();

  const newBinChunks = [];

  for (let i = 0; i < gltf.bufferViews.length; i++) {
    const bv = gltf.bufferViews[i];
    if (imageBvIndices.has(i)) {
      // Replace image bufferView with tinyPng
      const newBv = {
        buffer: 0,
        byteOffset: currentOffset,
        byteLength: tinyPng.length,
      };
      newBufferViews.push(newBv);
      newBinChunks.push(tinyPng);
      // Align to 4 bytes
      const pad = (4 - (tinyPng.length % 4)) % 4;
      if (pad > 0) newBinChunks.push(Buffer.alloc(pad));
      currentOffset += tinyPng.length + pad;
    } else {
      const chunk = binBuffer.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
      const newBv = {
        ...bv,
        buffer: 0,
        byteOffset: currentOffset,
        byteLength: bv.byteLength,
      };
      newBufferViews.push(newBv);
      newBinChunks.push(chunk);
      // Align to 4 bytes
      const pad = (4 - (bv.byteLength % 4)) % 4;
      if (pad > 0) newBinChunks.push(Buffer.alloc(pad));
      currentOffset += bv.byteLength + pad;
    }
  }

  const combinedBin = Buffer.concat(newBinChunks);
  gltf.bufferViews = newBufferViews;
  gltf.buffers[0].byteLength = combinedBin.length;

  const newJsonStr = JSON.stringify(gltf);
  const jsonPad = (4 - (Buffer.byteLength(newJsonStr) % 4)) % 4;
  const paddedJsonStr = newJsonStr + ' '.repeat(jsonPad);
  const jsonBuf = Buffer.from(paddedJsonStr, 'utf8');

  const totalLength = 12 + 8 + jsonBuf.length + 8 + combinedBin.length;
  const outBuf = Buffer.alloc(totalLength);

  // Header
  outBuf.writeUInt32LE(0x46546C67, 0); // "glTF"
  outBuf.writeUInt32LE(2, 4);          // version 2
  outBuf.writeUInt32LE(totalLength, 8); // total length

  // Chunk 0: JSON
  outBuf.writeUInt32LE(jsonBuf.length, 12);
  outBuf.writeUInt32LE(0x4E4F534A, 16); // "JSON"
  jsonBuf.copy(outBuf, 20);

  // Chunk 1: BIN
  const binHeaderOffset = 20 + jsonBuf.length;
  outBuf.writeUInt32LE(combinedBin.length, binHeaderOffset);
  outBuf.writeUInt32LE(0x004E4942, binHeaderOffset + 4); // "BIN\0"
  combinedBin.copy(outBuf, binHeaderOffset + 8);

  fs.writeFileSync(outPath, outBuf);
  console.log(`Optimized GLB written to ${outPath}!`);
  console.log(`Optimized GLB size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`);
}

optimizeGlb().catch(console.error);
