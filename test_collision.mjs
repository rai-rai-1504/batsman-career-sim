import { NullEngine, Scene, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testCollision() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  console.log('1. Loading animation file first...');
  const animPath = path.resolve('public/models/animations/standing_idle.glb');
  const animBuf = fs.readFileSync(animPath);
  const animB64 = 'data:base64,' + animBuf.toString('base64');
  await SceneLoader.ImportMeshAsync('', '', animB64, scene);
  console.log('Scene transformNodes after animation load:', scene.transformNodes.length);

  console.log('\n2. Loading character player.glb into SAME scene...');
  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');
  const charRes = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  console.log('Character meshes returned:', charRes.meshes.length);
  console.log('Character skeletons returned:', charRes.skeletons.length);
  console.log('Character transformNodes in scene:', scene.transformNodes.length);

  // Check bone names on skeleton
  const skel = charRes.skeletons[0];
  console.log('Skeleton bone 0 transform node name:', skel.bones[0].getTransformNode()?.name);

  engine.dispose();
}

testCollision().catch(console.error);
