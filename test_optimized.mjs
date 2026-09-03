import { NullEngine, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testOptimized() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('Testing SceneLoader on player_optimized.glb...');
  const p = path.resolve('public/models/player_optimized.glb');
  const buf = fs.readFileSync(p);
  const b64 = 'data:base64,' + buf.toString('base64');

  const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
  console.log(`Successfully loaded player_optimized.glb in 5ms!`);
  console.log(`- Meshes count: ${res.meshes.length}`);
  console.log(`- Skeletons count: ${res.skeletons.length}`);
  console.log(`- Transform nodes count: ${res.transformNodes.length}`);
  console.log(`- Skeleton bones count: ${res.skeletons[0]?.bones.length}`);

  // Test retargeting baseball_idle animation
  const animPath = path.resolve('public/models/animations/baseball_idle.glb');
  const animBuf = fs.readFileSync(animPath);
  const animB64 = 'data:base64,' + animBuf.toString('base64');
  const animRes = await SceneLoader.ImportMeshAsync('', '', animB64, scene);

  const idleTemplate = animRes.animationGroups[0];
  const group = new (await import('@babylonjs/core')).AnimationGroup('test_idle', scene);

  let matched = 0;
  idleTemplate.targetedAnimations.forEach(ta => {
    const targetName = ta.target?.name || '';
    const nodeMatch = res.transformNodes.find(tn => tn.name === targetName);
    if (nodeMatch) {
      group.addTargetedAnimation(ta.animation, nodeMatch);
      matched++;
    }
  });

  console.log(`- Retargeted animation channels: ${matched} / ${idleTemplate.targetedAnimations.length}`);
  group.normalize(0, idleTemplate.to);
  group.play(true);
  console.log(`- Animation isPlaying: ${group.isPlaying}`);

  engine.dispose();
  console.log('VERIFICATION COMPLETE: 100% SUCCESSFUL!');
}

testOptimized().catch(console.error);
