import * as THREE from 'three';
import { TimeOfDayId, WeatherTypeId } from '../types/character';

interface RenderItem {
  layer: number; // 0 = Ground/Floor slabs, 1 = Contact shadow, 2 = 3D Meshes, 3 = Sprites
  depth: number;
  kind: 'poly' | 'sprite';
  pts?: number[]; // [x0, y0, x1, y1, ...]
  fillStyle?: string;
  strokeStyle?: string;
  spriteImage?: HTMLCanvasElement;
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
}

const NEAR_CLIP = 0.35;

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _center = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _edge1 = new THREE.Vector3();
const _edge2 = new THREE.Vector3();
const _lightDir = new THREE.Vector3(0.45, 0.78, 0.43).normalize();
const _instanceMatrix = new THREE.Matrix4();
const _worldMatrix = new THREE.Matrix4();
const _color = new THREE.Color();

// Reusable vectors for quad subdivision
const _q00 = new THREE.Vector3();
const _q10 = new THREE.Vector3();
const _q11 = new THREE.Vector3();
const _q01 = new THREE.Vector3();
const _topA = new THREE.Vector3();
const _topB = new THREE.Vector3();
const _botA = new THREE.Vector3();
const _botB = new THREE.Vector3();

// 8 corners of a bounding box
const _boxCorners = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];

// 6 faces of a box defined by corner indices (counter-clockwise outward)
const BOX_FACES: [number, number, number, number][] = [
  [0, 1, 2, 3], // +Z front
  [5, 4, 7, 6], // -Z back
  [4, 0, 3, 7], // -X left
  [1, 5, 6, 2], // +X right
  [3, 2, 6, 7], // +Y top
  [4, 5, 1, 0], // -Y bottom
];

/**
 * Software 3D Renderer using HTML5 Canvas 2D API with 3D Near-Plane Polygon Clipping,
 * Automatic Face Subdivision, and 4-Layer Priority Depth Sorting.
 */
export class SoftwareCanvas3DRenderer {
  public readonly domElement: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private items: RenderItem[] = [];

  constructor(width: number, height: number) {
    this.domElement = document.createElement('canvas');
    this.ctx = this.domElement.getContext('2d')!;
    this.setSize(width, height);
  }

  public setSize(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.domElement.width = this.width;
    this.domElement.height = this.height;
    this.domElement.style.width = `${width}px`;
    this.domElement.style.height = `${height}px`;
  }

  private projectPoint(
    worldPt: THREE.Vector3,
    camInv: THREE.Matrix4,
    fovScaleX: number,
    fovScaleY: number,
    halfW: number,
    halfH: number
  ): [number, number, number] | null {
    _v0.copy(worldPt).applyMatrix4(camInv);
    const cz = -_v0.z;
    if (cz < NEAR_CLIP) return null;
    const invZ = 1 / cz;
    const sx = halfW + _v0.x * fovScaleX * invZ;
    const sy = halfH - _v0.y * fovScaleY * invZ;
    return [sx, sy, cz];
  }

