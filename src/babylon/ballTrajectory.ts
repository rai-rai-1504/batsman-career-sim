import {
  Scene,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Mesh,
  ParticleSystem,
  DynamicTexture,
} from '@babylonjs/core';
import { BallLength, BallLine, BallOutcome, DeliveryCombination, ShotDirection } from '../types';
import { soundManager } from '../audio/soundManager';

/**
 * Procedural high-detail texture for an authentic "Red Cherry" cricket ball:
 * - Rich deep oxblood/cherry leather gradient with realistic pores & organic grain
 * - Dual quarter-seam indentation grooves
 * - Embossed metallic gold foil crest (Kookaburra / Turf Regulation / Red Cherry / 156g)
 */
function createRedCherryTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture('tex_red_cherry', size, scene, true);
  const ctx = tex.getContext() as any;

  // 1. Rich deep oxblood / cherry leather gradient
  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, '#A31D24'); // vibrant bright cherry center
  grad.addColorStop(0.5, '#7F0910'); // rich deep crimson leather
  grad.addColorStop(0.85, '#520206'); // dark aged oxblood
  grad.addColorStop(1.0, '#300002'); // shadow edge
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 2. Fine organic leather grain / pores
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 700; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    ctx.fillRect(rx, ry, 1.4, 1.4);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
  for (let i = 0; i < 900; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    ctx.fillRect(rx, ry, 1.2, 1.2);
  }

  // 3. Subtle quarter-seam depressions (vertical lines at 25% and 75%)
  ctx.strokeStyle = 'rgba(30, 0, 0, 0.50)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size * 0.25, 0);
  ctx.lineTo(size * 0.25, size);
  ctx.moveTo(size * 0.75, 0);
  ctx.lineTo(size * 0.75, size);
  ctx.stroke();

  // 4. Iconic Gold Foil Maker's Crest (Kookaburra / Test Turf 156g)
  ctx.save();
  ctx.translate(size * 0.5, size * 0.5);

  // Gold outer decorative rings
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, 2 * Math.PI);
  ctx.stroke();

  // Gold text branding
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE047';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('KOOKABURRA', 0, -38);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('TURF REGULATION', 0, -14);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('RED CHERRY', 0, 18);

  ctx.fillStyle = '#FEF08A';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('★ 156g ★', 0, 46);

  ctx.restore();

  tex.update();
  return tex;
}

// ─── Real-scale world Z positions ─────────────────────────────────────────────
// Bowler release:  Z ≈ +10.06   (bowling crease, Y ≈ 2.15m)
// Pitch bounce:    Short Z ≈ +4.6m | Length Z ≈ +2.0m | Yorker Z ≈ -6.8m
// Batsman contact: Z ≈  -7.8    (popping crease contact plane in front of bat)

export interface BowlingDeliveryDef {
  combination: DeliveryCombination;
  length: BallLength;
  line: BallLine;
  name: string;
  description: string;
  bouncePos: Vector3;
  contactPos: Vector3;
  bounceProgress: number; // 0..1 fraction of total flight time when ball hits turf
  flightArcY: number;     // parabolic flight lift before pitch
  reboundArcY: number;    // post-bounce rise height
}

export interface BallTrajectoryController {
  ballMesh: Mesh;
  resetToBowler: () => void;
  animateDelivery: (
    line: BallLine,
    durationMs: number,
    onPitchBounce: () => void,
    onReachContact: () => void,
    length?: BallLength
  ) => void;
  animateDeliveryCombination: (
    combination: DeliveryCombination,
    durationMs: number,
    onPitchBounce: () => void,
    onReachContact: () => void
  ) => void;
  animateShot: (
    outcome: BallOutcome,
    shotDir: ShotDirection,
    onComplete: () => void
  ) => void;
  stop: () => void;
}

