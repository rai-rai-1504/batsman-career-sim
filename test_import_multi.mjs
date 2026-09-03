import { NullEngine, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testMulti() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const glbPath = path.resolve('public/models/player.glb');
  const buffer = fs.readFileSync(glbPath);
  const base64 = 'data:base64,' + buffer.toString('base64');

  console.log('Loading Striker...');
  const strikerRes = await SceneLoader.ImportMeshAsync('', '', base64, scene);
  const strikerRoot = strikerRes.meshes[0];
  strikerRoot.name = 'striker_root';
  strikerRoot.position = new Vector3(-0.3, 0, -8.8);
  console.log('Striker loaded, root position:', strikerRoot.position.toString());

  console.log('Loading Bowler...');
  const bowlerRes = await SceneLoader.ImportMeshAsync('', '', base64, scene);
  const bowlerRoot = bowlerRes.meshes[0];
  bowlerRoot.name = 'bowler_root';
  bowlerRoot.position = new Vector3(0.35, 0, 28.0);
  console.log('Bowler loaded, root position:', bowlerRoot.position.toString());

  console.log('Total scene meshes:', scene.meshes.length);
  console.log('Total scene skeletons:', scene.skeletons.length);

  engine.dispose();
}

testMulti().catch(console.error);