  /**
   * Clips a 3D quad in camera space against the near plane (cz >= NEAR_CLIP)
   * using Sutherland-Hodgman clipping so polygons never vanish or invert when walking across them.
   */
  private pushClippedQuad(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    camPos: THREE.Vector3,
    camInv: THREE.Matrix4,
    fovScaleX: number,
    fovScaleY: number,
    halfW: number,
    halfH: number,
    fillStyle: string,
    strokeStyle: string | undefined,
    layer: number,
    depthBias = 0
  ) {
    // Transform 4 vertices to camera space where forward depth is cz = -z
    const c0x =
      camInv.elements[0] * p0.x +
      camInv.elements[4] * p0.y +
      camInv.elements[8] * p0.z +
      camInv.elements[12];
    const c0y =
      camInv.elements[1] * p0.x +
      camInv.elements[5] * p0.y +
      camInv.elements[9] * p0.z +
      camInv.elements[13];
    const c0z = -(
      camInv.elements[2] * p0.x +
      camInv.elements[6] * p0.y +
      camInv.elements[10] * p0.z +
      camInv.elements[14]
    );

    const c1x =
      camInv.elements[0] * p1.x +
      camInv.elements[4] * p1.y +
      camInv.elements[8] * p1.z +
      camInv.elements[12];
    const c1y =
      camInv.elements[1] * p1.x +
      camInv.elements[5] * p1.y +
      camInv.elements[9] * p1.z +
      camInv.elements[13];
    const c1z = -(
      camInv.elements[2] * p1.x +
      camInv.elements[6] * p1.y +
      camInv.elements[10] * p1.z +
      camInv.elements[14]
    );

    const c2x =
      camInv.elements[0] * p2.x +
      camInv.elements[4] * p2.y +
      camInv.elements[8] * p2.z +
      camInv.elements[12];
    const c2y =
      camInv.elements[1] * p2.x +
      camInv.elements[5] * p2.y +
      camInv.elements[9] * p2.z +
      camInv.elements[13];
    const c2z = -(
      camInv.elements[2] * p2.x +
      camInv.elements[6] * p2.y +
      camInv.elements[10] * p2.z +
      camInv.elements[14]
    );

    const c3x =
      camInv.elements[0] * p3.x +
      camInv.elements[4] * p3.y +
      camInv.elements[8] * p3.z +
      camInv.elements[12];
    const c3y =
      camInv.elements[1] * p3.x +
      camInv.elements[5] * p3.y +
      camInv.elements[9] * p3.z +
      camInv.elements[13];
    const c3z = -(
      camInv.elements[2] * p3.x +
      camInv.elements[6] * p3.y +
      camInv.elements[10] * p3.z +
      camInv.elements[14]
    );

    if (c0z < NEAR_CLIP && c1z < NEAR_CLIP && c2z < NEAR_CLIP && c3z < NEAR_CLIP) {
      return;
    }

    const inVerts: [number, number, number][] = [
      [c0x, c0y, c0z],
      [c1x, c1y, c1z],
      [c2x, c2y, c2z],
      [c3x, c3y, c3z],
    ];
    const clipped: [number, number, number][] = [];

    for (let i = 0; i < 4; i++) {
      const curr = inVerts[i];
      const prev = inVerts[(i + 3) % 4];
      const currIn = curr[2] >= NEAR_CLIP;
      const prevIn = prev[2] >= NEAR_CLIP;

      if (currIn !== prevIn) {
        const t = (NEAR_CLIP - prev[2]) / (curr[2] - prev[2]);
        clipped.push([
          prev[0] + (curr[0] - prev[0]) * t,
          prev[1] + (curr[1] - prev[1]) * t,
          NEAR_CLIP,
        ]);
      }
      if (currIn) {
        clipped.push(curr);
      }
    }

    if (clipped.length < 3) return;

    const pts: number[] = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let sumZ = 0;

    for (let i = 0; i < clipped.length; i++) {
      const [cx, cy, cz] = clipped[i];
      const invZ = 1 / cz;
      const sx = halfW + cx * fovScaleX * invZ;
      const sy = halfH - cy * fovScaleY * invZ;
      pts.push(sx, sy);
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
      sumZ += cz;
    }

    if (maxX < -60 || minX > this.width + 60 || maxY < -60 || minY > this.height + 60) {
      return;
    }

    // Use true 3D Euclidean distance from camera to quad center for consistent sorting
    _center.copy(p0).add(p1).add(p2).add(p3).multiplyScalar(0.25);
    const euclidDist = camPos.distanceTo(_center);
    const avgDepth = (euclidDist * 0.7 + (sumZ / clipped.length) * 0.3) + depthBias;

    this.items.push({
      layer,
      depth: avgDepth,
      kind: 'poly',
      pts,
      fillStyle,
      strokeStyle,
    });
  }

