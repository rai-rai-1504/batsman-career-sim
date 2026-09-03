import { NullEngine, Scene, SceneLoader, Vector3, AnimationGroup } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testAnim() {
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

  const animContainer = await SceneLoader.LoadAssetContainerAsync('', '', animBase64, scene);
  console.log('Animation loaded with', animContainer.animationGroups.length, 'animation groups.');

  const idleGroupTemplate = animContainer.animationGroups[0];
  console.log('Template name:', idleGroupTemplate.name, 'targeted animations:', idleGroupTemplate.targetedAnimations.length);

  // Retarget animation onto character
  const charIdle = new AnimationGroup('striker_idle', scene);
  let matchedCount = 0;

  idleGroupTemplate.targetedAnimations.forEach(ta => {
    const origTarget = ta.target;
    const targetName = origTarget?.name || '';
    
    // Find matching transform node in charResult
    const match = charResult.transformNodes.find(tn => tn.name === targetName || tn.name.endsWith(targetName));
    if (match) {
      charIdle.addTargetedAnimation(ta.animation, match);
      matchedCount++;
    }
  });

  console.log(`Successfully retargeted ${matchedCount} / ${idleGroupTemplate.targetedAnimations.length} animation channels!`);

  charIdle.play(true);
  console.log('charIdle isPlaying:', charIdle.isPlaying);

  // Step scene
  scene.render();
  console.log('Scene rendered with active animation at frame 0!');

  engine.dispose();
}

testAnim().catch(console.error);
