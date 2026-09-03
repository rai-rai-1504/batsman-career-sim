import { NullEngine, Scene, SceneLoader, Vector3, Quaternion } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testQuat() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');

  const res = await SceneLoader.ImportMeshAsync('', '', charB64, scene);
  const root = res.meshes[0];

  console.log('root.rotationQuaternion before:', root.rotationQuaternion?.toString());
  console.log('root.rotation before:', root.rotation.toString());

  // If we set root.rotation.y = -0.62 without clearing rotationQuaternion:
  root.rotation.y = -0.62;
  console.log('Does root have rotationQuaternion?', root.rotationQuaternion !== null);

  // If rotationQuaternion is null:
  root.rotationQuaternion = null;
  root.rotation.y = -0.62;
  console.log('After clearing rotationQuaternion, root.rotation:', root.rotation.toString());

  engine.dispose();
}

testQuat().catch(console.error);