  private pushShadedFace(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    camPos: THREE.Vector3,
    camInv: THREE.Matrix4,
    fovScaleX: number,
    fovScaleY: number,
    halfW: number,
    halfH: number,
    baseColor: THREE.Color,
    layer: number,
    opacity = 1,
    allowSubdivide = true
  ) {
    _edge1.subVectors(p1, p0);
    _edge2.subVectors(p3, p0);
    _normal.crossVectors(_edge1, _edge2);
    const lenSq = _normal.lengthSq();
    if (lenSq < 1e-8) return;
    _normal.multiplyScalar(1 / Math.sqrt(lenSq));

    _center.copy(p0).add(p1).add(p2).add(p3).multiplyScalar(0.25);

    // Back-face culling for non-ground faces
    if (layer >= 2) {
      _v0.subVectors(camPos, _center);
      if (_normal.dot(_v0) <= 0) return;
    }

    const ndotl = Math.max(0, _normal.dot(_lightDir));
    const hemi = 0.58 + 0.42 * (0.5 + 0.5 * _normal.y);
    const shade = Math.min(1.16, hemi * 0.65 + ndotl * 0.48);

    const r = Math.min(255, Math.round(baseColor.r * 255 * shade));
    const g = Math.min(255, Math.round(baseColor.g * 255 * shade));
    const b = Math.min(255, Math.round(baseColor.b * 255 * shade));

    const fillStyle =
      opacity < 0.99 ? `rgba(${r},${g},${b},${opacity.toFixed(2)})` : `rgb(${r},${g},${b})`;
    const strokeR = Math.max(0, r - 20);
    const strokeG = Math.max(0, g - 20);
    const strokeB = Math.max(0, b - 20);
    const strokeStyle =
      layer === 0 ? undefined : `rgba(${strokeR},${strokeG},${strokeB},0.28)`;

    // Subdivide large walls/roofs (layer 2) so moving characters sort accurately against them
    if (allowSubdivide && layer === 2) {
      const spanU = p0.distanceTo(p1);
      const spanV = p0.distanceTo(p3);
      const maxTile = 6.0;
      const stepsU = Math.min(8, Math.max(1, Math.ceil(spanU / maxTile)));
      const stepsV = Math.min(4, Math.max(1, Math.ceil(spanV / maxTile)));

      if (stepsU > 1 || stepsV > 1) {
        for (let iu = 0; iu < stepsU; iu++) {
          const u0 = iu / stepsU;
          const u1 = (iu + 1) / stepsU;
          _topA.lerpVectors(p0, p1, u0);
          _topB.lerpVectors(p0, p1, u1);
          _botA.lerpVectors(p3, p2, u0);
          _botB.lerpVectors(p3, p2, u1);

          for (let iv = 0; iv < stepsV; iv++) {
            const v0 = iv / stepsV;
            const v1 = (iv + 1) / stepsV;
            _q00.lerpVectors(_topA, _botA, v0);
            _q10.lerpVectors(_topB, _botB, v0);
            _q11.lerpVectors(_topB, _botB, v1);
            _q01.lerpVectors(_topA, _botA, v1);

            this.pushClippedQuad(
              _q00,
              _q10,
              _q11,
              _q01,
              camPos,
              camInv,
              fovScaleX,
              fovScaleY,
              halfW,
              halfH,
              fillStyle,
              strokeStyle,
              layer,
              0
            );
          }
        }
        return;
      }
    }

    // For ground/floor slabs (layer 0), sort strictly by elevation so higher slabs draw over lower slabs
    const depthBias = layer === 0 ? -_center.y * 500 : 0;

    this.pushClippedQuad(
      p0,
      p1,
      p2,
      p3,
      camPos,
      camInv,
      fovScaleX,
      fovScaleY,
      halfW,
      halfH,
      fillStyle,
      strokeStyle,
      layer,
      depthBias
    );
  }

