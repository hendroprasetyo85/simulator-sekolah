import * as THREE from 'three';
import { TimeOfDayId, WeatherTypeId } from '../types/character';

interface CloudInstance {
  group: THREE.Group;
  baseY: number;
  baseScale: number;
  speed: number;
  phase: number;
}

interface BirdInstance {
  group: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
  mode: 'circle' | 'cruise';
  centerX: number;
  centerZ: number;
  radius: number;
  angularSpeed: number;
  angle: number;
  velocityX: number;
  velocityZ: number;
  baseY: number;
  flapSpeed: number;
  phase: number;
}

export interface RainDropState {
  x: number;
  y: number;
  z: number;
  speed: number;
  length: number;
}

interface SplashRippleState {
  x: number;
  z: number;
  phase: number;
  speed: number;
}

const _splashDummy = new THREE.Object3D();

/**
 * Returns true if (x, z) is in the outdoor school area (courtyard, sports field,
 * gate, street, outer grounds) and false if (x, z) is under any school building roof,
 * covered corridor terrace, or parking canopy.
 */
export function isOutdoorRainCoord(x: number, z: number): boolean {
  // North Wing + Covered Terrace
  if (x >= -53.2 && x <= 53.2 && z >= -62.5 && z <= -33.2) return false;
  // West Wing + Covered Terrace (including Ruang UKS)
  if (x >= -64.5 && x <= -35.2 && z >= -39.5 && z <= 57.0) return false;
  // East Wing + Covered Terrace (including Mushola Sekolah)
  if (x >= 35.2 && x <= 64.5 && z >= -39.5 && z <= 57.0) return false;
  // Teacher & Guest Parking Canopy
  if (x >= -36.0 && x <= -15.5 && z >= 39.0 && z <= 51.0) return false;
  // Pos Satpam Roof
  if (x >= -17.8 && x <= -11.2 && z >= 51.2 && z <= 56.8) return false;
  return true;
}

function sampleOutdoorRainXZ(): [number, number] {
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = (Math.random() * 2 - 1) * 72.0;
    const z = -66.0 + Math.random() * 142.0; // -66 to +76
    if (isOutdoorRainCoord(x, z)) {
      return [x, z];
    }
  }
  // Default to central courtyard if random attempts hit roofs
  return [(Math.random() * 2 - 1) * 30.0, -25.0 + Math.random() * 60.0];
}

