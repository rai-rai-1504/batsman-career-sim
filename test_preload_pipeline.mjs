import { NullEngine, Scene, SceneLoader, Vector3, AnimationGroup } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testPreloadPipeline() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('--- 1. Preloading Animation Templates ---');
  const animNames = ['standing_idle', 'baseball_idle', 'standing_jump_running', 'baseball_pitching', 'baseball_strike'];
  const animTemplates = new Map();

  for (const name of animNames) {
    const p = path.resolve('public/models/animations', `${name}.glb`);
    const buf = fs.readFileSync(p);
    const b64 = 'data:base64,' + buf.toString('base64');
    const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
    if (res.animationGroups[0]) {
      const ag = res.animationGroups[0];
      ag.name = `template_${name}`;
      ag.stop();
      res.meshes.forEach(m => m.setEnabled(false));
      animTemplates.set(name, ag);
      console.log(`Preloaded animation template "${name}" (${ag.targetedAnimations.length} channels)`);
    }
  }

  console.log('\n--- 2. Loading Character Mesh & Applying Animation Synchronously ---');
  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');

  const charResult = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  const root = charResult.meshes[0];

  // Immediately apply baseball_idle
  const template = animTemplates.get('baseball_idle');
  const batterIdle = new AnimationGroup('batter_baseball_idle', scene);
  template.targetedAnimations.forEach(ta => {
    const targetName = ta.target?.name || '';
    const match = charResult.transformNodes.find(tn => tn.name === targetName || tn.name.endsWith(targetName));
    if (match) {
      batterIdle.addTargetedAnimation(ta.animation, match);
    }
  });

  batterIdle.normalize(0, template.to);
  batterIdle.play(true);
  console.log('Batter baseball_idle active and playing immediately on frame 0, isPlaying:', batterIdle.isPlaying);

  engine.dispose();
  console.log('Test completed with zero crashes!');
}

testPreloadPipeline().catch(console.error);
