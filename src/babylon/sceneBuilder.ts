import {
  Scene,
  Engine,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Mesh,
  DynamicTexture,
  ShadowGenerator,
} from '@babylonjs/core';
import { createGrassTexture, createPitchTexture } from './textures';
import { buildStadiumBays } from './standBayBuilder';

// ─── World constants (1 engine unit = 1 metre, real cricket dimensions) ───────
//   Pitch (stumps-to-stumps):  20.12 m
//   Striker stumps:            Z = -10.06
//   Bowling crease:            Z = +10.06
//   Boundary radius:           70 m from pitch centre
//   Ground disc radius:        80 m
//   Character height:          ~1.82 m
//   Stumps height:             0.71 m

export interface StadiumSceneComponents {
  scene: Scene;
  ground: Mesh;
  pitch: Mesh;
  stumpsStriker: Mesh[];
  stumpsNonStriker: Mesh[];
  crowdStands: Mesh[];
  sightScreen: Mesh;
  umpire: Mesh;
  shadowGenerator: ShadowGenerator;
}

export function createStadiumScene(engine: Engine, canvas: HTMLCanvasElement): StadiumSceneComponents {
  const scene = new Scene(engine);
  // Clear daylight sky
  scene.clearColor = new Color4(0.42, 0.70, 0.94, 1.0);

  // Dynamic sky dome with real-time drifting 3D clouds
  createSkyAndMovingClouds(scene);

  // ─── 1. Lighting ─────────────────────────────────────────────────────────────
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.85;
  hemiLight.diffuse = new Color3(1.0, 1.0, 1.0);
  hemiLight.groundColor = new Color3(0.24, 0.44, 0.22); // grass bounce

  const sunLight = new DirectionalLight('sunLight', new Vector3(0.45, -1.3, 0.65), scene);
  sunLight.position = new Vector3(-35, 65, -45);
  sunLight.intensity = 1.15;
  sunLight.diffuse = new Color3(1.0, 0.97, 0.90);

  // Soft Shadow Generator (2048 map)
  const shadowGenerator = new ShadowGenerator(2048, sunLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 32;
  shadowGenerator.depthScale = 60;

  // ─── 2. Outfield Ground with Lush Lawn Mow Stripes ───────────────────────────
  // 165m ground plane covered with rich stadium turf across the entire field
  const ground = MeshBuilder.CreateGround('outfield', { width: 165, height: 165, subdivisions: 2 }, scene);
  ground.position.y = 0;
  ground.receiveShadows = true;

  const grassPBR = new PBRMaterial('pbr_grass', scene);
  const grassTex = createGrassTexture(scene);
  // Scale UV so lawn stripes and blade patterns tile beautifully across the whole field
  (grassTex as any).uScale = 7;
  (grassTex as any).vScale = 7;
  grassPBR.albedoTexture = grassTex;
  grassPBR.roughness = 0.88;
  grassPBR.metallic = 0.0;
  ground.material = grassPBR;

  // ─── 3. Boundary Rope at 70m Radius ──────────────────────────────────────────
  createBoundaryRope(scene);

  // ─── 4. Cricket Pitch Strip (3.66m wide × 24m long) ─────────────────────────
  const pitch = MeshBuilder.CreateGround('pitchStrip', { width: 3.66, height: 24, subdivisions: 2 }, scene);
  pitch.position.y = 0.019;
  pitch.position.z = 0.5; // centred between the two stump lines
  pitch.receiveShadows = true;

  const pitchPBR = new PBRMaterial('pbr_pitch', scene);
  const pitchTex = createPitchTexture(scene);
  // 1:1 UV mapping so bowling footmarks and good-length wear align with pitch
  (pitchTex as any).uScale = 1;
  (pitchTex as any).vScale = 1;
  pitchPBR.albedoTexture = pitchTex;
  pitchPBR.roughness = 0.65;
  pitchPBR.metallic = 0.0;
  pitch.material = pitchPBR;

  // Painted white crease markings
  createCreaseMarkings(scene);

  // ─── 5. Stumps at Real 20.12m Distance ──────────────────────────────────────
  const strikerStumpsPos = new Vector3(0, 0, -10.06);
  const nonStrikerStumpsPos = new Vector3(0, 0, 10.06);

  const stumpsStriker = createWicketSet(scene, strikerStumpsPos, shadowGenerator);
  const stumpsNonStriker = createWicketSet(scene, nonStrikerStumpsPos, shadowGenerator);

  // ─── 6. Umpire ──────────────────────────────────────────────────────────────
  const umpirePos = nonStrikerStumpsPos.add(new Vector3(1.4, 0, 1.2));
  const umpire = createUmpireMesh(scene, umpirePos, shadowGenerator);

  // ─── 7. Sight Screens ───────────────────────────────────────────────────────
  const sightScreen = createSightScreens(scene);

  // ─── 8. Modular Multi-Tier Stadium Architecture ─────────────────────────────
  const { stands: crowdStands } = buildStadiumBays(scene);

  // ─── 9. 3D Human Crowd Figures along Seating Tiers ──────────────────────────
  create3DHumanCrowd(scene);

  // ─── 10. Boundary Sponsor Boards & 6 Floodlight Towers ──────────────────────
  createSponsorBoards(scene);
  createStadiumFloodlights(scene);

  // ─── 11. Boxed Jumbotrons (North & South) perched above roof canopy ────────
  createBoxedJumbotron(scene, new Vector3(0, 37.0, 89), 0);
  createBoxedJumbotron(scene, new Vector3(0, 37.0, -89), Math.PI);

  return {
    scene,
    ground,
    pitch,
    stumpsStriker,
    stumpsNonStriker,
    crowdStands,
    sightScreen,
    umpire,
    shadowGenerator,
  };
}

// ─── Crease markings ──────────────────────────────────────────────────────────
function createCreaseMarkings(scene: Scene) {
  const creasePBR = new PBRMaterial('pbr_crease', scene);
  creasePBR.albedoColor = new Color3(0.98, 0.98, 0.98);
  creasePBR.roughness = 0.45;

  const mkLine = (id: string, w: number, d: number, pos: Vector3) => {
    const p = MeshBuilder.CreatePlane(id, { width: w, height: d }, scene);
    p.rotation.x = Math.PI / 2;
    p.position = pos;
    p.material = creasePBR;
  };

  // Striker end
  mkLine('bc_striker', 2.64, 0.08, new Vector3(0, 0.022, -10.06));
  mkLine('pop_striker', 3.66, 0.08, new Vector3(0, 0.022, -8.66));
  mkLine('ret_striker_L', 0.07, 1.46, new Vector3(-1.32, 0.022, -9.36));
  mkLine('ret_striker_R', 0.07, 1.46, new Vector3(1.32, 0.022, -9.36));

  // Non-striker end
  mkLine('bc_nonstriker', 2.64, 0.08, new Vector3(0, 0.022, 10.06));
  mkLine('pop_nonstriker', 3.66, 0.08, new Vector3(0, 0.022, 8.66));
  mkLine('ret_nonstriker_L', 0.07, 1.46, new Vector3(-1.32, 0.022, 9.36));
  mkLine('ret_nonstriker_R', 0.07, 1.46, new Vector3(1.32, 0.022, 9.36));
}

// ─── Wicket set ───────────────────────────────────────────────────────────────
export function createWicketSet(
  scene: Scene,
  pos: Vector3,
  shadowGenerator?: ShadowGenerator
): Mesh[] {
  const stumpPBR = new PBRMaterial(`pbr_stump_${pos.z}`, scene);
  stumpPBR.albedoColor = new Color3(0.92, 0.88, 0.78);
  stumpPBR.roughness = 0.55;

  const bailsPBR = new PBRMaterial(`pbr_bails_${pos.z}`, scene);
  bailsPBR.albedoColor = new Color3(0.98, 0.82, 0.12);
  bailsPBR.roughness = 0.40;

  const meshes: Mesh[] = [];
  const spacing = 0.113;

  for (let i = -1; i <= 1; i++) {
    const stump = MeshBuilder.CreateCylinder(`stump_${pos.z}_${i}`, {
      height: 0.71,
      diameter: 0.036,
      tessellation: 14,
    }, scene);
    stump.position = new Vector3(pos.x + i * spacing, 0.355, pos.z);
    stump.material = stumpPBR;
    if (shadowGenerator) shadowGenerator.addShadowCaster(stump);
    meshes.push(stump);
  }

  for (let b = -1; b <= 1; b += 2) {
    const bail = MeshBuilder.CreateCylinder(`bail_${pos.z}_${b}`, {
      height: 0.117,
      diameter: 0.020,
      tessellation: 8,
    }, scene);
    bail.rotation.z = Math.PI / 2;
    bail.position = new Vector3(pos.x + b * (spacing / 2), 0.715, pos.z);
    bail.material = bailsPBR;
    if (shadowGenerator) shadowGenerator.addShadowCaster(bail);
    meshes.push(bail);
  }

  return meshes;
}

// ─── Boundary rope & Running-Track Warning Apron ──────────────────────────────
function createBoundaryRope(scene: Scene) {
  // 1. Lighter running-track-style warning band just inside the boundary rope (radius 67.8m - 70.0m)
  const trackPBR = new PBRMaterial('pbr_warningTrack', scene);
  trackPBR.albedoColor = new Color3(0.46, 0.60, 0.36); // lighter manicured turf/sand apron
  trackPBR.roughness = 0.88;
  trackPBR.metallic = 0.0;

  const warningTrack = MeshBuilder.CreateTorus('warningTrackBand', {
    diameter: 137.8,
    thickness: 2.2,
    tessellation: 96,
  }, scene);
  warningTrack.rotation.x = Math.PI / 2;
  warningTrack.position.y = 0.008;
  warningTrack.material = trackPBR;

  // 2. Distinct dark boundary edge line at 70m
  const edgePBR = new PBRMaterial('pbr_boundaryEdgeLine', scene);
  edgePBR.albedoColor = new Color3(0.12, 0.14, 0.16); // dark demarcation strip
  edgePBR.roughness = 0.70;

  const edgeLine = MeshBuilder.CreateTorus('boundaryEdgeLine', {
    diameter: 140.0,
    thickness: 0.22,
    tessellation: 96,
  }, scene);
  edgeLine.rotation.x = Math.PI / 2;
  edgeLine.position.y = 0.012;
  edgeLine.material = edgePBR;

  // 3. White boundary rope at 70m radius
  const ropePBR = new PBRMaterial('pbr_rope', scene);
  ropePBR.albedoColor = new Color3(0.96, 0.96, 0.94);
  ropePBR.roughness = 0.60;

  const rope = MeshBuilder.CreateTorus('boundaryRope', {
    diameter: 140.0,
    thickness: 0.32,
    tessellation: 96,
  }, scene);
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 0.06;
  rope.material = ropePBR;

  // 4. Modern triangular foam sponsor wedges (Toblerones) along boundary rope
  const wedgeMatA = new PBRMaterial('pbr_wedgeA', scene);
  wedgeMatA.albedoColor = new Color3(0.10, 0.25, 0.65); // sponsor blue
  wedgeMatA.roughness = 0.55;

  const wedgeMatB = new PBRMaterial('pbr_wedgeB', scene);
  wedgeMatB.albedoColor = new Color3(0.85, 0.15, 0.15); // sponsor red
  wedgeMatB.roughness = 0.55;

  const numWedges = 32;
  for (let w = 0; w < numWedges; w++) {
    const angle = (w / numWedges) * Math.PI * 2;
    const x = Math.sin(angle) * 70.0;
    const z = Math.cos(angle) * 70.0;

    const wedge = MeshBuilder.CreateCylinder(`boundaryWedge_${w}`, {
      height: 3.4,
      diameter: 0.40,
      tessellation: 3,
    }, scene);
    wedge.position = new Vector3(x, 0.14, z);
    wedge.rotation.y = angle;
    wedge.rotation.z = Math.PI / 2;
    wedge.material = w % 2 === 0 ? wedgeMatA : wedgeMatB;
  }
}

// ─── Sight Screens ────────────────────────────────────────────────────────────
function createSightScreens(scene: Scene): Mesh {
  const m = new PBRMaterial('pbr_sightScreen', scene);
  m.albedoColor = new Color3(0.08, 0.08, 0.09); // International anti-glare black
  m.roughness = 0.85;

  // North sight screen (behind bowler)
  const screenN = MeshBuilder.CreateBox('sightScreenN', { width: 22, height: 9.5, depth: 0.8 }, scene);
  screenN.position = new Vector3(0, 4.8, 58);
  screenN.material = m;

  // South sight screen (behind batsman)
  const screenS = MeshBuilder.CreateBox('sightScreenS', { width: 22, height: 9.5, depth: 0.8 }, scene);
  screenS.position = new Vector3(0, 4.8, -58);
  screenS.material = m;

  return screenN;
}

// ─── Umpire ───────────────────────────────────────────────────────────────────
function createUmpireMesh(scene: Scene, pos: Vector3, shadowGenerator?: ShadowGenerator): Mesh {
  const root = MeshBuilder.CreateBox('umpireRoot', { size: 0.01 }, scene);
  root.position = new Vector3(pos.x, 0, pos.z);
  root.isVisible = false;

  const coatM = new PBRMaterial('pbr_umpireCoat', scene);
  coatM.albedoColor = new Color3(0.12, 0.12, 0.15);
  coatM.roughness = 0.78;

  const skinM = new PBRMaterial('pbr_umpireSkin', scene);
  skinM.albedoColor = new Color3(0.85, 0.65, 0.50);

  const hatM = new PBRMaterial('pbr_umpireHat', scene);
  hatM.albedoColor = new Color3(0.95, 0.95, 0.95);

  const mkPart = (id: string, mesh: Mesh, y: number, mat: PBRMaterial) => {
    mesh.position.y = y;
    mesh.material = mat;
    mesh.parent = root;
    if (shadowGenerator) shadowGenerator.addShadowCaster(mesh);
    return mesh;
  };

  mkPart('legs', MeshBuilder.CreateCylinder('uLegs', { height: 0.88, diameter: 0.32 }, scene), 0.44, coatM);
  mkPart('body', MeshBuilder.CreateCylinder('uBody', { height: 0.82, diameterTop: 0.46, diameterBottom: 0.34 }, scene), 1.22, coatM);
  mkPart('head', MeshBuilder.CreateSphere('uHead', { diameter: 0.34 }, scene), 1.90, skinM);
  mkPart('hat', MeshBuilder.CreateCylinder('uHat', { height: 0.09, diameter: 0.48 }, scene), 2.02, hatM);

  return root;
}

// ─── Boxed Stadium Jumbotron Video Scoreboard ─────────────────────────────────
function createBoxedJumbotron(scene: Scene, pos: Vector3, rotY: number) {
  // 1. Heavy industrial housing box cabinet (3.2m deep)
  const housingMat = new PBRMaterial(`pbr_jumboHousing_${rotY}`, scene);
  housingMat.albedoColor = new Color3(0.14, 0.16, 0.20);
  housingMat.roughness = 0.65;
  housingMat.metallic = 0.40;

  const housing = MeshBuilder.CreateBox(`jumboHousing_${rotY}`, {
    width: 28.0,
    height: 13.5,
    depth: 3.2,
  }, scene);
  housing.position = pos;
  housing.rotation.y = rotY;
  housing.material = housingMat;

  // 2. Beveled front bezel / frame in brushed aluminum
  const bezelMat = new PBRMaterial(`pbr_jumboBezel_${rotY}`, scene);
  bezelMat.albedoColor = new Color3(0.24, 0.26, 0.30);
  bezelMat.roughness = 0.35;
  bezelMat.metallic = 0.85;

  const bezel = MeshBuilder.CreateBox(`jumboBezel_${rotY}`, {
    width: 28.6,
    height: 14.1,
    depth: 0.6,
  }, scene);
  const forwardOffset = rotY === 0 ? -1.45 : 1.45;
  bezel.position = new Vector3(pos.x, pos.y, pos.z + forwardOffset);
  bezel.rotation.y = rotY;
  bezel.material = bezelMat;

  // 3. LED Screen Display with DynamicTexture
  const screenTex = new DynamicTexture(`jumboScreenTex_${rotY}`, { width: 1024, height: 512 }, scene, false);
  const ctx = screenTex.getContext() as any;
  ctx.fillStyle = '#050A14';
  ctx.fillRect(0, 0, 1024, 512);

  // Border neon glow
  ctx.strokeStyle = '#00D4A5';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 1000, 488);

  // Header
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ICC T20 PREMIER LEAGUE • CHAMPIONSHIP FINAL', 512, 70);

  // Score Banner
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'black 92px Montserrat, Inter, sans-serif';
  ctx.fillText('IND 184/3 (18.2 OV)', 512, 195);

  // Match Target & Requirement
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 50px Inter, sans-serif';
  ctx.fillText('REQ: 28 RUNS OFF 10 BALLS', 512, 285);

  // Striker stats
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 40px Inter, sans-serif';
  ctx.fillText('STRIKER: 68* (34b)  •  SR: 200.0', 512, 375);

  // Venue footer
  ctx.fillStyle = '#64748B';
  ctx.font = '28px Inter, sans-serif';
  ctx.fillText('COLOSSEUM GRAND ARENA • CAPACITY 85,000', 512, 455);

  screenTex.update();

  const screenPBR = new PBRMaterial(`pbr_jumboScreen_${rotY}`, scene);
  screenPBR.albedoTexture = screenTex;
  screenPBR.emissiveTexture = screenTex;
  screenPBR.emissiveColor = new Color3(0.55, 0.55, 0.55); // glows vividly in stadium
  screenPBR.roughness = 0.20;

  const screenMesh = MeshBuilder.CreatePlane(`jumboDisplay_${rotY}`, { width: 26.0, height: 11.5 }, scene);
  const screenForward = rotY === 0 ? -1.76 : 1.76;
  screenMesh.position = new Vector3(pos.x, pos.y, pos.z + screenForward);
  screenMesh.rotation.y = rotY;
  screenMesh.material = screenPBR;

  // 4. Rear structural mounting lattice framework
  const pylonMat = new PBRMaterial(`pbr_jumboPylon_${rotY}`, scene);
  pylonMat.albedoColor = new Color3(0.20, 0.22, 0.26);
  pylonMat.roughness = 0.50;
  pylonMat.metallic = 0.80;

  const pylonHeight = pos.y + 4.0;
  [-10, 10].forEach((xOff, pIdx) => {
    const pX = pos.x + (rotY === 0 ? xOff : -xOff);
    const pZ = pos.z + (rotY === 0 ? 1.5 : -1.5);
    const pylon = MeshBuilder.CreateCylinder(`jumboSupport_${rotY}_${pIdx}`, {
      height: pylonHeight,
      diameter: 1.6,
      tessellation: 12,
    }, scene);
    pylon.position = new Vector3(pX, pylonHeight * 0.5, pZ);
    pylon.material = pylonMat;
  });

  // Cross-truss gantry support beam directly underneath the elevated board frame
  const gantryBeam = MeshBuilder.CreateBox(`jumboGantry_${rotY}`, {
    width: 26.0,
    height: 1.2,
    depth: 2.2,
  }, scene);
  gantryBeam.position = new Vector3(pos.x, pos.y - 7.2, pos.z + (rotY === 0 ? 0.8 : -0.8));
  gantryBeam.rotation.y = rotY;
  gantryBeam.material = pylonMat;
}

