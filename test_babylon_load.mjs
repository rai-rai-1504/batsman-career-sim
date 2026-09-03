import { NullEngine, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function test() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('Testing SceneLoader.ImportMeshAsync on /public/models/player.glb...');
  const glbPath = path.resolve('public/models/player.glb');
  const buffer = fs.readFileSync(glbPath);
  const base64 = 'data:base64,' + buffer.toString('base64');

  const result = await SceneLoader.ImportMeshAsync('', '', base64, scene);
  console.log('--- POINT 1 & 2: Load Resolution ---');
  console.log('ImportMeshAsync resolved successfully!');
  console.log('Returned meshes count:', result.meshes.length);
  console.log('Returned skeletons count:', result.skeletons.length);
  console.log('Returned transformNodes count:', result.transformNodes?.length);
  console.log('Returned animationGroups count:', result.animationGroups?.length);

  console.log('\n--- POINT 3: Returned Meshes Details ---');
  result.meshes.forEach((m, i) => {
    console.log(`Mesh ${i}: "${m.name}" | isVisible: ${m.isVisible} | isEnabled: ${m.isEnabled()} | parent: "${m.parent?.name || 'none'}" | position: ${m.position.toString()} | scaling: ${m.scaling.toString()}`);
  });

  console.log('\n--- POINT 4: Transform Hierarchy & Scaling ---');
  result.transformNodes?.forEach((tn, i) => {
    console.log(`TransformNode ${i}: "${tn.name}" | parent: "${tn.parent?.name || 'none'}" | position: ${tn.position.toString()} | scaling: ${tn.scaling.toString()} | rotationQuaternion: ${tn.rotationQuaternion?.toString() || 'none'}`);
  });

  if (result.skeletons[0]) {
    const skel = result.skeletons[0];
    console.log('\n--- POINT 5: Skeleton & Bones ---');
    console.log(`Skeleton "${skel.name}" has ${skel.bones.length} bones.`);
    console.log('First 10 bones:', skel.bones.slice(0, 10).map(b => b.name));
  }

  engine.dispose();
}

test().catch(err => {
  console.error('Test error:', err);
});