  private emitBoxFromMatrix(
    min: THREE.Vector3,
    max: THREE.Vector3,
    matrixWorld: THREE.Matrix4,
    camPos: THREE.Vector3,
    camInv: THREE.Matrix4,
    fovScaleX: number,
    fovScaleY: number,
    halfW: number,
    halfH: number,
    color: THREE.Color,
    opacity = 1,
    isContactShadow = false
  ) {
    const dx = max.x - min.x;
    const dy = max.y - min.y;
    const dz = max.z - min.z;

    // 1. Flat 2D planes (either horizontal dy < 0.02 or PlaneGeometry/CircleGeometry dz < 0.02)
    if (dy < 0.02 || dz < 0.02) {
      if (dy < 0.02) {
        _boxCorners[0].set(min.x, max.y, max.z).applyMatrix4(matrixWorld);
        _boxCorners[1].set(max.x, max.y, max.z).applyMatrix4(matrixWorld);
        _boxCorners[2].set(max.x, max.y, min.z).applyMatrix4(matrixWorld);
        _boxCorners[3].set(min.x, max.y, min.z).applyMatrix4(matrixWorld);
      } else {
        _boxCorners[0].set(min.x, min.y, max.z).applyMatrix4(matrixWorld);
        _boxCorners[1].set(max.x, min.y, max.z).applyMatrix4(matrixWorld);
        _boxCorners[2].set(max.x, max.y, max.z).applyMatrix4(matrixWorld);
        _boxCorners[3].set(min.x, max.y, max.z).applyMatrix4(matrixWorld);
      }

      if (isContactShadow) {
        this.pushClippedQuad(
          _boxCorners[0],
          _boxCorners[1],
          _boxCorners[2],
          _boxCorners[3],
          camPos,
          camInv,
          fovScaleX,
          fovScaleY,
          halfW,
          halfH,
          'rgba(15, 23, 42, 0.30)',
          undefined,
          1,
          0
        );
        return;
      }

      const minWorldY = Math.min(
        _boxCorners[0].y,
        _boxCorners[1].y,
        _boxCorners[2].y,
        _boxCorners[3].y
      );
      const maxWorldY = Math.max(
        _boxCorners[0].y,
        _boxCorners[1].y,
        _boxCorners[2].y,
        _boxCorners[3].y
      );
      const worldY = (minWorldY + maxWorldY) * 0.5;
      const isHorizontalGround = maxWorldY - minWorldY < 0.1 && worldY <= 0.6;
      const layer = isHorizontalGround ? 0 : 2;

      // Ensure ground decals (Dampu Bulan squares, mats, court markings) draw above base courtyard (y=0)
      if (isHorizontalGround) {
        const span = Math.max(dx, dy, dz);
        const decalBonus = span < 25 ? -8.0 - worldY * 800 : -worldY * 500;
        const r = Math.min(255, Math.round(color.r * 255));
        const g = Math.min(255, Math.round(color.g * 255));
        const b = Math.min(255, Math.round(color.b * 255));
        const fillStyle =
          opacity < 0.99 ? `rgba(${r},${g},${b},${opacity.toFixed(2)})` : `rgb(${r},${g},${b})`;
        this.pushClippedQuad(
          _boxCorners[0],
          _boxCorners[1],
          _boxCorners[2],
          _boxCorners[3],
          camPos,
          camInv,
          fovScaleX,
          fovScaleY,
          halfW,
          halfH,
          fillStyle,
          span < 4 ? 'rgba(255,255,255,0.65)' : undefined,
          0,
          decalBonus
        );
        return;
      }

      this.pushShadedFace(
        _boxCorners[0],
        _boxCorners[1],
        _boxCorners[2],
        _boxCorners[3],
        camPos,
        camInv,
        fovScaleX,
        fovScaleY,
        halfW,
        halfH,
        color,
        layer,
        opacity,
        false
      );
      return;
    }

    _boxCorners[0].set(min.x, min.y, max.z).applyMatrix4(matrixWorld);
    _boxCorners[1].set(max.x, min.y, max.z).applyMatrix4(matrixWorld);
    _boxCorners[2].set(max.x, max.y, max.z).applyMatrix4(matrixWorld);
    _boxCorners[3].set(min.x, max.y, max.z).applyMatrix4(matrixWorld);
    _boxCorners[4].set(min.x, min.y, min.z).applyMatrix4(matrixWorld);
    _boxCorners[5].set(max.x, min.y, min.z).applyMatrix4(matrixWorld);
    _boxCorners[6].set(max.x, max.y, min.z).applyMatrix4(matrixWorld);
    _boxCorners[7].set(min.x, max.y, min.z).applyMatrix4(matrixWorld);

    _center.copy(_boxCorners[0]).add(_boxCorners[6]).multiplyScalar(0.5);
    const distSq = camPos.distanceToSquared(_center);
    if (distSq > 55000) return;

    // Check if this box is a low floor/corridor/sidewalk slab (world top Y <= 0.55 and wide footprint)
    const worldMaxY = Math.max(
      _boxCorners[2].y,
      _boxCorners[3].y,
      _boxCorners[6].y,
      _boxCorners[7].y
    );
    const worldMinY = Math.min(
      _boxCorners[0].y,
      _boxCorners[1].y,
      _boxCorners[4].y,
      _boxCorners[5].y
    );
    const isFloorSlab = worldMaxY <= 0.56 && worldMinY <= 0.15 && (max.x - min.x > 3 || max.z - min.z > 3);
    const boxLayer = isFloorSlab ? 0 : 2;

    for (let f = 0; f < 6; f++) {
      if (f === 5) continue; // Skip bottom face
      const [i0, i1, i2, i3] = BOX_FACES[f];
      this.pushShadedFace(
        _boxCorners[i0],
        _boxCorners[i1],
        _boxCorners[i2],
        _boxCorners[i3],
        camPos,
        camInv,
        fovScaleX,
        fovScaleY,
        halfW,
        halfH,
        color,
        boxLayer,
        opacity,
        !isFloorSlab
      );
    }
  }

