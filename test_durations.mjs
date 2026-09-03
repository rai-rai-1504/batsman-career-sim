import { NullEngine, Scene, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testDurations() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const files = [
    'standing_idle.glb',
    'standing_jump_running.glb',
    'baseball_idle.glb',
    'baseball_pitching.glb',
    'baseball_strike.glb'
  ];

  for (const file of files) {
    const p = path.resolve('public/models/animations', file);
    const buf = fs.readFileSync(p);
    const b64 = 'data:base64,' + buf.toString('base64');
    const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
    if (res.animationGroups[0]) {
      const ag = res.animationGroups[0];
      console.log(`${file}: from ${ag.from} to ${ag.to} (duration frames / speed)`);
    }
  }

  engine.dispose();
}

testDurations().catch(console.error);
