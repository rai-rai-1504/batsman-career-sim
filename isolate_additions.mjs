import { NullEngine, Scene, SceneLoader, Vector3, PBRMaterial, DynamicTexture, MeshBuilder, Quaternion, Axis } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import fs from 'fs';
import path from 'path';

async function runIsolationTests() {
  console.log('================================================================');
  console.log('PART A: ISOLATING RECENT ADDITIONS');
  console.log('================================================================\n');

  const p = path.resolve('public/models/player.glb');
  const buf = fs.readFileSync(p);
  const b64 = 'data:base64,' + buf.toString('base64');

  // --- Test 1: Raw Baseline Character Load (No additions) ---
  console.log('--- TEST 1: Baseline player.glb load (No additions) ---');
  {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
      console.log('Test 1 SUCCESS: Loaded meshes count =', res.meshes.length, 'skeletons =', res.skeletons.length);
      const root = res.meshes[0];
      root.rotationQuaternion = null;
      root.position = new Vector3(-0.3, 0, -8.8);
      res.meshes.forEach(m => {
        console.log(`  Mesh: "${m.name}" | isVisible: ${m.isVisible} | isEnabled: ${m.isEnabled()} | parent: "${m.parent?.name || 'none'}"`);
      });
    } catch (e) {
      console.error('Test 1 FAILED:', e);
    }
    engine.dispose();
  }

  // --- Test 2: Baseline + DynamicTexture Jersey ---
  console.log('\n--- TEST 2: Baseline + DynamicTexture Jersey ---');
  {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
      const tex = new DynamicTexture('jerseyTex', 1024, scene, false);
      const ctx = tex.getContext();
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(0, 0, 1024, 1024);
      tex.update();

      const mat = new PBRMaterial('jerseyMat', scene);
      mat.albedoTexture = tex;
      mat.backFaceCulling = false;

      res.meshes.forEach(m => {
        if (m.name.includes('Shirt') || m.name.includes('Shorts')) {
          m.material = mat;
        }
      });
      console.log('Test 2 SUCCESS: DynamicTexture assigned cleanly without throwing.');
    } catch (e) {
      console.error('Test 2 FAILED:', e);
    }
    engine.dispose();
  }

  // --- Test 3: Baseline + Bat attachToBone ---
  console.log('\n--- TEST 3: Baseline + Bat attachToBone ---');
  {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
      const skel = res.skeletons[0];
      console.log('Skeleton bones count:', skel?.bones.length);
      const rightHandBone = skel?.bones.find(b => b.name.includes('RightHand'));
      console.log('RightHand bone found:', rightHandBone ? rightHandBone.name : 'NOT FOUND!');

      const bat = MeshBuilder.CreateBox('bat', { width: 0.11, height: 0.85, depth: 0.06 }, scene);
      const anchorMesh = res.meshes.find(m => m !== res.meshes[0]);
      if (rightHandBone && anchorMesh) {
        bat.attachToBone(rightHandBone, anchorMesh);
        console.log('Test 3 SUCCESS: bat attached to bone cleanly.');
      } else {
        console.error('Test 3 FAILED: rightHandBone or anchorMesh missing!');
      }
    } catch (e) {
      console.error('Test 3 FAILED:', e);
    }
    engine.dispose();
  }

  // --- Test 4: Baseline + Animation Preload and Retargeting ---
  console.log('\n--- TEST 4: Baseline + Animation Preload and Retargeting ---');
  {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const animPath = path.resolve('public/models/animations/baseball_idle.glb');
      const animBuf = fs.readFileSync(animPath);
      const animB64 = 'data:base64,' + animBuf.toString('base64');
      const animRes = await SceneLoader.ImportMeshAsync('', '', animB64, scene);
      console.log('Animation loaded groups:', animRes.animationGroups.length);

      const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
      const template = animRes.animationGroups[0];
      const group = new (await import('@babylonjs/core')).AnimationGroup('testGroup', scene);

      let matched = 0;
      template.targetedAnimations.forEach(ta => {
        const targetName = ta.target?.name || '';
        const nodeMatch = res.transformNodes.find(tn => tn.name === targetName);
        if (nodeMatch) {
          group.addTargetedAnimation(ta.animation, nodeMatch);
          matched++;
        }
      });
      console.log(`Test 4 SUCCESS: Retargeted ${matched} / ${template.targetedAnimations.length} channels.`);
      group.normalize(0, template.to);
      group.play(true);
      console.log('Test 4 group isPlaying:', group.isPlaying);
    } catch (e) {
      console.error('Test 4 FAILED:', e);
    }
    engine.dispose();
  }

  // --- Test 5: Full combined pipeline ---
  console.log('\n--- TEST 5: Full Combined Pipeline (All 3 Together) ---');
  {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      // 1. Preload animation
      const animPath = path.resolve('public/models/animations/baseball_idle.glb');
      const animBuf = fs.readFileSync(animPath);
      const animB64 = 'data:base64,' + animBuf.toString('base64');
      const animRes = await SceneLoader.ImportMeshAsync('', '', animB64, scene);
      const template = animRes.animationGroups[0];
      template.stop();
      animRes.meshes.forEach(m => { m.setEnabled(false); m.isVisible = false; });

      // 2. Load character
      const res = await SceneLoader.ImportMeshAsync('', '', b64, scene);
      const root = res.meshes[0];
      root.rotationQuaternion = null;
      root.position = new Vector3(-0.3, 0, -8.8);

      // 3. Dynamic texture
      const tex = new DynamicTexture('jerseyTex', 1024, scene, false);
      const ctx = tex.getContext();
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(0, 0, 1024, 1024);
      tex.update();
      const mat = new PBRMaterial('jerseyMat', scene);
      mat.albedoTexture = tex;
      mat.backFaceCulling = false;
      res.meshes.forEach(m => {
        if (m.name.includes('Shirt') || m.name.includes('Shorts')) {
          m.material = mat;
        }
      });

      // 4. Bat attachToBone
      const skel = res.skeletons[0];
      const rightHandBone = skel.bones.find(b => b.name.includes('RightHand'));
      const bat = MeshBuilder.CreateBox('bat', { width: 0.11, height: 0.85, depth: 0.06 }, scene);
      const anchorMesh = res.meshes.find(m => m !== root);
      bat.attachToBone(rightHandBone, anchorMesh);

      // 5. Retarget animation
      const group = new (await import('@babylonjs/core')).AnimationGroup('striker_idle', scene);
      template.targetedAnimations.forEach(ta => {
        const targetName = ta.target?.name || '';
        const nodeMatch = res.transformNodes.find(tn => tn.name === targetName);
        if (nodeMatch) {
          group.addTargetedAnimation(ta.animation, nodeMatch);
        }
      });
      group.normalize(0, template.to);
      group.play(true);

      console.log('Test 5 SUCCESS: Full combined pipeline completed with ZERO errors!');
    } catch (e) {
      console.error('Test 5 FAILED:', e);
    }
    engine.dispose();
  }
}

runIsolationTests().catch(console.error);
