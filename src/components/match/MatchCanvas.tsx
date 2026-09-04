import React, { useEffect, useRef, useState } from 'react';
import { Engine, Vector3 } from '@babylonjs/core';
import { createStadiumScene } from '../../babylon/sceneBuilder';
import { createCameraRig } from '../../babylon/cameraRig';
import { createBallTrajectoryController } from '../../babylon/ballTrajectory';
import { loadCharacter, loadFieldingTeam, PlayerCharacterRig } from '../../babylon/playerMeshes';
import {
  startIdleAnimation,
  playBowlingAnimation,
  playShotAnimation,
  playAppealAnimation,
  playCelebrateAnimation,
  playWicketShatterAnimation,
  resetBattingStance,
  resetStumps,
} from '../../babylon/animations';
import { useMatchStore } from '../../state/matchStore';
import { soundManager } from '../../audio/soundManager';

// Real-scale batsman spawn (properly aligned on leg/middle guard at Z = -9.25, in front of stumps at Z = -10.06)
const BATSMAN_POS = new Vector3(-0.12, 0, -9.25);
// Bowler spawn at top of run-up
const BOWLER_POS = new Vector3(0.35, 0, 28.0);

export const MatchCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const phase = useMatchStore((s) => s.phase);
  const currentBallLine = useMatchStore((s) => s.currentBallLine);
  const currentBallLength = useMatchStore((s) => s.currentBallLength);
  const currentBallCombination = useMatchStore((s) => s.currentBallCombination);
  const currentBallSpeed = useMatchStore((s) => s.currentBallSpeed);
  const lastBallEvent = useMatchStore((s) => s.lastBallEvent);
  const screenShakeIntensity = useMatchStore((s) => s.screenShakeIntensity);
  const battingTeam = useMatchStore((s) => s.battingTeam);
  const bowlingTeam = useMatchStore((s) => s.bowlingTeam);
  const userPlayer = useMatchStore((s) => s.userPlayer);

  const releaseBall = useMatchStore((s) => s.releaseBall);
  const executeContactImpact = useMatchStore((s) => s.executeContactImpact);
  const pendingShotDirection = useMatchStore((s) => s.pendingShotDirection);
  const onBallMissedTimeout = useMatchStore((s) => s.onBallMissedTimeout);
  const finishBallAndAdvance = useMatchStore((s) => s.finishBallAndAdvance);

  const engineRef = useRef<Engine | null>(null);
  const cameraRigRef = useRef<ReturnType<typeof createCameraRig> | null>(null);
  const ballCtrlRef = useRef<ReturnType<typeof createBallTrajectoryController> | null>(null);
  const batterRigRef = useRef<PlayerCharacterRig | null>(null);
  const bowlerRigRef = useRef<PlayerCharacterRig | null>(null);
  const fieldersRef = useRef<PlayerCharacterRig[]>([]);
  const stumpsRef = useRef<any>(null);
  const stopIdleRef = useRef<(() => void) | null>(null);
  const shotPlayedRef = useRef(false);
  const isShotPlayingRef = useRef(false);
  // Single source of truth for whether this scene instance is alive
  const aliveRef = useRef<{ dead: boolean }>({ dead: false });

  // Scene setup
  useEffect(() => {
    if (!canvasRef.current || !battingTeam || !bowlingTeam) return;

    // Each mount gets its own alive token — all async callbacks close over this object
    const alive = { dead: false };
    aliveRef.current = alive;

    let engine: Engine | null = null;
    let cameraRig: ReturnType<typeof createCameraRig> | null = null;
    let sceneComp: ReturnType<typeof createStadiumScene> | null = null;

    try {
      engine = new Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      sceneComp = createStadiumScene(engine, canvasRef.current!);
      cameraRig = createCameraRig(sceneComp.scene, canvasRef.current!);
      cameraRigRef.current = cameraRig;
      stumpsRef.current = sceneComp.stumpsStriker;

      const ballCtrl = createBallTrajectoryController(sceneComp.scene);
      ballCtrlRef.current = ballCtrl;

      // Start rendering stadium immediately
      engine.runRenderLoop(() => {
        if (!alive.dead && sceneComp?.scene && !sceneComp.scene.isDisposed) {
          try {
            sceneComp.scene.render();
          } catch (renderErr) {
            console.error('[RenderLoop] Error during render:', renderErr);
          }
        }
      });

      // Asynchronous character loading
      const loadCharactersAsync = async () => {
        try {
          if (alive.dead) return;

          // 1. Striker
          const batterRig = await loadCharacter(
            sceneComp!.scene,
            'striker',
            BATSMAN_POS,
            battingTeam,
            {
              isBatter: true,
              batColor: userPlayer?.batColor || '#D4A373',
              jerseyNumber: userPlayer?.battingPosition || 1,
              avatarId: userPlayer?.avatarId,
              shadowGenerator: sceneComp!.shadowGenerator,
            }
          );
          if (alive.dead) return;
          batterRigRef.current = batterRig;
          stopIdleRef.current = startIdleAnimation(batterRig);

          // 2. Bowler
          const bowlerRig = await loadCharacter(
            sceneComp!.scene,
            'bowler',
            BOWLER_POS,
            bowlingTeam,
            {
              isBowler: true,
              shadowGenerator: sceneComp!.shadowGenerator,
            }
          );
          if (alive.dead) return;
          bowlerRigRef.current = bowlerRig;

          // 3. Fielders
          const fielders = await loadFieldingTeam(sceneComp!.scene, bowlingTeam, sceneComp!.shadowGenerator);
          if (alive.dead) return;
          fieldersRef.current = fielders;
        } catch (charErr: any) {
          if (!alive.dead) {
            console.error('Character loading from player.glb failed:', charErr);
            setInitError(charErr?.message || 'Error loading 3D player.glb model');
          }
        }
      };

      loadCharactersAsync();

    } catch (e: any) {
      console.error('Babylon 3D Scene init failed:', e);
      setInitError(e?.message || 'WebGL initialization error');
    }

    const onResize = () => {
      if (engine && !alive.dead) engine.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      // Mark this scene instance as dead — all async callbacks that close over `alive` will exit early
      alive.dead = true;

      window.removeEventListener('resize', onResize);
      if (stopIdleRef.current) stopIdleRef.current();

      // Null all rig refs so phase-effect callbacks cannot access disposed rigs
      batterRigRef.current = null;
      bowlerRigRef.current = null;
      fieldersRef.current = [];
      ballCtrlRef.current = null;
      cameraRigRef.current = null;

      try { if (cameraRig) cameraRig.dispose(); } catch (_) {}
      try { if (sceneComp?.scene && !sceneComp.scene.isDisposed) sceneComp.scene.dispose(); } catch (_) {}
      try { if (engine) engine.dispose(); } catch (_) {}
      engineRef.current = null;
    };
  }, [battingTeam?.id, bowlingTeam?.id]);

  // Phase-driven animation reactions
  useEffect(() => {
    // Guard: only run if all required refs are live
    if (!cameraRigRef.current || !ballCtrlRef.current) return;
    if (aliveRef.current.dead) return;

    const triggerBatterShot = () => {
      if (!shotPlayedRef.current && batterRigRef.current && lastBallEvent && lastBallEvent.isUserBall) {
        shotPlayedRef.current = true;
        isShotPlayingRef.current = true;
        const animToPlay =
          lastBallEvent.outcome === 'wicket' &&
          lastBallEvent.shotAnimName !== 'pull_shot' &&
          lastBallEvent.shotAnimName !== 'defense'
            ? 'batsman_out'
            : lastBallEvent.shotAnimName;
        playShotAnimation(
          batterRigRef.current,
          lastBallEvent.shotDirection || 'straight',
          340,
          () => {
            isShotPlayingRef.current = false;
          },
          animToPlay
        );
      }
    };

    if (phase === 'ready') {
      shotPlayedRef.current = false;
      cameraRigRef.current.setMode('batting');
      ballCtrlRef.current.resetToBowler();
      if (stumpsRef.current) resetStumps(stumpsRef.current);
      // ONLY reset batting stance if shot animation is not still playing follow-through
      if (!isShotPlayingRef.current && batterRigRef.current) {
        resetBattingStance(batterRigRef.current);
      }
    } else if (phase === 'bowling_runup') {
      shotPlayedRef.current = false;
      isShotPlayingRef.current = false;
      if (batterRigRef.current) resetBattingStance(batterRigRef.current);
      if (!bowlerRigRef.current) return;
      cameraRigRef.current.setMode('batting');
      ballCtrlRef.current.resetToBowler();
      soundManager.playBowlerRunup(950);
      playBowlingAnimation(bowlerRigRef.current, 950, () => {
        if (!aliveRef.current.dead) {
          soundManager.stopBowlerRunup();
          soundManager.playBallRelease();
          releaseBall();
        }
      });
    } else if (phase === 'ball_active') {
      cameraRigRef.current.setMode('batting');
      ballCtrlRef.current.animateDeliveryCombination(
        currentBallCombination || 'length_mid',
        currentBallSpeed,
        () => {},
        () => { if (!aliveRef.current.dead) executeContactImpact(); }
      );
      // If user initiated an early shot (sweep / reverse sweep), start posture immediately!
      if (lastBallEvent && lastBallEvent.isUserBall) {
        triggerBatterShot();
      }
    } else if (phase === 'hit_impact') {
      if (lastBallEvent) {
        cameraRigRef.current.triggerScreenShake(screenShakeIntensity);
        triggerBatterShot();
      }
    } else if (phase === 'ball_flight') {
      if (lastBallEvent) {
        if (lastBallEvent.outcome === '6' || lastBallEvent.outcome === '4') {
          soundManager.playCrowdCheer(lastBallEvent.outcome === '6');
          cameraRigRef.current.triggerScreenShake(screenShakeIntensity);
          // Batter plays out full stroke and follow-through; do not interrupt with celebrate
        } else if (lastBallEvent.outcome === 'wicket') {
          if (bowlerRigRef.current) playAppealAnimation(bowlerRigRef.current, 1200);
          fieldersRef.current.forEach((f) => playAppealAnimation(f, 1200));
        }

        // Trigger stroke if not already fired
        triggerBatterShot();

        const isPlayAndMiss =
          lastBallEvent.outcome === 'dot' &&
          (!lastBallEvent.timingQuality ||
            lastBallEvent.timingQuality === 'miss' ||
            lastBallEvent.timingQuality === 'very_late' ||
            lastBallEvent.timingQuality === 'very_early');

        if (ballCtrlRef.current) {
          ballCtrlRef.current.animateShot(
            lastBallEvent.outcome,
            lastBallEvent.shotDirection || 'straight',
            () => {
              if (!aliveRef.current.dead) {
                setTimeout(() => {
                  if (!aliveRef.current.dead) finishBallAndAdvance();
                }, 750);
              }
            },
            lastBallEvent.dismissalType,
            stumpsRef.current,
            isPlayAndMiss,
            lastBallEvent.strokeType
          );
        }
      }
    }
  }, [phase, lastBallEvent, currentBallLine, currentBallSpeed]);

  if (initError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1220] text-[#F5F7FA] p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-xl font-bold text-[#FF4757] mb-2">3D Engine / Asset Error</h3>
        <p className="text-xs text-[#8A93A6] max-w-md">{initError}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0B1220] overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full outline-none block cursor-crosshair touch-none" />
    </div>
  );
};