// ─── 3D Human Crowd Figures (Basic Stylized Human Spectators) ─────────────────
function create3DHumanCrowd(scene: Scene) {
  // 6 diverse jersey colors representing cheering fans
  const teamShirtColors = [
    new Color3(0.12, 0.31, 0.72), // Royal Blue
    new Color3(0.96, 0.62, 0.05), // Gold / Yellow
    new Color3(0.86, 0.15, 0.15), // Crimson Red
    new Color3(0.09, 0.64, 0.29), // Emerald Green
    new Color3(0.95, 0.95, 0.95), // White
    new Color3(0.92, 0.35, 0.05), // Vibrant Orange
  ];

  const skinTones = [
    new Color3(0.85, 0.65, 0.50),
    new Color3(0.70, 0.48, 0.35),
    new Color3(0.55, 0.38, 0.25),
  ];

  // Build 6 master archetypes with merged geometry (1 draw call per archetype via instancing)
  const masterArchetypes: Mesh[] = [];

  teamShirtColors.forEach((shirtColor, idx) => {
    const skinColor = skinTones[idx % skinTones.length];

    // Head
    const head = MeshBuilder.CreateSphere(`chHead_${idx}`, { diameter: 0.36, segments: 8 }, scene);
    head.position.y = 0.58;
    const skinMat = new PBRMaterial(`cSkin_${idx}`, scene);
    skinMat.albedoColor = skinColor;
    skinMat.roughness = 0.8;
    head.material = skinMat;

    // Torso (Shirt)
    const torso = MeshBuilder.CreateBox(`chTorso_${idx}`, { width: 0.38, height: 0.60, depth: 0.28 }, scene);
    torso.position.y = 0.12;
    const shirtMat = new PBRMaterial(`cShirt_${idx}`, scene);
    shirtMat.albedoColor = shirtColor;
    shirtMat.roughness = 0.7;
    torso.material = shirtMat;

    // Cap / Hat (varied)
    const cap = MeshBuilder.CreateCylinder(`chCap_${idx}`, { height: 0.08, diameter: 0.38, tessellation: 8 }, scene);
    cap.position.y = 0.74;
    cap.material = shirtMat;

    // Group into master mesh
    const master = Mesh.MergeMeshes([torso, head, cap], true, true, undefined, false, true);
    if (master) {
      master.name = `crowdArchetype_${idx}`;
      master.isVisible = false;
      masterArchetypes.push(master);
    }
  });

  if (masterArchetypes.length === 0) return;

  // Distribute 300+ 3D human spectator figures along Tier 1 and Tier 2 seating steps
  // Tier 1 rows (radii 73m, 75m, 77m)
  // Tier 2 rows (radii 81m, 83m, 85m)
  const rows = [
    { radius: 74.4, y: 1.40, count: 64 },
    { radius: 75.8, y: 1.85, count: 72 },
    { radius: 77.2, y: 2.30, count: 80 },
    { radius: 84.7, y: 5.55, count: 68 },
    { radius: 86.2, y: 6.85, count: 76 },
    { radius: 87.7, y: 8.15, count: 84 },
  ];

  let personIndex = 0;

  rows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      // Angle around perimeter with small jitter for natural seating
      const baseAngle = (i / row.count) * Math.PI * 2;
      const angleJitter = (Math.random() - 0.5) * 0.03;
      const angle = baseAngle + angleJitter;

      // Skip spots directly in front of the sight screens (North and South) to keep background clear for batsman
      const normZ = Math.cos(angle);
      if (Math.abs(normZ) > 0.94) continue;

      const master = masterArchetypes[personIndex % masterArchetypes.length];
      personIndex++;

      const instance = master.createInstance(`crowdFan_${personIndex}`);
      const r = row.radius + (Math.random() - 0.5) * 0.4;
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;

      instance.position = new Vector3(x, row.y + (Math.random() - 0.5) * 0.1, z);
      // Face inward toward pitch center with slight natural variation
      instance.rotation.y = angle + Math.PI + (Math.random() - 0.5) * 0.35;
      // Slight lean forward / excitement
      instance.rotation.x = 0.05 + Math.random() * 0.08;
    }
  });

  console.log(`[ColosseumCrowd] Spawned ${personIndex} 3D human crowd figures in stadium tiers!`);
}

