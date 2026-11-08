import * as THREE from 'three';

export interface WallColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RoomDoorController {
  title: string;
  hinge: THREE.Group;
  worldX: number;
  worldZ: number;
  openAngle: number;
  currentAngle: number;
  isOpen: boolean;
  doorCollider: WallColliderBox;
}

export interface EnterableSchoolBuildingHandle {
  group: THREE.Group;
  northRoofGroup: THREE.Group;
  westRoofGroup: THREE.Group;
  eastRoofGroup: THREE.Group;
  doors: RoomDoorController[];
  wallColliders: WallColliderBox[];
}

function createGableRoofGeometry(
  lengthX: number,
  spanZ: number,
  ridgeHeight: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-spanZ / 2, 0);
  shape.lineTo(spanZ / 2, 0);
  shape.lineTo(0, ridgeHeight);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: lengthX,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-lengthX / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createInteriorTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCompactSignTexture(
  title: string,
  subtitle: string,
  bgColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, subtitle ? 46 : 64);

  if (subtitle) {
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(subtitle, 256, 88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function buildEnterableSchoolBuilding(maxAnisotropy = 4): EnterableSchoolBuildingHandle {
  const building = new THREE.Group();
  const northRoofGroup = new THREE.Group();
  const westRoofGroup = new THREE.Group();
  const eastRoofGroup = new THREE.Group();
  const doors: RoomDoorController[] = [];
  const wallColliders: WallColliderBox[] = [];

  // Shared Architectural Materials
  const wallMat = new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.86 });
  const wallWhiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.82 });
  const partitionMat = new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#9A3412', roughness: 0.76 });
  const tealTrimMat = new THREE.MeshStandardMaterial({ color: '#0F766E', roughness: 0.55 });
  const maroonTrimMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.65 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.78 });
  const lightWoodMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.68 });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1E293B',
    roughness: 0.38,
    metalness: 0.72,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    roughness: 0.22,
    metalness: 0.88,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: '#7DD3FC',
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const redVelvetMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.7 });
  const flaskGreenMat = new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.2 });
  const flaskBlueMat = new THREE.MeshStandardMaterial({ color: '#3B82F6', roughness: 0.2 });
  const bookRedMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.55 });
  const bookBlueMat = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.55 });
  const bookGreenMat = new THREE.MeshStandardMaterial({ color: '#16A34A', roughness: 0.55 });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    metalness: 0.85,
    roughness: 0.1,
  });
  const potSteelMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.85,
    roughness: 0.2,
  });
  const torenOrangeMat = new THREE.MeshStandardMaterial({ color: '#EA580C', roughness: 0.4 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  const tileTex = createInteriorTileTexture();
  tileTex.repeat.set(48, 48);
  const floorTileMat = new THREE.MeshStandardMaterial({
    map: tileTex,
    roughness: 0.55,
    metalness: 0.05,
  });

  const createSign = (
    title: string,
    subtitle: string,
    bgColor: string,
    width = 6.2,
    height = 1.45
  ): THREE.Mesh => {
    const tex = createCompactSignTexture(title, subtitle, bgColor, maxAnisotropy);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.18), mat);
    mesh.castShadow = true;
    return mesh;
  };

  /**
   * Builds a solid room front wall segment with an interactive wooden door that starts closed
   * and swings open when approached, then closes automatically after passing.
   */
  const createHollowRoomFacade = (
    title: string,
    subtitle: string,
    signColor: string,
    bayWidth: number
  ): {
    baseFacade: THREE.Group;
    upperCutaway: THREE.Group;
    doorHinge: THREE.Group;
    doorCenter: number;
    doorLeftEdge: number;
    doorRightEdge: number;
    halfBay: number;
  } => {
    const baseFacade = new THREE.Group();
    const upperCutaway = new THREE.Group();

    const halfBay = bayWidth / 2;
    const doorCenter = -bayWidth * 0.26;
    const doorHalfW = 1.5;
    const doorLeftEdge = doorCenter - doorHalfW;
    const doorRightEdge = doorCenter + doorHalfW;

    const winCenter = bayWidth * 0.2;
    const winW = Math.min(6.4, bayWidth * 0.42);
    const winLeftEdge = winCenter - winW / 2;
    const winRightEdge = winCenter + winW / 2;

    const wallThick = 0.36;
    const wallBottom = 0.45;
    const lowWallTop = 1.45;
    const doorTop = 5.65;
    const wallTop = 8.65;

    const leftW = Math.max(0.4, doorLeftEdge - -halfBay);
    const lowLeft = new THREE.Mesh(
      new THREE.BoxGeometry(leftW, lowWallTop - wallBottom, wallThick),
      tealTrimMat
    );
    lowLeft.position.set(-halfBay + leftW / 2, (lowWallTop + wallBottom) / 2, 0);
    baseFacade.add(lowLeft);

    const rightSpanW = Math.max(0.4, halfBay - doorRightEdge);
    const lowRight = new THREE.Mesh(
      new THREE.BoxGeometry(rightSpanW, lowWallTop - wallBottom, wallThick),
      tealTrimMat
    );
    lowRight.position.set(doorRightEdge + rightSpanW / 2, (lowWallTop + wallBottom) / 2, 0);
    baseFacade.add(lowRight);

    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.44), tealTrimMat);
    jambL.position.set(doorLeftEdge, 3.05, 0);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.2, 0.44), tealTrimMat);
    jambR.position.set(doorRightEdge, 3.05, 0);
    const jambTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.44), tealTrimMat);
    jambTop.position.set(doorCenter, 5.65, 0);
    baseFacade.add(jambL, jambR, jambTop);

    // Interactive Hinged Door (starts closed at rotation.y = 0)
    const doorHinge = new THREE.Group();
    doorHinge.position.set(doorLeftEdge + 0.08, 3.02, 0);
    doorHinge.rotation.y = 0;

    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.84, 5.05, 0.16), woodMat);
    doorLeaf.position.set(1.42, 0, 0);
    doorLeaf.castShadow = true;

    const doorPanelGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 1.45, 0.2),
      windowGlassMat
    );
    doorPanelGlass.position.set(1.42, 1.1, 0);

    const knobFront = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), brassMat);
    knobFront.position.set(2.5, -0.35, 0.14);
    const knobBack = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), brassMat);
    knobBack.position.set(2.5, -0.35, -0.14);

    doorHinge.add(doorLeaf, doorPanelGlass, knobFront, knobBack);
    baseFacade.add(doorHinge);

    const upperWallH = wallTop - lowWallTop;
    const upperWallY = (wallTop + lowWallTop) / 2;

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(leftW, upperWallH, wallThick),
      wallMat
    );
    leftWall.position.set(-halfBay + leftW / 2, upperWallY, 0);
    leftWall.castShadow = true;
    baseFacade.add(leftWall);

    const midW = Math.max(0.4, winLeftEdge - doorRightEdge);
    const midWall = new THREE.Mesh(
      new THREE.BoxGeometry(midW, upperWallH, wallThick),
      wallMat
    );
    midWall.position.set(doorRightEdge + midW / 2, upperWallY, 0);
    midWall.castShadow = true;
    baseFacade.add(midWall);

    const rightW = Math.max(0.4, halfBay - winRightEdge);
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(rightW, upperWallH, wallThick),
      wallMat
    );
    rightWall.position.set(winRightEdge + rightW / 2, upperWallY, 0);
    rightWall.castShadow = true;
    baseFacade.add(rightWall);

    const lintelH = wallTop - doorTop;
    const lintelWall = new THREE.Mesh(
      new THREE.BoxGeometry(bayWidth, lintelH, wallThick),
      wallMat
    );
    lintelWall.position.set(0, doorTop + lintelH / 2, 0);
    lintelWall.castShadow = true;
    baseFacade.add(lintelWall);

    const sillH = 0.95;
    const sillWall = new THREE.Mesh(
      new THREE.BoxGeometry(winW, sillH, wallThick),
      wallMat
    );
    sillWall.position.set(winCenter, lowWallTop + sillH / 2, 0);
    baseFacade.add(sillWall);

    const winH = doorTop - (lowWallTop + sillH);
    const winGlass = new THREE.Mesh(
      new THREE.BoxGeometry(winW - 0.2, winH - 0.2, 0.12),
      windowGlassMat
    );
    winGlass.position.set(winCenter, lowWallTop + sillH + winH / 2, 0);
    baseFacade.add(winGlass);

    const sign = createSign(
      title,
      subtitle,
      signColor,
      Math.min(7.6, bayWidth * 0.72),
      1.5
    );
    sign.position.set(0, 6.85, 0.32);
    baseFacade.add(sign);

    return {
      baseFacade,
      upperCutaway,
      doorHinge,
      doorCenter,
      doorLeftEdge,
      doorRightEdge,
      halfBay,
    };
  };

  // ===========================================================================
  // 1. EXPANDED TILED FLOOR SLABS & VERANDAH PILLARS
  //    - North Wing: x = -64.5 to +64.5 (129 units), z = -35.0 to -62.5 (depth 27.5 units)
  //    - West Wing: x = -37.0 to -64.5 (depth 27.5 units), z = -62.5 to +44.5 (107 units)
  //    - East Wing: x = +37.0 to +64.5 (depth 27.5 units), z = -62.5 to +44.5 (107 units)
  // ===========================================================================
  const northSlab = new THREE.Mesh(
    new THREE.BoxGeometry(129.0, 0.45, 27.5),
    floorTileMat
  );
  northSlab.position.set(0, 0.225, -48.75);
  northSlab.receiveShadow = true;
  building.add(northSlab);

  const westSlab = new THREE.Mesh(
    new THREE.BoxGeometry(27.5, 0.45, 119.5),
    floorTileMat
  );
  westSlab.position.set(-50.75, 0.225, -2.75);
  westSlab.receiveShadow = true;
  building.add(westSlab);

  const eastSlab = new THREE.Mesh(
    new THREE.BoxGeometry(27.5, 0.45, 119.5),
    floorTileMat
  );
  eastSlab.position.set(50.75, 0.225, -2.75);
  eastSlab.receiveShadow = true;
  building.add(eastSlab);

  const pillarGeo = new THREE.BoxGeometry(0.65, 8.2, 0.65);
  for (let x = -40; x <= 40; x += 10) {
    const p = new THREE.Mesh(pillarGeo, wallWhiteMat);
    p.position.set(x, 4.55, -35.2);
    p.castShadow = true;
    northRoofGroup.add(p);
  }
  for (let z = -30; z <= 52; z += 9) {
    const pWest = new THREE.Mesh(pillarGeo, wallWhiteMat);
    pWest.position.set(-37.2, 4.55, z);
    pWest.castShadow = true;
    westRoofGroup.add(pWest);

    const pEast = new THREE.Mesh(pillarGeo, wallWhiteMat);
    pEast.position.set(37.2, 4.55, z);
    pEast.castShadow = true;
    eastRoofGroup.add(pEast);
  }

  // ===========================================================================
  // 2. EXPANDED OUTER BACK WALLS & ROOM PARTITION WALLS (SEKAT ANTAR RUANGAN)
  //    - North rooms depth: z = -39.5 to -62.0 (22.5 units deep = 9.0 meters!)
  //    - West/East rooms depth: x = ±41.5 to ±64.5 (23.0 units deep = 9.2 meters!)
  // ===========================================================================
  const northBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(129.0, 8.2, 0.45),
    wallMat
  );
  northBackWall.position.set(0, 4.55, -62.0);
  northBackWall.castShadow = true;
  northBackWall.receiveShadow = true;
  building.add(northBackWall);
  wallColliders.push({ minX: -64.8, maxX: 64.8, minZ: -62.35, maxZ: -61.65 });

  const northPartGeo = new THREE.BoxGeometry(0.38, 6.8, 22.5);
  [-52.0, -32.0, -11.0, 11.0, 32.0, 52.0].forEach((px) => {
    const part = new THREE.Mesh(northPartGeo, partitionMat);
    part.position.set(px, 3.85, -50.75);
    part.castShadow = true;
    part.receiveShadow = true;
    building.add(part);
    wallColliders.push({ minX: px - 0.28, maxX: px + 0.28, minZ: -62.1, maxZ: -39.4 });
  });

  // Corner closure walls at x = ±52.0 between z = -39.5 and z = -33.0
  const cornerClosureGeo = new THREE.BoxGeometry(0.42, 8.2, 6.5);
  [-52.0, 52.0].forEach((cx) => {
    const cw = new THREE.Mesh(cornerClosureGeo, wallMat);
    cw.position.set(cx, 4.55, -36.25);
    cw.castShadow = true;
    building.add(cw);
    wallColliders.push({ minX: cx - 0.3, maxX: cx + 0.3, minZ: -39.6, maxZ: -32.9 });
  });

  const westBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 8.2, 118.8),
    wallMat
  );
  westBackWall.position.set(-64.5, 4.55, -2.6);
  westBackWall.castShadow = true;
  westBackWall.receiveShadow = true;
  building.add(westBackWall);
  wallColliders.push({ minX: -64.85, maxX: -64.15, minZ: -62.2, maxZ: 57.0 });

  const sidePartGeo = new THREE.BoxGeometry(23.0, 6.8, 0.38);
  [-33.0, -15.0, 3.0, 21.0, 32.0, 44.0, 56.8].forEach((pz) => {
    const part = new THREE.Mesh(sidePartGeo, partitionMat);
    part.position.set(-53.0, 3.85, pz);
    part.castShadow = true;
    part.receiveShadow = true;
    building.add(part);
    wallColliders.push({ minX: -64.6, maxX: -41.4, minZ: pz - 0.28, maxZ: pz + 0.28 });
  });

  const eastBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 8.2, 118.8),
    wallMat
  );
  eastBackWall.position.set(64.5, 4.55, -2.6);
  eastBackWall.castShadow = true;
  eastBackWall.receiveShadow = true;
  building.add(eastBackWall);
  wallColliders.push({ minX: 64.15, maxX: 64.85, minZ: -62.2, maxZ: 57.0 });

  [-33.0, -15.0, 3.0, 21.0, 44.0, 56.8].forEach((pz) => {
    const part = new THREE.Mesh(sidePartGeo, partitionMat);
    part.position.set(53.0, 3.85, pz);
    part.castShadow = true;
    part.receiveShadow = true;
    building.add(part);
    wallColliders.push({ minX: 41.4, maxX: 64.6, minZ: pz - 0.28, maxZ: pz + 0.28 });
  });

  // ===========================================================================
  // 3. INTERACTIVE DOOR ROOM FACADES (NORTH, WEST, EAST WINGS)
  // ===========================================================================
  const northFacades = [
    { x: -42.0, w: 20.0, title: 'RUANG LAB IPA', sub: 'SAINS & BIOLOGI SD', color: '#15803D' },
    { x: -21.5, w: 21.0, title: 'RUANG KEPSEK', sub: 'KEPALA SEKOLAH SDN SUSUKAN 03', color: '#991B1B' },
    { x: 0.0, w: 22.0, title: 'RUANG GURU', sub: 'DEWAN GURU & STAF', color: '#0F766E' },
    { x: 21.5, w: 21.0, title: 'PERPUSTAKAAN', sub: 'PERPUSTAKAAN SDN SUSUKAN 03', color: '#1D4ED8' },
    { x: 42.0, w: 20.0, title: 'LAB KOMPUTER', sub: 'TIK & MULTIMEDIA SD', color: '#4338CA' },
  ];
  northFacades.forEach((rm) => {
    const f = createHollowRoomFacade(rm.title, rm.sub, rm.color, rm.w);
    f.baseFacade.position.set(rm.x, 0, -39.5);
    f.upperCutaway.position.set(rm.x, 0, -39.5);
    building.add(f.baseFacade);
    northRoofGroup.add(f.upperCutaway);

    // Left and right solid wall colliders around the doorway at z = -39.5
    wallColliders.push({
      minX: rm.x - f.halfBay,
      maxX: rm.x + f.doorLeftEdge,
      minZ: -39.8,
      maxZ: -39.2,
    });
    wallColliders.push({
      minX: rm.x + f.doorRightEdge,
      maxX: rm.x + f.halfBay,
      minZ: -39.8,
      maxZ: -39.2,
    });

    doors.push({
      title: rm.title,
      hinge: f.doorHinge,
      worldX: rm.x + f.doorCenter,
      worldZ: -39.5,
      openAngle: 1.72,
      currentAngle: 0,
      isOpen: false,
      doorCollider: {
        minX: rm.x + f.doorLeftEdge,
        maxX: rm.x + f.doorRightEdge,
        minZ: -39.75,
        maxZ: -39.25,
      },
    });
  });

  const westFacades = [
    { z: -24.0, w: 18.0, title: 'RUANG KELAS 1', sub: 'KELAS 1A · SIAGA MUDA', color: '#0F766E' },
    { z: -6.0, w: 18.0, title: 'RUANG KELAS 2', sub: 'KELAS 2A · CERIA', color: '#0F766E' },
    { z: 12.0, w: 18.0, title: 'RUANG KELAS 3', sub: 'KELAS 3A · KREATIF', color: '#0F766E' },
    { z: 26.5, w: 11.0, title: 'TOILET GURU', sub: 'KHUSUS GURU & STAF', color: '#0369A1' },
    { z: 38.0, w: 12.0, title: 'TOILET SISWA', sub: 'PUTRA & PUTRI · BERSIH', color: '#0284C7' },
    { z: 50.4, w: 12.8, title: 'RUANG UKS', sub: 'KESEHATAN SEKOLAH & P3K', color: '#DC2626' },
  ];
  westFacades.forEach((rm) => {
    const f = createHollowRoomFacade(rm.title, rm.sub, rm.color, rm.w);
    f.baseFacade.rotation.y = Math.PI / 2;
    f.upperCutaway.rotation.y = Math.PI / 2;
    f.baseFacade.position.set(-41.5, 0, rm.z);
    f.upperCutaway.position.set(-41.5, 0, rm.z);
    building.add(f.baseFacade);
    westRoofGroup.add(f.upperCutaway);

    // For rotation.y = +PI/2 at (-41.5, 0, rm.z), localX maps to worldZ = rm.z - localX
    wallColliders.push({
      minX: -41.8,
      maxX: -41.2,
      minZ: rm.z - f.doorLeftEdge,
      maxZ: rm.z + f.halfBay,
    });
    wallColliders.push({
      minX: -41.8,
      maxX: -41.2,
      minZ: rm.z - f.halfBay,
      maxZ: rm.z - f.doorRightEdge,
    });

    doors.push({
      title: rm.title,
      hinge: f.doorHinge,
      worldX: -41.5,
      worldZ: rm.z - f.doorCenter,
      openAngle: 1.72,
      currentAngle: 0,
      isOpen: false,
      doorCollider: {
        minX: -41.75,
        maxX: -41.25,
        minZ: rm.z - f.doorRightEdge,
        maxZ: rm.z - f.doorLeftEdge,
      },
    });
  });

  const eastFacades = [
    { z: -24.0, w: 18.0, title: 'RUANG KELAS 4', sub: 'KELAS 4A · NUSANTARA', color: '#991B1B' },
    { z: -6.0, w: 18.0, title: 'RUANG KELAS 5', sub: 'KELAS 5A · PENGGALANG', color: '#991B1B' },
    { z: 12.0, w: 18.0, title: 'RUANG KELAS 6', sub: 'KELAS 6A · SIAP UJIAN', color: '#991B1B' },
    { z: 32.5, w: 23.0, title: 'KANTIN SEHAT SD', sub: 'BAKSO · SOTO · JUS BUAH', color: '#15803D' },
    { z: 50.4, w: 12.8, title: 'MUSHOLA SEKOLAH', sub: 'MUSHOLA AL-IKHLAS SDN SUSUKAN 03', color: '#047857' },
  ];
  eastFacades.forEach((rm) => {
    const f = createHollowRoomFacade(rm.title, rm.sub, rm.color, rm.w);
    f.baseFacade.rotation.y = -Math.PI / 2;
    f.upperCutaway.rotation.y = -Math.PI / 2;
    f.baseFacade.position.set(41.5, 0, rm.z);
    f.upperCutaway.position.set(41.5, 0, rm.z);
    building.add(f.baseFacade);
    eastRoofGroup.add(f.upperCutaway);

    // For rotation.y = -PI/2 at (+41.5, 0, rm.z), localX maps to worldZ = rm.z + localX
    wallColliders.push({
      minX: 41.2,
      maxX: 41.8,
      minZ: rm.z - f.halfBay,
      maxZ: rm.z + f.doorLeftEdge,
    });
    wallColliders.push({
      minX: 41.2,
      maxX: 41.8,
      minZ: rm.z + f.doorRightEdge,
      maxZ: rm.z + f.halfBay,
    });

    doors.push({
      title: rm.title,
      hinge: f.doorHinge,
      worldX: 41.5,
      worldZ: rm.z + f.doorCenter,
      openAngle: 1.72,
      currentAngle: 0,
      isOpen: false,
      doorCollider: {
        minX: 41.25,
        maxX: 41.75,
        minZ: rm.z + f.doorLeftEdge,
        maxZ: rm.z + f.doorRightEdge,
      },
    });
  });

  // ===========================================================================
  // 4. EXPANDED ROOM INTERIORS (FURNITURE & EDUCATIONAL PROPS)
  // ===========================================================================
  const deskTopGeo = new THREE.BoxGeometry(2.3, 0.14, 1.45);
  const deskLegGeo = new THREE.BoxGeometry(0.14, 1.2, 1.25);
  const deskBookGeo = new THREE.BoxGeometry(0.8, 0.06, 0.6);
  const chairSeatGeo = new THREE.BoxGeometry(1.15, 0.12, 1.0);
  const chairBackGeo = new THREE.BoxGeometry(1.15, 0.95, 0.12);

  const createStudentDeskAndChair = (): THREE.Group => {
    const desk = new THREE.Group();
    const top = new THREE.Mesh(deskTopGeo, lightWoodMat);
    top.position.set(0, 1.65, 0);
    top.castShadow = true;

    const legL = new THREE.Mesh(deskLegGeo, darkMetalMat);
    legL.position.set(-0.95, 1.05, 0);
    const legR = new THREE.Mesh(deskLegGeo, darkMetalMat);
    legR.position.set(0.95, 1.05, 0);

    const book = new THREE.Mesh(deskBookGeo, wallWhiteMat);
    book.position.set(0, 1.75, 0);

    const seat = new THREE.Mesh(chairSeatGeo, woodMat);
    seat.position.set(0, 1.02, 1.15);
    const back = new THREE.Mesh(chairBackGeo, woodMat);
    back.position.set(0, 1.5, 1.6);

    desk.add(top, legL, legR, book, seat, back);
    return desk;
  };

  // --- A. 6 EXPANDED CLASSROOM INTERIORS (18.0w x 23.0d, 6 Desks in 3 Rows + Teacher Desk + Cupboard) ---
  const teacherDeskGeo = new THREE.BoxGeometry(2.2, 1.5, 3.4);
  const cupboardGeo = new THREE.BoxGeometry(1.6, 4.6, 3.2);

  const buildClassroomInterior = (
    wing: 'west' | 'east',
    centerZ: number,
    boardTitle: string,
    boardLesson: string
  ) => {
    const room = new THREE.Group();
    const dir = wing === 'west' ? -1 : 1;
    // Room center X is at -53.0 (West) or +53.0 (East), spanning 23 units from ±41.5 to ±64.5
    room.position.set(dir * 53.0, 0, centerZ);

    // Wide Chalkboard on the outer wall (x = dir * 10.9 -> world ±63.9)
    const board = createSign(boardTitle, boardLesson, '#14532D', 10.2, 2.7);
    board.rotation.y = dir === -1 ? Math.PI / 2 : -Math.PI / 2;
    board.position.set(dir * 10.9, 4.3, 0);
    room.add(board);

    // Teacher Desk in front of blackboard
    const teacherDesk = new THREE.Mesh(teacherDeskGeo, woodMat);
    teacherDesk.position.set(dir * 7.8, 1.2, -5.2);
    teacherDesk.castShadow = true;
    room.add(teacherDesk);

    // Classroom Book Cupboard on the corner wall
    const cupboard = new THREE.Mesh(cupboardGeo, lightWoodMat);
    cupboard.position.set(dir * 9.6, 2.75, 6.4);
    cupboard.castShadow = true;
    room.add(cupboard);

    // 6 Student Desks & Chairs arranged in 3 spacious rows x 2 columns
    // Row 1 (front): localX = dir * 4.2, Row 2 (mid): localX = 0.0, Row 3 (back): localX = -dir * 4.2
    const deskPositions: [number, number][] = [
      [4.2, -3.5],
      [4.2, 3.5],
      [0.0, -3.5],
      [0.0, 3.5],
      [-4.2, -3.5],
      [-4.2, 3.5],
    ];

    deskPositions.forEach(([lx, lz]) => {
      const d = createStudentDeskAndChair();
      d.rotation.y = dir === -1 ? Math.PI / 2 : -Math.PI / 2;
      d.position.set(lx * dir, 0, lz);
      room.add(d);
    });

    building.add(room);
  };

  buildClassroomInterior('west', -24.0, 'KELAS 1A · MEMBACA', 'Mengeja: I-N-I  B-U-D-I · 1 + 1 = 2');
  buildClassroomInterior('west', -6.0, 'KELAS 2A · BERHITUNG', 'Penjumlahan: 25 + 35 = 60 · Perkalian');
  buildClassroomInterior('west', 12.0, 'KELAS 3A · BAHASA', 'Membaca Puisi & Cerita Rakyat Nusantara');
  buildClassroomInterior('east', -24.0, 'KELAS 4A · IPS & PPKN', 'Peta Kepulauan Nusantara & Bhinneka Tunggal Ika');
  buildClassroomInterior('east', -6.0, 'KELAS 5A · SAINS IPA', 'Fotosintesis Tumbuhan Hijau & Rantai Makanan');
  buildClassroomInterior('east', 12.0, 'KELAS 6A · UJIAN SD', 'Rumus Volume Bangun Ruang & Pecahan');

  // --- B. EXPANDED RUANG LAB IPA (x = -42.0, z = -50.75, 20.0w x 22.5d) ---
  const labIpaGroup = new THREE.Group();
  labIpaGroup.position.set(-42.0, 0, -50.75);
  const ipaBoard = createSign('LABORATORIUM IPA SD', 'PRAKTIKUM MIKROSKOP & ZAT CAIR', '#15803D', 10.0, 2.5);
  ipaBoard.position.set(0, 4.3, -10.6);
  labIpaGroup.add(ipaBoard);

  [
    [-4.2, -3.5],
    [4.2, -3.5],
    [-4.2, 2.8],
    [4.2, 2.8],
  ].forEach(([tx, tz], idx) => {
    const labTable = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.55, 2.4), wallWhiteMat);
    labTable.position.set(tx, 1.22, tz);
    labTable.castShadow = true;
    labIpaGroup.add(labTable);

    const scopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), darkMetalMat);
    scopeBase.position.set(tx - 1.1, 2.06, tz);
    const scopeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.85, 10), darkMetalMat);
    scopeArm.position.set(tx - 1.1, 2.45, tz);
    labIpaGroup.add(scopeBase, scopeArm);

    const flask = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.78, 12),
      idx % 2 === 0 ? flaskGreenMat : flaskBlueMat
    );
    flask.position.set(tx + 1.0, 2.38, tz);
    labIpaGroup.add(flask);
  });
  building.add(labIpaGroup);

  // --- C. EXPANDED RUANG KEPALA SEKOLAH (x = -21.5, z = -50.75, 21.0w x 22.5d) ---
  const kepsekGroup = new THREE.Group();
  kepsekGroup.position.set(-21.5, 0, -50.75);
  const kepsekBoard = createSign('RUANG KEPALA SEKOLAH', 'Bpk. Drs. Hendra · SDN SUSUKAN 03', '#991B1B', 9.5, 2.3);
  kepsekBoard.position.set(0, 4.4, -10.6);
  kepsekGroup.add(kepsekBoard);

  const execDesk = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.5, 2.5), woodMat);
  execDesk.position.set(0, 1.2, -6.2);
  execDesk.castShadow = true;
  kepsekGroup.add(execDesk);

  const trophyCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.0, 5.2), lightWoodMat);
  trophyCabinet.position.set(-8.4, 2.95, -2.5);
  const trophyCup = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 1.0, 12), brassMat);
  trophyCup.position.set(-7.3, 3.7, -2.5);
  kepsekGroup.add(trophyCabinet, trophyCup);

  const sofa = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.25, 2.0), redVelvetMat);
  sofa.position.set(3.2, 1.05, 2.5);
  const guestTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.6), woodMat);
  guestTable.position.set(3.2, 0.9, 0.0);
  kepsekGroup.add(sofa, guestTable);
  building.add(kepsekGroup);

  // --- D. EXPANDED RUANG GURU (x = 0.0, z = -50.75, 22.0w x 22.5d) ---
  const guruGroup = new THREE.Group();
  guruGroup.position.set(0, 0, -50.75);
  const guruBoard = createSign('JADWAL MENGAJAR DEWAN GURU', 'KURIKULUM MERDEKA · KELAS 1 s/d KELAS 6', '#0F766E', 10.6, 2.5);
  guruBoard.position.set(0, 4.4, -10.6);
  guruGroup.add(guruBoard);

  const confTable = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.5, 4.2), lightWoodMat);
  confTable.position.set(0, 1.2, -2.5);
  confTable.castShadow = true;
  guruGroup.add(confTable);

  [-3.2, 0, 3.2].forEach((bx, idx) => {
    const bookStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.55, 0.75),
      idx === 0 ? bookRedMat : idx === 1 ? bookBlueMat : brassMat
    );
    bookStack.position.set(bx, 2.22, -2.5);
    guruGroup.add(bookStack);
  });
  building.add(guruGroup);

  // --- E. EXPANDED RUANG PERPUSTAKAAN (x = +21.5, z = -50.75, 21.0w x 22.5d) ---
  const perpusGroup = new THREE.Group();
  perpusGroup.position.set(21.5, 0, -50.75);
  const perpusBoard = createSign('PERPUSTAKAAN SDN SUSUKAN 03', 'MEMBACA ADALAH JENDELA DUNIA', '#1D4ED8', 9.6, 2.3);
  perpusBoard.position.set(0, 4.6, -10.6);
  perpusGroup.add(perpusBoard);

  const shelfGeo = new THREE.BoxGeometry(4.4, 4.8, 1.2);
  const bookRowGeo = new THREE.BoxGeometry(3.8, 0.65, 0.9);
  [-5.8, 0, 5.8].forEach((sx) => {
    const shelf = new THREE.Mesh(shelfGeo, woodMat);
    shelf.position.set(sx, 2.85, -9.6);
    shelf.castShadow = true;
    perpusGroup.add(shelf);

    [1.6, 2.7, 3.8].forEach((sy, rIdx) => {
      const booksRow = new THREE.Mesh(
        bookRowGeo,
        rIdx === 0 ? bookRedMat : rIdx === 1 ? bookBlueMat : bookGreenMat
      );
      booksRow.position.set(sx, sy, -9.45);
      perpusGroup.add(booksRow);
    });
  });

  [-2.8, 2.8].forEach((rz) => {
    const readTable = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.45, 2.6), lightWoodMat);
    readTable.position.set(1.2, 1.18, rz);
    readTable.castShadow = true;
    perpusGroup.add(readTable);
  });
  building.add(perpusGroup);

  // --- F. EXPANDED RUANG LAB KOMPUTER (x = +42.0, z = -50.75, 20.0w x 22.5d) ---
  const kompGroup = new THREE.Group();
  kompGroup.position.set(42.0, 0, -50.75);
  const kompBoard = createSign('LABORATORIUM KOMPUTER & TIK', 'PRAKTIK MENGETIK & MENGGAMBAR DIGITAL', '#4338CA', 9.6, 2.4);
  kompBoard.position.set(0, 4.4, -10.6);
  kompGroup.add(kompBoard);

  const monitorGeo = new THREE.BoxGeometry(1.4, 1.0, 0.14);
  const lcdGeo = new THREE.BoxGeometry(1.25, 0.85, 0.16);
  [
    [-4.2, -4.0],
    [4.2, -4.0],
    [-4.2, 2.2],
    [4.2, 2.2],
  ].forEach(([cx, cz]) => {
    const pcDesk = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.5, 2.0), wallWhiteMat);
    pcDesk.position.set(cx, 1.2, cz);
    pcDesk.castShadow = true;
    kompGroup.add(pcDesk);

    [-1.3, 1.3].forEach((mx) => {
      const monitor = new THREE.Mesh(monitorGeo, darkMetalMat);
      monitor.position.set(cx + mx, 2.55, cz - 0.2);
      const lcd = new THREE.Mesh(lcdGeo, screenMat);
      lcd.position.set(cx + mx, 2.55, cz - 0.18);
      kompGroup.add(monitor, lcd);
    });
  });
  building.add(kompGroup);

  // --- G. EXPANDED TOILET GURU (z = 26.5) & TOILET SISWA (z = 38.0) IN WEST WING ---
  const waterStreamMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
  });
  const soapBottleMat = new THREE.MeshStandardMaterial({
    color: '#10B981',
    roughness: 0.25,
    metalness: 0.15,
  });
  const soapFoamMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.35,
    metalness: 0.02,
  });

  [26.5, 38.0].forEach((tz, idx) => {
    const toiletGroup = new THREE.Group();
    toiletGroup.position.set(-53.0, 0, tz);

    // Ceramic Vanity Counter
    const basin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.5, 6.8), wallWhiteMat);
    basin.position.set(-9.5, 1.2, 0);
    basin.castShadow = true;
    basin.receiveShadow = true;

    // 3 Recessed Sink Bowls + Chrome Faucets + Running Water + Soap Dispensers
    [-2.0, 0, 2.0].forEach((sz, sIdx) => {
      const sinkRim = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.14, 1.45),
        new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.22, metalness: 0.15 })
      );
      sinkRim.position.set(-9.4, 1.98, sz);

      const sinkWell = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.16, 1.18),
        new THREE.MeshStandardMaterial({ color: '#BAE6FD', roughness: 0.18, metalness: 0.2 })
      );
      sinkWell.position.set(-9.4, 2.0, sz);

      // Chrome Gooseneck Faucet
      const faucetBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.42, 12),
        potSteelMat
      );
      faucetBase.position.set(-10.05, 2.18, sz);
      const faucetSpout = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.08, 0.08),
        potSteelMat
      );
      faucetSpout.position.set(-9.86, 2.36, sz);

      // Translucent Flowing Water Stream & Soap Foam on active center sink (Edo's station)
      if (sIdx === 1) {
        const waterStream = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.06, 0.42, 10),
          waterStreamMat
        );
        waterStream.position.set(-9.68, 2.16, sz);
        toiletGroup.add(waterStream);

        // Soap Lather Bubbles in Sink
        [
          [-9.45, 2.08, sz - 0.15, 0.14],
          [-9.32, 2.09, sz + 0.1, 0.16],
          [-9.52, 2.07, sz + 0.18, 0.12],
          [-9.28, 2.07, sz - 0.12, 0.11],
        ].forEach(([bx, by, bz, br]) => {
          const bubble = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 10), soapFoamMat);
          bubble.position.set(bx, by, bz);
          toiletGroup.add(bubble);
        });
      }

      // Liquid Soap Dispenser Bottle next to each sink
      const soapBottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.12, 0.34, 12),
        soapBottleMat
      );
      soapBottle.position.set(-9.85, 2.12, sz + 0.62);
      const soapPump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8),
        potSteelMat
      );
      soapPump.position.set(-9.85, 2.34, sz + 0.62);

      toiletGroup.add(sinkRim, sinkWell, faucetBase, faucetSpout, soapBottle, soapPump);
    });

    // Framed Vanity Mirror
    const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.65, 6.2), potSteelMat);
    mirrorFrame.position.set(-10.24, 3.55, 0);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 5.9), mirrorMat);
    mirror.position.set(-10.2, 3.55, 0);

    // PHBS 6 Langkah Cuci Tangan Educational Wall Poster above/beside sink
    const phbsPoster = createSign(
      'POSTER PHBS: 6 LANGKAH CUCI TANGAN',
      '1.TELAPAK · 2.PUNGGUNG · 3.SELA JARI · 4.KUNCI · 5.JEMPOL · 6.UJUNG KUKU',
      '#0284C7',
      5.8,
      1.35
    );
    phbsPoster.rotation.y = Math.PI / 2;
    phbsPoster.position.set(-10.18, 5.55, 0);

    const stall1 = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 4.8, 3.6),
      idx === 0 ? tealTrimMat : maroonTrimMat
    );
    stall1.position.set(-5.5, 2.85, -3.2);
    stall1.castShadow = true;
    const stall2 = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 4.8, 3.6),
      idx === 0 ? tealTrimMat : maroonTrimMat
    );
    stall2.position.set(1.5, 2.85, -3.2);
    stall2.castShadow = true;
    toiletGroup.add(basin, mirrorFrame, mirror, phbsPoster, stall1, stall2);
    building.add(toiletGroup);
  });

  // --- H. EXPANDED KANTIN SEHAT SD INTERIOR (x = +53.0, z = 32.5, 23.0w x 23.0d) ---
  const kantinInterior = new THREE.Group();
  kantinInterior.position.set(53.0, 0, 32.5);
  const kantinMenu = createSign('DAFTAR MENU KANTIN SEHAT', 'BAKSO KUAH · SOTO AYAM · JUS BUAH SEGAR', '#15803D', 10.6, 2.4);
  kantinMenu.rotation.y = -Math.PI / 2;
  kantinMenu.position.set(10.8, 4.4, 0);
  kantinInterior.add(kantinMenu);

  const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.65, 16.0), maroonTrimMat);
  kitchenCounter.position.set(6.5, 1.28, 0);
  kitchenCounter.castShadow = true;
  kantinInterior.add(kitchenCounter);

  const potGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.0, 14);
  [-4.5, 0, 4.5].forEach((pz) => {
    const pot = new THREE.Mesh(potGeo, potSteelMat);
    pot.position.set(6.5, 2.6, pz);
    kantinInterior.add(pot);
  });

  [
    [-3.2, -5.5],
    [-3.2, 5.5],
    [1.2, -5.5],
    [1.2, 5.5],
  ].forEach(([dx, dz]) => {
    const dineTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 4.4), lightWoodMat);
    dineTable.position.set(dx, 1.15, dz);
    dineTable.castShadow = true;
    kantinInterior.add(dineTable);
  });
  building.add(kantinInterior);

  const bellMesh = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 14), brassMat);
  bellMesh.position.set(7.5, 5.8, -35.2);
  building.add(bellMesh);

  [25.5, 32.5, 39.5].forEach((tz) => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 4.4), woodMat);
    top.position.set(31.5, 1.88, tz);
    top.castShadow = true;
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 4.4), woodMat);
    b1.position.set(29.85, 1.12, tz);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 4.4), woodMat);
    b2.position.set(33.15, 1.12, tz);
    building.add(top, b1, b2);
  });

  // --- I. EXPANDED RUANG UKS INTERIOR (x = -53.0, z = 50.4, 12.8w x 23.0d) ---
  const uksInterior = new THREE.Group();
  uksInterior.position.set(-53.0, 0, 50.4);

  const uksSign = createSign(
    'UNIT KESEHATAN SEKOLAH (UKS)',
    'P3K · PEMERIKSAAN KESEHATAN · DOKTER KECIL SD',
    '#DC2626',
    9.4,
    2.2
  );
  uksSign.rotation.y = Math.PI / 2;
  uksSign.position.set(-10.8, 4.4, 0);
  uksInterior.add(uksSign);

  // 2 UKS Examination Beds (Kasur Periksa UKS Putih & Selimut Hijau Medis)
  const bedFrameMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.4, metalness: 0.5 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.7 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.75 });
  const crossRedMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.4 });

  [-3.2, 2.8].forEach((bz) => {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-6.2, 0, bz);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.95, 2.4), bedFrameMat);
    frame.position.set(0, 0.92, 0);
    frame.castShadow = true;

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.32, 2.25), mattressMat);
    mattress.position.set(0, 1.52, 0);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 2.28), blanketMat);
    blanket.position.set(0.9, 1.54, 0);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 1.6), mattressMat);
    pillow.position.set(-1.95, 1.75, 0);

    bedGroup.add(frame, mattress, blanket, pillow);
    uksInterior.add(bedGroup);
  });

  // Privacy Medical Curtain Screen between UKS beds
  const curtainScreen = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 3.6, 0.14),
    new THREE.MeshStandardMaterial({ color: '#A7F3D0', roughness: 0.65 })
  );
  curtainScreen.position.set(-6.2, 2.25, -0.2);
  uksInterior.add(curtainScreen);

  // First-Aid & Medicine Cabinet (Lemari Obat P3K Palang Merah) on North Partition Wall
  const medCabinet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.5, 1.3), wallWhiteMat);
  medCabinet.position.set(2.5, 2.7, -5.2);
  medCabinet.castShadow = true;
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.08), crossRedMat);
  crossV.position.set(2.5, 3.5, -4.52);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.08), crossRedMat);
  crossH.position.set(2.5, 3.5, -4.52);
  uksInterior.add(medCabinet, crossV, crossH);

  // UKS Nurse Examination Desk & Height/Weight Scale
  const uksDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.45, 3.6), lightWoodMat);
  uksDesk.position.set(3.2, 1.18, 2.2);
  uksDesk.castShadow = true;
  const scaleBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 1.2), darkMetalMat);
  scaleBase.position.set(6.8, 0.54, -4.6);
  const scalePole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 10), bedFrameMat);
  scalePole.position.set(6.8, 2.4, -5.0);
  uksInterior.add(uksDesk, scaleBase, scalePole);

  building.add(uksInterior);

  // --- J. EXPANDED MUSHOLA SEKOLAH INTERIOR (x = +53.0, z = 50.4, 12.8w x 23.0d) ---
  const musholaInterior = new THREE.Group();
  musholaInterior.position.set(53.0, 0, 50.4);

  const musholaSign = createSign(
    'MUSHOLA AL-IKHLAS SDN SUSUKAN 03',
    'SHOLAT BERJAMAAH · MENGAJI AL-QURAN · BERAKHLAK MULIA',
    '#047857',
    9.6,
    2.2
  );
  musholaSign.rotation.y = -Math.PI / 2;
  musholaSign.position.set(10.8, 4.5, 0);
  musholaInterior.add(musholaSign);

  // Mihrab Niche on the Qibla / Outer Wall & Imam Prayer Sajadah
  const mihrabArch = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 4.8, 3.4),
    new THREE.MeshStandardMaterial({ color: '#065F46', roughness: 0.5 })
  );
  mihrabArch.position.set(-10.4, 2.85, 0);
  const mihrabGoldTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 4.4, 2.8),
    brassMat
  );
  mihrabGoldTrim.position.set(-10.35, 2.65, 0);
  musholaInterior.add(mihrabArch, mihrabGoldTrim);

  // Green & Gold Prayer Carpets (Sajadah Sholat Berjamaah) in 2 neat rows
  const sajadahGreenMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.85 });
  const sajadahGoldMat = new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.7 });
  [-4.8, 0.2, 5.2].forEach((sx, rowIdx) => {
    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.08, rowIdx === 0 ? 4.2 : 9.4),
      sajadahGreenMat
    );
    carpet.position.set(sx, 0.49, 0);
    carpet.receiveShadow = true;

    const borderStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.09, rowIdx === 0 ? 4.2 : 9.4),
      sajadahGoldMat
    );
    borderStrip.position.set(sx - 1.35, 0.495, 0);
    musholaInterior.add(carpet, borderStrip);
  });

  // Wooden Al-Quran, Iqro & Mukena Shelf on the North Partition Wall + Rehal Mengaji Desks
  const quranShelf = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.4, 1.2), woodMat);
  quranShelf.position.set(2.5, 2.65, -5.3);
  quranShelf.castShadow = true;
  musholaInterior.add(quranShelf);

  [
    [0.2, -2.6],
    [0.2, 2.6],
    [5.2, -2.6],
  ].forEach(([rx, rz]) => {
    const rehal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.3), lightWoodMat);
    rehal.position.set(rx - 1.1, 0.82, rz);
    const quranBook = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.95), bookGreenMat);
    quranBook.position.set(rx - 1.1, 1.18, rz);
    musholaInterior.add(rehal, quranBook);
  });

  building.add(musholaInterior);

  // ===========================================================================
  // 5. EXPANDED WING ROOFS (AUTO-CUTAWAY WHEN PLAYER ENTERS A WING)
  // ===========================================================================
  const northRoofMesh = new THREE.Mesh(
    createGableRoofGeometry(130.5, 28.5, 5.2),
    roofMat
  );
  northRoofMesh.position.set(0, 8.65, -48.75);
  northRoofMesh.castShadow = true;
  northRoofGroup.add(northRoofMesh);

  // Main School Building Rooftop Signboard facing the courtyard
  const mainBuildingSign = createSign(
    'SDN SUSUKAN 03',
    'GEDUNG SEKOLAH TERPADU',
    '#991B1B',
    15.5,
    2.4
  );
  mainBuildingSign.position.set(0, 10.1, -34.8);
  northRoofGroup.add(mainBuildingSign);

  // Seamless Hipped Corner Roof Caps connecting North Wing with West and East Wings
  [-50.75, 50.75].forEach((cx) => {
    const cornerHipRoof = new THREE.Mesh(
      new THREE.ConeGeometry(20.5, 5.8, 4),
      roofMat
    );
    cornerHipRoof.position.set(cx, 11.55, -48.75);
    cornerHipRoof.rotation.y = Math.PI / 4;
    cornerHipRoof.castShadow = true;
    northRoofGroup.add(cornerHipRoof);
  });

  const westRoofGeo = createGableRoofGeometry(120.5, 28.5, 5.2);
  westRoofGeo.rotateY(Math.PI / 2);
  const westRoofMesh = new THREE.Mesh(westRoofGeo, roofMat);
  westRoofMesh.position.set(-50.75, 8.65, -2.5);
  westRoofMesh.castShadow = true;
  westRoofGroup.add(westRoofMesh);

  const torenMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.55, 3.6, 20),
    torenOrangeMat
  );
  torenMesh.position.set(-50.75, 14.6, 32.0);
  westRoofGroup.add(torenMesh);

  const eastRoofGeo = createGableRoofGeometry(120.5, 28.5, 5.2);
  eastRoofGeo.rotateY(Math.PI / 2);
  const eastRoofMesh = new THREE.Mesh(eastRoofGeo, roofMat);
  eastRoofMesh.position.set(50.75, 8.65, -2.5);
  eastRoofMesh.castShadow = true;
  eastRoofGroup.add(eastRoofMesh);

  // Green & Gold 3D Mosque Dome (Kubah Mushola Al-Ikhlas) atop the Mushola roof
  const domeMat = new THREE.MeshStandardMaterial({
    color: '#15803D',
    roughness: 0.35,
    metalness: 0.25,
  });
  const musholaDome = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat
  );
  musholaDome.position.set(50.75, 13.2, 50.4);
  musholaDome.castShadow = true;
  const domeFinialPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10),
    brassMat
  );
  domeFinialPole.position.set(50.75, 17.8, 50.4);
  const domeCrescent = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.09, 10, 20, Math.PI * 1.35),
    brassMat
  );
  domeCrescent.position.set(50.75, 18.7, 50.4);
  domeCrescent.rotation.z = Math.PI / 4;
  eastRoofGroup.add(musholaDome, domeFinialPole, domeCrescent);

  // Central Entrance Lobby Portico projecting out from Ruang Guru to Lapangan Upacara
  const porticoSlab = new THREE.Mesh(
    new THREE.BoxGeometry(18.0, 0.45, 5.5),
    floorTileMat
  );
  porticoSlab.position.set(0, 0.225, -32.5);
  porticoSlab.receiveShadow = true;
  building.add(porticoSlab);

  // Ceremonial entrance steps (3 tiers) leading down smoothly from corridor (y=0.45) to field (y=0)
  [
    { w: 18.2, d: 1.1, y: 0.30, z: -29.2 },
    { w: 19.4, d: 1.1, y: 0.18, z: -28.1 },
    { w: 20.6, d: 1.1, y: 0.08, z: -27.0 },
  ].forEach((step) => {
    const stMesh = new THREE.Mesh(
      new THREE.BoxGeometry(step.w, step.y, step.d),
      wallWhiteMat
    );
    stMesh.position.set(0, step.y / 2, step.z);
    stMesh.receiveShadow = true;
    building.add(stMesh);
  });

  // Grand Portico Pillars with gold trim
  [-8.2, -3.2, 3.2, 8.2].forEach((px) => {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 8.2, 0.85),
      wallWhiteMat
    );
    col.position.set(px, 4.55, -30.2);
    col.castShadow = true;
    northRoofGroup.add(col);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.35, 1.15),
      brassMat
    );
    cap.position.set(px, 8.6, -30.2);
    northRoofGroup.add(cap);
  });

  // Grand Portico Marquee Roof
  const porticoRoof = new THREE.Mesh(
    new THREE.BoxGeometry(19.2, 0.85, 6.2),
    tealTrimMat
  );
  porticoRoof.position.set(0, 8.9, -32.8);
  porticoRoof.castShadow = true;
  northRoofGroup.add(porticoRoof);

  const lobbyMarqueeSign = createSign(
    'LOBI UTAMA SEKOLAH',
    'GEDUNG TERPADU SDN SUSUKAN 03',
    '#0F766E',
    14.5,
    1.65
  );
  lobbyMarqueeSign.position.set(0, 9.85, -29.6);
  northRoofGroup.add(lobbyMarqueeSign);

  // Notice board on lobby wall
  const noticeBoard = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 2.8, 0.12),
    new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.7 })
  );
  noticeBoard.position.set(0, 4.2, -39.2);
  building.add(noticeBoard);

  const noticePaper = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 2.2, 0.14),
    new THREE.MeshStandardMaterial({ color: '#FEF08A', roughness: 0.9 })
  );
  noticePaper.position.set(0, 4.2, -39.18);
  building.add(noticePaper);

  // Planter boxes with flowering shrubs flanking the entrance stairs
  [-11.2, 11.2].forEach((px) => {
    const planter = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.2, 4.2),
      maroonTrimMat
    );
    planter.position.set(px, 0.6, -29.5);
    planter.castShadow = true;
    building.add(planter);

    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.6, 1),
      new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.85 })
    );
    bush.position.set(px, 1.9, -29.5);
    bush.scale.set(1.1, 0.8, 1.1);
    bush.castShadow = true;
    building.add(bush);
  });

  // Continuous corridor safety balustrade railings along inner courtyard perimeter
  const railMat = new THREE.MeshStandardMaterial({ color: '#0F766E', roughness: 0.5 });
  const railPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.35, 10);
  const railBarGeo = new THREE.CylinderGeometry(0.06, 0.06, 8.5, 10);
  railBarGeo.rotateZ(Math.PI / 2);

  [-28.0, 28.0].forEach((rx) => {
    const rail = new THREE.Mesh(railBarGeo, railMat);
    rail.position.set(rx, 1.45, -35.2);
    building.add(rail);
  });

  building.add(northRoofGroup, westRoofGroup, eastRoofGroup);

  return {
    group: building,
    northRoofGroup,
    westRoofGroup,
    eastRoofGroup,
    doors,
    wallColliders,
  };
}
