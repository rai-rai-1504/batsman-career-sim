import {
  Scene,
  Vector3,
  TargetCamera,
} from '@babylonjs/core';

// ── Real-scale world camera constants ──────────────────────────────────────────
// 1 unit = 1 metre
// Striker stumps at Z = -10.06   Batsman at Z ≈ -8.8
// Camera behind wickets:         Z ≈ -18 for broadcast framing at 70 m boundary

export interface CameraRigController {
  camera: TargetCamera;
  setMode: (mode: 'batting' | 'boundary' | 'wicket') => void;
  triggerScreenShake: (intensity: number) => void;
  dispose: () => void;
}

export function createCameraRig(scene: Scene, canvas: HTMLCanvasElement): CameraRigController {
  // Behind-the-wickets broadcast framing — moved closer to wickets and vertically lowered
  // Camera at Z = -14.2 gives ~4.1 m clearance behind stumps at Z = -10.06
  // Lowered Y to 2.3 for an immersive, eye-level over-the-shoulder batting view
  const defaultPos    = new Vector3(-0.35, 2.3, -14.2);
  const defaultTarget = new Vector3( 0.05, 1.45,  6.0);

  const camera = new TargetCamera('broadcastCamera', defaultPos, scene);
  camera.setTarget(defaultTarget);
  camera.fov = 0.88; // ~50° horizontal — broadcast telephoto feel
  scene.activeCamera = camera;

  let targetPos    = defaultPos.clone();
  let targetLookAt = defaultTarget.clone();
  let shakeIntensity = 0;
  const shakeDecay   = 0.88;

  const setMode = (_mode: 'batting' | 'boundary' | 'wicket') => {
    // Camera is kept completely static at default batting position regardless of ball outcome
    targetPos = defaultPos.clone();
    targetLookAt = defaultTarget.clone();
  };

  const triggerScreenShake = (intensity: number) => {
    shakeIntensity = Math.min(1.2, intensity);
  };

  const observer = scene.onBeforeRenderObservable.add(() => {
    const lerp = 0.14;
    camera.position.x += (targetPos.x - camera.position.x) * lerp;
    camera.position.y += (targetPos.y - camera.position.y) * lerp;
    camera.position.z += (targetPos.z - camera.position.z) * lerp;

    const cur  = camera.getTarget();
    const newX = cur.x + (targetLookAt.x - cur.x) * lerp;
    const newY = cur.y + (targetLookAt.y - cur.y) * lerp;
    const newZ = cur.z + (targetLookAt.z - cur.z) * lerp;

    if (shakeIntensity > 0.01) {
      const ox = (Math.random() * 2 - 1) * shakeIntensity * 0.22;
      const oy = (Math.random() * 2 - 1) * shakeIntensity * 0.22;
      camera.setTarget(new Vector3(newX + ox, newY + oy, newZ));
      shakeIntensity *= shakeDecay;
    } else {
      camera.setTarget(new Vector3(newX, newY, newZ));
    }
  });

  const dispose = () => {
    scene.onBeforeRenderObservable.remove(observer);
    camera.dispose();
  };

  return { camera, setMode, triggerScreenShake, dispose };
}