// ─── 6 Giant Stadium Floodlight Towers ────────────────────────────────────────
function createStadiumFloodlights(scene: Scene) {
  const towerPBR = new PBRMaterial('pbr_lightTower', scene);
  towerPBR.albedoColor = new Color3(0.32, 0.35, 0.40); // galvanized structural steel
  towerPBR.roughness = 0.55;
  towerPBR.metallic = 0.85;

  const lampPBR = new PBRMaterial('pbr_floodLamp', scene);
  lampPBR.albedoColor = new Color3(1.0, 0.98, 0.92);
  lampPBR.emissiveColor = new Color3(1.0, 0.98, 0.88); // fake bright glowing stadium illumination
  lampPBR.roughness = 0.10;

  // 6 floodlight towers around perimeter (radius 106m)
  const TOWER_RADIUS = 106;
  const towerAngles = [
    Math.PI * 0.16,
    Math.PI * 0.50,
    Math.PI * 0.84,
    Math.PI * 1.16,
    Math.PI * 1.50,
    Math.PI * 1.84,
  ];

  towerAngles.forEach((angle, idx) => {
    const x = Math.sin(angle) * TOWER_RADIUS;
    const z = Math.cos(angle) * TOWER_RADIUS;

    // 1. Tapered vertical pylon tower (46m high)
    const pylon = MeshBuilder.CreateCylinder(`lightTower_${idx}`, {
      height: 46,
      diameterTop: 1.5,
      diameterBottom: 4.2,
      tessellation: 8,
    }, scene);
    pylon.position = new Vector3(x, 23, z);
    pylon.material = towerPBR;

    // 2. Cross-lattice maintenance platforms
    [18, 30, 42].forEach((h, platIdx) => {
      const plat = MeshBuilder.CreateCylinder(`lightPlat_${idx}_${platIdx}`, {
        height: 0.6,
        diameter: 3.8 - platIdx * 0.7,
        tessellation: 8,
      }, scene);
      plat.position = new Vector3(x, h, z);
      plat.material = towerPBR;
    });

    // 3. Headframe platform tilted downward toward pitch
    const head = MeshBuilder.CreateBox(`lightHead_${idx}`, { width: 11.5, height: 8.5, depth: 1.6 }, scene);
    head.position = new Vector3(x * 0.97, 47.0, z * 0.97);
    head.rotation.y = angle + Math.PI; // point toward pitch center
    head.rotation.x = 0.36; // downward pitch
    head.material = towerPBR;

    // 4. 4x4 array of bright emissive floodlight panels
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const panel = MeshBuilder.CreateBox(`floodPanel_${idx}_${row}_${col}`, {
          width: 2.2,
          height: 1.6,
          depth: 0.25,
        }, scene);
        panel.parent = head;
        panel.position = new Vector3((col - 1.5) * 2.6, (row - 1.5) * 1.9, -0.85);
        panel.material = lampPBR;
      }
    }
  });
}

