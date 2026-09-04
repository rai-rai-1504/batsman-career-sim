import {
  Scene,
  Vector3,
  MeshBuilder,
  PBRMaterial,
  Mesh,
  TransformNode,
  ShadowGenerator,
  Skeleton,
  Bone,
  Quaternion,
  Axis,
  SceneLoader,
  AbstractMesh,
  AnimationGroup,
  Color3,
  Matrix,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Team } from '../types';
import { createWillowBatTexture, createJerseyTexture } from './textures';

export const PITCH_CENTRE = new Vector3(0, 0, 0.5);

export interface HumanoidBones {
  root?: Bone;
  hips?: Bone;
  rightHand?: Bone;
}

export interface PlayerCharacterRig {
  root: TransformNode;
  characterMesh: AbstractMesh | TransformNode;
  allMeshes: AbstractMesh[];
  allTransformNodes: TransformNode[];
  skeleton: Skeleton | null;
  bones: HumanoidBones;
  animationGroups: AnimationGroup[];
  activeAnimationGroup?: AnimationGroup | null;
  bat?: Mesh;
  isBatter: boolean;
  isBowler: boolean;
  isFielder: boolean;
  playAnimation: (animName: string, loop?: boolean, speedRatio?: number, fromFrame?: number, toFrame?: number) => Promise<AnimationGroup | null>;
}

// Per-scene animation cache (keyed by scene uid to avoid stale refs across disposes)
const sceneAnimationCache = new Map<string, Map<string, AnimationGroup>>();

function getOrCreateSceneCache(scene: Scene): Map<string, AnimationGroup> {
  const uid = String((scene as any).uid ?? scene.getUniqueId?.() ?? Math.random());
  if (!sceneAnimationCache.has(uid)) {
    sceneAnimationCache.set(uid, new Map());
    // Clean up when scene is disposed
    scene.onDisposeObservable.addOnce(() => {
      sceneAnimationCache.delete(uid);
    });
  }
  return sceneAnimationCache.get(uid)!;
}

export async function preloadAllAnimationTemplates(scene: Scene): Promise<void> {
  const cache = getOrCreateSceneCache(scene);
  const animList: Array<{ name: string; path: string; file: string }> = [
    // Standard locomotion & bowler animations
    { name: 'standing_idle', path: '/models/animations/', file: 'standing_idle.glb' },
    { name: 'baseball_idle', path: '/models/animations/', file: 'baseball_idle.glb' },
    { name: 'standing_jump_running', path: '/models/animations/', file: 'standing_jump_running.glb' },
    { name: 'baseball_pitching', path: '/models/animations/', file: 'baseball_pitching.glb' },
    { name: 'baseball_strike', path: '/models/animations/', file: 'baseball_strike.glb' },

    // Authentic Cricket Animations
    { name: 'new_batsman_idle', path: '/models/animations/new animations/', file: 'new batsman idle.glb' },
    { name: 'pull_shot', path: '/models/animations/new animations/', file: 'pull shot.glb' },
    { name: 'flick_shot', path: '/models/animations/new animations/', file: 'flick shot.glb' },
    { name: 'defense', path: '/models/animations/new animations/', file: 'defense.glb' },
    { name: 'reverse_sweep', path: '/models/animations/new animations/', file: 'reverse sweep.glb' },
    { name: 'sweep_shot', path: '/models/animations/new animations/', file: 'sweep shot.glb' },
    { name: 'straight_hit_loft', path: '/models/animations/new animations/', file: 'straight hit (loft).glb' },
    { name: 'straight_hit_chip', path: '/models/animations/new animations/', file: 'straight hit (chip).glb' },
    { name: 'batsman_out', path: '/models/animations/new animations/', file: 'batsman out.glb' },
    { name: 'batsman_post_shot', path: '/models/animations/new animations/', file: 'batsman (post shot).glb' },
  ];

  for (const item of animList) {
    if (cache.has(item.name)) continue;
    // Abort if scene was disposed while we were loading a previous animation
    if ((scene as any).isDisposed) {
      console.warn(`[AnimLoader] Scene disposed — aborting preload at "${item.name}"`);
      return;
    }
    try {
      console.log(`[AnimLoader] Loading ${item.path}${item.file}`);
      let res: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>;
      try {
        res = await SceneLoader.ImportMeshAsync('', item.path, item.file, scene);
      } catch (firstErr) {
        // Fallback for straight hit (chip) if named (ship)
        if (item.name === 'straight_hit_chip') {
          res = await SceneLoader.ImportMeshAsync('', item.path, 'straight hit (ship).glb', scene);
        } else {
          throw firstErr;
        }
      }
      // Re-check after async gap
      if ((scene as any).isDisposed) return;
      if (res.animationGroups?.length > 0) {
        const ag = res.animationGroups[0];
        ag.name = `template_${item.name}`;
        ag.stop();
        res.meshes.forEach(m => { m.setEnabled(false); m.isVisible = false; });
        cache.set(item.name, ag);
        console.log(`[AnimLoader] Cached "${item.name}" (${ag.targetedAnimations.length} channels)`);
      } else {
        console.warn(`[AnimLoader] No animation groups in ${item.file}`);
      }
    } catch (err) {
      console.error(`[AnimLoader] FAILED to load ${item.file}:`, err);
    }
  }
}

