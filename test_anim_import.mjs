import { NullEngine, Scene, SceneLoader, Vector3, AnimationGroup } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testAnimImport() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const glbPath = path.resolve('public/models/player.glb');
  const buffer = fs.readFileSync(glbPath);
  const base64 = 'data:base64,' + buffer.toString('base64');

  const charResult = await SceneLoader.ImportMeshAsync('', '', base64, scene);
  console.log('Character loaded with', charResult.transformNodes.length, 'transform nodes.');

  const animPath = path.resolve('public/models/animations/idle.glb');
  const animBuffer = fs.readFileSync(animPath);
  const animBase64 = 'data:base64,' + animBuffer.toString('base64');

  const animResult = await SceneLoader.ImportMeshAsync('', '', animBase64, scene);
  console.log('Animation imported with', animResult.animationGroups.length, 'animation groups.');

  const idleGroup = animResult.animationGroups[0];
  console.log('Animation Group Name:', idleGroup.name);
  console.log('Channels count:', idleGroup.targetedAnimations.length);

  // Re-target onto character transform nodes
  const charIdle = new AnimationGroup('striker_idle', scene);
  let matched = 0;
  idleGroup.targetedAnimations.forEach(ta => {
    const targetName = ta.target?.name || '';
    const nodeMatch = charResult.transformNodes.find(tn => tn.name === targetName);
    if (nodeMatch) {
      charIdle.addTargetedAnimation(ta.animation, nodeMatch);
      matched++;
    }
  });

  console.log(`Matched and re-targeted ${matched} / ${idleGroup.targetedAnimations.length} channels.`);
  charIdle.play(true);
  console.log('charIdle isPlaying:', charIdle.isPlaying);

  scene.render();
  console.log('Scene render successful with active idle animation!');

  engine.dispose();
}

testAnimImport().catch(console.error);
