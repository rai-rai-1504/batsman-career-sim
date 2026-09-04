import {
  Vector3,
} from '@babylonjs/core';
import { PlayerCharacterRig } from './playerMeshes';
import { ShotDirection } from '../types';

/**
 * Safe check: is the rig's root node still alive and not disposed?
 */
function isRigAlive(rig: PlayerCharacterRig): boolean {
  try {
    return !!(rig?.root && !rig.root.isDisposed());
  } catch {
    return false;
  }
}

/**
 * 1. Start Idle Animation
 */
export function startIdleAnimation(batterRig: PlayerCharacterRig): () => void {
  batterRig.playAnimation('new_batsman_idle', true);
  return () => {};
}

/**
 * 2. Full Bowling Run-up, Pitch, and Return Sequence.
 *
 * Sequence:
 *  - Bowler runs from startPos (Z = 28.0) to creasePos (Z = 10.06) playing standing_jump_running
 *  - At crease, seamlessly starts baseball_pitching at 1.0x speed
 *  - Releases the ball at 60 frames (~2.0 seconds into the pitching animation) directly from the bowler's hand
 *  - Follow-through finishes (~1.0s after release), then bowler seamlessly returns to standing_idle and walks back
 *  - All rAF loops and observable handlers guard against rig disposal
 */
export function playFullBowlingSequence(
  bowlerRig: PlayerCharacterRig,
  onRelease: () => void
) {
  const startPos = new Vector3(0.35, 0, 28.0);
  const creasePos = new Vector3(0.35, 0, 10.06);
  const RUNUP_DURATION_MS = 900;

  // Fire-and-forget run animation
  bowlerRig.playAnimation('standing_jump_running', true, 1.35);

  const t0 = performance.now();

  const runupStep = (now: number) => {
    // Exit immediately if rig was disposed (scene changed/unmounted)
    if (!isRigAlive(bowlerRig)) return;

    const elapsed = now - t0;
    const progress = Math.min(1, elapsed / RUNUP_DURATION_MS);

    try {
      bowlerRig.root.position.z = startPos.z + (creasePos.z - startPos.z) * progress;
      bowlerRig.root.position.y = Math.abs(Math.sin(progress * Math.PI * 5)) * 0.08;
    } catch {
      return; // Silently exit if position write fails
    }

    if (progress < 1) {
      requestAnimationFrame(runupStep);
    } else {
      if (!isRigAlive(bowlerRig)) return;

      try {
        bowlerRig.root.position.y = 0;
        bowlerRig.root.position.copyFrom(creasePos);
      } catch { return; }

      // Seamlessly start pitching animation at natural 1.0x speed
      bowlerRig.playAnimation('baseball_pitching', false, 1.0).then(pitchingGroup => {
        if (!isRigAlive(bowlerRig)) return;

        let hasReleased = false;
        let hasCompletedPitch = false;
        const pitchStart = performance.now();

        const triggerRelease = () => {
          if (hasReleased) return;
          hasReleased = true;
          try {
            console.log(`[BowlingSeq] Ball released at frame ${pitchingGroup?.getCurrentFrame()?.toFixed(1) ?? 'N/A'}, elapsed: ${(performance.now() - pitchStart).toFixed(0)}ms`);
            onRelease();
          } catch (e) {
            console.error('[BowlingSeq] onRelease threw:', e);
          }
        };

        const startReturnWalk = () => {
          if (hasCompletedPitch) return;
          hasCompletedPitch = true;

          // Ensure release has been triggered if not already
          triggerRelease();

          if (!isRigAlive(bowlerRig)) return;

          // Switch seamlessly to standing_idle as bowler walks back
          bowlerRig.playAnimation('standing_idle', true, 1.0);

          // Translate back to start over 800ms
          const returnStart = performance.now();
          const returnDuration = 800;
          let currentZ: number;
          let currentX: number;
          try {
            currentZ = bowlerRig.root.position.z;
            currentX = bowlerRig.root.position.x;
          } catch { return; }

          const returnStep = (now: number) => {
            if (!isRigAlive(bowlerRig)) return;
            const t = Math.min(1, (now - returnStart) / returnDuration);
            const ease = 1 - (1 - t) * (1 - t);
            try {
              bowlerRig.root.position.z = currentZ + (startPos.z - currentZ) * ease;
              bowlerRig.root.position.x = currentX + (startPos.x - currentX) * ease;
            } catch { return; }
            if (t < 1) requestAnimationFrame(returnStep);
            else {
              try { bowlerRig.root.position.copyFrom(startPos); } catch {}
            }
          };
          requestAnimationFrame(returnStep);
        };

        if (pitchingGroup) {
          // Frame-by-frame check for the 60-frame (~2.0s) release point
          const checkPitchFrame = (now: number) => {
            if (!isRigAlive(bowlerRig)) return;

            const elapsedMs = now - pitchStart;
            const currentFrame = pitchingGroup.getCurrentFrame();

            // Mixamo 60 frames = frame 120 in Babylon (imported at 60fps), or ~2000ms elapsed
            if (!hasReleased && (currentFrame >= 120 || (currentFrame >= 60 && elapsedMs >= 1700) || elapsedMs >= 2000)) {
              triggerRelease();
            }

            // Follow-through completes ~1.0s after release (around frame 180 or ~3000ms from pitch start)
            if (!hasCompletedPitch && (currentFrame >= 180 || elapsedMs >= 3000)) {
              startReturnWalk();
              return;
            }

            if (!hasCompletedPitch) {
              requestAnimationFrame(checkPitchFrame);
            }
          };

          requestAnimationFrame(checkPitchFrame);

          // Also handle when animation ends
          pitchingGroup.onAnimationEndObservable.addOnce(() => {
            startReturnWalk();
          });
        } else {
          // Fallback if pitching group is unavailable: release at 2.0s and return
          setTimeout(() => {
            triggerRelease();
            startReturnWalk();
          }, 2000);
        }
      }).catch(err => {
        console.error('[BowlingSeq] playAnimation(baseball_pitching) rejected:', err);
        try { onRelease(); } catch {}
      });
    }
  };

  requestAnimationFrame(runupStep);
}