  public render(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    timeOfDay: TimeOfDayId = 'pagi_upacara',
    weather: WeatherTypeId = 'cerah'
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const halfW = w * 0.5;
    const halfH = h * 0.5;

    // 1. Paint Sky Gradient + Ground Base Fill modulated by Time of Day & Weather
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    if (weather === 'hujan') {
      skyGrad.addColorStop(0, '#1E293B');
      skyGrad.addColorStop(0.55, '#334155');
      skyGrad.addColorStop(1, '#64748B');
    } else if (weather === 'berawan') {
      skyGrad.addColorStop(0, '#3B82F6');
      skyGrad.addColorStop(0.55, '#94A3B8');
      skyGrad.addColorStop(1, '#CBD5E1');
    } else if (timeOfDay === 'pagi_upacara') {
      skyGrad.addColorStop(0, '#0284C7');
      skyGrad.addColorStop(0.55, '#38BDF8');
      skyGrad.addColorStop(1, '#E0F2FE');
    } else if (timeOfDay === 'siang_istirahat') {
      skyGrad.addColorStop(0, '#0369A1');
      skyGrad.addColorStop(0.55, '#0EA5E9');
      skyGrad.addColorStop(1, '#BAE6FD');
    } else {
      skyGrad.addColorStop(0, '#311042');
      skyGrad.addColorStop(0.45, '#C2410C');
      skyGrad.addColorStop(0.8, '#F97316');
      skyGrad.addColorStop(1, '#FDE047');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle =
      weather === 'hujan'
        ? '#2D4A1E'
        : timeOfDay === 'sore_pulang'
        ? '#365314'
        : '#3F6212';
    ctx.fillRect(0, h * 0.48, w, h * 0.52);

    // 2. Update World Matrices
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    const camInv = camera.matrixWorldInverse;
    const camPos = camera.position;

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const fovScaleY = halfH / Math.tan(fovRad * 0.5);
    const fovScaleX = fovScaleY;

    this.items.length = 0;

    // 3. Traverse Visible Scene Objects
    scene.traverseVisible((obj) => {
      if (obj instanceof THREE.Sprite) {
        const mat = obj.material as THREE.SpriteMaterial;
        const img = mat.map?.image as HTMLCanvasElement | undefined;
        if (!img || obj.scale.x < 0.05) return;

        _v1.setFromMatrixPosition(obj.matrixWorld);
        const proj = this.projectPoint(_v1, camInv, fovScaleX, fovScaleY, halfW, halfH);
        if (!proj) return;

        const sw = (obj.scale.x * fovScaleX) / proj[2];
        const sh = (obj.scale.y * fovScaleY) / proj[2];
        if (sw < 4 || sh < 2) return;

        this.items.push({
          layer: 3,
          depth: proj[2] - (obj.renderOrder > 0 ? 50 : 0),
          kind: 'sprite',
          spriteImage: img,
          sx: proj[0] - sw * 0.5,
          sy: proj[1] - sh * 0.5,
          sw,
          sh,
        });
        return;
      }

      if (obj instanceof THREE.InstancedMesh) {
        const geo = obj.geometry as THREE.BufferGeometry;
        if (!geo.boundingBox) geo.computeBoundingBox();
        const bb = geo.boundingBox;
        if (!bb) return;

        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        const baseCol =
          mat && 'color' in mat && mat.color instanceof THREE.Color
            ? mat.color
            : _color.set('#15803D');

        const count = obj.count;
        for (let i = 0; i < count; i++) {
          obj.getMatrixAt(i, _instanceMatrix);
          _worldMatrix.multiplyMatrices(obj.matrixWorld, _instanceMatrix);
          if (obj.instanceColor) {
            obj.getColorAt(i, _color);
          } else {
            _color.copy(baseCol);
          }
          this.emitBoxFromMatrix(
            bb.min,
            bb.max,
            _worldMatrix,
            camPos,
            camInv,
            fovScaleX,
            fovScaleY,
            halfW,
            halfH,
            _color,
            1,
            false
          );
        }
        return;
      }

      if (obj instanceof THREE.Mesh) {
        if (obj.userData?.skipSoftwareRender) return;
        const geo = obj.geometry as THREE.BufferGeometry;
        // Skip hollow RingGeometry in bounding-box software fallback so it doesn't draw solid squares
        if (geo instanceof THREE.RingGeometry) return;

        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (!mat || !mat.visible) return;
        if (mat.side === THREE.BackSide) return;

        if (!geo.boundingBox) geo.computeBoundingBox();
        const bb = geo.boundingBox;
        if (!bb) return;

        const spanX = bb.max.x - bb.min.x;
        const spanY = bb.max.y - bb.min.y;
        const spanZ = bb.max.z - bb.min.z;

        // Skip huge circular grass terrain since horizon fill covers it
        if (spanX > 300) return;

        // Detect contact shadow mesh (2.4 x 2.4 transparent plane with depthWrite=false)
        const isContactShadow =
          spanY < 0.02 &&
          Math.abs(spanX - 2.4) < 0.1 &&
          Math.abs(spanZ - 2.4) < 0.1 &&
          mat.transparent;

        if (typeof obj.userData?.softwareColor === 'string') {
          _color.set(obj.userData.softwareColor);
        } else if ('color' in mat && mat.color instanceof THREE.Color) {
          _color.copy(mat.color);
          if ('map' in mat && mat.map && _color.r > 0.95 && _color.g > 0.95 && _color.b > 0.95) {
            if (spanX > 180) {
              _color.set('#334155'); // Asphalt road
            } else if (spanX > 90) {
              _color.set('#CBD5E1'); // Courtyard paving
            } else if (spanX > 40) {
              _color.set('#0D9488'); // Sports court
            }
          }
        } else {
          _color.set('#E2E8F0');
        }

        const opacity = mat.transparent ? mat.opacity : 1;
        if (opacity < 0.15) return;

        this.emitBoxFromMatrix(
          bb.min,
          bb.max,
          obj.matrixWorld,
          camPos,
          camInv,
          fovScaleX,
          fovScaleY,
          halfW,
          halfH,
          _color,
          opacity,
          isContactShadow
        );
      }
    });

    // 4. Multi-Layer Painter's Algorithm Sort:
    // Layer 0 (Ground/Slabs) -> Layer 1 (Contact Shadow) -> Layer 2 (3D Objects) -> Layer 3 (Sprites)
    this.items.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      return b.depth - a.depth;
    });