// ─── Boundary sponsor boards ──────────────────────────────────────────────────
function createSponsorBoards(scene: Scene) {
  const RADIUS = 71.2; // directly hugging the 70m rope
  const numBoards = 28;

  const texA = createTextTexture(scene, 'T20 PREMIER', '#1E3A8A', '#F59E0B');
  const texB = createTextTexture(scene, 'COLOSSEUM CUP', '#14532D', '#FFFFFF');
  const texC = createTextTexture(scene, 'CRICKET 2026', '#7C2D12', '#F8FAFC');

  const mats = [texA, texB, texC].map((t, i) => {
    const m = new PBRMaterial(`sponsorMat_${i}`, scene);
    m.albedoTexture = t;
    m.roughness = 0.50;
    return m;
  });

  for (let i = 0; i < numBoards; i++) {
    const angle = (i / numBoards) * Math.PI * 2;
    const x = Math.sin(angle) * RADIUS;
    const z = Math.cos(angle) * RADIUS;

    const board = MeshBuilder.CreateBox(`sponsor_${i}`, {
      width: 7.2,
      height: 1.15,
      depth: 0.45,
    }, scene);
    board.position = new Vector3(x, 0.58, z);
    board.rotation.y = angle;
    board.material = mats[i % 3];
  }
}

