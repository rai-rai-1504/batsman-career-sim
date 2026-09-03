import { NullEngine, Scene, SceneLoader, PBRMaterial } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testTransparency() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const p = path.resolve('public/models/player.glb');
  const buf = fs.readFileSync(p);
  const b64 = 'data:base64,' + buf.toString('base64');

  const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
  
  console.log('Inspecting imported meshes and materials for transparency...');
  res.meshes.forEach(m => {
    if (m.material) {
      const mat = m.material;
      console.log(`Mesh: "${m.name}" | Mat: "${mat.name}" | hasAlpha: ${mat.hasAlpha} | needAlphaBlending: ${mat.needAlphaBlending()} | needAlphaTesting: ${mat.needAlphaTesting()} | transparencyMode: ${mat.transparencyMode}`);
      if (mat.albedoTexture) {
        console.log(`   -> albedoTexture: hasAlpha: ${mat.albedoTexture.hasAlpha}`);
      }
    }
  });

  engine.dispose();
}

testTransparency().catch(console.error);