    // 5. Draw Sorted Polygons & Sprites
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.kind === 'poly' && item.pts) {
        const p = item.pts;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let k = 2; k < p.length; k += 2) {
          ctx.lineTo(p[k], p[k + 1]);
        }
        ctx.closePath();
        ctx.fillStyle = item.fillStyle!;
        ctx.fill();
        if (item.strokeStyle) {
          ctx.strokeStyle = item.strokeStyle;
          ctx.stroke();
        }
      } else if (item.kind === 'sprite' && item.spriteImage) {
        ctx.drawImage(item.spriteImage, item.sx!, item.sy!, item.sw!, item.sh!);
      }
    }

    // 6. Project & Draw 3D Outdoor Raindrop Streaks when weather === 'hujan'
    if (weather === 'hujan') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.62)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      scene.traverseVisible((obj) => {
        if (obj instanceof THREE.LineSegments) {
          const posAttr = obj.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
          if (!posAttr) return;
          const arr = posAttr.array as Float32Array;
          // Step by 2 segments (every 12 floats) for crisp software framerate
          for (let i = 0; i < arr.length; i += 12) {
            _q00.set(arr[i], arr[i + 1], arr[i + 2]);
            _q10.set(arr[i + 3], arr[i + 4], arr[i + 5]);
            if (camPos.distanceToSquared(_q10) > 4200) continue;
            const pTop = this.projectPoint(_q00, camInv, fovScaleX, fovScaleY, halfW, halfH);
            const pBot = this.projectPoint(_q10, camInv, fovScaleX, fovScaleY, halfW, halfH);
            if (pTop && pBot) {
              ctx.moveTo(pTop[0], pTop[1]);
              ctx.lineTo(pBot[0], pBot[1]);
            }
          }
        }
      });
      ctx.stroke();
    }
  }
}