export function playRetargetedAnimation(
  rig: PlayerCharacterRig,
  animTemplate: AnimationGroup,
  animName: string,
  loop: boolean = true,
  speedRatio: number = 1.0,
  fromFrame?: number,
  toFrame?: number
): AnimationGroup {
  const scene = rig.root.getScene();
  const group = new AnimationGroup(`${rig.root.name}_${animName}_${Date.now()}`, scene);

  let matched = 0;
  animTemplate.targetedAnimations.forEach(ta => {
    const targetName = ta.target?.name ?? '';
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nodeMatch = rig.allTransformNodes.find(tn => {
      const cleanTn = tn.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanTn === cleanName || cleanTn.endsWith(cleanName) || cleanTn.includes(cleanName);
    });
    if (nodeMatch) {
      group.addTargetedAnimation(ta.animation, nodeMatch);
      matched++;
    }
  });

  if (matched === 0) {
    console.warn(`[AnimRetarget] ZERO channels matched for "${animName}" on rig "${rig.root.name}"!`);
  }

  if (fromFrame !== undefined && toFrame !== undefined) {
    group.normalize(fromFrame, toFrame);
    group.start(loop, speedRatio, fromFrame, toFrame);
  } else {
    group.normalize(0, animTemplate.to);
    group.speedRatio = speedRatio;
    group.play(loop);
  }

  return group;
}

export async function playRigAnimation(
  rig: PlayerCharacterRig,
  animName: string,
  loop: boolean = true,
  speedRatio: number = 1.0,
  fromFrame?: number,
  toFrame?: number
): Promise<AnimationGroup | null> {
  const scene = rig.root.getScene();
  const cache = getOrCreateSceneCache(scene);
  const resolvedName = animName === 'baseball_hit' ? 'baseball_strike' : animName;
  const template = cache.get(resolvedName) || cache.get(animName);

  if (!template) {
    console.warn(`[AnimLoader] Template "${animName}" not in cache. Available:`, [...cache.keys()]);
    return null;
  }

  if (rig.activeAnimationGroup) {
    try { rig.activeAnimationGroup.stop(); } catch (_) {}
  }

  const group = playRetargetedAnimation(rig, template, animName, loop, speedRatio, fromFrame, toFrame);
  rig.activeAnimationGroup = group;
  return group;
}

function findBone(skeleton: Skeleton, nameFragment: string): Bone | undefined {
  const clean = nameFragment.toLowerCase().replace(/[^a-z0-9]/g, '');
  // 1. Exact match or ends with fragment (e.g. 'mixamorig5:righthand')
  let bone = skeleton.bones.find(b => {
    const bc = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return bc === clean || bc.endsWith(':' + clean) || bc.endsWith(clean);
  });
  // 2. Safe fallback avoiding finger or arm bones
  if (!bone) {
    bone = skeleton.bones.find(b => {
      const bc = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        bc.includes(clean) &&
        !bc.includes('forearm') &&
        !bc.includes('arm') &&
        !bc.includes('thumb') &&
        !bc.includes('index') &&
        !bc.includes('middle') &&
        !bc.includes('ring') &&
        !bc.includes('pinky')
      );
    });
  }
  return bone;
}

function yawLookAt(root: TransformNode, target: Vector3) {
  root.rotationQuaternion = null;
  const dx = target.x - root.position.x;
  const dz = target.z - root.position.z;
  // Model faces +Z by default (rotation.y=0). atan2(dx,dz) gives angle to face +Z toward target.
  // Add Math.PI so the *front face* of the character (which naturally faces -Z after GLTF import) looks at the target.
  root.rotation.y = Math.atan2(dx, dz) + Math.PI;
}

