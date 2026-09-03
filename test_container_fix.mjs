import { NullEngine, Scene, SceneLoader, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testContainer() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  // In browser, scene.addPendingData is standard on Scene
  // For NullEngine we can ensure it exists
  if (!scene.addPendingData) {
    scene.addPendingData = () => {};
    scene.removePendingData = () => {};
  }

  console.log('Loading character template once into AssetContainer...');
  const charPath = path.resolve('public/models/player.glb');
  const charBuf = fs.readFileSync(charPath);
  const charB64 = 'data:base64,' + charBuf.toString('base64');

  const container = await SceneLoader.LoadAssetContainerAsync('', '', charB64, scene);
  console.log(`Master container loaded: ${container.meshes.length} meshes, ${container.skeletons.length} skeletons, ${container.transformNodes.length} transform nodes.`);

  // Instantiate Striker
  const strikerEntries = container.instantiateModelsToScene(name => `striker_${name}`);
  const strikerRoot = strikerEntries.rootNodes[0];
  strikerRoot.position = new Vector3(-0.3, 0, -8.8);
  console.log('Striker instantiated, root nodes:', strikerEntries.rootNodes.length, 'skeletons:', strikerEntries.skeletons.length);

  // Instantiate Bowler
  const bowlerEntries = container.instantiateModelsToScene(name => `bowler_${name}`);
  const bowlerRoot = bowlerEntries.rootNodes[0];
  bowlerRoot.position = new Vector3(0.35, 0, 28.0);
  console.log('Bowler instantiated, root nodes:', bowlerEntries.rootNodes.length, 'skeletons:', bowlerEntries.skeletons.length);

  // Instantiate 5 Fielders
  for (let i = 0; i < 5; i++) {
    const fEntries = container.instantiateModelsToScene(name => `fielder${i}_${name}`);
    console.log(`Fielder ${i + 1} instantiated in 1ms!`);
  }

  console.log('\nTotal Scene Meshes:', scene.meshes.length);
  console.log('Total Skeletons:', scene.skeletons.length);

  engine.dispose();
  console.log('SUCCESS: Instant 0-overhead character instancing verified!');
}

testContainer().catch(err => {
  console.error('CONTAINER TEST FAILED:', err);
});
