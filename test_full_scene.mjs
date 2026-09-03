import { NullEngine, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testFullScene() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('--- Step 1: Preload Animation Templates ---');
  const animList = [
    'standing_idle',
    'baseball_idle',
    'standing_jump_running',
    'baseball_pitching',
    'baseball_strike',
  ];
  const animTemplates = new Map();

  for (const name of animList) {
    const p = path.resolve('public/models/animations', `${name}.glb`);
    const buf = fs.readFileSync(p);
    const b64 = 'data:base64,' + buf.toString('base64');
    const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
    if (res.animationGroups && res.animationGroups.length > 0) {
      const ag = res.animationGroups[0];
      ag.name = `template_${name}`;
      ag.stop();
      res.meshes.forEach(m => m.setEnabled(false));
      animTemplates.set(name, ag);
      console.log(`Preloaded: ${name}`);
    }
  }

  console.log('\n--- Step 2: Load Striker ---');
  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');

  const strikerRes = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  console.log('Striker loaded, meshes:', strikerRes.meshes.length);

  console.log('\n--- Step 3: Load Bowler ---');
  const bowlerRes = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  console.log('Bowler loaded, meshes:', bowlerRes.meshes.length);

  console.log('\n--- Step 4: Load 5 Fielders ---');
  for (let i = 0; i < 5; i++) {
    const fielderRes = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
    console.log(`Fielder ${i + 1} loaded, meshes:`, fielderRes.meshes.length);
  }

  console.log('\n--- Scene Summary ---');
  console.log('Total Scene Meshes:', scene.meshes.length);
  console.log('Total Skeletons:', scene.skeletons.length);
  console.log('Total Animation Groups:', scene.animationGroups.length);

  engine.dispose();
  console.log('SUCCESS: Full scene loaded without any errors!');
}

testFullScene().catch(err => {
  console.error('FULL SCENE TEST FAILED:', err);
});