function createTextTexture(scene: Scene, text: string, bgHex: string, textHex: string): DynamicTexture {
  const tex = new DynamicTexture(`tex_${text}`, { width: 512, height: 128 }, scene, false);
  const ctx = tex.getContext() as any;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.font = 'bold 50px Inter, Montserrat, sans-serif';
  ctx.fillStyle = textHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  tex.update();
  return tex;
}

function createSkyAndMovingClouds(scene: Scene) {
  // 1. Sky Dome with vibrant daytime atmosphere
  const skyDome = MeshBuilder.CreateSphere('skyDome', { diameter: 360, segments: 24, slice: 0.5 }, scene);
  skyDome.position.y = -10;
  const skyMat = new StandardMaterial('skyDomeMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.diffuseColor = Color3.Black();
  skyMat.specularColor = Color3.Black();
  skyMat.emissiveColor = Color3.FromHexString('#4AA3DF'); // vibrant summer azure sky
  skyDome.material = skyMat;

  // 2. Radiant Sun Disc in the sky above the stands behind the bowler
  const sunMesh = MeshBuilder.CreateSphere('skySunDisc', { diameter: 7.5, segments: 16 }, scene);
  sunMesh.position = new Vector3(20, 35, 95);
  const sunMat = new StandardMaterial('skySunMat', scene);
  sunMat.emissiveColor = Color3.FromHexString('#FFFCE8');
  sunMat.diffuseColor = Color3.Black();
  sunMat.specularColor = Color3.Black();
  sunMat.disableLighting = true;
  sunMesh.material = sunMat;

  // Glowing Sun Flare / Corona Billboard
  const sunCorona = MeshBuilder.CreatePlane('skySunCorona', { size: 28 }, scene);
  sunCorona.position = new Vector3(20, 35, 94.5);
  sunCorona.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const coronaTex = new DynamicTexture('sunCoronaTex', 256, scene, true);
  const sctx = coronaTex.getContext() as any;
  const sgrad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  sgrad.addColorStop(0.0, 'rgba(255, 255, 235, 0.95)');
  sgrad.addColorStop(0.25, 'rgba(255, 225, 130, 0.65)');
  sgrad.addColorStop(0.60, 'rgba(255, 185, 60, 0.22)');
  sgrad.addColorStop(1.0, 'rgba(255, 150, 10, 0.00)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 256, 256);
  coronaTex.update();

  const coronaMat = new StandardMaterial('sunCoronaMat', scene);
  coronaMat.diffuseTexture = coronaTex;
  coronaMat.diffuseTexture.hasAlpha = true;
  coronaMat.useAlphaFromDiffuseTexture = true;
  coronaMat.emissiveColor = new Color3(1, 0.95, 0.8);
  coronaMat.disableLighting = true;
  coronaMat.backFaceCulling = false;
  sunCorona.material = coronaMat;

  // 3. Procedural fluffy cumulus cloud texture
  const cloudTex = new DynamicTexture('cloudTex', 512, scene, true);
  const cctx = cloudTex.getContext() as any;
  cctx.clearRect(0, 0, 512, 512);

  // Natural multi-puff cumulus shape
  const puffs = [
    { x: 256, y: 260, r: 130 },
    { x: 170, y: 280, r: 105 },
    { x: 340, y: 280, r: 110 },
    { x: 210, y: 190, r: 95 },
    { x: 300, y: 190, r: 100 },
    { x: 120, y: 310, r: 75 },
    { x: 395, y: 310, r: 75 },
  ];
  puffs.forEach((p) => {
    const radGrad = cctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, p.r);
    radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.96)');
    radGrad.addColorStop(0.55, 'rgba(245, 248, 255, 0.78)');
    radGrad.addColorStop(0.85, 'rgba(230, 240, 255, 0.28)');
    radGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.00)');
    cctx.fillStyle = radGrad;
    cctx.beginPath();
    cctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
    cctx.fill();
  });
  cloudTex.update();

  const cloudMat = new StandardMaterial('cloudMat', scene);
  cloudMat.diffuseTexture = cloudTex;
  cloudMat.diffuseTexture.hasAlpha = true;
  cloudMat.useAlphaFromDiffuseTexture = true;
  cloudMat.emissiveColor = new Color3(1.0, 1.0, 1.0);
  cloudMat.disableLighting = true;
  cloudMat.backFaceCulling = false;

  // 4. Floating 3D Clouds placed directly in view above the stadium stands (Z = 85m..120m, Y = 26m..42m)
  const clouds: Mesh[] = [];
  const cloudConfigs = [
    { pos: new Vector3(-55, 33, 98), w: 32, h: 18 },
    { pos: new Vector3(-28, 28, 92), w: 26, h: 15 },
    { pos: new Vector3(-4,  36, 105), w: 36, h: 20 },
    { pos: new Vector3( 26, 30, 90), w: 28, h: 16 },
    { pos: new Vector3( 52, 34, 100), w: 34, h: 19 },
    { pos: new Vector3(-68, 38, 115), w: 38, h: 22 },
    { pos: new Vector3(-16, 32, 108), w: 30, h: 17 },
    { pos: new Vector3( 10, 40, 118), w: 35, h: 20 },
    { pos: new Vector3( 44, 27, 94), w: 25, h: 14 },
    { pos: new Vector3( 70, 36, 112), w: 36, h: 21 },
  ];

  cloudConfigs.forEach((cfg, idx) => {
    const cloud = MeshBuilder.CreatePlane(`floatingCloud_${idx}`, { width: cfg.w, height: cfg.h }, scene);
    cloud.material = cloudMat;
    cloud.position = cfg.pos.clone();
    cloud.billboardMode = Mesh.BILLBOARDMODE_ALL; // always face camera so they are fluffy and volumetric
    clouds.push(cloud);
  });

  // 5. Continuous gentle breeze drift across the stadium sky
  scene.onBeforeRenderObservable.add(() => {
    clouds.forEach((c) => {
      c.position.x += 0.016;
      if (c.position.x > 82) c.position.x = -82;
    });
  });
}