export function createBallTrajectoryController(scene: Scene): BallTrajectoryController {
  // Premium Textured "Red Cherry" Leather Cricket Ball — PBR material with clear-coat lacquer
  const ballMesh = MeshBuilder.CreateSphere('cricketBall', { diameter: 0.22, segments: 32 }, scene);

  const ballPBR = new PBRMaterial('pbr_ball', scene);
  ballPBR.albedoTexture = createRedCherryTexture(scene);
  ballPBR.roughness = 0.25;
  ballPBR.metallic = 0.04;
  // Professional clear-coat lacquer sheen reflecting stadium floodlights
  ballPBR.clearCoat.isEnabled = true;
  ballPBR.clearCoat.intensity = 0.92;
  ballPBR.clearCoat.roughness = 0.10;
  ballPBR.clearCoat.indexOfRefraction = 1.54;
  ballMesh.material = ballPBR;
  ballMesh.alwaysSelectAsActiveMesh = true;
  ballMesh.position = new Vector3(0.35, 2.1, 28.0);

  // Raised pristine cream stitched seam ring wrapped around the ball
  const seamMesh = MeshBuilder.CreateTorus('ballSeam', { diameter: 0.223, thickness: 0.011, tessellation: 48 }, scene);
  const seamPBR = new PBRMaterial('pbr_ballSeam', scene);
  seamPBR.albedoColor = new Color3(0.97, 0.95, 0.88); // cream stitched thread
  seamPBR.roughness   = 0.45;
  seamPBR.metallic    = 0.0;
  seamMesh.material   = seamPBR;
  seamMesh.parent     = ballMesh;

  // Length indicator ring around the ball with a clean gap
  // Yorker -> Yellow (#FACC15), Length -> Green (#22C55E), Short -> Red (#EF4444)
  const ringMesh = MeshBuilder.CreateTorus(
    'ballLengthRing',
    { diameter: 0.30, thickness: 0.013, tessellation: 48 },
    scene
  );
  const ringMat = new StandardMaterial('ballLengthRingMat', scene);
  ringMat.emissiveColor = Color3.FromHexString('#22C55E'); // default green
  ringMat.diffuseColor = Color3.Black();
  ringMat.specularColor = Color3.Black();
  ringMat.alpha = 0.92;
  ringMesh.material = ringMat;
  ringMesh.parent = ballMesh;
  ringMesh.isVisible = false;

  // Pitch bounce turf dust puff particle burst
  const pitchPuff = new ParticleSystem('pitchPuff', 40, scene);
  pitchPuff.emitter = new Vector3(0, 0.08, 0);
  try {
    const dustTex = new DynamicTexture('dustDot', 32, scene, false);
    const dctx = dustTex.getContext() as any;
    dctx.beginPath();
    dctx.arc(16, 16, 14, 0, 2 * Math.PI);
    dctx.fillStyle = '#E5D0B0';
    dctx.fill();
    dustTex.update();
    pitchPuff.particleTexture = dustTex;
  } catch (e) {}
  pitchPuff.minEmitBox  = new Vector3(-0.06, 0.0, -0.06);
  pitchPuff.maxEmitBox  = new Vector3( 0.06, 0.04,  0.06);
  pitchPuff.color1      = new Color4(0.85, 0.75, 0.60, 0.80);
  pitchPuff.color2      = new Color4(0.65, 0.55, 0.40, 0.45);
  pitchPuff.colorDead   = new Color4(0.50, 0.40, 0.30, 0.00);
  pitchPuff.minSize     = 0.04;
  pitchPuff.maxSize     = 0.14;
  pitchPuff.minLifeTime = 0.15;
  pitchPuff.maxLifeTime = 0.35;
  pitchPuff.emitRate    = 0;
  pitchPuff.gravity     = new Vector3(0, -3.0, 0);
  pitchPuff.direction1  = new Vector3(-0.4, 1.2, -0.4);
  pitchPuff.direction2  = new Vector3( 0.4, 1.8,  0.4);
  pitchPuff.manualEmitCount = 0;
  try { pitchPuff.start(); } catch (e) {}

  let raf: number | null = null;

  const resetToBowler = () => {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    ringMesh.isVisible = false;
    ballMesh.position = new Vector3(0.35, 2.1, 28.0); // back at top of run-up
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9 DISTINCT BOWLING DELIVERY TRAJECTORIES (3 Lengths × 3 Lines)
  // Continuous uniform forward Z velocity across real 22-yard pitch distance
  // Short balls pitch at Z = 0.0m (halfway down pitch) and rear up to helmet height
  // Good length balls pitch at Z = -4.8m (in front of batsman) and hit at waist height
  // Yorkers pitch at Z = -7.6m (blockhole) right in front of the bat blade
  // Contact position calibrated to Z = -8.4m directly into the bat blade face
  // ─────────────────────────────────────────────────────────────────────────────
  const BOWLING_DELIVERIES: Record<DeliveryCombination, BowlingDeliveryDef> = {
    // ─── 1. SHORT PITCHED BALLS (Bounce Z = 0.0m, t_bounce ≈ 0.545, Contact Z = -8.4m) ──
    short_leg: {
      combination: 'short_leg',
      length: 'short',
      line: 'leg',
      name: 'Rib-Cage Bouncer (Short Leg)',
      description: 'Pitches halfway down the pitch, rearing up aggressively into batsman’s ribs & chest.',
      bouncePos: new Vector3(-0.10, 0.08, 0.0),
      contactPos: new Vector3(-0.16, 1.45, -8.4),
      bounceProgress: 0.545,
      flightArcY: 0.28,
      reboundArcY: 0.95,
    },
    short_mid: {
      combination: 'short_mid',
      length: 'short',
      line: 'mid',
      name: 'Throat Bouncer (Short Mid / 4th Stump)',
      description: 'Pitches halfway down the pitch in 4th stump channel, climbing steeply to throat height.',
      bouncePos: new Vector3(0.08, 0.08, 0.0),
      contactPos: new Vector3(0.12, 1.50, -8.4),
      bounceProgress: 0.545,
      flightArcY: 0.28,
      reboundArcY: 0.98,
    },
    short_off: {
      combination: 'short_off',
      length: 'short',
      line: 'off',
      name: 'Short & Wide Slash (Short Off)',
      description: 'Pitches halfway down outside off stump, rising high to invite the backfoot cut.',
      bouncePos: new Vector3(0.28, 0.08, 0.0),
      contactPos: new Vector3(0.38, 1.40, -8.4),
      bounceProgress: 0.545,
      flightArcY: 0.28,
      reboundArcY: 0.92,
    },

    // ─── 2. GOOD LENGTH BALLS (Bounce Z = -4.8m, t_bounce ≈ 0.805, Contact Z = -8.4m) ────
    length_leg: {
      combination: 'length_leg',
      length: 'length',
      line: 'leg',
      name: 'In-Angler to Pads (Good Length Leg)',
      description: 'Pitches on true good length shaping into pads & leg stump at knee-roll height.',
      bouncePos: new Vector3(-0.08, 0.08, -4.8),
      contactPos: new Vector3(-0.14, 0.72, -8.4),
      bounceProgress: 0.805,
      flightArcY: 0.38,
      reboundArcY: 0.65,
    },
    length_mid: {
      combination: 'length_mid',
      length: 'length',
      line: 'mid',
      name: 'Top of Off / 4th Stump Channel (Good Length Mid)',
      description: 'Probing in corridor of uncertainty, clipping top of off-stump bail into bat.',
      bouncePos: new Vector3(0.08, 0.08, -4.8),
      contactPos: new Vector3(0.12, 0.74, -8.4),
      bounceProgress: 0.805,
      flightArcY: 0.38,
      reboundArcY: 0.68,
    },
    length_off: {
      combination: 'length_off',
      length: 'length',
      line: 'off',
      name: 'Corridor Drive Bait (Good Length Off)',
      description: 'Good length drifting outside off stump, bouncing right into the cover drive sweet spot.',
      bouncePos: new Vector3(0.26, 0.08, -4.8),
      contactPos: new Vector3(0.36, 0.70, -8.4),
      bounceProgress: 0.805,
      flightArcY: 0.38,
      reboundArcY: 0.62,
    },

    // ─── 3. YORKER BALLS (Bounce Z = -7.6m, t_bounce ≈ 0.957, Contact Z = -8.4m) ────────
    yorker_leg: {
      combination: 'yorker_leg',
      length: 'yorker',
      line: 'leg',
      name: 'In-Swinging Toe-Crusher (Yorker Leg)',
      description: 'Torpedo aimed directly at base of leg stump and batsman’s boots at popping crease.',
      bouncePos: new Vector3(-0.10, 0.08, -7.6),
      contactPos: new Vector3(-0.14, 0.16, -8.4),
      bounceProgress: 0.957,
      flightArcY: 0.48,
      reboundArcY: 0.14,
    },
    yorker_mid: {
      combination: 'yorker_mid',
      length: 'yorker',
      line: 'mid',
      name: 'Stump-Shattering Blockhole (Yorker Mid / 4th Stump)',
      description: 'Fast blockhole yorker pinpointed directly at root of middle and off stump.',
      bouncePos: new Vector3(0.06, 0.08, -7.6),
      contactPos: new Vector3(0.08, 0.15, -8.4),
      bounceProgress: 0.957,
      flightArcY: 0.48,
      reboundArcY: 0.12,
    },
    yorker_off: {
      combination: 'yorker_off',
      length: 'yorker',
      line: 'off',
      name: 'Wide Slicing Tramline (Yorker Off)',
      description: 'Pinpoint wide yorker fired along the off tramline right to the bat bottom.',
      bouncePos: new Vector3(0.28, 0.08, -7.6),
      contactPos: new Vector3(0.36, 0.18, -8.4),
      bounceProgress: 0.957,
      flightArcY: 0.48,
      reboundArcY: 0.15,
    },
  };

  const animateDeliveryCombination = (
    combination: DeliveryCombination,
    durationMs: number,
    onPitchBounce: () => void,
    onReachContact: () => void
  ) => {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }

    const def = BOWLING_DELIVERIES[combination] || BOWLING_DELIVERIES['length_mid'];
    console.log(`[BOWLING DELIVERY] 🏏 "${def.combination}" | ${def.name} | Bounce Z=${def.bouncePos.z.toFixed(1)}m, Arrival Y=${def.contactPos.y.toFixed(2)}m`);

    // Update indicator ring color based on delivery length:
    // Yorker -> Yellow (#FACC15), Length -> Green (#22C55E), Short -> Red (#EF4444)
    if (def.length === 'yorker') {
      ringMat.emissiveColor = Color3.FromHexString('#FACC15'); // Yellow
    } else if (def.length === 'short') {
      ringMat.emissiveColor = Color3.FromHexString('#EF4444'); // Red
    } else {
      ringMat.emissiveColor = Color3.FromHexString('#22C55E'); // Green
    }
    ringMesh.isVisible = true;

    const startPos = new Vector3(0.25, 2.15, 10.06); // bowler release point
    const { bouncePos, contactPos, bounceProgress, flightArcY, reboundArcY } = def;

    const t0 = performance.now();
    let bounced = false;

    // Pace-adaptive physics:
    // Faster balls (e.g. 480-650ms bolt/fast) spin faster and have flatter zippier trajectories.
    // Slower balls (e.g. 1150-1240ms slow spin) spin gentler and have looped flight arc.
    const paceFactor = Math.max(0.7, Math.min(1.85, 1000 / durationMs));
    const seamSpinRate = 0.30 * paceFactor;
    const dynamicFlightArcY = flightArcY * (paceFactor < 0.95 ? 1.18 : paceFactor > 1.25 ? 0.88 : 1.0);

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);

      // Realistic continuous seam and ball spin scaled to bowling pace
      ballMesh.rotation.x += seamSpinRate;
      ballMesh.rotation.z = (bouncePos.x - startPos.x) * 0.35;

      // Ring billboard: keep ring facing the camera with clean gap
      if (scene.activeCamera) {
        ringMesh.lookAt(scene.activeCamera.position);
      }

      // UNIFORM CONTINUOUS FORWARD MOTION ALONG Z:
      // Covers the 18.46m pitch length precisely in durationMs!
      const z = startPos.z + (contactPos.z - startPos.z) * t;

      let x: number;
      let y: number;

      if (t < bounceProgress) {
        // Phase 1: From Bowler Hand to Turf Pitch
        const s = t / bounceProgress;
        x = startPos.x + (bouncePos.x - startPos.x) * s;
        y = (1 - s) * startPos.y + s * bouncePos.y + Math.sin(s * Math.PI) * dynamicFlightArcY;
      } else {
        // Phase 2: Pitch Impact and Rebound to Batsman
        if (!bounced) {
          bounced = true;
          soundManager.playPitchBounce();
          pitchPuff.emitter = bouncePos.clone();
          pitchPuff.manualEmitCount = 30;
          onPitchBounce();
        }
        const s = (t - bounceProgress) / (1 - bounceProgress);
        x = bouncePos.x + (contactPos.x - bouncePos.x) * s;
        y = (1 - s) * bouncePos.y + s * contactPos.y + Math.sin(s * Math.PI) * reboundArcY;
      }

      ballMesh.position.set(x, Math.max(0.08, y), z);

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        ringMesh.isVisible = false;
        raf = null;
        onReachContact();
      }
    };

    raf = requestAnimationFrame(step);
  };

  const animateDelivery = (
    line: BallLine,
    durationMs: number,
    onPitchBounce: () => void,
    onReachContact: () => void,
    length?: BallLength
  ) => {
    const normLine: 'leg' | 'mid' | 'off' = line === 'straight' ? 'mid' : (line as any);
    const normLength: BallLength = length || 'length';
    const combination = `${normLength}_${normLine}` as DeliveryCombination;
    animateDeliveryCombination(combination, durationMs, onPitchBounce, onReachContact);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 60 UNIQUE SHOT ANIMATIONS (20 per direction: Left/Leg, Straight/The V, Right/Off)
  // Distributed across 1 Run, 2 Runs, 4 Runs, and 6 Runs
  // ─────────────────────────────────────────────────────────────────────────────
  interface ShotTrajectoryDef {
    id: string;
    index: number;
    name: string;
    direction: ShotDirection;
    runs: '1' | '2' | '4' | '6';
    endPos: Vector3;
    peakY: number;
    durationMs: number;
    bounces: number; // 0 = aerial six cleared into stands, 2-5 = turf skips/hops
  }

  const SHOT_TRAJECTORIES: ShotTrajectoryDef[] = [
    // ═══════════════════════════════════════════════════════════════════════════
    // LEFT ARROW / KEY A (LEG SIDE / ON SIDE) — 20 ANIMATIONS (STRICTLY X < 0)
    // ═══════════════════════════════════════════════════════════════════════════
    // 6 Runs (5 variations)
    { id: 'leg_6_1', index: 1, name: 'Towering Pull over Deep Mid-Wicket into Stands', direction: 'leg', runs: '6', endPos: new Vector3(-58, 24, 58), peakY: 28, durationMs: 2000, bounces: 0 },
    { id: 'leg_6_2', index: 2, name: 'Monstrous Hook over Backward Square Leg', direction: 'leg', runs: '6', endPos: new Vector3(-72, 22, 12), peakY: 26, durationMs: 1950, bounces: 0 },
    { id: 'leg_6_3', index: 3, name: 'Lofted On-Drive over Long-On Ropes', direction: 'leg', runs: '6', endPos: new Vector3(-30, 26, 76), peakY: 30, durationMs: 2100, bounces: 0 },
    { id: 'leg_6_4', index: 4, name: 'Slog Sweep clearing Cow Corner Stands', direction: 'leg', runs: '6', endPos: new Vector3(-66, 25, 42), peakY: 27, durationMs: 2050, bounces: 0 },
    { id: 'leg_6_5', index: 5, name: 'Helicopter Whip high into Deep Fine Leg', direction: 'leg', runs: '6', endPos: new Vector3(-55, 20, -16), peakY: 23, durationMs: 1850, bounces: 0 },
    // 4 Runs (6 variations)
    { id: 'leg_4_1', index: 6, name: 'Scorching Square Leg Sweep along Turf', direction: 'leg', runs: '4', endPos: new Vector3(-72, 0.08, 10), peakY: 0.6, durationMs: 1550, bounces: 4 },
    { id: 'leg_4_2', index: 7, name: 'Piercing Pull through Mid-Wicket Gap', direction: 'leg', runs: '4', endPos: new Vector3(-66, 0.08, 36), peakY: 1.1, durationMs: 1500, bounces: 3 },
    { id: 'leg_4_3', index: 8, name: 'Delicate Glance past Short Fine Leg to Fence', direction: 'leg', runs: '4', endPos: new Vector3(-56, 0.08, -24), peakY: 0.4, durationMs: 1600, bounces: 5 },
    { id: 'leg_4_4', index: 9, name: 'Firm On-Drive beating Mid-On to Boundary', direction: 'leg', runs: '4', endPos: new Vector3(-52, 0.08, 52), peakY: 0.9, durationMs: 1520, bounces: 4 },
    { id: 'leg_4_5', index: 10, name: 'Short-Arm Jab beating Deep Square Fielder', direction: 'leg', runs: '4', endPos: new Vector3(-70, 0.08, 22), peakY: 1.6, durationMs: 1580, bounces: 3 },
    { id: 'leg_4_6', index: 11, name: 'Aerial One-Bounce Pull onto Boundary Cushions', direction: 'leg', runs: '4', endPos: new Vector3(-68, 0.12, 30), peakY: 5.2, durationMs: 1450, bounces: 2 },
    // 2 Runs (5 variations)
    { id: 'leg_2_1', index: 12, name: 'Worked through Vacant Mid-Wicket Pocket', direction: 'leg', runs: '2', endPos: new Vector3(-38, 0.08, 35), peakY: 1.4, durationMs: 1200, bounces: 3 },
    { id: 'leg_2_2', index: 13, name: 'Whipped off Pads into Deep Square Gap', direction: 'leg', runs: '2', endPos: new Vector3(-42, 0.08, 14), peakY: 1.1, durationMs: 1150, bounces: 3 },
    { id: 'leg_2_3', index: 14, name: 'Pushed Wide of Long-On for an Easy Two', direction: 'leg', runs: '2', endPos: new Vector3(-26, 0.08, 44), peakY: 0.8, durationMs: 1220, bounces: 3 },
    { id: 'leg_2_4', index: 15, name: 'Nudged fine of Backward Square Leg', direction: 'leg', runs: '2', endPos: new Vector3(-36, 0.08, -12), peakY: 0.6, durationMs: 1100, bounces: 3 },
    { id: 'leg_2_5', index: 16, name: 'Tucked off Hip into Deep Mid-Wicket pocket', direction: 'leg', runs: '2', endPos: new Vector3(-46, 0.08, 25), peakY: 1.7, durationMs: 1200, bounces: 2 },
    // 1 Run (4 variations)
    { id: 'leg_1_1', index: 17, name: 'Gentle Push to Mid-On for Quick Single', direction: 'leg', runs: '1', endPos: new Vector3(-12, 0.08, 16), peakY: 0.3, durationMs: 750, bounces: 2 },
    { id: 'leg_1_2', index: 18, name: 'Dropped at Short Mid-Wicket & Scampered', direction: 'leg', runs: '1', endPos: new Vector3(-15, 0.08, 6), peakY: 0.2, durationMs: 700, bounces: 2 },
    { id: 'leg_1_3', index: 19, name: 'Turned off the Pads to Square Leg', direction: 'leg', runs: '1', endPos: new Vector3(-18, 0.08, -1), peakY: 0.35, durationMs: 780, bounces: 2 },
    { id: 'leg_1_4', index: 20, name: 'Glanced softly down to Short Fine Leg', direction: 'leg', runs: '1', endPos: new Vector3(-14, 0.08, -14), peakY: 0.25, durationMs: 720, bounces: 2 },

    // ═══════════════════════════════════════════════════════════════════════════
    // UP ARROW / KEY W (IN "THE V" / STRAIGHT) — 20 ANIMATIONS (STRICTLY |X| <= 4.0)
    // ═══════════════════════════════════════════════════════════════════════════
    // 6 Runs (5 variations)
    { id: 'str_6_1', index: 21, name: 'Straight Six over Bowler Head into Pavilion', direction: 'straight', runs: '6', endPos: new Vector3(0.2, 26, 85), peakY: 32, durationMs: 2150, bounces: 0 },
    { id: 'str_6_2', index: 22, name: 'Lofted Straight Drive into Sight Screen Upper Tier', direction: 'straight', runs: '6', endPos: new Vector3(-1.8, 24, 82), peakY: 29, durationMs: 2050, bounces: 0 },
    { id: 'str_6_3', index: 23, name: 'Flat Maximum over Long-Off / Long-On Divider', direction: 'straight', runs: '6', endPos: new Vector3(2.0, 22, 84), peakY: 26, durationMs: 1980, bounces: 0 },
    { id: 'str_6_4', index: 24, name: 'High Arc Straight Launch clearing Stadium Sightscreen', direction: 'straight', runs: '6', endPos: new Vector3(0.0, 30, 88), peakY: 35, durationMs: 2200, bounces: 0 },
    { id: 'str_6_5', index: 25, name: 'Punched Straight Lofted Drive landing in Long-Off Stand', direction: 'straight', runs: '6', endPos: new Vector3(-2.4, 25, 80), peakY: 28, durationMs: 2000, bounces: 0 },
    // 4 Runs (6 variations)
    { id: 'str_4_1', index: 26, name: 'Bullet Straight Drive blistering along Pitch Carpet', direction: 'straight', runs: '4', endPos: new Vector3(0.2, 0.08, 72), peakY: 0.5, durationMs: 1480, bounces: 4 },
    { id: 'str_4_2', index: 27, name: 'Classic Straight Punch past Umpire to Boundary', direction: 'straight', runs: '4', endPos: new Vector3(-1.5, 0.08, 73), peakY: 0.7, durationMs: 1520, bounces: 4 },
    { id: 'str_4_3', index: 28, name: 'Drilled Straight past Bowler to Long-Off Fence', direction: 'straight', runs: '4', endPos: new Vector3(3.0, 0.08, 71), peakY: 0.8, durationMs: 1500, bounces: 4 },
    { id: 'str_4_4', index: 29, name: 'One-Bounce Straight Hammer onto Boundary Rope', direction: 'straight', runs: '4', endPos: new Vector3(0.8, 0.12, 70), peakY: 4.8, durationMs: 1420, bounces: 2 },
    { id: 'str_4_5', index: 30, name: 'Front-Foot Punch in the V beating Mid-Off Dive', direction: 'straight', runs: '4', endPos: new Vector3(2.2, 0.08, 72), peakY: 1.0, durationMs: 1540, bounces: 3 },
    { id: 'str_4_6', index: 31, name: 'Dead-Center Straight Drive past Bowling Crease', direction: 'straight', runs: '4', endPos: new Vector3(-0.6, 0.08, 74), peakY: 0.6, durationMs: 1490, bounces: 4 },
    // 2 Runs (5 variations)
    { id: 'str_2_1', index: 32, name: 'Firm Push past Bowler down to Long-On Sweeper', direction: 'straight', runs: '2', endPos: new Vector3(-3.2, 0.08, 48), peakY: 0.9, durationMs: 1200, bounces: 3 },
    { id: 'str_2_2', index: 33, name: 'Clean Straight Push down to Long-Off Pocket', direction: 'straight', runs: '2', endPos: new Vector3(3.5, 0.08, 46), peakY: 1.1, durationMs: 1220, bounces: 3 },
    { id: 'str_2_3', index: 34, name: 'Aerial Chip over Bowler Head into No-Mans Land', direction: 'straight', runs: '2', endPos: new Vector3(0.5, 0.08, 38), peakY: 6.0, durationMs: 1150, bounces: 2 },
    { id: 'str_2_4', index: 35, name: 'Crisp On-Drive into the V, deep fielder cutoff', direction: 'straight', runs: '2', endPos: new Vector3(-2.0, 0.08, 42), peakY: 1.3, durationMs: 1180, bounces: 3 },
    { id: 'str_2_5', index: 36, name: 'Straight Check-Drive between Mid-On and Mid-Off', direction: 'straight', runs: '2', endPos: new Vector3(1.2, 0.08, 44), peakY: 0.8, durationMs: 1190, bounces: 3 },
    // 1 Run (4 variations)
    { id: 'str_1_1', index: 37, name: 'Straight Push back past Bowlers Shins', direction: 'straight', runs: '1', endPos: new Vector3(0.3, 0.08, 16), peakY: 0.3, durationMs: 750, bounces: 2 },
    { id: 'str_1_2', index: 38, name: 'Forward Defensive Push into the V for Quick Single', direction: 'straight', runs: '1', endPos: new Vector3(-1.6, 0.08, 14), peakY: 0.2, durationMs: 720, bounces: 2 },
    { id: 'str_1_3', index: 39, name: 'Soft-Hands Dead-Bat Straight Tap and Dash', direction: 'straight', runs: '1', endPos: new Vector3(1.0, 0.08, 12), peakY: 0.15, durationMs: 680, bounces: 2 },
    { id: 'str_1_4', index: 40, name: 'Punched straight to Mid-Off on the circle edge', direction: 'straight', runs: '1', endPos: new Vector3(2.8, 0.08, 18), peakY: 0.35, durationMs: 760, bounces: 2 },

    // ═══════════════════════════════════════════════════════════════════════════
    // RIGHT ARROW / KEY D (OFF SIDE) — 20 ANIMATIONS (STRICTLY X > 0)
    // ═══════════════════════════════════════════════════════════════════════════
    // 6 Runs (5 variations)
    { id: 'off_6_1', index: 41, name: 'Glorious Lofted Cover Drive over Extra Cover into Stands', direction: 'off', runs: '6', endPos: new Vector3(60, 24, 55), peakY: 28, durationMs: 2050, bounces: 0 },
    { id: 'off_6_2', index: 42, name: 'Explosive Slash / Upper Cut over Deep Backward Point', direction: 'off', runs: '6', endPos: new Vector3(72, 22, 12), peakY: 25, durationMs: 1950, bounces: 0 },
    { id: 'off_6_3', index: 43, name: 'Audacious Ramp / Upper Scoop over Third Man Rope', direction: 'off', runs: '6', endPos: new Vector3(54, 20, -18), peakY: 22, durationMs: 1850, bounces: 0 },
    { id: 'off_6_4', index: 44, name: 'Inside-Out Lofted Drive sailing over Deep Point', direction: 'off', runs: '6', endPos: new Vector3(66, 25, 32), peakY: 27, durationMs: 2000, bounces: 0 },
    { id: 'off_6_5', index: 45, name: 'Mighty Lofted Drive over Wide Long-Off Barrier', direction: 'off', runs: '6', endPos: new Vector3(44, 26, 70), peakY: 29, durationMs: 2100, bounces: 0 },
    // 4 Runs (6 variations)
    { id: 'off_4_1', index: 46, name: 'Exquisite Threaded Cover Drive piercing Infield', direction: 'off', runs: '4', endPos: new Vector3(68, 0.08, 42), peakY: 0.6, durationMs: 1520, bounces: 4 },
    { id: 'off_4_2', index: 47, name: 'Ferocious Square Cut behind Point to the Fence', direction: 'off', runs: '4', endPos: new Vector3(72, 0.08, 6), peakY: 0.5, durationMs: 1480, bounces: 4 },
    { id: 'off_4_3', index: 48, name: 'Steered Guide past Gully down to Third Man Boundary', direction: 'off', runs: '4', endPos: new Vector3(56, 0.08, -24), peakY: 0.4, durationMs: 1580, bounces: 5 },
    { id: 'off_4_4', index: 49, name: 'Punchy Extra Cover Drive beating Sweeper Cover', direction: 'off', runs: '4', endPos: new Vector3(64, 0.08, 52), peakY: 0.9, durationMs: 1510, bounces: 3 },
    { id: 'off_4_5', index: 50, name: 'Back-Foot Punch through Backward Point Boundary', direction: 'off', runs: '4', endPos: new Vector3(70, 0.08, 20), peakY: 1.1, durationMs: 1530, bounces: 3 },
    { id: 'off_4_6', index: 51, name: 'Flashing Cut striking Boundary Advertising Board', direction: 'off', runs: '4', endPos: new Vector3(68, 0.12, 24), peakY: 4.4, durationMs: 1440, bounces: 2 },
    // 2 Runs (5 variations)
    { id: 'off_2_1', index: 52, name: 'Driven softly into Deep Extra Cover Pocket', direction: 'off', runs: '2', endPos: new Vector3(40, 0.08, 38), peakY: 1.2, durationMs: 1180, bounces: 3 },
    { id: 'off_2_2', index: 53, name: 'Cut firmly between Point and Third Man', direction: 'off', runs: '2', endPos: new Vector3(45, 0.08, 12), peakY: 0.9, durationMs: 1160, bounces: 3 },
    { id: 'off_2_3', index: 54, name: 'Pushed wide of Mid-Off into wide open gap', direction: 'off', runs: '2', endPos: new Vector3(30, 0.08, 48), peakY: 1.0, durationMs: 1220, bounces: 3 },
    { id: 'off_2_4', index: 55, name: 'Glanced off Face of Bat toward Deep Third Man', direction: 'off', runs: '2', endPos: new Vector3(36, 0.08, -14), peakY: 0.7, durationMs: 1140, bounces: 3 },
    { id: 'off_2_5', index: 56, name: 'Lofted Chip over Infield Point, collected on boundary ring', direction: 'off', runs: '2', endPos: new Vector3(46, 0.08, 22), peakY: 5.6, durationMs: 1240, bounces: 2 },
    // 1 Run (4 variations)
    { id: 'off_1_1', index: 57, name: 'Soft-Touch Dab past Slip towards Third Man', direction: 'off', runs: '1', endPos: new Vector3(15, 0.08, -10), peakY: 0.3, durationMs: 720, bounces: 2 },
    { id: 'off_1_2', index: 58, name: 'Pushed into Cover Gap for a sharp single', direction: 'off', runs: '1', endPos: new Vector3(17, 0.08, 18), peakY: 0.35, durationMs: 750, bounces: 2 },
    { id: 'off_1_3', index: 59, name: 'Dropped at Point and ran hard', direction: 'off', runs: '1', endPos: new Vector3(14, 0.08, 4), peakY: 0.2, durationMs: 700, bounces: 2 },
    { id: 'off_1_4', index: 60, name: 'Checked Drive to Mid-Off on the 30-yard ring', direction: 'off', runs: '1', endPos: new Vector3(13, 0.08, 22), peakY: 0.38, durationMs: 770, bounces: 2 },
  ];

  const animateShot = (
    outcome: BallOutcome,
    shotDir: ShotDirection,
    onComplete: () => void
  ) => {
    if (raf !== null) { cancelAnimationFrame(raf); }
    ringMesh.isVisible = false;

    const startPos = ballMesh.position.clone();

    // 1. Select matching trajectory from the 60 defined animations
    const targetDir = shotDir || 'straight';
    let targetRuns: '1' | '2' | '4' | '6' = '1';
    if (outcome === '6') targetRuns = '6';
    else if (outcome === '4') targetRuns = '4';
    else if (outcome === '2') targetRuns = '2';
    else if (outcome === '3') targetRuns = '2';
    else if (outcome === '1') targetRuns = '1';
    else if (outcome === 'dot') targetRuns = '1';

    // Filter by strict user direction key
    const dirPool = SHOT_TRAJECTORIES.filter((t) => t.direction === targetDir);
    const runPool = dirPool.filter((t) => t.runs === targetRuns);
    const selectedTraj: ShotTrajectoryDef =
      runPool.length > 0
        ? runPool[Math.floor(Math.random() * runPool.length)]
        : dirPool[Math.floor(Math.random() * dirPool.length)];

    console.log(
      `%c[SHOT ANIMATION #${selectedTraj.index} / 60] "${selectedTraj.name}" (${selectedTraj.runs} Runs, Dir: ${selectedTraj.direction.toUpperCase()})`,
      'background:#1e293b; color:#38bdf8; font-weight:bold; font-size:12px; padding:3px 6px; border-radius:4px;'
    );

    let endPos = selectedTraj.endPos.clone();
    let peakY = selectedTraj.peakY;
    let dur = selectedTraj.durationMs;
    const bounces = selectedTraj.bounces;

    // Special case for rare dismissals or dot defense
    if (outcome === 'wicket') {
      endPos = new Vector3(0, 0.45, -10.06);
      peakY = 0.4;
      dur = 650;
    } else if (outcome === 'dot') {
      // Soft dead-bat drop into the pitch in the user's direction
      const dotX = targetDir === 'leg' ? -2.5 : targetDir === 'off' ? 2.5 : 0.0;
      endPos = new Vector3(dotX, 0.08, -7.0);
      peakY = 0.15;
      dur = 550;
    }

    const t0 = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);

      // Linear interpolation along X and Z
      const x = startPos.x + (endPos.x - startPos.x) * t;
      const z = startPos.z + (endPos.z - startPos.z) * t;

      // Realistic vertical arc
      let y: number;
      if (bounces === 0 || outcome === 'wicket') {
        // High unbroken rainbow arc for maximum sixes
        const bY = startPos.y + (endPos.y - startPos.y) * t;
        const arc = Math.sin(t * Math.PI) * peakY;
        y = Math.max(0.08, bY + arc);
      } else {
        // Multi-hop turf bounces with realistic energy decay along outfield
        const numBounces = Math.max(1, bounces);
        const bounceIdx = Math.min(numBounces - 1, Math.floor(t * numBounces));
        const bounceT = (t * numBounces) - bounceIdx;
        const decay = Math.pow(0.55, bounceIdx);
        const bounceHeight = Math.sin(bounceT * Math.PI) * (peakY * decay);
        const bY = startPos.y + (endPos.y - startPos.y) * t;
        y = Math.max(0.08, bY + bounceHeight);
      }

      // Continuous seam rotation
      ballMesh.rotation.x += 0.35;
      ballMesh.rotation.y += 0.20;
      ballMesh.position.set(x, y, z);

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        raf = null;
        onComplete();
      }
    };

    raf = requestAnimationFrame(step);
  };

  const stop = () => {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    ringMesh.isVisible = false;
  };

  return { ballMesh, resetToBowler, animateDelivery, animateDeliveryCombination, animateShot, stop };
}