export async function loadCharacter(
  scene: Scene,
  name: string,
  pos: Vector3,
  team: Team,
  options?: {
    isBatter?: boolean;
    batColor?: string;
    isBowler?: boolean;
    isFielder?: boolean;
    jerseyNumber?: number;
    avatarId?: string;
    shadowGenerator?: ShadowGenerator;
  }
): Promise<PlayerCharacterRig> {
  console.log(`[loadCharacter] Starting load for "${name}"...`);

  // Step 1 — Preload animations into this scene's cache
  await preloadAllAnimationTemplates(scene);
  const cache = getOrCreateSceneCache(scene);
  console.log(`[loadCharacter] Anim cache has ${cache.size} templates:`, [...cache.keys()]);

  // Step 2 — Import mesh
  let result: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>;
  try {
    result = await SceneLoader.ImportMeshAsync('', '/models/', 'player.glb', scene);
  } catch (err) {
    console.error(`[loadCharacter] SceneLoader.ImportMeshAsync FAILED for "${name}":`, err);
    throw err;
  }

  if (!result.meshes?.length) {
    throw new Error(`[loadCharacter] player.glb returned 0 meshes for "${name}"`);
  }

  console.log(`[loadCharacter] "${name}": loaded ${result.meshes.length} meshes, ${result.skeletons.length} skeletons, ${result.transformNodes.length} transform nodes`);

  const rootMesh = result.meshes[0];
  rootMesh.name = `character_root_${name}`;

  // CRITICAL: null the quaternion before setting Euler position/rotation
  rootMesh.rotationQuaternion = null;
  rootMesh.position = pos.clone();
  rootMesh.rotation = Vector3.Zero();

  const skeleton = result.skeletons[0] ?? null;
  const bones: HumanoidBones = {
    rightHand: skeleton ? findBone(skeleton, 'RightHand') : undefined,
  };

  // Step 3 — Ensure all meshes are fully enabled and visible
  result.meshes.forEach(m => {
    m.isVisible = true;
    m.setEnabled(true);
    m.alwaysSelectAsActiveMesh = true;
    m.computeBonesUsingShaders = true;
    m.receiveShadows = true;
    if (options?.shadowGenerator && m !== rootMesh) {
      options.shadowGenerator.addShadowCaster(m, true);
    }
  });

  // Step 4 — Apply procedural jersey material
  try {
    const primary = team.primaryColor ?? '#1E40AF';
    const secondary = team.secondaryColor ?? '#F59E0B';
    const squadNum = options?.jerseyNumber ?? (options?.isBatter ? 1 : 18);
    const jerseyTex = createJerseyTexture(scene, primary, secondary, squadNum);
    const jerseyMat = new PBRMaterial(`pbr_jersey_${name}`, scene);
    jerseyMat.albedoTexture = jerseyTex;
    jerseyMat.roughness = 0.7;
    jerseyMat.metallic = 0;
    jerseyMat.backFaceCulling = false;

    result.meshes.forEach(m => {
      if (m === rootMesh) return;
      const mn = m.name.toLowerCase();
      if (mn.includes('shirt') || mn.includes('short') || mn.includes('sock')) {
        m.material = jerseyMat;
      }
    });
  } catch (err) {
    // Jersey material failure must NOT prevent the character from showing
    console.error(`[loadCharacter] Jersey texture FAILED for "${name}", character will show with default material:`, err);
  }

  // Step 5 — Attach bat for batter via attachToBone(bones.rightHand, characterMesh)
  let batMesh: Mesh | undefined;
  if (options?.isBatter && bones.rightHand) {
    const characterMesh = (result.meshes.find(m => m.name === 'Ch38_Body') as Mesh) ??
      (result.meshes.find(m => m !== rootMesh) as Mesh);

    try {
      // 1. Load the user's custom 3D bat model (11716_bat_v1_l3.obj.glb)
      try {
        const batImport = await SceneLoader.ImportMeshAsync('', '/models/', '11716_bat_v1_l3.obj.glb', scene);
        const importedBat = batImport.meshes.find(m => m.name !== '__root__') as Mesh;
        if (importedBat) {
          importedBat.name = `customBat_${name}`;
          importedBat.setParent(null);
          batImport.meshes.forEach(m => { if (m !== importedBat) m.dispose(); });

          // In bat model: length is ~100cm. Handle grip center is at Z ≈ 88cm.
          // Bake grip offset to (0, 0, 0) so the hand holds the bat by the handle
          importedBat.bakeTransformIntoVertices(Matrix.Translation(0, 0, -88));

          // Attach to RightHand bone using mesh.attachToBone(handBone, characterMesh)
          importedBat.attachToBone(bones.rightHand, characterMesh);

          // Bat grip offset: blade angled down and back, resting near ground beside back leg in cricket stance
          importedBat.position = new Vector3(0.0, -3.5, 0.5);
          importedBat.rotationQuaternion = Quaternion.RotationYawPitchRoll(0.12, Math.PI / 2 + 0.15, -0.22);

          const batPBR = new PBRMaterial(`pbr_bat_${name}`, scene);
          batPBR.albedoTexture = createWillowBatTexture(scene, options.batColor ?? '#D4A373');
          batPBR.roughness = 0.45;
          batPBR.metallic = 0.0;
          batPBR.backFaceCulling = false;
          importedBat.material = batPBR;
          importedBat.isVisible = true;
          importedBat.setEnabled(true);
          importedBat.alwaysSelectAsActiveMesh = true;

          if (options.shadowGenerator) options.shadowGenerator.addShadowCaster(importedBat);
          batMesh = importedBat;
          console.log(`[loadCharacter] Custom 3D Bat attached via attachToBone(mixamorig5:RightHand, Ch38_Body) for "${name}"!`);
        }
      } catch (meshErr) {
        console.warn(`[loadCharacter] Custom bat load failed, using procedural fallback:`, meshErr);
        const batPBR = new PBRMaterial(`pbr_bat_${name}`, scene);
        batPBR.albedoTexture = createWillowBatTexture(scene, options.batColor ?? '#D4A373');
        batPBR.roughness = 0.5;
        batPBR.metallic = 0;
        batPBR.backFaceCulling = false;

        batMesh = MeshBuilder.CreateBox(`bat_${name}`, { width: 11, height: 85, depth: 6 }, scene);
        batMesh.material = batPBR;
        batMesh.attachToBone(bones.rightHand, characterMesh);
        batMesh.position = new Vector3(0, -42, 0);
        batMesh.rotationQuaternion = Quaternion.RotationAxis(Axis.X, 0.25);
        batMesh.alwaysSelectAsActiveMesh = true;
        batMesh.isVisible = true;
        batMesh.setEnabled(true);

        if (options.shadowGenerator) options.shadowGenerator.addShadowCaster(batMesh);
      }
    } catch (err) {
      console.error(`[loadCharacter] Bat attach FAILED for "${name}":`, err);
      batMesh = undefined;
    }
  }

  // Step 6 — Facing direction
  if (options?.isBatter) {
    rootMesh.rotationQuaternion = null;
    // Right-handed batsman: stand side-on, left shoulder pointing toward bowler (+Z)
    // rotation.y = Math.PI rotates 180° (faces camera), then offset ~0.52 rad for side-on stance
    rootMesh.rotation.y = Math.PI - 0.52;
  } else if (options?.isBowler) {
    rootMesh.rotationQuaternion = null;
    // Bowler at Z=28 must face toward batsman at Z=-8.8 (face -Z direction = Math.PI)
    rootMesh.rotation.y = Math.PI;
  }

  const rig: PlayerCharacterRig = {
    root: rootMesh as TransformNode,
    characterMesh: rootMesh,
    allMeshes: result.meshes,
    allTransformNodes: (result.transformNodes ?? []) as TransformNode[],
    skeleton,
    bones,
    animationGroups: result.animationGroups ?? [],
    activeAnimationGroup: null,
    bat: batMesh,
    isBatter: !!options?.isBatter,
    isBowler: !!options?.isBowler,
    isFielder: !!options?.isFielder,
    playAnimation: (animName, loop = true, speedRatio = 1.0, fromFrame, toFrame) =>
      playRigAnimation(rig, animName, loop, speedRatio, fromFrame, toFrame),
  };

  // Step 7 — Play default idle animation immediately (no T-pose)
  const defaultAnim = options?.isBatter ? 'baseball_idle' : 'standing_idle';
  if (cache.has(defaultAnim)) {
    rig.activeAnimationGroup = playRetargetedAnimation(rig, cache.get(defaultAnim)!, defaultAnim, true, 1.0);
    console.log(`[loadCharacter] "${name}" started in "${defaultAnim}"`);
  } else {
    console.warn(`[loadCharacter] "${defaultAnim}" not in cache, "${name}" will T-pose`);
  }

  return rig;
}

export async function loadFieldingTeam(
  scene: Scene,
  fieldingTeam: Team,
  shadowGenerator?: ShadowGenerator
): Promise<PlayerCharacterRig[]> {
  const positions = [
    { name: 'cover',     pos: new Vector3(-22, 0,  10), num: 4  },
    { name: 'midOff',    pos: new Vector3(-12, 0,  22), num: 8  },
    { name: 'midOn',     pos: new Vector3( 12, 0,  22), num: 11 },
    { name: 'squareLeg', pos: new Vector3( 24, 0,   2), num: 27 },
    { name: 'point',     pos: new Vector3(-30, 0,  -6), num: 33 },
  ];

  const fielders: PlayerCharacterRig[] = [];
  for (const f of positions) {
    const rig = await loadCharacter(scene, f.name, f.pos, fieldingTeam, {
      isFielder: true,
      jerseyNumber: f.num,
      shadowGenerator,
    });
    yawLookAt(rig.root, PITCH_CENTRE);
    fielders.push(rig);
  }
  return fielders;
}

// Keep compatibility exports
export function applyBattingStance(_bones: any) {}
export function applyFieldingStance(_bones: any) {}
