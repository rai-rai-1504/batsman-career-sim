import { NullEngine, Scene, SceneLoader, Vector3, Color3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function diagnose() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('=== STEP 1: PRELOAD ANIMATIONS ===');
  const animList = [
    'standing_idle',
    'baseball_idle',
    'standing_jump_running',
    'baseball_pitching',
    'baseball_strike',
  ];
  const animationTemplates = new Map();

  for (const name of animList) {
    const p = path.resolve('public/models/animations', `${name}.glb`);
    const buf = fs.readFileSync(p);
    const b64 = 'data:base64,' + buf.toString('base64');
    const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
    if (res.animationGroups && res.animationGroups.length > 0) {
      const ag = res.animationGroups[0];
      ag.name = `template_${name}`;
      ag.stop();
      res.meshes.forEach(m => {
        m.setEnabled(false);
        m.isVisible = false;
      });
      animationTemplates.set(name, ag);
      console.log(`Preloaded: "${name}" -> channels: ${ag.targetedAnimations.length}`);
    }
  }

  console.log('\n=== STEP 2: LOAD STRIKER CHARACTER ===');
  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');

  const result = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  console.log('Striker meshes count:', result.meshes.length);
  console.log('Striker transform nodes count:', result.transformNodes.length);
  console.log('Striker skeletons count:', result.skeletons.length);

  const rootMesh = result.meshes[0];
  rootMesh.name = 'character_root_striker';
  rootMesh.position = new Vector3(-0.3, 0, -8.8);

  const allTransformNodes = result.transformNodes || [];

  console.log('\n=== STEP 3: RETARGET ANIMATION ON STRIKER ===');
  const template = animationTemplates.get('baseball_idle');
  console.log('baseball_idle template channels:', template.targetedAnimations.length);

  const group = scene.getAnimationGroupByName('striker_baseball_idle') || new (await import('@babylonjs/core')).AnimationGroup('striker_baseball_idle', scene);

  let matched = 0;
  template.targetedAnimations.forEach((ta) => {
    const targetName = ta.target?.name || '';
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const nodeMatch = allTransformNodes.find((tn) => {
      const cleanTn = tn.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanTn.endsWith(cleanName) || cleanTn.includes(cleanName);
    });

    if (nodeMatch) {
      group.addTargetedAnimation(ta.animation, nodeMatch);
      matched++;
    }
  });

  console.log(`Matched and bound: ${matched} / ${template.targetedAnimations.length} animation channels`);
  group.normalize(0, template.to);
  group.play(true);
  console.log('group isPlaying:', group.isPlaying);

  console.log('\n=== STEP 4: MESH VISIBILITY & TRANSFORM CHECK ===');
  result.meshes.forEach((m, idx) => {
    console.log(`Mesh ${idx}: "${m.name}" | isVisible: ${m.isVisible} | isEnabled: ${m.isEnabled()} | parent: "${m.parent?.name || 'none'}"`);
  });

  engine.dispose();
  console.log('\nALL DIAGNOSTIC STEPS COMPLETED 100% CLEANLY!');
}

diagnose().catch(err => {
  console.error('DIAGNOSTIC ERROR:', err);
});