/**
 * 3. Batsman Shot Animation
 */
export async function playBatterShotAnimation(
  batterRig: PlayerCharacterRig,
  direction: ShotDirection = 'straight',
  onComplete?: () => void,
  animName?: string
) {
  if (!isRigAlive(batterRig)) return;
  try {
    const baseRotY = Math.PI - 0.52;
    // Directional stance swivel during the stroke:
    // leg: pull/swivel toward leg side (left)
    // off: step out / cut toward off side (right)
    // straight: stay square down the ground in the V
    const targetRotY = direction === 'leg' ? baseRotY - 0.28
                     : direction === 'off' ? baseRotY + 0.28
                     : baseRotY;

    if (batterRig.root && batterRig.root.rotation) {
      batterRig.root.rotation.y = targetRotY;
    }

    const selectedAnim = animName || 'baseball_strike';
    let shotGroup: any = null;

    if (selectedAnim === 'pull_shot') {
      shotGroup = await batterRig.playAnimation('pull_shot', false, 1.15);
    } else if (selectedAnim === 'flick_shot') {
      shotGroup = await batterRig.playAnimation('flick_shot', false, 1.25);
    } else if (selectedAnim === 'defense') {
      shotGroup = await batterRig.playAnimation('defense', false, 1.1);
    } else if (selectedAnim === 'sweep_shot') {
      shotGroup = await batterRig.playAnimation('sweep_shot', false, 1.25);
    } else if (selectedAnim === 'reverse_sweep') {
      shotGroup = await batterRig.playAnimation('reverse_sweep', false, 1.35);
    } else if (selectedAnim === 'straight_hit_loft') {
      shotGroup = await batterRig.playAnimation('straight_hit_loft', false, 1.35);
    } else if (selectedAnim === 'straight_hit_chip') {
      shotGroup = await batterRig.playAnimation('straight_hit_chip', false, 1.35);
    } else if (selectedAnim === 'batsman_out') {
      shotGroup = await batterRig.playAnimation('batsman_out', false, 1.0);
    } else {
      // Trimmed: start at frame 27, end at frame 52 (frames 54 to 104 in Babylon 60fps), played 3x as fast
      shotGroup = await batterRig.playAnimation('baseball_strike', false, 3.0, 54, 104);
    }

    if (!isRigAlive(batterRig)) return;

    const restoreStance = () => {
      if (isRigAlive(batterRig)) {
        if (batterRig.root && batterRig.root.rotation) {
          batterRig.root.rotation.y = baseRotY;
        }
        batterRig.playAnimation('new_batsman_idle', true);
      }
      if (onComplete) onComplete();
    };

    if (shotGroup) {
      shotGroup.onAnimationEndObservable.addOnce(restoreStance);
    } else {
      restoreStance();
    }
  } catch (err) {
    console.error('[BatterShot] error:', err);
    if (onComplete) onComplete();
  }
}

/**
 * Alias for backward compatibility
 */
export function playBowlingAnimation(
  bowlerRig: PlayerCharacterRig,
  _durationMs: number,
  onRelease: () => void
) {
  playFullBowlingSequence(bowlerRig, onRelease);
}

/**
 * Alias for backward compatibility with direction-aware shot handling
 */
export function playShotAnimation(
  batterRig: PlayerCharacterRig,
  direction: ShotDirection = 'straight',
  _durationMs: number = 340,
  onFinish?: () => void,
  animName?: string
) {
  playBatterShotAnimation(batterRig, direction, onFinish, animName);
}

