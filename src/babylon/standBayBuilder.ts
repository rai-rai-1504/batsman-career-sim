import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  PBRMaterial,
  Mesh,
  Matrix,
  Quaternion,
} from '@babylonjs/core';

export interface StandBaySystem {
  stands: Mesh[];
  seatMasters: Mesh[];
}

/**
 * Builds the modular multi-tier stadium environment:
 * - 28 radial bay modules around the 72m-96m circumference
 * - Each bay has 2 raked seating tiers (Lower Bowl + Upper Grandstand)
 * - Separated by a wide concourse / walkway level
 * - Individual 3D thin-instanced bucket seats in alternating two-tone section color blocks
 * - Distinct aerodynamic cantilevered roof canopy with angled tubular support struts
 * - 2 asymmetric showpiece Pavilion / Media Press stands with executive glass suites
 */
export function buildStadiumBays(scene: Scene): StandBaySystem {
  const stands: Mesh[] = [];
  const NUM_SECTORS = 28;

  // ─── 1. PBR Materials ──────────────────────────────────────────────────────
  const concretePBR = new PBRMaterial('pbr_stadiumConcrete', scene);
  concretePBR.albedoColor = new Color3(0.76, 0.75, 0.72); // modern light-warm stadium concrete
  concretePBR.roughness = 0.78;
  concretePBR.metallic = 0.05;

  const concoursePBR = new PBRMaterial('pbr_concourseFloor', scene);
  concoursePBR.albedoColor = new Color3(0.48, 0.50, 0.53); // dark non-slip walkway
  concoursePBR.roughness = 0.70;

  const steelPBR = new PBRMaterial('pbr_stadiumSteel', scene);
  steelPBR.albedoColor = new Color3(0.22, 0.24, 0.28); // anthracite steel frame
  steelPBR.roughness = 0.42;
  steelPBR.metallic = 0.85;

  const roofPBR = new PBRMaterial('pbr_stadiumRoofCanopy', scene);
  roofPBR.albedoColor = new Color3(0.18, 0.20, 0.24); // aerodynamic coated roof
  roofPBR.roughness = 0.40;
  roofPBR.metallic = 0.35;

  const strutPBR = new PBRMaterial('pbr_roofStruts', scene);
  strutPBR.albedoColor = new Color3(0.92, 0.93, 0.95); // white tubular architectural steel
  strutPBR.roughness = 0.35;
  strutPBR.metallic = 0.70;

  const glassPBR = new PBRMaterial('pbr_vipGlass', scene);
  glassPBR.albedoColor = new Color3(0.08, 0.18, 0.28); // tinted architectural glass
  glassPBR.roughness = 0.12;
  glassPBR.metallic = 0.20;
  glassPBR.alpha = 0.72;

  // Seat PBR Materials for section color blocks
  const seatMatBlue = new PBRMaterial('pbr_seatBlue', scene);
  seatMatBlue.albedoColor = new Color3(0.10, 0.32, 0.68); // Royal Blue
  seatMatBlue.roughness = 0.65;

  const seatMatGold = new PBRMaterial('pbr_seatGold', scene);
  seatMatGold.albedoColor = new Color3(0.88, 0.58, 0.08); // Amber Gold
  seatMatGold.roughness = 0.65;

  const seatMatRed = new PBRMaterial('pbr_seatRed', scene);
  seatMatRed.albedoColor = new Color3(0.78, 0.14, 0.14); // Crimson Red
  seatMatRed.roughness = 0.65;

  // ─── 2. Master Bucket Seat Meshes (for Thin Instancing) ────────────────────
  // Create a sleek low-poly stadium chair (base + backrest)
  const seatBase = MeshBuilder.CreateBox('seatBase', { width: 0.44, height: 0.10, depth: 0.40 }, scene);
  seatBase.position.y = 0.05;
  const seatBack = MeshBuilder.CreateBox('seatBack', { width: 0.42, height: 0.38, depth: 0.08 }, scene);
  seatBack.position.set(0, 0.25, 0.16);

  const masterSeatBlue = Mesh.MergeMeshes([seatBase, seatBack], true, true, undefined, false, true)!;
  masterSeatBlue.name = 'masterSeatBlue';
  masterSeatBlue.material = seatMatBlue;
  masterSeatBlue.alwaysSelectAsActiveMesh = true;

  const masterSeatGold = masterSeatBlue.clone('masterSeatGold')!;
  masterSeatGold.material = seatMatGold;
  masterSeatGold.alwaysSelectAsActiveMesh = true;

  const masterSeatRed = masterSeatBlue.clone('masterSeatRed')!;
  masterSeatRed.material = seatMatRed;
  masterSeatRed.alwaysSelectAsActiveMesh = true;

  const seatMatricesBlue: number[] = [];
  const seatMatricesGold: number[] = [];
  const seatMatricesRed: number[] = [];

  const addSeatMatrix = (
    colorGroup: 'blue' | 'gold' | 'red',
    pos: Vector3,
    yawRad: number
  ) => {
    const scale = new Vector3(1, 1, 1);
    const rot = Quaternion.FromEulerAngles(0, yawRad, 0);
    const m = Matrix.Compose(scale, rot, pos);
    const arr = m.asArray();
    const targetArr =
      colorGroup === 'blue'
        ? seatMatricesBlue
        : colorGroup === 'gold'
        ? seatMatricesGold
        : seatMatricesRed;
    for (let i = 0; i < 16; i++) targetArr.push(arr[i]);
  };

  // ─── 3. Build the 28 Modular Stadium Bays ──────────────────────────────────
  for (let i = 0; i < NUM_SECTORS; i++) {
    const bayAngle = (i / NUM_SECTORS) * Math.PI * 2;
    const sin = Math.sin(bayAngle);
    const cos = Math.cos(bayAngle);
    const bayRotY = bayAngle + Math.PI; // Face inward toward pitch center

    // Determine section two-tone color block
    const blockIndex = Math.floor((i / NUM_SECTORS) * 6);
    const colorGroup: 'blue' | 'gold' | 'red' =
      blockIndex % 3 === 0 ? 'blue' : blockIndex % 3 === 1 ? 'gold' : 'red';

    // Sectors 0 and 14 are the asymmetric Showpiece Main Stand & Media Pavilion
    const isPavilion = i === 0 || i === 14;

    // ── Lower Bowl Tier (5 raked rows, radius 72.8m to 79.5m) ────────────────
    const lowerRows = [
      { r: 73.0, y: 0.50, w: 16.2, h: 0.50, seats: 16 },
      { r: 74.4, y: 0.95, w: 16.5, h: 0.95, seats: 16 },
      { r: 75.8, y: 1.40, w: 16.8, h: 1.40, seats: 17 },
      { r: 77.2, y: 1.85, w: 17.1, h: 1.85, seats: 17 },
      { r: 78.6, y: 2.30, w: 17.4, h: 2.30, seats: 18 },
    ];

    lowerRows.forEach((row, rowIdx) => {
      // Stepped concrete riser/tread block
      const step = MeshBuilder.CreateBox(`bay_${i}_lower_${rowIdx}`, {
        width: row.w,
        height: row.h,
        depth: 1.45,
      }, scene);
      step.position = new Vector3(sin * row.r, row.h * 0.5, cos * row.r);
      step.rotation.y = bayRotY;
      step.material = concretePBR;
      stands.push(step);

      // Populate instanced bucket seats on this row
      const seatSpacing = (row.w * 0.88) / (row.seats - 1);
      const startOffset = -((row.w * 0.88) * 0.5);
      for (let s = 0; s < row.seats; s++) {
        const lateral = startOffset + s * seatSpacing;
        // Transform local (lateral, Y, R) into world coordinates
        const seatWorldX = sin * row.r + cos * lateral;
        const seatWorldZ = cos * row.r - sin * lateral;
        const seatWorldY = row.y;
        addSeatMatrix(colorGroup, new Vector3(seatWorldX, seatWorldY, seatWorldZ), bayRotY);
      }
    });

    // Lower tier front boundary parapet wall
    const parapet = MeshBuilder.CreateBox(`bay_${i}_parapet`, {
      width: 16.0,
      height: 0.90,
      depth: 0.35,
    }, scene);
    parapet.position = new Vector3(sin * 72.1, 0.45, cos * 72.1);
    parapet.rotation.y = bayRotY;
    parapet.material = concretePBR;
    stands.push(parapet);

    // ── Concourse Walkway Level (radius 80.2m to 82.8m, Y = 2.45m) ───────────
    const concourse = MeshBuilder.CreateBox(`bay_${i}_concourse`, {
      width: 17.8,
      height: 0.30,
      depth: 2.6,
    }, scene);
    concourse.position = new Vector3(sin * 81.5, 2.35, cos * 81.5);
    concourse.rotation.y = bayRotY;
    concourse.material = concoursePBR;
    stands.push(concourse);

    // Concourse safety balustrade railing
    const rail = MeshBuilder.CreateBox(`bay_${i}_concourseRail`, {
      width: 17.6,
      height: 0.90,
      depth: 0.12,
    }, scene);
    rail.position = new Vector3(sin * 80.2, 2.90, cos * 80.2);
    rail.rotation.y = bayRotY;
    rail.material = steelPBR;
    stands.push(rail);

    // ── Upper Grandstand Tier OR Asymmetric Pavilion Showpiece ───────────────
    if (!isPavilion) {
      // Regular Grandstand: 7 steeply raked rows (radius 83.2m to 92.5m)
      const upperRows = [
        { r: 83.2, y: 3.80, w: 18.5, h: 1.40, seats: 18 },
        { r: 84.7, y: 5.10, w: 18.8, h: 2.70, seats: 18 },
        { r: 86.2, y: 6.40, w: 19.2, h: 4.00, seats: 19 },
        { r: 87.7, y: 7.70, w: 19.6, h: 5.30, seats: 19 },
        { r: 89.2, y: 9.00, w: 20.0, h: 6.60, seats: 20 },
        { r: 90.7, y: 10.30, w: 20.4, h: 7.90, seats: 20 },
        { r: 92.2, y: 11.60, w: 20.8, h: 9.20, seats: 21 },
      ];

      upperRows.forEach((row, rowIdx) => {
        const step = MeshBuilder.CreateBox(`bay_${i}_upper_${rowIdx}`, {
          width: row.w,
          height: row.h,
          depth: 1.55,
        }, scene);
        step.position = new Vector3(sin * row.r, row.h * 0.5, cos * row.r);
        step.rotation.y = bayRotY;
        step.material = concretePBR;
        stands.push(step);

        // Populate instanced bucket seats
        const seatSpacing = (row.w * 0.88) / (row.seats - 1);
        const startOffset = -((row.w * 0.88) * 0.5);
        for (let s = 0; s < row.seats; s++) {
          const lateral = startOffset + s * seatSpacing;
          const seatWorldX = sin * row.r + cos * lateral;
          const seatWorldZ = cos * row.r - sin * lateral;
          const seatWorldY = row.y;
          addSeatMatrix(colorGroup, new Vector3(seatWorldX, seatWorldY, seatWorldZ), bayRotY);
        }
      });

      // Upper tier rear facade wall
      const rearWall = MeshBuilder.CreateBox(`bay_${i}_rearWall`, {
        width: 21.4,
        height: 8.5,
        depth: 0.8,
      }, scene);
      rearWall.position = new Vector3(sin * 93.8, 15.8, cos * 93.8);
      rearWall.rotation.y = bayRotY;
      rearWall.material = concretePBR;
      stands.push(rearWall);
    } else {
      // ── Showpiece Pavilion / Media Suite Stand ─────────────────────────────
      // Level 1: VIP Executive Lounges & Corporate Boxes (Y = 3.0m to 7.5m)
      const vipBase = MeshBuilder.CreateBox(`bay_${i}_vipBase`, {
        width: 20.5,
        height: 4.8,
        depth: 9.5,
      }, scene);
      vipBase.position = new Vector3(sin * 88.0, 5.2, cos * 88.0);
      vipBase.rotation.y = bayRotY;
      vipBase.material = concretePBR;
      stands.push(vipBase);

      // Level 1 Panoramic Tinted Glass Front
      const vipGlass = MeshBuilder.CreateBox(`bay_${i}_vipGlass`, {
        width: 19.8,
        height: 2.8,
        depth: 0.25,
      }, scene);
      vipGlass.position = new Vector3(sin * 83.2, 5.8, cos * 83.2);
      vipGlass.rotation.y = bayRotY;
      vipGlass.material = glassPBR;
      stands.push(vipGlass);

      // Level 2: Media Press Center & Broadcasting Suites (Y = 7.5m to 14.5m)
      const mediaLevel = MeshBuilder.CreateBox(`bay_${i}_mediaLevel`, {
        width: 21.5,
        height: 6.5,
        depth: 9.0,
      }, scene);
      mediaLevel.position = new Vector3(sin * 88.5, 10.8, cos * 88.5);
      mediaLevel.rotation.y = bayRotY;
      mediaLevel.material = concretePBR;
      stands.push(mediaLevel);

      // Level 2 Panoramic Commentary Glass Facade
      const mediaGlass = MeshBuilder.CreateBox(`bay_${i}_mediaGlass`, {
        width: 20.6,
        height: 3.4,
        depth: 0.25,
      }, scene);
      mediaGlass.position = new Vector3(sin * 83.8, 11.2, cos * 83.8);
      mediaGlass.rotation.y = bayRotY;
      mediaGlass.material = glassPBR;
      stands.push(mediaGlass);

      // VIP Balcony with Executive Seating
      const balcony = MeshBuilder.CreateBox(`bay_${i}_balcony`, {
        width: 19.5,
        height: 0.35,
        depth: 2.2,
      }, scene);
      balcony.position = new Vector3(sin * 82.0, 3.4, cos * 82.0);
      balcony.rotation.y = bayRotY;
      balcony.material = concoursePBR;
      stands.push(balcony);

      // Executive gold seats on VIP balcony
      for (let s = 0; s < 14; s++) {
        const lateral = -7.5 + s * 1.15;
        const seatWorldX = sin * 82.0 + cos * lateral;
        const seatWorldZ = cos * 82.0 - sin * lateral;
        addSeatMatrix('gold', new Vector3(seatWorldX, 3.6, seatWorldZ), bayRotY);
      }
    }

    // ── Rear Vertical Structural Pylons (2 per bay) ──────────────────────────
    const pylonRadius = 94.8;
    const pylonHeight = isPavilion ? 27.0 : 25.0;
    const pylonOffset = 7.2;

    [-pylonOffset, pylonOffset].forEach((latOffset, pIdx) => {
      const pX = sin * pylonRadius + cos * latOffset;
      const pZ = cos * pylonRadius - sin * latOffset;
      const pylon = MeshBuilder.CreateCylinder(`bay_${i}_pylon_${pIdx}`, {
        height: pylonHeight,
        diameter: 1.2,
        tessellation: 12,
      }, scene);
      pylon.position = new Vector3(pX, pylonHeight * 0.5, pZ);
      pylon.material = steelPBR;
      stands.push(pylon);
    });

    // ── Aerodynamic Cantilevered Roof Canopy ──────────────────────────────────
    // Overhangs the upper tier and concourse (radius 80m to 96m, depth 16m)
    const roofCenterR = 88.0;
    const roofHeight = isPavilion ? 25.5 : 23.5;

    const roofCanopy = MeshBuilder.CreateBox(`bay_${i}_roofCanopy`, {
      width: 20.8,
      height: 0.65,
      depth: 16.5,
    }, scene);
    roofCanopy.position = new Vector3(sin * roofCenterR, roofHeight, cos * roofCenterR);
    roofCanopy.rotation.y = bayRotY;
    roofCanopy.rotation.x = 0.08; // Downward forward pitch (~4.5°)
    roofCanopy.material = roofPBR;
    stands.push(roofCanopy);

    // Longitudinal Structural Under-Truss Girders (2 per bay)
    [-5.5, 5.5].forEach((latOffset, gIdx) => {
      const gX = sin * roofCenterR + cos * latOffset;
      const gZ = cos * roofCenterR - sin * latOffset;
      const truss = MeshBuilder.CreateBox(`bay_${i}_roofTruss_${gIdx}`, {
        width: 0.45,
        height: 1.10,
        depth: 16.2,
      }, scene);
      truss.position = new Vector3(gX, roofHeight - 0.75, gZ);
      truss.rotation.y = bayRotY;
      truss.rotation.x = 0.08;
      truss.material = steelPBR;
      stands.push(truss);
    });

    // ── Angled Structural Support Struts (Cantilever Engineering) ────────────
    // 2 tubular struts connecting rear pylon to roof mid-span
    [-pylonOffset, pylonOffset].forEach((latOffset, sIdx) => {
      const p1 = new Vector3(
        sin * pylonRadius + cos * latOffset,
        14.0,
        cos * pylonRadius - sin * latOffset
      );
      const p2 = new Vector3(
        sin * 86.0 + cos * (latOffset * 0.8),
        roofHeight - 1.2,
        cos * 86.0 - sin * (latOffset * 0.8)
      );

      const strut = MeshBuilder.CreateTube(`bay_${i}_strut_${sIdx}`, {
        path: [p1, p2],
        radius: 0.28,
        tessellation: 8,
      }, scene);
      strut.material = strutPBR;
      stands.push(strut);
    });
  }

  // ─── 4. Apply Thin Instance Buffers to Master Seats ────────────────────────
  if (seatMatricesBlue.length > 0) {
    masterSeatBlue.thinInstanceSetBuffer('matrix', new Float32Array(seatMatricesBlue), 16, true);
    masterSeatBlue.isVisible = true;
  }
  if (seatMatricesGold.length > 0) {
    masterSeatGold.thinInstanceSetBuffer('matrix', new Float32Array(seatMatricesGold), 16, true);
    masterSeatGold.isVisible = true;
  }
  if (seatMatricesRed.length > 0) {
    masterSeatRed.thinInstanceSetBuffer('matrix', new Float32Array(seatMatricesRed), 16, true);
    masterSeatRed.isVisible = true;
  }

  const totalSeats =
    (seatMatricesBlue.length + seatMatricesGold.length + seatMatricesRed.length) / 16;
  console.log(
    `[StandBayBuilder] Assembled 28 multi-tier stadium bays with ${totalSeats} 3D thin-instanced seats in 3 draw calls!`
  );

  return {
    stands,
    seatMasters: [masterSeatBlue, masterSeatGold, masterSeatRed],
  };
}
