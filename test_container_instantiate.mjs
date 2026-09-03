import { NullEngine, Scene, SceneLoader, Vector3, Matrix } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function testClone() {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const glbPath = path.resolve('public/models/player.glb');
  const buffer = fs.readFileSync(glbPath);
  const base64 = 'data:base64,' + buffer.toString('base64');

  // Load container
  const container = await SceneLoader.LoadAssetContainerAsync('', '', base64, scene);
  console.log('Container loaded:', container.meshes.length, 'meshes,', container.skeletons.length, 'skeletons');

  // Instantiate 1: Striker
  const entries1 = container.instantiateModelsToScene(name => `striker_${name}`);
  console.log('Instantiate 1 (striker):', {
    rootNodes: entries1.rootNodes.map(n => n.name),
    skeletons: entries1.skeletons.map(s => s.name),
    childMeshes: entries1.rootNodes[0]?.getChildMeshes().map(m => m.name),
  });

  // Check world transform of striker body mesh
  scene.render();
  const strikerBody = scene.getMeshByName('striker_Ch38_Body');
  if (strikerBody) {
    const wm = strikerBody.computeWorldMatrix(true);
    console.log('Striker Ch38_Body isVisible:', strikerBody.isVisible, 'isEnabled:', strikerBody.isEnabled());
    console.log('Striker Ch38_Body World Matrix Translation:', wm.getTranslation().toString());
  }

  // Instantiate 2: Bowler
  const entries2 = container.instantiateModelsToScene(name => `bowler_${name}`);
  console.log('Instantiate 2 (bowler):', {
    rootNodes: entries2.rootNodes.map(n => n.name),
    skeletons: entries2.skeletons.map(s => s.name),
  });

  scene.render();
  const bowlerBody = scene.getMeshByName('bowler_Ch38_Body');
  if (bowlerBody) {
    console.log('Bowler Ch38_Body isVisible:', bowlerBody.isVisible, 'isEnabled:', bowlerBody.isEnabled());
  }

  engine.dispose();
}

testClone().catch(console.error);