export function resetBattingStance(batterRig: PlayerCharacterRig) {
  if (isRigAlive(batterRig)) batterRig.playAnimation('new_batsman_idle', true);
}

export function playAppealAnimation(rig: PlayerCharacterRig, _durationMs: number = 1200) {
  if (isRigAlive(rig)) rig.playAnimation('standing_idle', true);
}

export function playCelebrateAnimation(rig: PlayerCharacterRig, _durationMs: number = 1400) {
  if (isRigAlive(rig)) rig.playAnimation('standing_idle', true);
}

// Cache of original un-shattered rest poses for stumps & bails
const stumpsRestPoses = new Map<any, { pos: Vector3; rot: Vector3 }>();

export function resetStumps(stumpsGroup: any) {
  if (!stumpsGroup) return;
  const list: any[] = Array.isArray(stumpsGroup) ? stumpsGroup : [stumpsGroup];
  list.forEach((mesh) => {
    if (mesh && !mesh.isDisposed()) {
      const rest = stumpsRestPoses.get(mesh);
      if (rest) {
        mesh.position.copyFrom(rest.pos);
        mesh.rotation.copyFrom(rest.rot);
      }
    }
  });
}

export function playWicketShatterAnimation(stumpsGroup: any, _ballPosition?: Vector3) {
  if (!stumpsGroup) return;
  const list: any[] = Array.isArray(stumpsGroup) ? stumpsGroup : [stumpsGroup];
  if (list.length === 0) return;

  // Cache rest poses on first trigger
  list.forEach((mesh) => {
    if (mesh && !stumpsRestPoses.has(mesh)) {
      stumpsRestPoses.set(mesh, {
        pos: mesh.position.clone(),
        rot: mesh.rotation.clone(),
      });
    }
  });

  const t0 = performance.now();
  const dur = 1400; // dramatic 1.4s cartwheel and bail flight

  // Assign distinct trajectory profiles to each stump and bail
  const profiles = list.map((mesh, i) => {
    const isBail = mesh.name?.includes('bail') || i >= 3;
    const isMidStump = mesh.name?.includes('_0') || i === 1;
    const isOffStump = mesh.name?.includes('_-1') || i === 0;

    const rest = stumpsRestPoses.get(mesh) || { pos: mesh.position.clone(), rot: mesh.rotation.clone() };

    let targetOffset: Vector3;
    let targetRotation: Vector3;
    let peakY: number;

    if (isBail) {
      // Bails fly high into the air and scatter outward
      const side = isOffStump ? 1 : -1;
      targetOffset = new Vector3(side * (0.6 + Math.random() * 0.4), -0.2, -2.5 - Math.random() * 1.5);
      targetRotation = new Vector3(Math.PI * 4, Math.PI * 3, Math.PI * 2);
      peakY = 1.4 + Math.random() * 0.5;
    } else if (isMidStump) {
      // Middle stump gets cartwheeled directly backward by the ball
      targetOffset = new Vector3(0.05, 0.08, -2.8);
      targetRotation = new Vector3(Math.PI * 1.8, 0.2, 0.4);
      peakY = 0.55;
    } else {
      // Off or leg stump tilts back and sideways
      const side = isOffStump ? 1 : -1;
      targetOffset = new Vector3(side * 0.45, 0.08, -1.8);
      targetRotation = new Vector3(Math.PI * 1.2, 0.4 * side, 0.8 * side);
      peakY = 0.35;
    }

    return {
      mesh,
      startPos: rest.pos.clone(),
      startRot: rest.rot.clone(),
      targetOffset,
      targetRotation,
      peakY,
      isBail,
    };
  });

  const step = (now: number) => {
    const elapsed = now - t0;
    const p = Math.min(1, elapsed / dur);

    // Gravity and kinetic bounce curve
    const easeOutQuad = 1 - (1 - p) * (1 - p);

    profiles.forEach((item) => {
      try {
        if (!item.mesh || item.mesh.isDisposed()) return;

        // Position interpolation
        const x = item.startPos.x + item.targetOffset.x * easeOutQuad;
        const z = item.startPos.z + item.targetOffset.z * easeOutQuad;

        // Parabolic arc for height
        const arc = Math.sin(p * Math.PI) * item.peakY;
        const groundY = item.isBail ? 0.05 : 0.08;
        const y = Math.max(groundY, item.startPos.y + item.targetOffset.y * easeOutQuad + arc);

        item.mesh.position.set(x, y, z);

        // Dynamic rotation tumbling
        item.mesh.rotation.x = item.startRot.x + item.targetRotation.x * easeOutQuad;
        item.mesh.rotation.y = item.startRot.y + item.targetRotation.y * easeOutQuad;
        item.mesh.rotation.z = item.startRot.z + item.targetRotation.z * easeOutQuad;
      } catch (_) {}
    });

    if (p < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}
