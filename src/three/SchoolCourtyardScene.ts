import * as THREE from 'three';
import { TimeOfDayId, WeatherTypeId } from '../types/character';
import {
  createContactShadowTexture,
  createCourtyardPavingTexture,
  createRoadAsphaltTexture,
  createSignboardTexture,
  createSportsCourtTexture,
} from '../utils/proceduralTextures';
import {
  buildEnterableSchoolBuilding,
  EnterableSchoolBuildingHandle,
  WallColliderBox,
} from './SchoolRoomInteriors';
import { isOutdoorRainCoord, SchoolSkySystem } from './SchoolSkySystem';
import { soundFX } from '../utils/soundFX';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Anthropomorphic Scale Standard:
 * - Anak SD Character Height = 3.35 units (~1.34 m real world)
 * - 1.0 meter real world = 2.50 Three.js units
 * - Classroom Door = 5.2 units tall x 2.6 units wide (~2.08 m x 1.04 m)
 * - Building Wall Height = 7.8 units (~3.12 m), Roof Ridge = 12.8 units (~5.12 m)
 * - Adult NPC Height = 4.25 units (~1.70 m)
 * - Car (MPV/Hatchback) = 10.2 units long x 4.4 units wide x 3.9 units tall
 * - Motorcycle = 4.5 units long x 1.95 units seat height x 2.75 units handlebar height
 * - Futsal Goal = 7.4 units wide x 4.8 units tall (~2.96 m x 1.92 m)
 * - Basketball Rim = 7.5 units high (~3.0 m)
 */
export interface EcobrickLetterPiece {
  index: number;
  char: string;
  group: THREE.Group;
  slotFrame: THREE.Mesh;
  homePos: THREE.Vector3;
  scatteredPos: THREE.Vector3;
  scatteredRot: THREE.Euler;
  isAssembled: boolean;
  scatterProgress: number;
  snapFlyTimer: number;
}

export class SchoolCourtyardEnvironment {
  public readonly group = new THREE.Group();
  public readonly contactShadowMesh: THREE.Mesh;
  public readonly keyLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  public readonly rimLight: THREE.DirectionalLight;
  public readonly skySystem: SchoolSkySystem;

  private buildingHandle!: EnterableSchoolBuildingHandle;
  private flagGeo: THREE.PlaneGeometry;
  private flagBasePositions: Float32Array;
  private flagMesh!: THREE.Mesh;
  private ceremonyClassSignsGroup!: THREE.Group;
  private maxAnisotropy: number;
  private currentWeather: WeatherTypeId = 'cerah';
  private courtyardMat!: THREE.MeshStandardMaterial;
  private roadMat!: THREE.MeshStandardMaterial;
  private contactShadowMat!: THREE.MeshBasicMaterial;

  // Interactive 3D Ecobrick "I LOVE SUGA" Wind Scatter & Puzzle State
  public ecobrickPieces: EcobrickLetterPiece[] = [];
  private ecobrickWindGroup: THREE.Group | null = null;
  private ecobrickWindStreaks: THREE.Mesh[] = [];
  private ecobrickWindTimer = 0;
  private ecobrickIsScattered = false;
  private hasCompletedEcobrickOnce = false;
  private hasAutoTriggeredWindNearEcobrick = false;

