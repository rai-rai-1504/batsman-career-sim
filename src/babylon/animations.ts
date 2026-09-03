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
  batterRig.playAnimation('baseball_idle', true);
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
  onComplete?: () => void
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

    // Trimmed: start at frame 27, end at frame 52 (frames 54 to 104 in Babylon 60fps), played 3x as fast
    const strikeGroup = await batterRig.playAnimation('baseball_strike', false, 3.0, 54, 104);
    if (!isRigAlive(batterRig)) return;

    const restoreStance = () => {
      if (isRigAlive(batterRig)) {
        if (batterRig.root && batterRig.root.rotation) {
          batterRig.root.rotation.y = baseRotY;
        }
        batterRig.playAnimation('baseball_idle', true);
      }
      if (onComplete) onComplete();
    };

    if (strikeGroup) {
      strikeGroup.onAnimationEndObservable.addOnce(restoreStance);
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
  onFinish?: () => void
) {
  playBatterShotAnimation(batterRig, direction, onFinish);
}

export function resetBattingStance(batterRig: PlayerCharacterRig) {
  if (isRigAlive(batterRig)) batterRig.playAnimation('baseball_idle', true);
}

export function playAppealAnimation(rig: PlayerCharacterRig, _durationMs: number = 1200) {
  if (isRigAlive(rig)) rig.playAnimation('standing_idle', true);
}

export function playCelebrateAnimation(rig: PlayerCharacterRig, _durationMs: number = 1400) {
  if (isRigAlive(rig)) rig.playAnimation('standing_idle', true);
}

export function playWicketShatterAnimation(stumpsNode: any, _ballPosition?: Vector3) {
  if (!stumpsNode) return;
  const t0 = performance.now();
  const dur = 900;
  const initialY = stumpsNode.position?.y ?? 0;

  const step = (now: number) => {
    try {
      if (!stumpsNode.position) return;
      const elapsed = now - t0;
      const progress = Math.min(1, elapsed / dur);
      stumpsNode.position.y = initialY + Math.sin(progress * Math.PI) * 0.45;
      stumpsNode.rotation.x = progress * 0.9;
      stumpsNode.rotation.z = Math.sin(progress * Math.PI * 2) * 0.4;
      if (progress < 1) requestAnimationFrame(step);
      else {
        stumpsNode.position.y = initialY;
        stumpsNode.rotation.x = 0;
        stumpsNode.rotation.z = 0;
      }
    } catch { /* stumps disposed, exit */ }
  };
  requestAnimationFrame(step);
}