function paintSkyDomeGradient(
  canvas: HTMLCanvasElement,
  timeOfDay: TimeOfDayId,
  weather: WeatherTypeId
) {
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (weather === 'hujan') {
    if (timeOfDay === 'sore_pulang') {
      grad.addColorStop(0.0, '#0F172A');
      grad.addColorStop(0.28, '#1E293B');
      grad.addColorStop(0.48, '#334155');
      grad.addColorStop(0.55, '#475569');
      grad.addColorStop(1.0, '#1E293B');
    } else {
      grad.addColorStop(0.0, '#1E293B');
      grad.addColorStop(0.28, '#334155');
      grad.addColorStop(0.48, '#475569');
      grad.addColorStop(0.56, '#64748B');
      grad.addColorStop(1.0, '#334155');
    }
  } else if (weather === 'berawan') {
    if (timeOfDay === 'sore_pulang') {
      grad.addColorStop(0.0, '#334155');
      grad.addColorStop(0.26, '#475569');
      grad.addColorStop(0.45, '#94A3B8');
      grad.addColorStop(0.52, '#CBD5E1');
      grad.addColorStop(1.0, '#475569');
    } else {
      grad.addColorStop(0.0, '#3B82F6');
      grad.addColorStop(0.26, '#60A5FA');
      grad.addColorStop(0.46, '#94A3B8');
      grad.addColorStop(0.53, '#CBD5E1');
      grad.addColorStop(0.6, '#E2E8F0');
      grad.addColorStop(1.0, '#64748B');
    }
  } else if (timeOfDay === 'pagi_upacara') {
    grad.addColorStop(0.0, '#1D4ED8');
    grad.addColorStop(0.28, '#3B82F6');
    grad.addColorStop(0.46, '#93C5FD');
    grad.addColorStop(0.51, '#FEF3C7');
    grad.addColorStop(0.56, '#DBEAFE');
    grad.addColorStop(1.0, '#64748B');
  } else if (timeOfDay === 'siang_istirahat') {
    grad.addColorStop(0.0, '#0369A1');
    grad.addColorStop(0.26, '#0EA5E9');
    grad.addColorStop(0.47, '#7DD3FC');
    grad.addColorStop(0.52, '#E0F2FE');
    grad.addColorStop(0.58, '#BAE6FD');
    grad.addColorStop(1.0, '#64748B');
  } else {
    grad.addColorStop(0.0, '#312E81');
    grad.addColorStop(0.22, '#7C2D12');
    grad.addColorStop(0.38, '#EA580C');
    grad.addColorStop(0.48, '#FBBF24');
    grad.addColorStop(0.53, '#FEF08A');
    grad.addColorStop(1.0, '#475569');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function createSunGlowTexture(withRays: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  const radGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 124);
  radGrad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
  radGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.85)');
  radGrad.addColorStop(0.55, 'rgba(251, 191, 36, 0.32)');
  radGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');

  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 256, 256);

  if (withRays) {
    ctx.save();
    ctx.translate(cx, cy);
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      ctx.rotate((Math.PI * 2) / rayCount);
      const rayGrad = ctx.createLinearGradient(0, 0, 0, 122);
      rayGrad.addColorStop(0.0, 'rgba(255, 251, 235, 0.45)');
      rayGrad.addColorStop(0.7, 'rgba(253, 224, 71, 0.14)');
      rayGrad.addColorStop(1.0, 'rgba(253, 224, 71, 0.0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(-7, 16);
      ctx.lineTo(7, 16);
      ctx.lineTo(1.5, 122);
      ctx.lineTo(-1.5, 122);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SchoolSkySystem {
  public readonly group = new THREE.Group();

  private skyCanvas: HTMLCanvasElement;
  private skyTex: THREE.CanvasTexture;
  private skyDomeMesh: THREE.Mesh;
  private skyDomeMat: THREE.MeshBasicMaterial;

  private sunGroup = new THREE.Group();
  private sunCoreMat: THREE.MeshBasicMaterial;
  private sunGlowSprite: THREE.Sprite;
  private sunRaysSprite: THREE.Sprite;

  private cloudTopMat: THREE.MeshStandardMaterial;
  private cloudBaseMat: THREE.MeshStandardMaterial;
  private birdBodyMat: THREE.MeshStandardMaterial;
  private birdBellyMat: THREE.MeshStandardMaterial;
  private birdBeakMat: THREE.MeshStandardMaterial;

  private clouds: CloudInstance[] = [];
  private birds: BirdInstance[] = [];

  // Outdoor Rain Particle System (Streaks + Ground Splash Ripples)
  private rainGroup = new THREE.Group();
  private rainDrops: RainDropState[] = [];
  private rainLineGeo!: THREE.BufferGeometry;
  private rainLinePositions!: Float32Array;
  private rainLineMat!: THREE.LineBasicMaterial;
  private splashRipples: SplashRippleState[] = [];
  private splashInstanced!: THREE.InstancedMesh;
  private currentWeather: WeatherTypeId = 'cerah';

  constructor(parentGroup: THREE.Group) {
    // 1. Sky Dome using a single persistent canvas texture
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 64;
    this.skyCanvas.height = 256;
    paintSkyDomeGradient(this.skyCanvas, 'pagi_upacara', 'cerah');

    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;

    const domeGeo = new THREE.SphereGeometry(225, 28, 20);
    this.skyDomeMat = new THREE.MeshBasicMaterial({
      map: this.skyTex,
      side: THREE.BackSide,
      fog: false,
    });
    this.skyDomeMesh = new THREE.Mesh(domeGeo, this.skyDomeMat);
    this.group.add(this.skyDomeMesh);

    // 2. 3D Sun Disc + Radiant Corona + Rotating Sunbeams
    this.sunCoreMat = new THREE.MeshBasicMaterial({
      color: '#FFFBEB',
      fog: false,
    });
    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 20), this.sunCoreMat);
    this.sunGroup.add(sunCore);

    const glowMat = new THREE.SpriteMaterial({
      map: createSunGlowTexture(false),
      transparent: true,
      fog: false,
      depthWrite: false,
    });
    this.sunGlowSprite = new THREE.Sprite(glowMat);
    this.sunGlowSprite.scale.set(22, 22, 1);
    this.sunGroup.add(this.sunGlowSprite);

    const raysMat = new THREE.SpriteMaterial({
      map: createSunGlowTexture(true),
      transparent: true,
      fog: false,
      depthWrite: false,
      opacity: 0.78,
    });
    this.sunRaysSprite = new THREE.Sprite(raysMat);
    this.sunRaysSprite.scale.set(34, 34, 1);
    this.sunGroup.add(this.sunRaysSprite);

    this.sunGroup.position.set(32, 33, -94);
    this.group.add(this.sunGroup);

    // 3. Shared Cloud & Bird Materials
    this.cloudTopMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.88,
      metalness: 0.0,
      emissive: '#E2E8F0',
      emissiveIntensity: 0.28,
      fog: false,
    });
    this.cloudBaseMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      roughness: 0.92,
      metalness: 0.0,
      emissive: '#CBD5E1',
      emissiveIntensity: 0.2,
      fog: false,
    });
    this.birdBodyMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.6,
      fog: false,
    });
    this.birdBellyMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.7,
      fog: false,
    });
    this.birdBeakMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      roughness: 0.5,
      fog: false,
    });

    this.buildClouds();
    this.buildBirds();
    this.buildOutdoorRainSystem();

    parentGroup.add(this.group);
  }

  private buildClouds() {
    const cloudSpecs: [number, number, number, number, number][] = [
      [-48, 22, -68, 1.15, 1.6],
      [-14, 24, -74, 1.35, 1.3],
      [22, 21, -64, 1.1, 1.7],
      [54, 25, -72, 1.25, 1.4],
      [-78, 27, -55, 1.4, 1.5],
      [82, 26, -58, 1.3, 1.8],
      [-34, 20, -38, 0.95, 2.0],
      [36, 21, -42, 1.05, 1.9],
      [-65, 24, -22, 1.2, 1.5],
      [68, 23, -18, 1.15, 1.6],
      [-26, 23, 12, 1.0, 1.8],
      [30, 24, 18, 1.1, 1.7],
      [-72, 26, 28, 1.3, 1.4],
      [74, 25, 34, 1.25, 1.5],
      [-42, 22, 58, 1.15, 1.9],
      [18, 23, 64, 1.2, 1.6],
      [58, 24, 68, 1.05, 1.7],
      [-105, 28, -40, 1.45, 1.3],
      [108, 29, -35, 1.4, 1.4],
      [-96, 27, 45, 1.35, 1.6],
      [98, 28, 52, 1.3, 1.5],
      [0, 29, -92, 1.5, 1.2],
      [-56, 30, -90, 1.35, 1.4],
      [58, 30, -88, 1.4, 1.3],
    ];

    const puffGeoMain = new THREE.DodecahedronGeometry(2.6, 1);
    const puffGeoSide = new THREE.DodecahedronGeometry(2.0, 1);
    const puffGeoBlock = new THREE.BoxGeometry(6.8, 1.6, 3.8);

    cloudSpecs.forEach(([x, y, z, scale, speed], idx) => {
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(x, y, z);
      cloudGroup.scale.setScalar(scale);

      const baseMesh = new THREE.Mesh(puffGeoBlock, this.cloudBaseMat);
      baseMesh.position.set(0, -0.35, 0);
      cloudGroup.add(baseMesh);

      const centerPuff = new THREE.Mesh(puffGeoMain, this.cloudTopMat);
      centerPuff.position.set(0, 0.85, 0);
      centerPuff.scale.set(1.25, 0.95, 1.0);
      cloudGroup.add(centerPuff);

      const leftPuff = new THREE.Mesh(puffGeoSide, this.cloudTopMat);
      leftPuff.position.set(-2.35, 0.35, 0.25);
      leftPuff.scale.set(1.15, 0.85, 0.95);
      cloudGroup.add(leftPuff);

      const rightPuff = new THREE.Mesh(puffGeoSide, this.cloudTopMat);
      rightPuff.position.set(2.35, 0.42, -0.2);
      rightPuff.scale.set(1.1, 0.9, 0.95);
      cloudGroup.add(rightPuff);

      const frontPuff = new THREE.Mesh(puffGeoSide, this.cloudTopMat);
      frontPuff.position.set(0.5, 0.28, 1.35);
      frontPuff.scale.set(0.95, 0.75, 0.85);
      cloudGroup.add(frontPuff);

      cloudGroup.rotation.y = (idx % 4) * 0.35 - 0.5;
      this.group.add(cloudGroup);

      this.clouds.push({
        group: cloudGroup,
        baseY: y,
        baseScale: scale,
        speed,
        phase: idx * 1.37,
      });
    });
  }

  private createSingleBirdMesh(
    torsoGeo: THREE.BoxGeometry,
    bellyGeo: THREE.BoxGeometry,
    headGeo: THREE.BoxGeometry,
    beakGeo: THREE.ConeGeometry,
    tailGeo: THREE.BoxGeometry,
    innerWingGeo: THREE.BoxGeometry,
    outerWingGeo: THREE.BoxGeometry
  ): {
    root: THREE.Group;
    leftWingPivot: THREE.Group;
    rightWingPivot: THREE.Group;
  } {
    const root = new THREE.Group();

    const torso = new THREE.Mesh(torsoGeo, this.birdBodyMat);
    root.add(torso);

    const belly = new THREE.Mesh(bellyGeo, this.birdBellyMat);
    belly.position.set(0, -0.09, 0.02);
    root.add(belly);

    const head = new THREE.Mesh(headGeo, this.birdBodyMat);
    head.position.set(0, 0.1, 0.42);
    root.add(head);

    const beak = new THREE.Mesh(beakGeo, this.birdBeakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.08, 0.62);
    root.add(beak);

    const tail = new THREE.Mesh(tailGeo, this.birdBodyMat);
    tail.position.set(0, 0.02, -0.48);
    tail.rotation.x = 0.15;
    root.add(tail);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.position.set(0.14, 0.06, 0.05);
    const leftInnerWing = new THREE.Mesh(innerWingGeo, this.birdBodyMat);
    leftInnerWing.position.set(0.34, 0, 0);
    const leftOuterWing = new THREE.Mesh(outerWingGeo, this.birdBellyMat);
    leftOuterWing.position.set(0.88, 0, -0.04);
    leftWingPivot.add(leftInnerWing, leftOuterWing);
    root.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.position.set(-0.14, 0.06, 0.05);
    const rightInnerWing = new THREE.Mesh(innerWingGeo, this.birdBodyMat);
    rightInnerWing.position.set(-0.34, 0, 0);
    const rightOuterWing = new THREE.Mesh(outerWingGeo, this.birdBellyMat);
    rightOuterWing.position.set(-0.88, 0, -0.04);
    rightWingPivot.add(rightInnerWing, rightOuterWing);
    root.add(rightWingPivot);

    root.scale.setScalar(0.88);

    return { root, leftWingPivot, rightWingPivot };
  }

  private buildBirds() {
    const torsoGeo = new THREE.BoxGeometry(0.28, 0.22, 0.72);
    const bellyGeo = new THREE.BoxGeometry(0.24, 0.1, 0.56);
    const headGeo = new THREE.BoxGeometry(0.24, 0.22, 0.26);
    const beakGeo = new THREE.ConeGeometry(0.07, 0.22, 6);
    const tailGeo = new THREE.BoxGeometry(0.38, 0.06, 0.36);
    const innerWingGeo = new THREE.BoxGeometry(0.68, 0.05, 0.34);
    const outerWingGeo = new THREE.BoxGeometry(0.52, 0.04, 0.24);

    const circleConfigs = [
      { cx: 0, cz: -22, radius: 16, baseY: 14.8, speed: 0.52, count: 5 },
      { cx: -12, cz: 10, radius: 24, baseY: 17.5, speed: -0.44, count: 4 },
      { cx: 18, cz: -4, radius: 28, baseY: 19.8, speed: 0.38, count: 4 },
    ];

    let birdIdx = 0;
    circleConfigs.forEach((cfg) => {
      for (let i = 0; i < cfg.count; i++) {
        const { root, leftWingPivot, rightWingPivot } = this.createSingleBirdMesh(
          torsoGeo,
          bellyGeo,
          headGeo,
          beakGeo,
          tailGeo,
          innerWingGeo,
          outerWingGeo
        );
        const angle = (i / cfg.count) * Math.PI * 2 + birdIdx * 0.4;
        const bx = cfg.cx + Math.cos(angle) * cfg.radius;
        const bz = cfg.cz + Math.sin(angle) * cfg.radius;
        const by = cfg.baseY + (i % 3) * 0.85;

        root.position.set(bx, by, bz);
        this.group.add(root);

        this.birds.push({
          group: root,
          leftWingPivot,
          rightWingPivot,
          mode: 'circle',
          centerX: cfg.cx,
          centerZ: cfg.cz,
          radius: cfg.radius + (i % 2) * 2.2,
          angularSpeed: cfg.speed,
          angle,
          velocityX: 0,
          velocityZ: 0,
          baseY: by,
          flapSpeed: 9.5 + (birdIdx % 4) * 1.2,
          phase: birdIdx * 1.7,
        });
        birdIdx++;
      }
    });

    const flockOrigins = [
      { originX: -45, originZ: -34, baseY: 16.2, vx: 7.2, vz: 1.4 },
      { originX: 35, originZ: -52, baseY: 19.5, vx: -6.8, vz: 1.8 },
      { originX: -20, originZ: 28, baseY: 17.0, vx: 6.4, vz: -1.6 },
    ];

    const vOffsets: [number, number, number][] = [
      [0, 0, 0],
      [-2.4, 0.25, -2.2],
      [2.4, 0.25, -2.2],
      [-4.8, 0.5, -4.4],
      [4.8, 0.5, -4.4],
    ];

    flockOrigins.forEach((flock) => {
      const heading = Math.atan2(flock.vx, flock.vz);
      vOffsets.forEach(([ox, oy, oz], idx) => {
        const { root, leftWingPivot, rightWingPivot } = this.createSingleBirdMesh(
          torsoGeo,
          bellyGeo,
          headGeo,
          beakGeo,
          tailGeo,
          innerWingGeo,
          outerWingGeo
        );
        const bx = flock.originX + ox;
        const by = flock.baseY + oy;
        const bz = flock.originZ + oz;

        root.position.set(bx, by, bz);
        root.rotation.y = heading;
        this.group.add(root);

        this.birds.push({
          group: root,
          leftWingPivot,
          rightWingPivot,
          mode: 'cruise',
          centerX: 0,
          centerZ: 0,
          radius: 0,
          angularSpeed: 0,
          angle: 0,
          velocityX: flock.vx,
          velocityZ: flock.vz,
          baseY: by,
          flapSpeed: 10.2 + (idx % 3) * 0.9,
          phase: birdIdx * 1.15,
        });
        birdIdx++;
      });
    });
  }

  /**
   * Builds the Outdoor Raindrop Particle System (1,050 falling rain streaks + 85 courtyard splash ripples)
   * strictly restricted to outdoor school areas (never inside classrooms or covered terraces).
   */
  private buildOutdoorRainSystem() {
    const RAIN_DROP_COUNT = 1050;
    this.rainLinePositions = new Float32Array(RAIN_DROP_COUNT * 6);

    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      const [rx, rz] = sampleOutdoorRainXZ();
      const ry = Math.random() * 26.0;
      const speed = 28.0 + Math.random() * 9.0;
      const length = 1.15 + Math.random() * 0.45;

      this.rainDrops.push({ x: rx, y: ry, z: rz, speed, length });

      const baseIdx = i * 6;
      // Top vertex of raindrop streak (slightly slanted by wind)
      this.rainLinePositions[baseIdx] = rx + 0.18;
      this.rainLinePositions[baseIdx + 1] = ry + length;
      this.rainLinePositions[baseIdx + 2] = rz + 0.08;
      // Bottom vertex of raindrop streak
      this.rainLinePositions[baseIdx + 3] = rx;
      this.rainLinePositions[baseIdx + 4] = ry;
      this.rainLinePositions[baseIdx + 5] = rz;
    }

    this.rainLineGeo = new THREE.BufferGeometry();
    this.rainLineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainLinePositions, 3)
    );

    this.rainLineMat = new THREE.LineBasicMaterial({
      color: '#BAE6FD',
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    const rainLines = new THREE.LineSegments(this.rainLineGeo, this.rainLineMat);
    rainLines.frustumCulled = false;
    this.rainGroup.add(rainLines);

    // Ground Rain Splash Ripples across outdoor courtyard & sports field
    const SPLASH_COUNT = 85;
    const splashGeo = new THREE.RingGeometry(0.12, 0.24, 12);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({
      color: '#E0F2FE',
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });

    this.splashInstanced = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT);
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const [sx, sz] = sampleOutdoorRainXZ();
      this.splashRipples.push({
        x: sx,
        z: sz,
        phase: Math.random() * Math.PI * 2,
        speed: 3.8 + Math.random() * 2.2,
      });
      _splashDummy.position.set(sx, 0.03, sz);
      _splashDummy.scale.setScalar(1.0);
      _splashDummy.updateMatrix();
      this.splashInstanced.setMatrixAt(i, _splashDummy.matrix);
    }
    this.splashInstanced.instanceMatrix.needsUpdate = true;
    this.rainGroup.add(this.splashInstanced);

    this.rainGroup.visible = false;
    this.group.add(this.rainGroup);
  }

  public getRainDropsForSoftwareRenderer(): RainDropState[] {
    return this.currentWeather === 'hujan' ? this.rainDrops : [];
  }

  public applyTimeOfDay(timeOfDay: TimeOfDayId, weather: WeatherTypeId = this.currentWeather) {
    this.currentWeather = weather;
    paintSkyDomeGradient(this.skyCanvas, timeOfDay, weather);
    this.skyTex.needsUpdate = true;

    // 1. Position Sun based on time of day
    if (timeOfDay === 'pagi_upacara') {
      this.sunGroup.position.set(32, 33, -94);
      this.sunCoreMat.color.set('#FFFBEB');
      this.sunGlowSprite.material.color.set('#FEF08A');
      this.sunRaysSprite.material.color.set('#FDE047');
    } else if (timeOfDay === 'siang_istirahat') {
      this.sunGroup.position.set(10, 43, -98);
      this.sunCoreMat.color.set('#FFFFFF');
      this.sunGlowSprite.material.color.set('#FEF9C3');
      this.sunRaysSprite.material.color.set('#FEF08A');
    } else {
      this.sunGroup.position.set(-38, 22, -88);
      this.sunCoreMat.color.set('#FDE047');
      this.sunGlowSprite.material.color.set('#FB923C');
      this.sunRaysSprite.material.color.set('#F97316');
    }

    // 2. Adjust Sun, Clouds, Birds & Outdoor Rain Particles by Weather
    if (weather === 'hujan') {
      this.sunGroup.visible = false;
      this.rainGroup.visible = true;

      this.cloudTopMat.color.set('#64748B');
      this.cloudTopMat.emissive.set('#334155');
      this.cloudBaseMat.color.set('#334155');
      this.cloudBaseMat.emissive.set('#1E293B');

      for (const c of this.clouds) {
        c.group.scale.setScalar(c.baseScale * 1.42);
      }
      for (const b of this.birds) {
        b.group.visible = false; // Birds shelter during rain
      }
    } else if (weather === 'berawan') {
      this.sunGroup.visible = true;
      this.sunRaysSprite.visible = false;
      this.sunGlowSprite.material.opacity = 0.38;
      this.rainGroup.visible = false;

      this.cloudTopMat.color.set('#CBD5E1');
      this.cloudTopMat.emissive.set('#94A3B8');
      this.cloudBaseMat.color.set('#64748B');
      this.cloudBaseMat.emissive.set('#475569');

      for (const c of this.clouds) {
        c.group.scale.setScalar(c.baseScale * 1.26);
      }
      for (const b of this.birds) {
        b.group.visible = true;
      }
    } else {
      // Cerah (Sunny / Clear)
      this.sunGroup.visible = true;
      this.sunRaysSprite.visible = true;
      this.sunGlowSprite.material.opacity = 1.0;
      this.rainGroup.visible = false;

      if (timeOfDay === 'sore_pulang') {
        this.cloudTopMat.color.set('#FED7AA');
        this.cloudTopMat.emissive.set('#FB923C');
        this.cloudBaseMat.color.set('#FDBA74');
        this.cloudBaseMat.emissive.set('#EA580C');
      } else {
        this.cloudTopMat.color.set('#FFFFFF');
        this.cloudTopMat.emissive.set('#E2E8F0');
        this.cloudBaseMat.color.set('#E2E8F0');
        this.cloudBaseMat.emissive.set('#CBD5E1');
      }

      for (const c of this.clouds) {
        c.group.scale.setScalar(c.baseScale);
      }
      for (const b of this.birds) {
        b.group.visible = true;
      }
    }
  }

  public update(elapsed: number, delta: number) {
    if (this.sunGroup.visible) {
      this.sunRaysSprite.material.rotation = elapsed * 0.14;
      const pulse = 1.0 + Math.sin(elapsed * 1.8) * 0.05;
      this.sunGlowSprite.scale.set(22 * pulse, 22 * pulse, 1);
      this.sunRaysSprite.scale.set(34 * pulse, 34 * pulse, 1);
    }

    const cloudSpeedMult =
      this.currentWeather === 'hujan'
        ? 1.85
        : this.currentWeather === 'berawan'
        ? 1.35
        : 1.0;

    for (const cloud of this.clouds) {
      cloud.group.position.x += cloud.speed * cloudSpeedMult * delta;
      if (cloud.group.position.x > 135) {
        cloud.group.position.x = -135;
      }
      cloud.group.position.y =
        cloud.baseY + Math.sin(elapsed * 0.55 + cloud.phase) * 0.35;
    }

    // Update Outdoor Raindrop Particles & Courtyard Splash Ripples when raining
    if (this.currentWeather === 'hujan') {
      const windX = -3.2;
      const windZ = -1.1;

      for (let i = 0; i < this.rainDrops.length; i++) {
        const drop = this.rainDrops[i];
        drop.y -= drop.speed * delta;
        drop.x += windX * delta;
        drop.z += windZ * delta;

        if (drop.y <= 0.05 || !isOutdoorRainCoord(drop.x, drop.z)) {
          const [nx, nz] = sampleOutdoorRainXZ();
          drop.x = nx;
          drop.z = nz;
          drop.y = 23.0 + Math.random() * 5.0;
        }

        const baseIdx = i * 6;
        this.rainLinePositions[baseIdx] = drop.x + 0.16;
        this.rainLinePositions[baseIdx + 1] = drop.y + drop.length;
        this.rainLinePositions[baseIdx + 2] = drop.z + 0.06;
        this.rainLinePositions[baseIdx + 3] = drop.x;
        this.rainLinePositions[baseIdx + 4] = drop.y;
        this.rainLinePositions[baseIdx + 5] = drop.z;
      }
      this.rainLineGeo.attributes.position.needsUpdate = true;

      for (let i = 0; i < this.splashRipples.length; i++) {
        const sp = this.splashRipples[i];
        const cycle = (elapsed * sp.speed + sp.phase) % 1.0;
        const scale = 0.35 + cycle * 1.65;
        _splashDummy.position.set(sp.x, 0.03, sp.z);
        _splashDummy.scale.set(scale, 1, scale);
        _splashDummy.updateMatrix();
        this.splashInstanced.setMatrixAt(i, _splashDummy.matrix);
      }
      this.splashInstanced.instanceMatrix.needsUpdate = true;
    }

    // Update Flying Birds (when visible)
    if (this.currentWeather !== 'hujan') {
      for (const bird of this.birds) {
        if (bird.mode === 'circle') {
          bird.angle += bird.angularSpeed * delta;
          const nx = bird.centerX + Math.cos(bird.angle) * bird.radius;
          const nz = bird.centerZ + Math.sin(bird.angle) * bird.radius;
          const dx = -Math.sin(bird.angle) * bird.angularSpeed;
          const dz = Math.cos(bird.angle) * bird.angularSpeed;

          bird.group.position.x = nx;
          bird.group.position.z = nz;
          bird.group.position.y =
            bird.baseY + Math.sin(elapsed * 1.4 + bird.phase) * 0.65;

          bird.group.rotation.y = Math.atan2(dx, dz);
          bird.group.rotation.z = bird.angularSpeed > 0 ? -0.26 : 0.26;
        } else {
          bird.group.position.x += bird.velocityX * delta;
          bird.group.position.z += bird.velocityZ * delta;
          bird.group.position.y =
            bird.baseY + Math.sin(elapsed * 1.6 + bird.phase) * 0.45;

          if (bird.group.position.x > 125) bird.group.position.x = -125;
          if (bird.group.position.x < -125) bird.group.position.x = 125;
          if (bird.group.position.z > 105) bird.group.position.z = -95;
          if (bird.group.position.z < -95) bird.group.position.z = 105;
        }

        const cycle = Math.sin(elapsed * 0.75 + bird.phase);
        let flapAngle: number;
        if (cycle > 0.45) {
          flapAngle = 0.2 + Math.sin(elapsed * 2.5 + bird.phase) * 0.05;
        } else {
          flapAngle = Math.sin(elapsed * bird.flapSpeed + bird.phase) * 0.68;
        }
        bird.leftWingPivot.rotation.z = flapAngle;
        bird.rightWingPivot.rotation.z = -flapAngle;
      }
    }
  }
}