  // Shared architectural materials
  private wallMat = new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.86 });
  private wallWhiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.82 });
  private roofMat = new THREE.MeshStandardMaterial({ color: '#9A3412', roughness: 0.76 });
  private tealTrimMat = new THREE.MeshStandardMaterial({ color: '#0F766E', roughness: 0.55 });
  private maroonTrimMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.65 });
  private woodMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.78 });
  private glassMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    roughness: 0.16,
    metalness: 0.35,
  });
  private darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1E293B',
    roughness: 0.38,
    metalness: 0.72,
  });
  private chromeMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    roughness: 0.22,
    metalness: 0.88,
  });
  private brassMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    roughness: 0.22,
    metalness: 0.88,
  });

  constructor(scene: THREE.Scene, maxAnisotropy = 4) {
    this.maxAnisotropy = maxAnisotropy;

    // 1. Studio + Outdoor 3-Point Lighting Rig scaled for full school campus
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x94a3b8, 0.85);
    this.hemiLight.position.set(0, 50, 0);
    scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff7ed, 1.95);
    this.keyLight.position.set(28, 45, 32);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 160;
    const d = 68;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.015;
    scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    this.rimLight.position.set(-24, 24, -30);
    scene.add(this.rimLight);

    // 2. Expansive Grass Terrain + School Courtyard Paving Block + Front Street
    const terrainGeo = new THREE.CircleGeometry(240, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: '#3F6212',
      roughness: 0.92,
      metalness: 0.0,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.y = -0.05;
    terrainMesh.receiveShadow = true;
    this.group.add(terrainMesh);

    const pavingTex = createCourtyardPavingTexture(maxAnisotropy);
    pavingTex.repeat.set(42, 46);
    const courtyardGeo = new THREE.PlaneGeometry(116, 118);
    courtyardGeo.rotateX(-Math.PI / 2);
    this.courtyardMat = new THREE.MeshStandardMaterial({
      map: pavingTex,
      roughness: 0.84,
      metalness: 0.04,
    });
    const courtyardMesh = new THREE.Mesh(courtyardGeo, this.courtyardMat);
    courtyardMesh.position.set(0, 0.0, 6);
    courtyardMesh.receiveShadow = true;
    this.group.add(courtyardMesh);

    // Asphalt Road outside the school gate (z = 77.0, width = 24.0 units = 9.6m realistic two-lane main road)
    const roadTex = createRoadAsphaltTexture(maxAnisotropy);
    roadTex.repeat.set(16, 1);
    const roadGeo = new THREE.PlaneGeometry(270, 24.0);
    roadGeo.rotateX(-Math.PI / 2);
    this.roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);
    roadMesh.position.set(0, 0.015, 77.0);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    // North & South Concrete Sidewalks (Trotoar Jalan Raya) flanking the 24-unit road
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.85,
      metalness: 0.04,
    });
    const northSidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(270, 0.16, 6.4),
      sidewalkMat
    );
    northSidewalk.position.set(0, 0.04, 61.8);
    northSidewalk.receiveShadow = true;

    const southSidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(270, 0.16, 5.2),
      sidewalkMat
    );
    southSidewalk.position.set(0, 0.04, 91.6);
    southSidewalk.receiveShadow = true;
    this.group.add(northSidewalk, southSidewalk);

    // 3. Soft Radial Contact Shadow directly beneath character
    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.4, 2.4);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    this.contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    this.contactShadowMesh = new THREE.Mesh(shadowPlaneGeo, this.contactShadowMat);
    this.contactShadowMesh.position.set(0, 0.02, 0);
    this.group.add(this.contactShadowMesh);

    // 4. Lapangan Upacara (Tiang Bendera Merah Putih Proporsional)
    this.flagGeo = new THREE.PlaneGeometry(4.0, 2.6, 16, 8);
    this.flagBasePositions = new Float32Array(this.flagGeo.attributes.position.array);
    this.buildFlagpole();

    // 5. Lapangan Olahraga Serbaguna SD (Futsal & Basket Proporsional)
    this.buildSportsField();

    // 6. Satu Bangunan Sekolah Terpadu Berbentuk U (Skala Arsitektur Realistis)
    this.buildUnifiedSchoolBuilding();

    // 7. Area Depan Sekolah: Parkiran Motor & Mobil, Gerbang & Pos Satpam, Tukang Jajanan SD
    this.buildParkingArea();
    this.buildSchoolGateAndFence();
    this.buildStreetVendors();

    // 8. Instanced Perimeter Trees (Tinggi Pohon ~12.5 unit = ~5 meter)
    this.buildInstancedFoliage();

    // 9. Sky Dome, Radiant Sun, Drifting 3D Clouds & Flying Bird Flocks
    this.skySystem = new SchoolSkySystem(this.group);

    scene.add(this.group);
  }

  private createSignMesh(
    title: string,
    subtitle = '',
    bgColor = '#0F766E',
    width = 6.2,
    height = 1.55
  ): THREE.Mesh {
    const tex = createSignboardTexture(
      title,
      subtitle,
      bgColor,
      '#FFFFFF',
      '#FACC15',
      this.maxAnisotropy
    );
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.45,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.18), mat);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Builds ONE Continuous U-Shaped School Building with hollow enterable rooms,
   * swung-open doorways, transparent windows, partition walls, and detailed interior furniture.
   */
  private buildUnifiedSchoolBuilding() {
    this.buildingHandle = buildEnterableSchoolBuilding(this.maxAnisotropy);
    this.group.add(this.buildingHandle.group);
  }

  /**
   * Builds the Central Multipurpose School Sports Field (Lapangan Olahraga Futsal & Basket SD)
   * at true scale relative to the 3.35-unit student:
   * - Court: 50 units wide x 31 units deep
   * - Futsal Goal: 7.4 units wide x 4.8 units tall (~2.96m x 1.92m — taller than the student!)
   * - Basketball Hoop Rim: 7.5 units high (~3.0m)
   */
  private buildSportsField() {
    const fieldGroup = new THREE.Group();
    fieldGroup.position.set(0, 0, 10.0);

    // 1. Painted Court Surface (50 units wide x 31 units deep)
    const courtTex = createSportsCourtTexture(this.maxAnisotropy);
    const courtGeo = new THREE.PlaneGeometry(50.0, 31.0);
    courtGeo.rotateX(-Math.PI / 2);
    const courtMat = new THREE.MeshStandardMaterial({
      map: courtTex,
      roughness: 0.72,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const courtMesh = new THREE.Mesh(courtGeo, courtMat);
    courtMesh.position.y = 0.015;
    courtMesh.receiveShadow = true;
    fieldGroup.add(courtMesh);

    // 2. Left & Right Futsal Goals + Basketball Hoops at x = -21.8 and x = +21.8
    [-1, 1].forEach((dir) => {
      const goalX = dir * 21.8;

      // Futsal Goal Frame (4.8 units tall x 7.4 units wide x 2.4 units deep)
      const goalGroup = new THREE.Group();
      goalGroup.position.set(goalX, 0, 0);
      goalGroup.rotation.y = dir === -1 ? Math.PI / 2 : -Math.PI / 2;

      const postMat = new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
        roughness: 0.35,
        metalness: 0.5,
      });
      const netMat = new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        roughness: 0.9,
        wireframe: true,
      });

      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.8, 14), postMat);
      leftPost.position.set(-3.7, 2.4, 0);
      leftPost.castShadow = true;

      const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.8, 14), postMat);
      rightPost.position.set(3.7, 2.4, 0);
      rightPost.castShadow = true;

      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.68, 14), postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, 4.8, 0);
      crossbar.castShadow = true;

      const netCage = new THREE.Mesh(new THREE.BoxGeometry(7.3, 4.7, 2.2), netMat);
      netCage.position.set(0, 2.35, -1.1);

      goalGroup.add(leftPost, rightPost, crossbar, netCage);
      fieldGroup.add(goalGroup);

      // Basketball Pole, Backboard & Orange Rim behind the goal (x = ±24.2, rim at y = 7.5)
      const hoopGroup = new THREE.Group();
      hoopGroup.position.set(dir * 24.2, 0, 0);
      hoopGroup.rotation.y = dir === -1 ? Math.PI / 2 : -Math.PI / 2;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.26, 8.6, 16),
        this.darkMetalMat
      );
      pole.position.set(0, 4.3, -0.8);
      pole.castShadow = true;

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 1.6), this.darkMetalMat);
      arm.position.set(0, 8.1, 0.0);

      const backboard = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 2.6, 0.16),
        this.wallWhiteMat
      );
      backboard.position.set(0, 8.2, 0.82);
      backboard.castShadow = true;

      const targetSquare = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.05, 0.18),
        this.maroonTrimMat
      );
      targetSquare.position.set(0, 7.9, 0.83);

      const rimMat = new THREE.MeshStandardMaterial({
        color: '#EA580C',
        roughness: 0.3,
        metalness: 0.7,
      });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 12, 24), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 7.5, 1.45);

      const hoopNet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.54, 0.34, 0.85, 12, 3, true),
        netMat
      );
      hoopNet.position.set(0, 7.05, 1.45);

      hoopGroup.add(pole, arm, backboard, targetSquare, rim, hoopNet);
      fieldGroup.add(hoopGroup);
    });

    // 3. Proportional 3D Soccer / Futsal Ball (diameter 0.68 units) & Training Cones
    const ballMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.4,
      metalness: 0.1,
    });
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), ballMat);
    ball.position.set(2.2, 0.34, 1.2);
    ball.castShadow = true;
    fieldGroup.add(ball);

    const coneMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.5 });
    [
      [-6.5, -9.5],
      [-3.5, -9.5],
      [-0.5, -9.5],
    ].forEach(([cx, cz]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 16), coneMat);
      cone.position.set(cx, 0.425, cz);
      cone.castShadow = true;
      fieldGroup.add(cone);
    });

    this.group.add(fieldGroup);
  }

  /**
   * Builds the Teacher & Guest Parking Area at realistic scale relative to the 3.35-unit student:
   * - Cars: 10.2 units long x 4.4 units wide x 3.9 units tall
   * - Motorcycles: 4.5 units long x 1.95 units seat height x 2.75 units handlebar height
   */
  private buildParkingArea() {
    const parkGroup = new THREE.Group();
    parkGroup.position.set(-25.8, 0, 45.0);

    // Asphalt parking pad (19.6 units wide x 12.0 units deep)
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(19.6, 0.12, 12.0),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.88 })
    );
    pad.position.y = 0.06;
    pad.receiveShadow = true;
    parkGroup.add(pad);

    // Parking Canopy Roof (height = 7.2 units so cars & adults fit comfortably underneath)
    const canopyRoof = new THREE.Mesh(
      new THREE.BoxGeometry(19.0, 0.3, 11.2),
      new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.45, metalness: 0.35 })
    );
    canopyRoof.position.set(0, 7.2, -0.3);
    canopyRoof.rotation.x = 0.07;
    canopyRoof.castShadow = true;
    parkGroup.add(canopyRoof);

    // Steel Canopy Pillars
    [-8.5, 0, 8.5].forEach((px) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 7.2, 14),
        this.darkMetalMat
      );
      post.position.set(px, 3.6, -4.8);
      post.castShadow = true;
      parkGroup.add(post);
    });

    // Signboard PARKIRAN MOTOR & MOBIL
    const sign = this.createSignMesh(
      'PARKIRAN SEKOLAH',
      'AREA MOBIL & MOTOR GURU',
      '#1E3A8A',
      8.2,
      1.65
    );
    sign.position.set(0, 8.1, 4.9);
    parkGroup.add(sign);

    // Build Realistically Scaled 3D Car (Silver MPV) + 4 Motorcycles (Motor Matic Guru)
    const car1 = this.createCarModel('#E2E8F0');
    car1.position.set(-5.6, 0.12, -0.2);
    parkGroup.add(car1);

    const motoColors = ['#2563EB', '#16A34A', '#FACC15', '#DC2626'];
    motoColors.forEach((mHex, idx) => {
      const moto = this.createMotorcycleModel(mHex);
      moto.position.set(0.2 + idx * 2.3, 0.12, -0.2);
      parkGroup.add(moto);
    });

    this.group.add(parkGroup);
  }

  private createCarModel(bodyHex: string): THREE.Group {
    // Realistic Car dimensions: 4.5 units wide, 3.9 units tall, 10.2 units long
    const car = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyHex,
      roughness: 0.25,
      metalness: 0.65,
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.85 });
    const lightMat = new THREE.MeshStandardMaterial({
      color: '#FEF08A',
      emissive: '#FEF08A',
      emissiveIntensity: 0.4,
    });

    // Lower body chassis (height 1.55, centered at y = 1.45)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.55, 10.2), paintMat);
    chassis.position.y = 1.45;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Upper cabin greenhouse (top at y = 3.85 — slightly taller than the 3.35-unit child)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.5, 5.8), paintMat);
    cabin.position.set(0, 2.95, -0.5);
    cabin.castShadow = true;
    car.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(3.75, 1.2, 5.95), this.glassMat);
    windshield.position.set(0, 2.95, -0.5);
    car.add(windshield);

    // 4 Wheels (radius 0.82 -> diameter 1.64 units = ~65cm)
    const wheelGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.55, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    [
      [-2.2, 0.82, 3.1],
      [2.2, 0.82, 3.1],
      [-2.2, 0.82, -3.1],
      [2.2, 0.82, -3.1],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      car.add(wheel);
    });

    // Headlights
    [-1.5, 1.5].forEach((hx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 0.15), lightMat);
      hl.position.set(hx, 1.55, 5.12);
      car.add(hl);
    });

    return car;
  }

  private createMotorcycleModel(bodyHex: string): THREE.Group {
    // Realistic Scooter dimensions: length 4.4 units, seat at y = 1.95 (hip height of student),
    // handlebars at y = 2.75 (chest/shoulder height of student)
    const moto = new THREE.Group();
    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyHex,
      roughness: 0.3,
      metalness: 0.5,
    });
    const seatMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 3.6), paintMat);
    body.position.set(0, 1.18, 0);
    body.castShadow = true;
    moto.add(body);

    const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.85, 0.72), paintMat);
    frontShield.position.set(0, 1.82, 1.25);
    frontShield.rotation.x = -0.2;
    frontShield.castShadow = true;
    moto.add(frontShield);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 1.95), seatMat);
    seat.position.set(0, 1.92, -0.55);
    moto.add(seat);

    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.75, 12),
      this.chromeMat
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 2.75, 1.12);
    moto.add(bar);

    const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.32, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const fWheel = new THREE.Mesh(wheelGeo, seatMat);
    fWheel.position.set(0, 0.62, 1.48);
    const rWheel = new THREE.Mesh(wheelGeo, seatMat);
    rWheel.position.set(0, 0.62, -1.35);
    moto.add(fWheel, rWheel);

    return moto;
  }

  private buildSchoolGateAndFence() {
    // Southern Perimeter Wall & Grand Archway Gate at z = 58.0
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 58.0);

    // Left & Right Main Gate Pillars (widened to px = ±10.2 so signboard is 100% unobstructed)
    [-10.2, 10.2].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 10.2, 2.2),
        this.maroonTrimMat
      );
      pillar.position.set(px, 5.1, 0);
      pillar.castShadow = true;
      gateGroup.add(pillar);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.55, 2.6),
        this.wallWhiteMat
      );
      cap.position.set(px, 10.4, 0);
      gateGroup.add(cap);
    });

    // Overhead Arch Beam spanning cleanly across both pillars (y = 10.2, depth = 2.4)
    const archBeam = new THREE.Mesh(
      new THREE.BoxGeometry(23.0, 2.8, 2.4),
      this.wallWhiteMat
    );
    archBeam.position.set(0, 10.2, 0);
    archBeam.castShadow = true;
    gateGroup.add(archBeam);

    // Front & Back Gate Signboards mounted proud at z = ±1.36 so pillars never clip any letters
    const frontSign = this.createSignMesh(
      'SDN SUSUKAN 03',
      'CERDAS · BERKARAKTER · BERPRESTASI',
      '#991B1B',
      16.5,
      2.4
    );
    frontSign.position.set(0, 10.2, 1.36);
    gateGroup.add(frontSign);

    const backSign = this.createSignMesh(
      'SDN SUSUKAN 03',
      'GERBANG UTAMA SEKOLAH',
      '#0F766E',
      16.5,
      2.4
    );
    backSign.rotation.y = Math.PI;
    backSign.position.set(0, 10.2, -1.36);
    gateGroup.add(backSign);

    // Pos Satpam beside the gate (set back at z = -3.4 so its doorway & sign are completely clear)
    const posSatpam = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 6.2, 5.6),
      this.wallWhiteMat
    );
    posSatpam.position.set(-15.2, 3.1, -3.4);
    posSatpam.castShadow = true;

    const posDoor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.8, 0.2), this.woodMat);
    posDoor.position.set(-13.8, 2.4, -0.55);

    const posWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.2), this.glassMat);
    posWin.position.set(-16.5, 3.6, -0.55);

    const posRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.4, 4), this.roofMat);
    posRoof.position.set(-15.2, 7.4, -3.4);
    posRoof.rotation.y = Math.PI / 4;

    const posSign = this.createSignMesh('POS SATPAM', 'KEAMANAN SDN SUSUKAN 03', '#1E3A8A', 5.0, 1.2);
    posSign.position.set(-15.2, 5.5, -0.48);
    gateGroup.add(posSatpam, posDoor, posWin, posRoof, posSign);

    // Perimeter Fence Segments connecting cleanly outside the ±10.2 gate pillars
    [-33.0, 33.0].forEach((fx) => {
      const lowWall = new THREE.Mesh(
        new THREE.BoxGeometry(43.5, 2.1, 0.85),
        this.wallMat
      );
      lowWall.position.set(fx, 1.05, 0);
      lowWall.castShadow = true;
      lowWall.receiveShadow = true;

      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(43.5, 0.25, 0.4),
        this.darkMetalMat
      );
      topRail.position.set(fx, 3.85, 0);
      gateGroup.add(lowWall, topRail);
    });

    // Taman Instalasi Ecobrick "I LOVE SUGA" di dekat Gerbang Sekolah (sisi timur gerbang)
    const ecobrickGroup = this.buildEcobrickILoveSuga();
    ecobrickGroup.position.set(16.2, 0, -3.8);
    ecobrickGroup.rotation.y = -0.22;
    gateGroup.add(ecobrickGroup);

    // Register Southern Perimeter Fence, Gate Pillars, Pos Satpam & Ecobrick Colliders
    if (this.buildingHandle) {
      this.buildingHandle.wallColliders.push(
        // Left & Right Perimeter Fence Walls at z = 58.0
        { minX: -56.0, maxX: -11.0, minZ: 57.45, maxZ: 58.55 },
        { minX: 11.0, maxX: 56.0, minZ: 57.45, maxZ: 58.55 },
        // Left & Right Main Gate Pillars at x = ±10.2, z = 58.0
        { minX: -11.4, maxX: -9.0, minZ: 56.8, maxZ: 59.2 },
        { minX: 9.0, maxX: 11.4, minZ: 56.8, maxZ: 59.2 },
        // Pos Satpam Building at x = -15.2, z = 54.6
        { minX: -18.1, maxX: -12.3, minZ: 51.7, maxZ: 57.5 },
        // Ecobrick "I LOVE SUGA" Planter Base at x = 16.2, z = 54.2
        { minX: 9.0, maxX: 23.4, minZ: 52.8, maxZ: 55.6 }
      );
    }

    this.group.add(gateGroup);
  }

  /**
   * Builds an Indonesian SD Adiwiyata Ecobrick Garden & 3D Recycled Bottle Sculpture
   * in a patriotic Merah Putih (Red & White) theme spelling out "I LOVE SUGA" near the school gate.
   */
  private buildEcobrickILoveSuga(): THREE.Group {
    const eco = new THREE.Group();

    const redBrightMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.32 });
    const redMaroonMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.38 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.28 });
    const greenMat = new THREE.MeshStandardMaterial({ color: '#16A34A', roughness: 0.75 });
    const soilMat = new THREE.MeshStandardMaterial({ color: '#451A03', roughness: 0.92 });

    // 1. Two-Tier Merah Putih Ecobrick Planter Base (Bottom White, Top Red)
    const baseWhiteBottom = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.58, 2.5), whiteMat);
    baseWhiteBottom.position.set(0, 0.29, 0);
    baseWhiteBottom.castShadow = true;
    baseWhiteBottom.receiveShadow = true;
    eco.add(baseWhiteBottom);

    const baseRedTop = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.58, 2.52), redBrightMat);
    baseRedTop.position.set(0, 0.87, 0);
    baseRedTop.castShadow = true;
    baseRedTop.receiveShadow = true;
    eco.add(baseRedTop);

    const soilBed = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.25, 2.0), soilMat);
    soilBed.position.set(0, 1.2, 0);
    eco.add(soilBed);

    const grassStrip = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.22, 1.8), greenMat);
    grassStrip.position.set(0, 1.35, 0);
    eco.add(grassStrip);

    // Alternating Merah-Putih Ecobrick Bottle Ends along the front & back of the planter bed
    for (let i = -12; i <= 12; i++) {
      const isEven = Math.abs(i) % 2 === 0;
      const topBottleMat = isEven ? whiteMat : redMaroonMat;
      const botBottleMat = isEven ? redBrightMat : whiteMat;

      const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 2.62), topBottleMat);
      capTop.position.set(i * 0.54, 0.86, 0);
      const capBot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 2.62), botBottleMat);
      capBot.position.set(i * 0.54, 0.32, 0);
      eco.add(capTop, capBot);
    }

    // 2. Front & Back Merah-Putih Signboard Plaque mounted proud at z = ±1.48 so bottle caps never clip it
    const frontPlaque = this.createSignMesh(
      'ECOBRICK: I LOVE SUGA',
      'KARYA DAUR ULANG SDN SUSUKAN 03',
      '#991B1B',
      9.2,
      1.12
    );
    frontPlaque.position.set(0, 0.62, -1.48);
    frontPlaque.rotation.y = Math.PI;
    eco.add(frontPlaque);

    const backPlaque = this.createSignMesh(
      'ECOBRICK: I LOVE SUGA',
      'TAMAN ADIWIYATA SDN SUSUKAN 03',
      '#991B1B',
      9.2,
      1.12
    );
    backPlaque.position.set(0, 0.62, 1.48);
    eco.add(backPlaque);

    // 3. 3D Blocky Ecobrick Letter Sculpture spelling "I LOVE SUGA" in Merah Putih Flag Gradient
    const letterDefs: {
      char: string;
      rows: string[];
    }[] = [
      {
        char: 'I',
        rows: ['111', '010', '010', '010', '111'],
      },
      {
        char: ' ',
        rows: ['0', '0', '0', '0', '0'],
      },
      {
        char: 'L',
        rows: ['100', '100', '100', '100', '111'],
      },
      {
        char: 'O',
        rows: ['111', '101', '101', '101', '111'],
      },
      {
        char: 'V',
        rows: ['101', '101', '101', '111', '010'],
      },
      {
        char: 'E',
        rows: ['111', '100', '111', '100', '111'],
      },
      {
        char: ' ',
        rows: ['0', '0', '0', '0', '0'],
      },
      {
        char: 'S',
        rows: ['111', '100', '111', '001', '111'],
      },
      {
        char: 'U',
        rows: ['101', '101', '101', '101', '111'],
      },
      {
        char: 'G',
        rows: ['1111', '1000', '1011', '1001', '1111'],
      },
      {
        char: 'A',
        rows: ['111', '101', '111', '101', '101'],
      },
    ];

    const voxelW = 0.28;
    const voxelH = 0.42;
    const voxelD = 0.52;
    const letterGap = 0.22;

    let totalW = 0;
    for (const def of letterDefs) {
      totalW += def.rows[0].length * voxelW + letterGap;
    }
    totalW -= letterGap;

    let cursorX = totalW * 0.5;
    const baseY = 1.46;

    // Pre-computed wind-blown scattered positions & tilted angles in front of the planter bed (z = -2.2 .. -4.4)
    const scatteredPresets: { pos: [number, number, number]; rot: [number, number, number] }[] = [
      { pos: [5.4, 0.48, -2.5], rot: [1.35, 0.45, -0.82] },
      { pos: [3.7, 0.52, -3.6], rot: [-1.28, -0.62, 1.15] },
      { pos: [2.1, 1.58, -0.58], rot: [1.12, 0.85, 0.65] },
      { pos: [0.6, 0.48, -2.9], rot: [-1.42, 0.35, -1.25] },
      { pos: [-0.9, 0.5, -4.1], rot: [1.32, -0.95, 0.78] },
      { pos: [-2.3, 1.58, -0.62], rot: [-1.18, 0.52, -0.92] },
      { pos: [-3.5, 0.48, -2.6], rot: [1.45, -0.42, 1.35] },
      { pos: [-4.8, 0.52, -3.7], rot: [-1.34, 0.78, -0.68] },
      { pos: [-6.1, 0.48, -2.4], rot: [1.26, -0.55, 1.08] },
    ];

    const slotGhostMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });

    this.ecobrickPieces = [];
    let pieceIdx = 0;

    for (const def of letterDefs) {
      const cols = def.rows[0].length;
      if (def.char === ' ') {
        cursorX -= cols * voxelW + letterGap;
        continue;
      }

      const letterWidth = cols * voxelW;
      const letterHeight = 5 * voxelH;
      const letterCenterX = cursorX - letterWidth * 0.5;
      const letterCenterY = baseY + letterHeight * 0.5;

      const letterGroup = new THREE.Group();
      letterGroup.position.set(letterCenterX, letterCenterY, 0);

      for (let r = 0; r < 5; r++) {
        const rowStr = def.rows[r];
        // Top 3 rows in Merah (#DC2626), bottom 2 rows in Putih (#F8FAFC)
        const rowMat = r <= 2 ? redBrightMat : whiteMat;
        let c = 0;
        while (c < cols) {
          if (rowStr[c] === '1') {
            let run = 1;
            while (c + run < cols && rowStr[c + run] === '1') {
              run++;
            }
            const segW = run * voxelW;
            const centerX = cursorX - (c + run * 0.5) * voxelW - letterCenterX;
            const centerY = baseY + (4 - r + 0.5) * voxelH - letterCenterY;

            const block = new THREE.Mesh(
              new THREE.BoxGeometry(segW, voxelH * 0.94, voxelD),
              rowMat
            );
            block.position.set(centerX, centerY, 0);
            block.castShadow = true;
            letterGroup.add(block);

            c += run;
          } else {
            c++;
          }
        }
      }

      // Subtle wireframe ghost slot on the planter bed visible when the letter is blown away
      const slotFrame = new THREE.Mesh(
        new THREE.BoxGeometry(letterWidth * 0.95, letterHeight * 0.95, voxelD * 0.85),
        slotGhostMat
      );
      slotFrame.position.set(letterCenterX, letterCenterY, 0);
      slotFrame.visible = false;
      eco.add(slotFrame);
      eco.add(letterGroup);

      const preset = scatteredPresets[pieceIdx % scatteredPresets.length];
      this.ecobrickPieces.push({
        index: pieceIdx,
        char: def.char,
        group: letterGroup,
        slotFrame,
        homePos: new THREE.Vector3(letterCenterX, letterCenterY, 0),
        scatteredPos: new THREE.Vector3(...preset.pos),
        scatteredRot: new THREE.Euler(...preset.rot),
        isAssembled: true,
        scatterProgress: 0,
        snapFlyTimer: 0,
      });

      pieceIdx++;
      cursorX -= cols * voxelW + letterGap;
    }

    // 4. 3D Swirling Wind Gust Streaks & Flying Leaves Group (Visible when wind blows Ecobricks apart)
    const windGroup = new THREE.Group();
    windGroup.visible = false;
    const windStreakMat = new THREE.MeshBasicMaterial({
      color: '#E0F2FE',
      transparent: true,
      opacity: 0.78,
    });
    const leafParticleMat = new THREE.MeshBasicMaterial({
      color: '#4ADE80',
    });
    this.ecobrickWindStreaks = [];
    for (let w = 0; w < 8; w++) {
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(2.6 + (w % 3) * 0.9, 0.08, 0.08),
        w % 3 === 2 ? leafParticleMat : windStreakMat
      );
      streak.position.set((w - 3.5) * 1.8, 1.8 + (w % 4) * 0.55, -0.8 - (w % 3) * 0.85);
      windGroup.add(streak);
      this.ecobrickWindStreaks.push(streak);
    }
    eco.add(windGroup);
    this.ecobrickWindGroup = windGroup;

    return eco;
  }

  private buildStreetVendors() {
    // Lined up along the sidewalk outside the school gate (z = 62.5)
    const vendorsGroup = new THREE.Group();
    vendorsGroup.position.set(0, 0, 62.5);

    const cilokCart = this.createVendorCart({
      title: 'CILOK & BATAGOR',
      subtitle: 'BUMBU KACANG SPESIAL RP 2.000',
      cartColor: '#0284C7',
      umbrellaColor: '#DC2626',
      vendorShirtColor: '#16A34A',
      vendorHatColor: '#1E293B',
    });
    cilokCart.position.set(14.5, 0, 0);
    vendorsGroup.add(cilokCart);

    const telurCart = this.createVendorCart({
      title: 'TELUR GULUNG SD',
      subtitle: 'SOSIS · CIMOL · ES CEKEK',
      cartColor: '#EAB308',
      umbrellaColor: '#2563EB',
      vendorShirtColor: '#DC2626',
      vendorHatColor: '#FACC15',
    });
    telurCart.position.set(25.0, 0, 0);
    vendorsGroup.add(telurCart);

    const esDogerCart = this.createVendorCart({
      title: 'ES DOGER SEGAR',
      subtitle: 'ES KRIM ROTI & AGAR-AGAR',
      cartColor: '#DB2777',
      umbrellaColor: '#0D9488',
      vendorShirtColor: '#0284C7',
      vendorHatColor: '#FFFFFF',
    });
    esDogerCart.position.set(35.5, 0, 0);
    vendorsGroup.add(esDogerCart);

    this.group.add(vendorsGroup);
  }

  private createVendorCart(options: {
    title: string;
    subtitle: string;
    cartColor: string;
    umbrellaColor: string;
    vendorShirtColor: string;
    vendorHatColor: string;
  }): THREE.Group {
    // Realistic Pushcart (Gerobak) + Adult Vendor (4.25 units tall vs 3.35-unit student)
    const cart = new THREE.Group();
    const cartMat = new THREE.MeshStandardMaterial({
      color: options.cartColor,
      roughness: 0.55,
    });
    const umbrellaMat = new THREE.MeshStandardMaterial({
      color: options.umbrellaColor,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    // Cart counter body (top at y = 2.35 — chest height for the student, waist height for adult vendor)
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.75, 2.2), cartMat);
    body.position.set(0, 1.55, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    cart.add(body);

    // Glass Display Box on top of counter (top at y = 3.85)
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 1.85), this.glassMat);
    glassBox.position.set(-1.05, 3.15, 0);
    cart.add(glassBox);

    // Steaming Aluminum Dandang Pot
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.64, 1.05, 20),
      this.chromeMat
    );
    pot.position.set(1.05, 2.95, 0);
    pot.castShadow = true;
    cart.add(pot);

    // Sauce Bottles (Saos Sambal & Kecap)
    const redBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.3 })
    );
    redBottle.position.set(0.15, 2.75, 0.6);
    const darkBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: '#1E1B18', roughness: 0.3 })
    );
    darkBottle.position.set(0.5, 2.75, 0.6);
    cart.add(redBottle, darkBottle);

    // Spoked Pushcart Wheels (diameter 1.64 units)
    const wheelGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.22, 24);
    wheelGeo.rotateX(Math.PI / 2);
    [-1.45, 1.45].forEach((wx) => {
      const wheel = new THREE.Mesh(wheelGeo, this.darkMetalMat);
      wheel.position.set(wx, 0.82, 1.2);
      wheel.castShadow = true;
      cart.add(wheel);
    });

    // Large Vendor Parasol / Payung Jajanan (height 7.2 units, diameter 4.2 units)
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 5.2, 12),
      this.chromeMat
    );
    pole.position.set(0, 4.5, 0);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.35, 14), umbrellaMat);
    canopy.position.set(0, 7.15, 0);
    canopy.castShadow = true;
    cart.add(pole, canopy);

    // Front Signboard on Cart Body
    const sign = this.createSignMesh(
      options.title,
      options.subtitle,
      options.cartColor,
      4.5,
      1.35
    );
    sign.rotation.y = Math.PI;
    sign.position.set(0, 1.55, -1.14);
    cart.add(sign);

    // Adult Roblox NPC Street Vendor (Mang Jajanan — 4.25 units tall vs 3.35-unit Anak SD!)
    const npc = new THREE.Group();
    npc.position.set(0, 0, 2.1);
    npc.rotation.y = Math.PI;

    const skinMat = new THREE.MeshStandardMaterial({ color: '#D99B72', roughness: 0.45 });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: options.vendorShirtColor,
      roughness: 0.75,
    });
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8 });
    const hatMat = new THREE.MeshStandardMaterial({
      color: options.vendorHatColor,
      roughness: 0.6,
    });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.55, 0.75), pantsMat);
    legs.position.y = 0.775;
    legs.castShadow = true;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.6, 0.8), shirtMat);
    torso.position.y = 2.35;
    torso.castShadow = true;

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), skinMat);
    leftArm.position.set(-1.12, 2.35, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), skinMat);
    rightArm.position.set(1.12, 2.35, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), skinMat);
    head.position.y = 3.72;
    head.castShadow = true;

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.34, 1.28), hatMat);
    cap.position.set(0, 4.32, 0.08);

    npc.add(legs, torso, leftArm, rightArm, head, cap);
    cart.add(npc);
    return cart;
  }

  private buildFlagpole() {
    // Placed in the Lapangan Upacara zone (x = 0, z = -22.5) in front of Ruang Guru
    // Height = 19.5 units (~7.8 meters — towering realistically over the 3.35-unit student)
    const flagGroup = new THREE.Group();
    flagGroup.position.set(0, 0, -22.5);

    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      roughness: 0.85,
    });

    const step1 = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.42, 5.2), this.maroonTrimMat);
    step1.position.y = 0.21;
    step1.receiveShadow = true;
    step1.castShadow = true;

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.46, 3.4), concreteMat);
    step2.position.y = 0.65;
    step2.receiveShadow = true;
    step2.castShadow = true;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 18.5, 20), this.chromeMat);
    pole.position.y = 9.8;
    pole.castShadow = true;

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), this.brassMat);
    finial.position.y = 19.2;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 170;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(0, 0, 256, 85);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 85, 256, 85);
    const flagTex = new THREE.CanvasTexture(canvas);
    flagTex.colorSpace = THREE.SRGBColorSpace;

    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTex,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    this.flagGeo.translate(2.0, 0, 0);
    this.flagBasePositions = new Float32Array(this.flagGeo.attributes.position.array);

    const flagMesh = new THREE.Mesh(this.flagGeo, flagMat);
    flagMesh.position.set(0.12, 17.5, 0);
    flagMesh.castShadow = true;
    this.flagMesh = flagMesh;

    // White vertical halyard rope (tali kerekan bendera) alongside the flagpole
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.55 });
    const halyardRope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 17.2, 8),
      ropeMat
    );
    halyardRope.position.set(0.24, 10.2, 0.08);

    // 3D Class Row Formation Signboards ("KELAS 1" .. "KELAS 6") South of Flagpole during Opening Ceremony
    this.ceremonyClassSignsGroup = new THREE.Group();
    const classXs = [-15.0, -9.0, -3.0, 3.0, 9.0, 15.0];
    const classColors = ['#EF4444', '#F97316', '#EAB308', '#16A34A', '#0284C7', '#7C3AED'];
    const postMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.4 });

    classXs.forEach((cx, idx) => {
      const signNode = new THREE.Group();
      // flagGroup is at (0, 0, -22.5), so local z = +9.8 places the class sign at world z = -12.7
      signNode.position.set(cx, 0, 9.8);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 8), postMat);
      post.position.y = 0.675;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12), postMat);
      base.position.y = 0.04;

      const sCanvas = document.createElement('canvas');
      sCanvas.width = 256;
      sCanvas.height = 96;
      const sCtx = sCanvas.getContext('2d')!;
      sCtx.fillStyle = classColors[idx];
      sCtx.fillRect(0, 0, 256, 96);
      sCtx.strokeStyle = '#FFFFFF';
      sCtx.lineWidth = 8;
      sCtx.strokeRect(4, 4, 248, 88);
      sCtx.fillStyle = '#FFFFFF';
      sCtx.font = 'bold 42px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText(`KELAS ${idx + 1}`, 128, 50);

      const sTex = new THREE.CanvasTexture(sCanvas);
      sTex.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.62, 0.08),
        new THREE.MeshBasicMaterial({ map: sTex })
      );
      board.position.y = 1.42;

      signNode.add(base, post, board);
      this.ceremonyClassSignsGroup.add(signNode);
    });
    this.ceremonyClassSignsGroup.visible = false;

    flagGroup.add(step1, step2, pole, finial, halyardRope, flagMesh, this.ceremonyClassSignsGroup);
    this.group.add(flagGroup);
  }

  public setCeremonyFlagState(isActive: boolean, progress: number) {
    if (this.flagMesh) {
      if (isActive) {
        const clamped = THREE.MathUtils.clamp(progress, 0, 1);
        // Starts at hands height (y = 3.2) at 0% and reaches pole top (y = 17.5) at 100% of Indonesia Raya
        this.flagMesh.position.y = THREE.MathUtils.lerp(3.2, 17.5, clamped);
      } else {
        this.flagMesh.position.y = 17.5;
      }
    }
    if (this.ceremonyClassSignsGroup) {
      this.ceremonyClassSignsGroup.visible = isActive;
    }
  }

  private buildInstancedFoliage() {
    // Realistic Trees (~12.5 units tall = ~5 meters, vs 3.35-unit child)
    const treePositions: [number, number, number][] = [];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const radius = 84 + (i % 4) * 8.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius + 8;
      if (z > 59.0 && z < 96.0) continue;
      const scale = 0.9 + ((i * 7) % 5) * 0.12;
      treePositions.push([x, z, scale]);
    }

    const innerTrees: [number, number, number][] = [
      [-28, -24, 1.0],
      [28, -24, 1.0],
      [46, 62, 1.15],
      [-48, 62, 1.15],
    ];
    innerTrees.forEach((t) => treePositions.push(t));

    const count = treePositions.length;
    const trunkGeo = new THREE.CylinderGeometry(0.48, 0.68, 5.6, 12);
    trunkGeo.translate(0, 2.8, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5C3A21', roughness: 0.9 });
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    trunkInstanced.castShadow = true;
    trunkInstanced.receiveShadow = true;

    const canopyGeo = new THREE.DodecahedronGeometry(3.6, 1);
    canopyGeo.translate(0, 7.8, 0);
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 });
    const canopyInstanced = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
    canopyInstanced.castShadow = true;
    canopyInstanced.receiveShadow = true;

    const greens = ['#15803D', '#166534', '#14532D', '#3F6212'];

    treePositions.forEach(([x, z, s], idx) => {
      _dummy.position.set(x, 0, z);
      _dummy.rotation.set(0, idx * 1.1, 0);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();

      trunkInstanced.setMatrixAt(idx, _dummy.matrix);
      canopyInstanced.setMatrixAt(idx, _dummy.matrix);
      canopyInstanced.setColorAt(idx, _color.set(greens[idx % greens.length]));
    });

    trunkInstanced.instanceMatrix.needsUpdate = true;
    canopyInstanced.instanceMatrix.needsUpdate = true;
    if (canopyInstanced.instanceColor) canopyInstanced.instanceColor.needsUpdate = true;

    trunkInstanced.computeBoundingSphere();
    canopyInstanced.computeBoundingSphere();

    this.group.add(trunkInstanced, canopyInstanced);
  }

  public applyTimeOfDay(
    scene: THREE.Scene,
    timeOfDay: TimeOfDayId,
    weather: WeatherTypeId = this.currentWeather
  ) {
    this.currentWeather = weather;

    // 1. Base Time-of-Day Sun Position & Color
    let skyHex = 0xdbeafe;
    let fogDensity = 0.0055;
    let hemiSkyHex = 0xdbeafe;
    let hemiGroundHex = 0x64748b;
    let hemiInt = 0.9;
    let keyHex = 0xfff7ed;
    let keyInt = 1.95;

    if (timeOfDay === 'pagi_upacara') {
      skyHex = 0xdbeafe;
      fogDensity = 0.0055;
      hemiSkyHex = 0xdbeafe;
      hemiGroundHex = 0x64748b;
      hemiInt = 0.9;
      keyHex = 0xfff7ed;
      keyInt = 1.95;
      this.keyLight.position.set(28, 45, 32);
    } else if (timeOfDay === 'siang_istirahat') {
      skyHex = 0xbae6fd;
      fogDensity = 0.0048;
      hemiSkyHex = 0xe0f2fe;
      hemiGroundHex = 0x94a3b8;
      hemiInt = 1.05;
      keyHex = 0xffffff;
      keyInt = 2.2;
      this.keyLight.position.set(14, 55, 20);
    } else {
      skyHex = 0xfed7aa;
      fogDensity = 0.0065;
      hemiSkyHex = 0xfde68a;
      hemiGroundHex = 0x475569;
      hemiInt = 0.8;
      keyHex = 0xfb923c;
      keyInt = 2.1;
      this.keyLight.position.set(-36, 28, 28);
    }

    // 2. Modulate Lighting, Fog & Ground Wetness by Dynamic Weather (Cerah / Berawan / Hujan)
    if (weather === 'hujan') {
      skyHex = timeOfDay === 'sore_pulang' ? 0x334155 : 0x475569;
      fogDensity = 0.0092;
      hemiSkyHex = 0x94a3b8;
      hemiGroundHex = 0x334155;
      hemiInt = 0.88;
      keyHex = 0xcbd5e1;
      keyInt = 0.72;
      this.rimLight.intensity = 0.45;
      this.courtyardMat.roughness = 0.36;
      this.courtyardMat.metalness = 0.16;
      this.roadMat.roughness = 0.34;
      this.roadMat.metalness = 0.18;
      this.contactShadowMat.opacity = 0.24;
    } else if (weather === 'berawan') {
      skyHex = timeOfDay === 'sore_pulang' ? 0x64748b : 0x94a3b8;
      fogDensity = 0.0072;
      hemiSkyHex = 0xcbd5e1;
      hemiGroundHex = 0x475569;
      hemiInt = 0.95;
      keyHex = timeOfDay === 'sore_pulang' ? 0xfdba74 : 0xe2e8f0;
      keyInt = 1.18;
      this.rimLight.intensity = 0.6;
      this.courtyardMat.roughness = 0.78;
      this.courtyardMat.metalness = 0.05;
      this.roadMat.roughness = 0.82;
      this.roadMat.metalness = 0.06;
      this.contactShadowMat.opacity = 0.36;
    } else {
      // Cerah
      this.rimLight.intensity = 0.75;
      this.courtyardMat.roughness = 0.84;
      this.courtyardMat.metalness = 0.04;
      this.roadMat.roughness = 0.88;
      this.roadMat.metalness = 0.05;
      this.contactShadowMat.opacity = 0.55;
    }

    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.FogExp2(skyHex, fogDensity);
    this.hemiLight.color.setHex(hemiSkyHex);
    this.hemiLight.groundColor.setHex(hemiGroundHex);
    this.hemiLight.intensity = hemiInt;
    this.keyLight.color.setHex(keyHex);
    this.keyLight.intensity = keyInt;

    this.skySystem.applyTimeOfDay(timeOfDay, weather);
  }

  /**
   * Resolves player 2D circle-vs-AABB wall collisions with smooth X/Z wall sliding
   * so the character can never walk through walls or closed doors.
   */
  public resolvePlayerMovement(
    prevX: number,
    prevZ: number,
    desiredX: number,
    desiredZ: number,
    playerRadius = 0.68
  ): [number, number] {
    if (!this.buildingHandle) return [desiredX, desiredZ];

    const colliders = this.buildingHandle.wallColliders;
    const doors = this.buildingHandle.doors;

    const hitsBox = (x: number, z: number, box: WallColliderBox): boolean => {
      return (
        x > box.minX - playerRadius &&
        x < box.maxX + playerRadius &&
        z > box.minZ - playerRadius &&
        z < box.maxZ + playerRadius
      );
    };

    const hitsAnyWall = (x: number, z: number): boolean => {
      for (let i = 0; i < colliders.length; i++) {
        const b = colliders[i];
        // Ignore a collider if the player was somehow already inside it before moving
        if (hitsBox(prevX, prevZ, b)) continue;
        if (hitsBox(x, z, b)) return true;
      }
      for (let i = 0; i < doors.length; i++) {
        const d = doors[i];
        // Block doorway while the door is still closed (< 0.25 rad)
        if (d.currentAngle < 0.25) {
          if (hitsBox(prevX, prevZ, d.doorCollider)) continue;
          if (hitsBox(x, z, d.doorCollider)) return true;
        }
      }
      return false;
    };

    let resolvedX = desiredX;
    if (hitsAnyWall(resolvedX, prevZ)) {
      resolvedX = prevX;
    }

    let resolvedZ = desiredZ;
    if (hitsAnyWall(resolvedX, resolvedZ)) {
      resolvedZ = prevZ;
    }

    return [resolvedX, resolvedZ];
  }

  public updateFlagWave(
    elapsed: number,
    delta = 0.016,
    playerX = 0,
    playerZ = 0,
    soundEnabled = true
  ) {
    this.skySystem.update(elapsed, delta);

    // Update ambient rain audio with automatic indoor/outdoor muffling
    const isPlayerIndoor = !isOutdoorRainCoord(playerX, playerZ);
    soundFX.updateRainAmbience(this.currentWeather === 'hujan', isPlayerIndoor, soundEnabled);
    soundFX.updateSchoolAndTrafficAmbience(
      elapsed,
      delta,
      playerX,
      playerZ,
      isPlayerIndoor,
      this.currentWeather === 'hujan',
      soundEnabled
    );

    if (this.buildingHandle) {
      // 1. Smart Roof Cutaway: Lift roof when player steps inside a building wing
      this.buildingHandle.northRoofGroup.visible = !(playerZ < -38.8);
      this.buildingHandle.westRoofGroup.visible = !(playerX < -40.8);
      this.buildingHandle.eastRoofGroup.visible = !(playerX > 40.8);

      // 2. Interactive Room Doors: Open when player approaches to enter/exit, close after passing
      const doors = this.buildingHandle.doors;
      for (let i = 0; i < doors.length; i++) {
        const door = doors[i];
        const dist = Math.hypot(playerX - door.worldX, playerZ - door.worldZ);

        if (!door.isOpen && dist <= 4.5) {
          door.isOpen = true;
          soundFX.playDoor(true, soundEnabled);
        } else if (door.isOpen && dist >= 4.9) {
          door.isOpen = false;
          soundFX.playDoor(false, soundEnabled);
        }

        const targetAngle = door.isOpen ? door.openAngle : 0;
        door.currentAngle = THREE.MathUtils.damp(door.currentAngle, targetAngle, 9.5, delta);
        door.hinge.rotation.y = door.currentAngle;
      }
    }

    const windSpeedMult =
      this.currentWeather === 'hujan'
        ? 1.75
        : this.currentWeather === 'berawan'
        ? 1.3
        : 1.0;
    const windAmpMult =
      this.currentWeather === 'hujan'
        ? 1.45
        : this.currentWeather === 'berawan'
        ? 1.15
        : 1.0;

    const pos = this.flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.flagBasePositions[i * 3];
      const by = this.flagBasePositions[i * 3 + 1];
      const pinFactor = Math.min(1, bx / 2.5);
      const waveZ =
        Math.sin(bx * 2.2 - elapsed * 4.5 * windSpeedMult) * 0.24 * windAmpMult * pinFactor +
        Math.cos(by * 1.5 - elapsed * 3.0 * windSpeedMult) * 0.08 * windAmpMult * pinFactor;
      pos.setZ(i, waveZ);
    }
    pos.needsUpdate = true;
    this.flagGeo.computeVertexNormals();

    // 3. Automatic Pre-Mission Wind Gust when Player Approaches Taman Ecobrick / Laras for the First Time
    const distToEcobrick = Math.hypot(playerX - 16.2, playerZ - 52.0);
    if (
      !this.hasCompletedEcobrickOnce &&
      !this.hasAutoTriggeredWindNearEcobrick &&
      distToEcobrick < 20.5
    ) {
      this.hasAutoTriggeredWindNearEcobrick = true;
      this.triggerEcobrickWindScatter(soundEnabled);
    }

    // 4. Animate 3D Wind Gust Streaks & 9 Ecobrick "I LOVE SUGA" Letter Pieces
    if (this.ecobrickWindTimer > 0) {
      this.ecobrickWindTimer = Math.max(0, this.ecobrickWindTimer - delta);
      if (this.ecobrickWindGroup) {
        this.ecobrickWindGroup.visible = this.ecobrickWindTimer > 0;
        const gustPhase = 1.65 - this.ecobrickWindTimer;
        for (let w = 0; w < this.ecobrickWindStreaks.length; w++) {
          const streak = this.ecobrickWindStreaks[w];
          const sweepX = ((gustPhase * 15.0 + w * 2.1) % 16.0) - 8.0;
          streak.position.x = -sweepX;
          streak.position.y = 1.6 + (w % 4) * 0.5 + Math.sin(elapsed * 12 + w) * 0.25;
          streak.position.z = -0.5 - (w % 3) * 1.05 + Math.cos(elapsed * 10 + w) * 0.35;
          streak.rotation.z = Math.sin(elapsed * 14 + w) * 0.28;
        }
      }
    } else if (this.ecobrickWindGroup && this.ecobrickWindGroup.visible) {
      this.ecobrickWindGroup.visible = false;
    }

    for (let i = 0; i < this.ecobrickPieces.length; i++) {
      const piece = this.ecobrickPieces[i];
      piece.slotFrame.visible = !piece.isAssembled;

      if (!piece.isAssembled) {
        // Delay slightly per letter during the wind gust so they blow off in a dramatic cascade
        const gustElapsed = 1.65 - this.ecobrickWindTimer;
        const pieceDelay = i * 0.045;
        if (this.ecobrickWindTimer > 1.32 && gustElapsed < 0.33 + pieceDelay) {
          // Tremble on the monument right before the wind blows it off!
          const shake = Math.sin(elapsed * 48.0 + i * 2.1) * 0.09;
          piece.group.position.set(
            piece.homePos.x + shake,
            piece.homePos.y + Math.abs(shake) * 0.5,
            piece.homePos.z - Math.abs(shake)
          );
          piece.group.rotation.set(shake * 1.5, shake * 1.2, shake * 2.4);
        } else {
          piece.scatterProgress = Math.min(1, piece.scatterProgress + delta * 1.85);
          const p = piece.scatterProgress;
          const easeP = 1 - Math.pow(1 - p, 2.4);
          const windArcY = Math.sin(p * Math.PI) * 1.45;
          piece.group.position.set(
            THREE.MathUtils.lerp(piece.homePos.x, piece.scatteredPos.x, easeP),
            THREE.MathUtils.lerp(piece.homePos.y, piece.scatteredPos.y, easeP) + windArcY,
            THREE.MathUtils.lerp(piece.homePos.z, piece.scatteredPos.z, easeP)
          );
          piece.group.rotation.set(
            THREE.MathUtils.lerp(0, piece.scatteredRot.x, easeP),
            THREE.MathUtils.lerp(0, piece.scatteredRot.y, easeP),
            THREE.MathUtils.lerp(0, piece.scatteredRot.z, easeP)
          );
        }
      } else if (piece.snapFlyTimer > 0) {
        // Parabolic jump-and-spin animation back from the messy ground into its slot on "I LOVE SUGA"
        piece.snapFlyTimer += delta;
        const p = Math.min(1, piece.snapFlyTimer / 0.52);
        const easeP = 1 - Math.pow(1 - p, 2.2);
        const arcY = Math.sin(p * Math.PI) * 2.15;
        piece.group.position.set(
          THREE.MathUtils.lerp(piece.scatteredPos.x, piece.homePos.x, easeP),
          THREE.MathUtils.lerp(piece.scatteredPos.y, piece.homePos.y, easeP) + arcY,
          THREE.MathUtils.lerp(piece.scatteredPos.z, piece.homePos.z, easeP)
        );
        piece.group.rotation.set(
          THREE.MathUtils.lerp(piece.scatteredRot.x, 0, easeP),
          THREE.MathUtils.lerp(piece.scatteredRot.y, 0, easeP) + (1 - easeP) * Math.PI * 2,
          THREE.MathUtils.lerp(piece.scatteredRot.z, 0, easeP)
        );
        if (p >= 1) {
          piece.snapFlyTimer = 0;
          piece.scatterProgress = 0;
          piece.group.position.copy(piece.homePos);
          piece.group.rotation.set(0, 0, 0);
        }
      } else {
        piece.group.position.copy(piece.homePos);
        piece.group.rotation.set(0, 0, 0);
      }
    }
  }

  /**
   * Triggers a 3D wind gust animation that blows all 9 Ecobrick "I LOVE SUGA" letters
   * off the planter bed into a messy pile on the ground in front of Laras.
   */
  public triggerEcobrickWindScatter(soundEnabled = true) {
    this.hasAutoTriggeredWindNearEcobrick = true;
    this.ecobrickIsScattered = true;
    this.ecobrickWindTimer = 1.65;
    for (let i = 0; i < this.ecobrickPieces.length; i++) {
      const piece = this.ecobrickPieces[i];
      piece.isAssembled = false;
      piece.scatterProgress = 0;
      piece.snapFlyTimer = 0;
      piece.group.position.copy(piece.homePos);
      piece.group.rotation.set(0, 0, 0);
    }
    soundFX.playEcobrickWindScatter(soundEnabled);
  }

  /**
   * Snaps a single Ecobrick letter block (0..8) from the messy ground back into its upright slot on "I LOVE SUGA".
   */
  public snapEcobrickPiece(pieceIndex: number, isPerfect = true, soundEnabled = true) {
    this.hasAutoTriggeredWindNearEcobrick = true;
    this.ecobrickWindTimer = 0;
    const piece = this.ecobrickPieces[pieceIndex];
    if (!piece) return;
    piece.isAssembled = true;
    piece.snapFlyTimer = 0.001;
    soundFX.playPuzzleSnap(isPerfect, soundEnabled);

    const allDone = this.ecobrickPieces.every((p) => p.isAssembled);
    if (allDone) {
      this.ecobrickIsScattered = false;
      this.hasCompletedEcobrickOnce = true;
    }
  }

  /**
   * Restores all 9 Ecobrick letter blocks neatly onto the "I LOVE SUGA" monument.
   */
  public restoreAllEcobrickPieces() {
    this.ecobrickIsScattered = false;
    this.ecobrickWindTimer = 0;
    for (let i = 0; i < this.ecobrickPieces.length; i++) {
      const piece = this.ecobrickPieces[i];
      piece.isAssembled = true;
      piece.scatterProgress = 0;
      piece.snapFlyTimer = 0;
      piece.group.position.copy(piece.homePos);
      piece.group.rotation.set(0, 0, 0);
      piece.slotFrame.visible = false;
    }
  }

  public isEcobrickCurrentlyScattered(): boolean {
    return this.ecobrickIsScattered;
  }
}
