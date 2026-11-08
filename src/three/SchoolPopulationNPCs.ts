import * as THREE from 'three';
import { FaceExpressionId } from '../types/character';
import { createFaceTexture } from '../utils/proceduralTextures';
import { soundFX } from '../utils/soundFX';

function createNPCRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  bevelRadius = 0.05
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const w = width - bevelRadius * 2;
  const h = height - bevelRadius * 2;
  const r = 0.02;

  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevelRadius * 2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevelRadius,
    bevelThickness: bevelRadius,
  });
  geo.center();
  return geo;
}

export type NPCRole = 'siswa_putra' | 'siswa_putri' | 'guru' | 'kepsek' | 'satpam' | 'pedagang';

export type NPCBehavior =
  | 'patrol_loop'
  | 'futsal_player'
  | 'ceremony_salute'
  | 'coach_sideline'
  | 'chat_gesture'
  | 'read_book'
  | 'eat_snack'
  | 'guard_wave'
  | 'vendor_stand'
  | 'teach_board'
  | 'science_experiment'
  | 'type_computer'
  | 'write_desk'
  | 'wash_hands'
  | 'raise_hand'
  | 'clap_cheer'
  | 'stretch_body'
  | 'inspect_shelf'
  | 'sweep_clean'
  | 'exercise_skj'
  | 'hop_dampu'
  | 'play_kelereng'
  | 'jump_rope'
  | 'turn_rope';

export interface NPCActivityStage {
  activity: string;
  behavior: NPCBehavior;
  position?: [number, number];
  rotationY?: number;
  duration: number;
  dialogues?: string[];
}

export interface ActiveNPCDialogue {
  npcName: string;
  npcActivity: string;
  role: NPCRole;
  message: string;
  distance: number;
  voiceVolume: number;
  playerReply?: string;
  suggestedReplies?: string[];
  stageIndex?: number;
  totalStages?: number;
}

export type PJOKMissionMode = 'penalty' | 'basket';

export const OBSTACLE_COURSE_WAYPOINTS = [
  { x: -14.0, z: 22.0, d: 0 },
  { x: 18.0, z: 22.0, d: 32.0 },
  { x: 21.0, z: 19.0, d: 36.24 },
  { x: 21.0, z: 1.0, d: 54.24 },
  { x: 18.0, z: -2.0, d: 58.48 },
  { x: -18.0, z: -2.0, d: 94.48 },
  { x: -21.0, z: 1.0, d: 98.72 },
  { x: -21.0, z: 19.0, d: 116.72 },
  { x: -18.0, z: 22.0, d: 120.96 },
  { x: -14.0, z: 22.0, d: 124.96 },
];

export function getObstacleTrackPoint(dist: number): { x: number; z: number; angle: number } {
  const maxD = OBSTACLE_COURSE_WAYPOINTS[OBSTACLE_COURSE_WAYPOINTS.length - 1].d;
  const clampedD = Math.max(0, Math.min(dist, maxD));

  for (let i = 0; i < OBSTACLE_COURSE_WAYPOINTS.length - 1; i++) {
    const p1 = OBSTACLE_COURSE_WAYPOINTS[i];
    const p2 = OBSTACLE_COURSE_WAYPOINTS[i + 1];
    if (clampedD >= p1.d && clampedD <= p2.d) {
      const segLen = p2.d - p1.d;
      const t = segLen > 0.0001 ? (clampedD - p1.d) / segLen : 0;
      const x = p1.x + (p2.x - p1.x) * t;
      const z = p1.z + (p2.z - p1.z) * t;
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      return { x, z, angle };
    }
  }
  return { x: OBSTACLE_COURSE_WAYPOINTS[0].x, z: OBSTACLE_COURSE_WAYPOINTS[0].z, angle: Math.PI / 2 };
}

export type PenaltyZoneId =
  | 'kiri_atas'
  | 'tengah_atas'
  | 'kanan_atas'
  | 'kiri_bawah'
  | 'tengah_bawah'
  | 'kanan_bawah';

export type PenaltyShotOutcome = 'goal' | 'saved' | 'post';

export interface PenaltyKickResult {
  outcome: PenaltyShotOutcome;
  zone: PenaltyZoneId;
  keeperZone: PenaltyZoneId;
  power: number;
  teacherComment: string;
}

export const PENALTY_ZONES: Record<
  PenaltyZoneId,
  { label: string; shortLabel: string; targetZ: number; targetY: number }
> = {
  // Shooter stands at (-8.3, 0, 10.0) facing West (-X) towards goal at (-21.8, 0, 10.0)
  // Shooter's Left is +Z (12.45), Center is 10.0, Shooter's Right is -Z (7.55)
  kiri_atas: { label: 'Pojok Kiri Atas', shortLabel: '↖ Kiri Atas', targetZ: 12.45, targetY: 3.55 },
  tengah_atas: { label: 'Tengah Atas', shortLabel: '⬆ Tengah Atas', targetZ: 10.0, targetY: 3.65 },
  kanan_atas: { label: 'Pojok Kanan Atas', shortLabel: '↗ Kanan Atas', targetZ: 7.55, targetY: 3.55 },
  kiri_bawah: { label: 'Pojok Kiri Bawah', shortLabel: '↙ Kiri Bawah', targetZ: 12.45, targetY: 1.05 },
  tengah_bawah: { label: 'Tengah Bawah', shortLabel: '⬇ Tengah Bawah', targetZ: 10.0, targetY: 1.05 },
  kanan_bawah: { label: 'Pojok Kanan Bawah', shortLabel: '↘ Kanan Bawah', targetZ: 7.55, targetY: 1.05 },
};

export const BASKET_ZONES: Record<
  PenaltyZoneId,
  { label: string; shortLabel: string; targetX: number; targetY: number; targetZ: number }
> = {
  // Shooter stands at (+12.2, 0, 10.0) facing East (+X) towards East Basketball Hoop (rim at x=22.75, y=7.5, z=10.0)
  kiri_atas: {
    label: 'Pantul Papan Kiri',
    shortLabel: '↖ Papan Kiri',
    targetX: 23.15,
    targetY: 8.05,
    targetZ: 9.65,
  },
  tengah_atas: {
    label: 'Pantul Kotak Papan',
    shortLabel: '⬆ Kotak Papan',
    targetX: 23.15,
    targetY: 8.05,
    targetZ: 10.0,
  },
  kanan_atas: {
    label: 'Pantul Papan Kanan',
    shortLabel: '↗ Papan Kanan',
    targetX: 23.15,
    targetY: 8.05,
    targetZ: 10.35,
  },
  kiri_bawah: {
    label: 'Ring Sisi Kiri',
    shortLabel: '↙ Ring Kiri',
    targetX: 22.75,
    targetY: 7.55,
    targetZ: 9.76,
  },
  tengah_bawah: {
    label: 'Tengah Ring (Swish!)',
    shortLabel: '🎯 Tengah Ring',
    targetX: 22.75,
    targetY: 7.55,
    targetZ: 10.0,
  },
  kanan_bawah: {
    label: 'Ring Sisi Kanan',
    shortLabel: '↘ Ring Kanan',
    targetX: 22.75,
    targetY: 7.55,
    targetZ: 10.24,
  },
};

export type TrashCategoryId = 'organik' | 'anorganik' | 'daur_ulang' | 'b3';
export type CleanupMissionStage = 'inactive' | 'collecting' | 'sorting';

export interface TrashBinMetadata {
  id: TrashCategoryId;
  label: string;
  shortLabel: string;
  icon: string;
  colorHex: string;
  binX: number;
  binZ: number;
  examples: string;
}

export const TRASH_BINS_INFO: Record<TrashCategoryId, TrashBinMetadata> = {
  organik: {
    id: 'organik',
    label: 'Sampah Organik',
    shortLabel: '🌿 Organik',
    icon: '🌿',
    colorHex: '#16A34A',
    binX: 26.4,
    binZ: 43.2,
    examples: 'Sisa buah, daun kering, makanan (Kompos)',
  },
  anorganik: {
    id: 'anorganik',
    label: 'Sampah Anorganik',
    shortLabel: '🛍️ Anorganik',
    icon: '🛍️',
    colorHex: '#EAB308',
    binX: 28.8,
    binZ: 43.2,
    examples: 'Bungkus jajanan, sedotan, styrofoam (Residu)',
  },
  daur_ulang: {
    id: 'daur_ulang',
    label: 'Sampah Daur Ulang',
    shortLabel: '♻️ Daur Ulang',
    icon: '♻️',
    colorHex: '#2563EB',
    binX: 31.2,
    binZ: 43.2,
    examples: 'Botol plastik, kertas, kaleng (Ecobrick/Kriya)',
  },
  b3: {
    id: 'b3',
    label: 'Sampah B3 (Berbahaya)',
    shortLabel: '☣️ B3',
    icon: '☣️',
    colorHex: '#DC2626',
    binX: 33.6,
    binZ: 43.2,
    examples: 'Baterai bekas, bohlam rusak, kaleng aerosol',
  },
};

export interface SchoolTrashItemInfo {
  id: string;
  name: string;
  icon: string;
  category: TrashCategoryId;
  colorHex: string;
  pos: [number, number];
  areaName: string;
  explanation: string;
}

export interface TrashSortResult {
  item: SchoolTrashItemInfo;
  chosenBin: TrashCategoryId;
  correctBin: TrashCategoryId;
  isCorrect: boolean;
  principalComment: string;
}

// South-facing (+Z) Dampu Bulan Square Coordinates (dampuGroup origin at x = 1.5, z = 31.8)
// Player starts at North side (z = 24.3) facing South (+Z, rotation.y = 0) toward Puncak Bulan (z = 39.45)
export const DAMPU_SQUARE_LOCAL_COORDS: Record<number, [number, number]> = {
  0: [0, -7.5], // Garis Start Utara (Menghadap Selatan +Z)
  1: [0, -5.5], // Petak 1
  2: [0, -3.3], // Petak 2
  3: [0, -1.1], // Petak 3
  4: [1.22, 1.1], // Petak 4 (Sayap Kiri saat menghadap Selatan)
  5: [-1.22, 1.1], // Petak 5 (Sayap Kanan saat menghadap Selatan)
  45: [0, 1.1], // Tengah Sayap 4-5 (Pijakan Dampu 2 Kaki)
  6: [0, 3.3], // Petak 6
  7: [1.22, 5.5], // Petak 7 (Sayap Atas Kiri saat menghadap Selatan)
  8: [-1.22, 5.5], // Petak 8 (Sayap Atas Kanan saat menghadap Selatan)
  78: [0, 5.5], // Tengah Sayap 7-8 (Pijakan Dampu 2 Kaki)
  9: [0, 7.65], // Puncak BULAN (Busur Selatan)
};

export const DAMPU_SQUARE_WORLD_COORDS: Record<number, [number, number]> = {
  0: [1.5, 24.3],
  1: [1.5, 26.3],
  2: [1.5, 28.5],
  3: [1.5, 30.7],
  4: [2.72, 32.9],
  5: [0.28, 32.9],
  45: [1.5, 32.9],
  6: [1.5, 35.1],
  7: [2.72, 37.3],
  8: [0.28, 37.3],
  78: [1.5, 37.3],
  9: [1.5, 39.45],
};

export const SCHOOL_TRASH_ITEMS: SchoolTrashItemInfo[] = [
  // 1. ORGANIK (6 items)
  {
    id: 'kulit_pisang',
    name: 'Kulit Pisang Matang',
    icon: '🍌',
    category: 'organik',
    colorHex: '#FACC15',
    pos: [-12.5, 24.5],
    areaName: 'Teras Kantin Sehat',
    explanation: 'Kulit pisang mudah terurai alami dan bagus dijadikan kompos tanaman sekolah.',
  },
  {
    id: 'daun_kering',
    name: 'Tumpukan Daun Kering',
    icon: '🍂',
    category: 'organik',
    colorHex: '#D97706',
    pos: [12.5, 42.0],
    areaName: 'Taman Ecobrick I LOVE SUGA',
    explanation: 'Daun gugur dari pohon halaman adalah sampah Organik untuk pupuk kompos.',
  },
  {
    id: 'sisa_apel',
    name: 'Sisa Buah Apel',
    icon: '🍎',
    category: 'organik',
    colorHex: '#EF4444',
    pos: [-6.5, 34.0],
    areaName: 'Halaman Upacara',
    explanation: 'Sisa buah apel termasuk sampah Organik basah yang mudah membusuk.',
  },
  {
    id: 'ranting_pohon',
    name: 'Ranting & Daun Mangga',
    icon: '🌿',
    category: 'organik',
    colorHex: '#16A34A',
    pos: [-24.0, 38.5],
    areaName: 'Taman Barat Sekolah',
    explanation: 'Ranting kecil dan daun mangga gugur merupakan bahan kompos Organik.',
  },
  {
    id: 'kulit_jeruk',
    name: 'Kulit Jeruk Manis',
    icon: '🍊',
    category: 'organik',
    colorHex: '#F97316',
    pos: [4.5, 19.0],
    areaName: 'Pinggir Lapangan Selatan',
    explanation: 'Kulit buah jeruk alami termasuk sampah Organik yang mudah terurai.',
  },
  {
    id: 'daun_pisang_nasi',
    name: 'Bungkus Daun Pisang',
    icon: '🍃',
    category: 'organik',
    colorHex: '#15803D',
    pos: [-18.5, 28.0],
    areaName: 'Meja Makan Kantin',
    explanation: 'Daun pisang pembungkus nasi uduk adalah sampah Organik ramah lingkungan.',
  },

  // 2. ANORGANIK (6 items)
  {
    id: 'bungkus_ciki',
    name: 'Bungkus Plastik Ciki',
    icon: '🍬',
    category: 'anorganik',
    colorHex: '#EC4899',
    pos: [7.5, 35.0],
    areaName: 'Halaman Depan Sekolah',
    explanation: 'Plastik kemasan jajanan berlapis foil sulit terurai sehingga masuk tong Anorganik.',
  },
  {
    id: 'gelas_sedotan',
    name: 'Cup Es & Sedotan Plastik',
    icon: '🥤',
    category: 'anorganik',
    colorHex: '#38BDF8',
    pos: [-16.0, 17.5],
    areaName: 'Pinggir Lapangan Barat',
    explanation: 'Sedotan dan gelas plastik kotor sekali pakai masuk ke tong Anorganik.',
  },
  {
    id: 'wadah_styrofoam',
    name: 'Gabus Styrofoam Bekas',
    icon: '🥡',
    category: 'anorganik',
    colorHex: '#F8FAFC',
    pos: [16.5, 21.5],
    areaName: 'Pinggir Lapangan Timur',
    explanation: 'Styrofoam tidak bisa membusuk dan tidak bisa didaur ulang biasa (Anorganik).',
  },
  {
    id: 'kantong_kresek',
    name: 'Kantong Plastik Kresek',
    icon: '🛍️',
    category: 'anorganik',
    colorHex: '#F43F5E',
    pos: [19.5, 48.0],
    areaName: 'Dekat Gerbang Timur',
    explanation: 'Kantong kresek plastik kotor sekali pakai termasuk sampah residu Anorganik.',
  },
  {
    id: 'bungkus_mie',
    name: 'Plastik Bungkus Mie',
    icon: '🍜',
    category: 'anorganik',
    colorHex: '#EAB308',
    pos: [-8.5, 18.5],
    areaName: 'Bangku Penonton Barat',
    explanation: 'Bungkus plastik mie instan berlapis minyak masuk ke tempat sampah Anorganik.',
  },
  {
    id: 'sendok_plastik',
    name: 'Sendok & Garpu Plastik',
    icon: '🥄',
    category: 'anorganik',
    colorHex: '#E2E8F0',
    pos: [-25.0, 22.0],
    areaName: 'Samping Kantin Sehat',
    explanation: 'Sendok plastik kecil sekali pakai masuk ke kategori sampah Anorganik.',
  },

  // 3. DAUR ULANG (6 items)
  {
    id: 'botol_ecobrick',
    name: 'Botol Plastik Air Mineral',
    icon: '🧴',
    category: 'daur_ulang',
    colorHex: '#60A5FA',
    pos: [0.0, 21.0],
    areaName: 'Tengah Halaman Sekolah',
    explanation: 'Botol plastik PET bersih bisa didaur ulang menjadi bata Ecobrick SDN SUSUKAN 03!',
  },
  {
    id: 'kertas_kardus',
    name: 'Kertas & Kardus Bekas',
    icon: '📄',
    category: 'daur_ulang',
    colorHex: '#E2E8F0',
    pos: [-11.0, -27.5],
    areaName: 'Selasar Depan Kelas',
    explanation: 'Kertas ujian dan kardus bekas dapat didaur ulang menjadi kertas baru.',
  },
  {
    id: 'kaleng_minuman',
    name: 'Kaleng Minuman Aluminium',
    icon: '🥫',
    category: 'daur_ulang',
    colorHex: '#94A3B8',
    pos: [11.5, -27.5],
    areaName: 'Selasar Ruang Guru',
    explanation: 'Kaleng aluminium dapat dilebur dan didaur ulang kembali 100%.',
  },
  {
    id: 'kardus_susu',
    name: 'Kotak Kardus Susu',
    icon: '📦',
    category: 'daur_ulang',
    colorHex: '#C2A378',
    pos: [27.0, 12.0],
    areaName: 'Selasar Kelas Timur',
    explanation: 'Kardus kemasan bersih dapat dilipat dan dikirim ke pusat Daur Ulang.',
  },
  {
    id: 'koran_majalah',
    name: 'Koran & Majalah Lama',
    icon: '📰',
    category: 'daur_ulang',
    colorHex: '#CBD5E1',
    pos: [-27.0, -5.0],
    areaName: 'Selasar Perpustakaan Barat',
    explanation: 'Koran dan kertas buku bekas sangat bernilai untuk Daur Ulang kertas.',
  },
  {
    id: 'botol_teh_plastik',
    name: 'Botol Teh Plastik Bersih',
    icon: '🍾',
    category: 'daur_ulang',
    colorHex: '#38BDF8',
    pos: [11.0, -3.5],
    areaName: 'Pinggir Lapangan Utara',
    explanation: 'Botol plastik minuman bersih dapat dikumpulkan untuk Daur Ulang Ecobrick.',
  },

  // 4. B3 - BAHAN BERBAHAYA & BERACUN (6 items)
  {
    id: 'baterai_bekas',
    name: 'Baterai Jam Dinding Bekas',
    icon: '🔋',
    category: 'b3',
    colorHex: '#DC2626',
    pos: [-20.5, -28.0],
    areaName: 'Depan Ruang Kepala Sekolah',
    explanation: 'Baterai bekas mengandung logam berat beracun sehingga wajib masuk tong B3 (Merah)!',
  },
  {
    id: 'bohlam_pecah',
    name: 'Lampu Bohlam Rusak',
    icon: '💡',
    category: 'b3',
    colorHex: '#FDE047',
    pos: [20.0, 31.0],
    areaName: 'Taman Timur Sekolah',
    explanation: 'Lampu bohlam rusak tajam dan mengandung zat kimia berbahaya (Sampah B3).',
  },
  {
    id: 'kaleng_aerosol',
    name: 'Kaleng Semprotan Serangga',
    icon: '🧪',
    category: 'b3',
    colorHex: '#F97316',
    pos: [-7.5, 45.5],
    areaName: 'Dekat Gerbang & Pos Satpam',
    explanation: 'Kaleng aerosol bertekanan sisa zat kimia berbahaya wajib masuk tong B3 (Merah)!',
  },
  {
    id: 'botol_obat_uks',
    name: 'Botol Obat Kedaluwarsa',
    icon: '💊',
    category: 'b3',
    colorHex: '#EF4444',
    pos: [26.5, -18.0],
    areaName: 'Depan Ruang UKS',
    explanation: 'Obat-obatan kedaluwarsa dan kemasan medis termasuk limbah B3 berbahaya.',
  },
  {
    id: 'tinta_spidol_kimia',
    name: 'Botol Tinta & Cairan Lab',
    icon: '🧫',
    category: 'b3',
    colorHex: '#A855F7',
    pos: [-27.0, -24.0],
    areaName: 'Selasar Lab IPA',
    explanation: 'Wadah sisa pelarut kimia dan tinta pekat harus dibuang ke tong B3 (Merah).',
  },
  {
    id: 'aki_mainan_rusak',
    name: 'Baterai Kotak Elektronik',
    icon: '🪫',
    category: 'b3',
    colorHex: '#B91C1C',
    pos: [0.0, -28.0],
    areaName: 'Teras Ruang Guru',
    explanation: 'Baterai elektronik bekas tidak boleh dicampur sampah biasa karena termasuk limbah B3.',
  },
];

interface NPCInstance {
  name: string;
  activity: string;
  role: NPCRole;
  group: THREE.Group;
  hips: THREE.Group;
  head: THREE.Group;
  eyesGroup?: THREE.Group;
  mouthGroup?: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  behavior: NPCBehavior;
  phaseOffset: number;
  basePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  moveSpeed: number;
  patrolWaypoints?: [number, number][];
  currentWaypointIdx: number;
  // Multi-Stage Activity Schedule State
  activitySchedule: NPCActivityStage[];
  currentStageIdx: number;
  stageTimer: number;
  isTransitioningWalk: boolean;
  stageTargetPos: THREE.Vector3;
  stageTargetRotY: number;
  // Speech Bubble & Dynamic Label State
  badgeColor: string;
  labelCanvas?: HTMLCanvasElement;
  labelTexture?: THREE.CanvasTexture;
  labelSprite?: THREE.Sprite;
  dialogues: string[];
  currentDialogue: string;
  wasPlayerNear: boolean;
  nextCycleTime: number;
}

function drawNPCLabelCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  activity: string,
  badgeColor: string
) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(6, 6, 244, 52, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 23);

  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 11px monospace';
  const trimmedActivity = activity.length > 30 ? `${activity.slice(0, 28)}..` : activity;
  ctx.fillText(trimmedActivity, 128, 43);
}

function createNPCLabelSprite(
  name: string,
  activity: string,
  badgeColor: string
): {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  drawNPCLabelCanvas(canvas, name, activity, badgeColor);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 0.85, 1);
  return { sprite, canvas, texture: tex };
}

function drawSpeechBubbleCanvas(
  canvas: HTMLCanvasElement,
  speakerName: string,
  activityName: string,
  message: string,
  accentHex: string
) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bx = 16;
  const by = 12;
  const bw = 608;
  const bh = 190;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;

  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 28);
  ctx.fill();
  ctx.stroke();

  // Speech pointer tail at bottom center
  ctx.beginPath();
  ctx.moveTo(292, by + bh - 2);
  ctx.lineTo(320, by + bh + 38);
  ctx.lineTo(348, by + bh - 2);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(295, by + bh - 8, 50, 12);

  // Speaker Header Bar + Current Activity inside bubble
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(speakerName.toUpperCase(), 320, 38);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`[Kegiatan: ${activityName}]`, 320, 62);

  // Word-wrap message into up to 3 crisp lines
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 25px sans-serif';
  const words = message.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const w of words) {
    const testLine = currentLine ? `${currentLine} ${w}` : w;
    if (ctx.measureText(testLine).width > 556 && currentLine) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const displayLines = lines.slice(0, 3);
  const startY = displayLines.length === 1 ? 132 : displayLines.length === 2 ? 114 : 100;
  const lineStep = 33;

  displayLines.forEach((line, idx) => {
    ctx.fillText(line, 320, startY + idx * lineStep);
  });
}

export class SchoolPopulationManager {
  public readonly group = new THREE.Group();
  private npcs: NPCInstance[] = [];
  private futsalBallMesh: THREE.Mesh;

  private boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private cylGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.9, 16);
  private headBodyGeo = createNPCRoundedBoxGeometry(0.88, 0.86, 0.84, 0.14);
  private neckGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.18, 16);
  private headCapGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.08, 16);
  private earGeo = createNPCRoundedBoxGeometry(0.12, 0.24, 0.16, 0.03);
  private facePlaneGeo = new THREE.PlaneGeometry(0.68, 0.68);
  private torsoCoreGeo = createNPCRoundedBoxGeometry(1.22, 1.22, 0.62, 0.06);
  private collarGeo = createNPCRoundedBoxGeometry(0.38, 0.12, 0.28, 0.02);
  private buckleGeo = createNPCRoundedBoxGeometry(0.26, 0.16, 0.08, 0.015);
  private matCache = new Map<string, THREE.MeshStandardMaterial>();
  private faceMatCache = new Map<string, THREE.MeshStandardMaterial>();
  private eyeMat = new THREE.MeshBasicMaterial({ color: '#141417' });
  private shineMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  private blushMat = new THREE.MeshBasicMaterial({ color: '#F87171' });
  private mouthRedMat = new THREE.MeshBasicMaterial({ color: '#991B1B' });
  private tongueMat = new THREE.MeshBasicMaterial({ color: '#FB7185' });
  private glassesFrameMat = new THREE.MeshBasicMaterial({ color: '#0F172A' });

  private sharedBubbleCanvas: HTMLCanvasElement;
  private sharedBubbleTexture: THREE.CanvasTexture;
  private sharedBubbleMaterial: THREE.SpriteMaterial;
  private sharedBubbleSprite: THREE.Sprite;
  private sharedBubbleScale = 0;
  private lastBubbleRenderKey = '';

  // Player Character 3D Speech Bubble & Manual Dialogue State
  private playerBubbleCanvas: HTMLCanvasElement;
  private playerBubbleTexture: THREE.CanvasTexture;
  private playerBubbleMaterial: THREE.SpriteMaterial;
  private playerBubbleSprite: THREE.Sprite;
  private playerBubbleTimer = 0;
  private playerCurrentReply = '';
  private lastPlayerRenderKey = '';
  private soloGreetingIdx = 0;

  // 3D PJOK Mini-Game State (Penalty Shootout & Basketball Hoop Throw)
  private penaltyModeActive = false;
  private activeMissionType: PJOKMissionMode = 'penalty';
  private penaltyAimZone: PenaltyZoneId = 'kiri_atas';
  private penaltyTargetGroup: THREE.Group;
  private penaltySpotMesh: THREE.Mesh;
  private basketballMesh: THREE.Group;
  private penaltyShotState: 'idle' | 'flying' | 'rebound' = 'idle';
  private penaltyShotTimer = 0;
  private penaltyBallStart = new THREE.Vector3(-9.8, 0.38, 10.0);
  private penaltyBallEnd = new THREE.Vector3(-22.5, 2.0, 10.0);
  private penaltyBallRebound = new THREE.Vector3(-15.0, 0.38, 10.0);
  private penaltyLastOutcome: PenaltyShotOutcome = 'goal';
  private keeperDiveTargetZ = 10.0;
  private keeperDiveTargetY = 1.22;
  private keeperDiveRoll = 0;

  // 3D Principal Cleanup & Waste Sorting Mission State (Organik, Anorganik, Daur Ulang, B3)
  private cleanupStage: CleanupMissionStage = 'inactive';
  private collectedTrashSet = new Set<string>();
  private onTrashPickedUpCallback?: (item: SchoolTrashItemInfo) => void;
  private cleanupStationGroup: THREE.Group;
  private binLidMap = new Map<TrashCategoryId, THREE.Group>();
  private activeOpenBin: TrashCategoryId | null = null;
  private binOpenTimer = 0;
  private trashNodeMap = new Map<
    string,
    { info: SchoolTrashItemInfo; group: THREE.Group; mesh: THREE.Object3D; ring: THREE.Mesh }
  >();
  private thrownTrashGroup: THREE.Group;
  private thrownTrashMesh: THREE.Mesh;
  private thrownTrashMat: THREE.MeshStandardMaterial;
  private trashThrowActive = false;
  private trashThrowTimer = 0;
  private trashThrowStart = new THREE.Vector3(30.0, 2.35, 48.8);
  private trashThrowEnd = new THREE.Vector3(30.0, 1.85, 43.2);
  private trashLastSortCorrect = true;

  // 3D Grade 1 Mathematics Mission State (Bu Maya, S.Pd. in Ruang Kelas 1A)
  private mathMissionActive = false;
  private mathBoardCanvas: HTMLCanvasElement;
  private mathBoardCtx: CanvasRenderingContext2D;
  private mathBoardTex: THREE.CanvasTexture;
  private mathBoardMesh: THREE.Mesh;
  private mathLastAnswerCorrect: boolean | null = null;
  private mathFeedbackTimer = 0;

  // 3D Traditional Indonesian Games Props beside Lapangan Olahraga (Lompat Tali, Dampu Bulan, Kelereng)
  private jumpRopePivot!: THREE.Group;
  private dampuGacoGroup!: THREE.Group;
  private kelerengShooterA!: THREE.Mesh;
  private kelerengShooterB!: THREE.Mesh;

  // 3D Dampu Bulan Mission State (Wulan & Mentari beside Lapangan Olahraga)
  private dampuMissionActive = false;
  private dampuGacoThrowActive = false;
  private dampuGacoThrowTimer = 0;
  private dampuGacoStart = new THREE.Vector3(0, 1.35, -7.2);
  private dampuGacoEnd = new THREE.Vector3(0, 0.012, -5.5);

  // 3D Lompat Tali Karet Mission State (Intan, Dewi & Kartika at x = -12.5, z = 29.5)
  private jumpRopeMissionActive = false;
  private jumpRopeSpeedMultiplier = 1.0;

  // 3D Main Kelereng / Gundu Mission State (Bimo & Ciko at x = 14.5, z = 29.5)
  private kelerengMissionActive = false;
  private kelerengTargetMarbles: {
    mesh: THREE.Mesh;
    homeX: number;
    homeZ: number;
    knockedOut: boolean;
    knockOutX: number;
    knockOutZ: number;
  }[] = [];
  private kelerengShotActive = false;
  private kelerengShotTimer = 0;
  private kelerengShotTargetIdx = 0;
  private kelerengShotHit = false;
  private kelerengGacoStart = new THREE.Vector3(0, 0.135, 2.1);
  private kelerengGacoEnd = new THREE.Vector3(0, 0.135, 0);

  // Street Traffic (Cars & Motorcycles) + Satpam Zebra Cross Mission
  private crossingMissionActive = false;
  private crossingTrafficStopped = false;
  private crossingActionTimer = 0;
  private crossingWaveSuccess = true;
  private crossingStopSignGroup!: THREE.Group;

  // Laras (Duta Adiwiyata) Ecobrick "I LOVE SUGA" Puzzle Mission State
  private ecobrickMissionActive = false;
  private ecobrickIsScattered = false;

  // Tono (Kelas 2A) Street Food Snack Budget & Change Calculation Mission State
  private tonoMissionActive = false;
  private tonoMissionSuccess = true;
  private tonoActionTimer = 0;

  // Pak Budi (Guru PJOK) Obstacle Course (Lari Rintangan Keliling Lapangan) State
  private obstacleCourseActive = false;
  private obstacleCourseGroup!: THREE.Group;
  private obstacleMeshes: { group: THREE.Group; isKnocked: boolean; targetRotX: number }[] = [];
  private bonusStarMeshes: THREE.Mesh[] = [];

  // Opening Flag Ceremony (Upacara Bendera Merah Putih — Lagu Indonesia Raya) State
  private openingCeremonyActive = false;
  private ceremonyFlagProgress = 0;
  private ceremonySlots = new Map<
    NPCInstance,
    {
      x: number;
      z: number;
      rotY: number;
      ceremonyRole:
        | 'paskibra_left'
        | 'paskibra_center'
        | 'paskibra_right'
        | 'student_salute'
        | 'teacher_salute';
      ceremonyLabel: string;
    }
  >();

  private streetVehicles: {
    group: THREE.Group;
    wheels: THREE.Object3D[];
    laneZ: number;
    dir: 1 | -1;
    speed: number;
    currentSpeed: number;
    length: number;
  }[] = [];

  private getMat(colorHex: string, roughness = 0.7): THREE.MeshStandardMaterial {
    const key = `${colorHex}_${roughness}`;
    let mat = this.matCache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness });
      this.matCache.set(key, mat);
    }
    return mat;
  }

  private getFaceMat(skinHex: string, expression: FaceExpressionId): THREE.MeshStandardMaterial {
    const key = `${skinHex}_${expression}`;
    let mat = this.faceMatCache.get(key);
    if (!mat) {
      const tex = createFaceTexture(skinHex, expression, 4);
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.38,
        metalness: 0.04,
      });
      this.faceMatCache.set(key, mat);
    }
    return mat;
  }

  constructor(scene: THREE.Scene) {
    const ballMat = this.getMat('#F8FAFC', 0.35);
    this.futsalBallMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), ballMat);
    this.futsalBallMesh.position.set(0, 0.38, 10);
    this.futsalBallMesh.castShadow = true;
    this.group.add(this.futsalBallMesh);

    // 3D Orange Basketball with black seam ribs
    this.basketballMesh = new THREE.Group();
    const orangeBallMat = this.getMat('#EA580C', 0.55);
    const seamMat = this.getMat('#18181B', 0.8);
    const bCore = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 20), orangeBallMat);
    bCore.castShadow = true;
    const seam1 = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.018, 8, 24), seamMat);
    const seam2 = new THREE.Mesh(new THREE.TorusGeometry(0.385, 0.018, 8, 24), seamMat);
    seam2.rotation.y = Math.PI / 2;
    this.basketballMesh.add(bCore, seam1, seam2);
    this.basketballMesh.position.set(12.85, 2.38, 10.0);
    this.basketballMesh.visible = false;
    this.group.add(this.basketballMesh);

    this.sharedBubbleCanvas = document.createElement('canvas');
    this.sharedBubbleCanvas.width = 640;
    this.sharedBubbleCanvas.height = 256;
    this.sharedBubbleTexture = new THREE.CanvasTexture(this.sharedBubbleCanvas);
    this.sharedBubbleTexture.colorSpace = THREE.SRGBColorSpace;
    this.sharedBubbleTexture.generateMipmaps = false;
    this.sharedBubbleTexture.minFilter = THREE.LinearFilter;

    this.sharedBubbleMaterial = new THREE.SpriteMaterial({
      map: this.sharedBubbleTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.sharedBubbleSprite = new THREE.Sprite(this.sharedBubbleMaterial);
    this.sharedBubbleSprite.scale.set(0, 0, 1);
    this.sharedBubbleSprite.renderOrder = 25;
    this.sharedBubbleSprite.visible = false;
    this.group.add(this.sharedBubbleSprite);

    // Initialize Player Character 3D Speech Bubble Sprite
    this.playerBubbleCanvas = document.createElement('canvas');
    this.playerBubbleCanvas.width = 640;
    this.playerBubbleCanvas.height = 256;
    this.playerBubbleTexture = new THREE.CanvasTexture(this.playerBubbleCanvas);
    this.playerBubbleTexture.colorSpace = THREE.SRGBColorSpace;
    this.playerBubbleTexture.generateMipmaps = false;
    this.playerBubbleTexture.minFilter = THREE.LinearFilter;

    this.playerBubbleMaterial = new THREE.SpriteMaterial({
      map: this.playerBubbleTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.playerBubbleSprite = new THREE.Sprite(this.playerBubbleMaterial);
    this.playerBubbleSprite.scale.set(0, 0, 1);
    this.playerBubbleSprite.renderOrder = 26;
    this.playerBubbleSprite.visible = false;
    this.group.add(this.playerBubbleSprite);

    // Initialize 3D Penalty Spot & Goal Aiming Target Reticle inside West Goal (x = -21.55)
    const spotGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 24);
    const spotMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });
    this.penaltySpotMesh = new THREE.Mesh(spotGeo, spotMat);
    this.penaltySpotMesh.position.set(-9.8, 0.025, 10.0);
    this.penaltySpotMesh.visible = false;
    this.group.add(this.penaltySpotMesh);

    this.penaltyTargetGroup = new THREE.Group();
    this.penaltyTargetGroup.position.set(-21.5, 3.55, 12.45);
    this.penaltyTargetGroup.rotation.y = Math.PI / 2;

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.82, 28),
      new THREE.MeshBasicMaterial({
        color: '#22C55E',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.36, 24),
      new THREE.MeshBasicMaterial({
        color: '#FACC15',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      })
    );
    const centerDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 16),
      new THREE.MeshBasicMaterial({ color: '#EF4444', side: THREE.DoubleSide })
    );
    this.penaltyTargetGroup.add(outerRing, innerRing, centerDot);
    this.penaltyTargetGroup.visible = false;
    this.group.add(this.penaltyTargetGroup);

    // Build 3D Bank Sampah 4 Tong Pilah (Organik, Anorganik, Daur Ulang, B3) & 12 3D School Trash Items
    this.cleanupStationGroup = new THREE.Group();
    this.thrownTrashGroup = new THREE.Group();
    this.thrownTrashMat = new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.5 });
    this.thrownTrashMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.32, 0),
      this.thrownTrashMat
    );
    this.thrownTrashMesh.castShadow = true;
    this.thrownTrashGroup.add(this.thrownTrashMesh);
    this.thrownTrashGroup.visible = false;
    this.group.add(this.thrownTrashGroup);

    this.buildCleanupBinsAndTrash();
    this.buildTraditionalGamesArena();
    this.buildStreetTrafficAndZebraCross();
    this.buildObstacleCourseArena();

    // Build Interactive 3D Chalkboard for Grade 1 Mathematics Mission inside Ruang Kelas 1A (x = -63.66, y = 4.3, z = -24.0)
    this.mathBoardCanvas = document.createElement('canvas');
    this.mathBoardCanvas.width = 768;
    this.mathBoardCanvas.height = 256;
    this.mathBoardCtx = this.mathBoardCanvas.getContext('2d')!;
    this.mathBoardTex = new THREE.CanvasTexture(this.mathBoardCanvas);
    this.mathBoardTex.colorSpace = THREE.SRGBColorSpace;
    const mathBoardMat = new THREE.MeshStandardMaterial({
      map: this.mathBoardTex,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.mathBoardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(10.25, 2.75, 0.14),
      mathBoardMat
    );
    this.mathBoardMesh.rotation.y = Math.PI / 2;
    this.mathBoardMesh.position.set(-63.68, 4.3, -24.0);
    this.mathBoardMesh.visible = false;
    this.group.add(this.mathBoardMesh);

    this.spawnAllSchoolNPCs();
    this.computeCeremonyFormationSlots();
    scene.add(this.group);
  }

  private buildCleanupBinsAndTrash() {
    // 1. Concrete Platform & 4 Color-Coded Sorting Bins beside Ruangan Kantin (x = 30.0, z = 43.2)
    const padMesh = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.14, 2.6),
      this.getMat('#334155', 0.85)
    );
    padMesh.position.set(30.0, 0.07, 43.2);
    padMesh.receiveShadow = true;
    this.cleanupStationGroup.add(padMesh);

    const binCategories: TrashCategoryId[] = ['organik', 'anorganik', 'daur_ulang', 'b3'];
    binCategories.forEach((catId) => {
      const info = TRASH_BINS_INFO[catId];
      const binGroup = new THREE.Group();
      binGroup.position.set(info.binX, 0.14, info.binZ);
      // Face South (+Z) away from the Canteen side wall (z = 44.0) toward the student at z = 51.2
      binGroup.rotation.y = Math.PI;

      const bodyMat = this.getMat(info.colorHex, 0.45);
      const darkRimMat = this.getMat('#0F172A', 0.6);

      // Tapered Bin Body
      const bodyMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.54, 1.65, 20),
        bodyMat
      );
      bodyMesh.position.set(0, 0.825, 0);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      binGroup.add(bodyMesh);

      // White front emblem plaque
      const plaqueMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.55, 0.06),
        this.getMat('#F8FAFC', 0.4)
      );
      plaqueMesh.position.set(0, 0.9, -0.62);
      binGroup.add(plaqueMesh);

      // Dark collar rim
      const collarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.7, 0.12, 20),
        darkRimMat
      );
      collarMesh.position.set(0, 1.66, 0);
      binGroup.add(collarMesh);

      // Hinged Lid Pivot at back of bin (+Z) so it opens toward the player (-Z)
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 1.72, 0.58);
      const lidMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.1, 20),
        bodyMat
      );
      lidMesh.position.set(0, 0.04, -0.58);
      const handleMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.08, 0.14),
        darkRimMat
      );
      handleMesh.position.set(0, 0.11, -0.95);
      lidPivot.add(lidMesh, handleMesh);
      binGroup.add(lidPivot);
      this.binLidMap.set(catId, lidPivot);

      // Floating 3D Sign Sprite above each bin
      const signData = createNPCLabelSprite(
        info.shortLabel.toUpperCase(),
        info.label,
        info.colorHex
      );
      signData.sprite.position.set(0, 2.75, 0);
      signData.sprite.scale.set(2.55, 0.68, 1);
      binGroup.add(signData.sprite);

      this.cleanupStationGroup.add(binGroup);
    });

    this.group.add(this.cleanupStationGroup);

    // 2. Spawn 12 3D Trash Items across the School Courtyard
    SCHOOL_TRASH_ITEMS.forEach((item) => {
      const nodeGroup = new THREE.Group();
      const floorY = item.pos[1] < -34.0 ? 0.45 : 0;
      nodeGroup.position.set(item.pos[0], floorY, item.pos[1]);

      // Glowing Ground Ring so player can spot trash easily in 3D
      const ringGeo = new THREE.RingGeometry(0.55, 0.78, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: TRASH_BINS_INFO[item.category].colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, 0.03, 0);
      nodeGroup.add(ringMesh);

      // Distinct 3D Trash Object Mesh
      const itemMat = this.getMat(item.colorHex, 0.45);
      let itemMesh: THREE.Object3D;
      if (item.category === 'daur_ulang') {
        itemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.56, 14), itemMat);
        itemMesh.rotation.z = 0.45;
      } else if (item.category === 'b3') {
        itemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.48, 16), itemMat);
      } else if (item.category === 'organik') {
        itemMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), itemMat);
      } else {
        itemMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.26, 0.36), itemMat);
      }
      itemMesh.position.set(0, 0.35, 0);
      itemMesh.castShadow = true;
      nodeGroup.add(itemMesh);

      // Floating Label Sprite above Trash Item
      const labelInfo = createNPCLabelSprite(
        `${item.icon} ${item.name}`,
        `📍 ${item.areaName}`,
        TRASH_BINS_INFO[item.category].colorHex
      );
      labelInfo.sprite.position.set(0, 1.45, 0);
      labelInfo.sprite.scale.set(2.9, 0.74, 1);
      nodeGroup.add(labelInfo.sprite);

      nodeGroup.visible = false;
      this.group.add(nodeGroup);
      this.trashNodeMap.set(item.id, {
        info: item,
        group: nodeGroup,
        mesh: itemMesh,
        ring: ringMesh,
      });
    });
  }

  /**
   * Builds the 3D Traditional Indonesian Games Arena right beside Lapangan Olahraga (z = 29.5):
   * 1. Lompat Tali Karet Gelang (x = -12.5, z = 29.5) with rotating 3D colorful rubber-band rope
   * 2. Dampu Bulan / Engklek (x = 1.5, z = 29.5) with chalk grid Petak 1-8, Puncak Bulan & animated Gaco
   * 3. Main Kelereng / Gundu (x = 14.5, z = 29.5) with chalk ring, inner triangle & shooting glass marbles
   */
  private buildTraditionalGamesArena() {
    const arenaGroup = new THREE.Group();
    const chalkWhiteMat = new THREE.MeshBasicMaterial({
      color: '#F8FAFC',
      side: THREE.DoubleSide,
    });

    // =========================================================================
    // 1. ARENA LOMPAT TALI KARET GELANG (x = -12.5, z = 29.5)
    // =========================================================================
    const ropeStation = new THREE.Group();
    ropeStation.position.set(-12.5, 0, 29.5);

    // Subtle chalk court border beneath jumper & rope turners
    const ropePadGeo = new THREE.PlaneGeometry(7.6, 3.0);
    ropePadGeo.rotateX(-Math.PI / 2);
    const ropeMatPad = new THREE.Mesh(
      ropePadGeo,
      new THREE.MeshBasicMaterial({
        color: '#FEF08A',
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    ropeMatPad.position.y = 0.02;
    ropeStation.add(ropeMatPad);

    // 3D Swinging Rubber-Band Rope Pivot at hand height (y = 1.82) spanning X from -3.1 to +3.1
    this.jumpRopePivot = new THREE.Group();
    this.jumpRopePivot.position.set(0, 1.82, 0);
    const rubberColors = ['#EF4444', '#FACC15', '#22C55E', '#38BDF8', '#EC4899'];
    const numSegments = 20;
    const halfSpan = 3.15;
    const maxBow = 1.62;
    for (let i = 0; i < numSegments; i++) {
      const t0 = i / numSegments;
      const t1 = (i + 1) / numSegments;
      const x0 = THREE.MathUtils.lerp(-halfSpan, halfSpan, t0);
      const x1 = THREE.MathUtils.lerp(-halfSpan, halfSpan, t1);
      const y0 = Math.sin(t0 * Math.PI) * maxBow;
      const y1 = Math.sin(t1 * Math.PI) * maxBow;
      const mx = (x0 + x1) * 0.5;
      const my = (y0 + y1) * 0.5;
      const segLen = Math.hypot(x1 - x0, y1 - y0);
      const angleZ = Math.atan2(y1 - y0, x1 - x0);

      const segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, segLen + 0.04, 8),
        this.getMat(rubberColors[i % rubberColors.length], 0.45)
      );
      segMesh.position.set(mx, my, 0);
      segMesh.rotation.z = angleZ - Math.PI / 2;
      this.jumpRopePivot.add(segMesh);
    }
    ropeStation.add(this.jumpRopePivot);

    const ropeLabel = createNPCLabelSprite(
      '🪢 LOMPAT TALI KARET',
      'Permainan Tradisional di Sebelah Lapangan',
      '#EC4899'
    );
    ropeLabel.sprite.position.set(0, 4.55, 0);
    ropeLabel.sprite.scale.set(3.2, 0.82, 1);
    ropeStation.add(ropeLabel.sprite);
    arenaGroup.add(ropeStation);

    // =========================================================================
    // 2. ARENA DAMPU BULAN / ENGKLEK BESAR MENGHADAP SELATAN (+Z) (x = 1.5, z = 31.8)
    //    Garis Start & Petak 1 di Utara (z = 26.3) -> Petak 2..8 -> Puncak Bulan di Selatan (z = 39.45)
    // =========================================================================
    const dampuGroup = new THREE.Group();
    dampuGroup.position.set(1.5, 0.025, 31.8);

    // Subtle dark asphalt/slate base mat under the entire South-facing Dampu Bulan court so chalk colors pop vividly
    const dampuPadGeo = new THREE.PlaneGeometry(6.4, 16.4);
    dampuPadGeo.rotateX(-Math.PI / 2);
    const dampuBasePad = new THREE.Mesh(
      dampuPadGeo,
      new THREE.MeshBasicMaterial({
        color: '#1E293B',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      })
    );
    dampuBasePad.position.set(0, -0.004, 1.2);
    dampuGroup.add(dampuBasePad);

    const createDampuNumberTexture = (numText: string, bgHex: string): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.save();
      // Rotate canvas 180 deg so number is right-side-up when looking South (+Z)
      ctx.translate(64, 64);
      ctx.rotate(Math.PI);
      ctx.translate(-64, -64);
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, 118, 118);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 68px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(numText, 64, 67);
      ctx.restore();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      return tex;
    };

    const sqOutlineGeo = new THREE.PlaneGeometry(2.44, 2.22);
    sqOutlineGeo.rotateX(-Math.PI / 2);
    const sqInnerGeo = new THREE.PlaneGeometry(2.24, 2.04);
    sqInnerGeo.rotateX(-Math.PI / 2);

    const addDampuSquare = (lx: number, lz: number, fillHex: string, numLabel: string) => {
      const sqGroup = new THREE.Group();
      sqGroup.position.set(lx, 0, lz);
      const outline = new THREE.Mesh(sqOutlineGeo, chalkWhiteMat);
      const sqTex = createDampuNumberTexture(numLabel, fillHex);
      const inner = new THREE.Mesh(
        sqInnerGeo,
        new THREE.MeshBasicMaterial({
          map: sqTex,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
        })
      );
      inner.userData.softwareColor = fillHex;
      inner.position.y = 0.004;
      sqGroup.add(outline, inner);
      dampuGroup.add(sqGroup);
    };

    // Petak 1, 2, 3 (Single large squares progressing North -> South / Menghadap Selatan +Z)
    addDampuSquare(0, -5.5, '#EC4899', '1'); // Petak 1 (Utara)
    addDampuSquare(0, -3.3, '#0284C7', '2'); // Petak 2
    addDampuSquare(0, -1.1, '#EAB308', '3'); // Petak 3
    // Sayap 4 & 5 (Double wing squares facing South: Kiri = +X, Kanan = -X)
    addDampuSquare(1.22, 1.1, '#16A34A', '4'); // Petak 4 (Sayap Kiri saat menghadap Selatan)
    addDampuSquare(-1.22, 1.1, '#EA580C', '5'); // Petak 5 (Sayap Kanan saat menghadap Selatan)
    // Petak 6 (Single neck square)
    addDampuSquare(0, 3.3, '#7C3AED', '6'); // Petak 6
    // Sayap 7 & 8 (Upper double wing squares facing South)
    addDampuSquare(1.22, 5.5, '#0D9488', '7'); // Petak 7 (Sayap Atas Kiri saat menghadap Selatan)
    addDampuSquare(-1.22, 5.5, '#E11D48', '8'); // Petak 8 (Sayap Atas Kanan saat menghadap Selatan)

    // Puncak BULAN / GUNUNG (Giant Semicircular Moon Arch curving Southward +Z at z = +6.62)
    const moonOutlineGeo = new THREE.CircleGeometry(2.54, 36, Math.PI, Math.PI);
    moonOutlineGeo.rotateX(-Math.PI / 2);
    const moonOutline = new THREE.Mesh(moonOutlineGeo, chalkWhiteMat);
    moonOutline.position.set(0, 0.003, 6.62);

    const moonFillGeo = new THREE.CircleGeometry(2.32, 36, Math.PI, Math.PI);
    moonFillGeo.rotateX(-Math.PI / 2);
    const moonFill = new THREE.Mesh(
      moonFillGeo,
      new THREE.MeshBasicMaterial({
        color: '#FACC15',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    );
    moonFill.position.set(0, 0.006, 6.62);
    dampuGroup.add(moonOutline, moonFill);

    // Animated 3D Gaco (Pecahan Genteng / Batu Pipih Dampu Bulan — Diperbesar)
    this.dampuGacoGroup = new THREE.Group();
    const gacoStone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.48, 0.12, 20),
      this.getMat('#EA580C', 0.45)
    );
    gacoStone.position.y = 0.06;
    gacoStone.castShadow = true;
    const gacoGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.7, 24),
      new THREE.MeshBasicMaterial({ color: '#FEF08A', side: THREE.DoubleSide })
    );
    gacoGlow.rotation.x = -Math.PI / 2;
    gacoGlow.position.y = 0.012;
    this.dampuGacoGroup.add(gacoStone, gacoGlow);
    this.dampuGacoGroup.position.set(0, 0.012, -1.1);
    dampuGroup.add(this.dampuGacoGroup);

    const dampuLabel = createNPCLabelSprite(
      '🌙 ARENA DAMPU BULAN (ENGKLEK)',
      'Menghadap Selatan · Klik Wulan/Mentari untuk Main!',
      '#F59E0B'
    );
    dampuLabel.sprite.position.set(0, 4.75, 1.0);
    dampuLabel.sprite.scale.set(3.85, 0.94, 1);
    dampuGroup.add(dampuLabel.sprite);
    arenaGroup.add(dampuGroup);

    // =========================================================================
    // 3. ARENA MAIN KELERENG / GUNDU (x = 14.5, z = 29.5)
    // =========================================================================
    const kelerengGroup = new THREE.Group();
    kelerengGroup.position.set(14.5, 0.022, 29.5);

    // Subtle sandy circle court pad with baked horizontal geometry
    const kelerengPadGeo = new THREE.CircleGeometry(1.75, 32);
    kelerengPadGeo.rotateX(-Math.PI / 2);
    const kelerengPadMat = new THREE.MeshBasicMaterial({
      color: '#1E293B',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const kelerengPad = new THREE.Mesh(kelerengPadGeo, kelerengPadMat);
    kelerengPad.position.y = -0.004;
    kelerengPad.userData.softwareColor = '#334155';
    kelerengGroup.add(kelerengPad);

    // Chalk outer circle ring
    const outerCircleGeo = new THREE.RingGeometry(1.48, 1.62, 36);
    outerCircleGeo.rotateX(-Math.PI / 2);
    const outerCircle = new THREE.Mesh(outerCircleGeo, chalkWhiteMat);
    kelerengGroup.add(outerCircle);

    // Chalk inner target triangle for target marbles (pasangan kelereng)
    const innerTriGeo = new THREE.RingGeometry(0.68, 0.8, 3);
    innerTriGeo.rotateX(-Math.PI / 2);
    const innerTriangle = new THREE.Mesh(
      innerTriGeo,
      new THREE.MeshBasicMaterial({ color: '#F87171', side: THREE.DoubleSide })
    );
    innerTriangle.position.y = 0.003;
    kelerengGroup.add(innerTriangle);

    // 7 Colorful Target Glass Marbles clustered inside the triangle
    const marbleOffsets: [number, number, string][] = [
      [0, 0, '#38BDF8'],
      [-0.24, 0.18, '#22C55E'],
      [0.24, 0.18, '#FACC15'],
      [-0.22, -0.2, '#EC4899'],
      [0.22, -0.2, '#A855F7'],
      [0, 0.34, '#F97316'],
      [0, -0.34, '#14B8A6'],
    ];
    this.kelerengTargetMarbles = [];
    const marbleGeo = new THREE.SphereGeometry(0.11, 14, 14);
    marbleOffsets.forEach(([mx, mz, mHex], idx) => {
      const mMesh = new THREE.Mesh(marbleGeo, this.getMat(mHex, 0.15));
      mMesh.position.set(mx, 0.11, mz);
      mMesh.castShadow = true;
      kelerengGroup.add(mMesh);
      const angle = (idx / marbleOffsets.length) * Math.PI * 1.4 - Math.PI * 0.7;
      this.kelerengTargetMarbles.push({
        mesh: mMesh,
        homeX: mx,
        homeZ: mz,
        knockedOut: false,
        knockOutX: Math.sin(angle) * 1.88,
        knockOutZ: -1.65 - Math.cos(angle) * 0.35,
      });
    });

    // 2 Animated Shooter Marbles (Gaco Kelereng) flicked by Bimo, Ciko & Player
    this.kelerengShooterA = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 16, 16),
      this.getMat('#EF4444', 0.12)
    );
    this.kelerengShooterA.position.set(-1.2, 0.135, 0.15);
    this.kelerengShooterA.castShadow = true;

    this.kelerengShooterB = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 16, 16),
      this.getMat('#3B82F6', 0.12)
    );
    this.kelerengShooterB.position.set(1.2, 0.135, -0.15);
    this.kelerengShooterB.castShadow = true;
    kelerengGroup.add(this.kelerengShooterA, this.kelerengShooterB);

    const kelerengLabel = createNPCLabelSprite(
      '🔮 MAIN KELERENG (GUNDU)',
      'Klik Bimo / Ciko untuk Misi Bermain Kelereng!',
      '#0284C7'
    );
    kelerengLabel.sprite.position.set(0, 4.45, 0);
    kelerengLabel.sprite.scale.set(3.35, 0.82, 1);
    kelerengGroup.add(kelerengLabel.sprite);
    arenaGroup.add(kelerengGroup);

    this.group.add(arenaGroup);
  }

  /**
   * 3D Obstacle Course Arena around Lapangan Olahraga (Center 0, 10.0, 50x31)
   * Track: 124.8 units circuit around the perimeter of the court.
   * Start/Finish Gate at (-14.0, 22.0)
   * 8 Authentic Indonesian SD Hurdles, Cones, Foam Blocks & Tires
   */
  private buildObstacleCourseArena() {
    this.obstacleCourseGroup = new THREE.Group();
    this.obstacleMeshes = [];
    this.bonusStarMeshes = [];

    const whiteMat = this.getMat('#F8FAFC', 0.35);
    const darkMat = this.getMat('#1E293B', 0.8);
    const redMat = this.getMat('#DC2626', 0.4);
    const yellowMat = this.getMat('#FACC15', 0.4);
    const blueMat = this.getMat('#2563EB', 0.5);
    const greenMat = this.getMat('#16A34A', 0.5);
    const orangeMat = this.getMat('#EA580C', 0.5);
    const goldStarMat = new THREE.MeshStandardMaterial({
      color: '#FBBF24',
      roughness: 0.25,
      metalness: 0.6,
      emissive: new THREE.Color('#F59E0B'),
      emissiveIntensity: 0.35,
    });

    // 1. Start / Finish Line Checkered Strip (x = -14.0, z = 22.0)
    const checkCanvas = document.createElement('canvas');
    checkCanvas.width = 128;
    checkCanvas.height = 128;
    const cctx = checkCanvas.getContext('2d')!;
    const cellSize = 16;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        cctx.fillStyle = (row + col) % 2 === 0 ? '#F8FAFC' : '#0F172A';
        cctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
    const checkTex = new THREE.CanvasTexture(checkCanvas);
    const checkMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 1.8),
      new THREE.MeshStandardMaterial({
        map: checkTex,
        roughness: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    checkMesh.rotation.x = -Math.PI / 2;
    checkMesh.position.set(-14.0, 0.025, 22.0);
    this.obstacleCourseGroup.add(checkMesh);

    // Start / Finish Arch (2 vertical posts + overhead banner)
    const archGroup = new THREE.Group();
    archGroup.position.set(-14.0, 0, 22.0);
    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 4.4, 16);
    const postL = new THREE.Mesh(postGeo, whiteMat);
    postL.position.set(0, 2.2, -2.2);
    postL.castShadow = true;
    const postR = new THREE.Mesh(postGeo, whiteMat);
    postR.position.set(0, 2.2, 2.2);
    postR.castShadow = true;
    archGroup.add(postL, postR);

    // Banner Overhead
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d')!;
    bctx.fillStyle = '#15803D';
    bctx.fillRect(0, 0, 512, 128);
    bctx.fillStyle = '#FACC15';
    bctx.fillRect(0, 0, 512, 10);
    bctx.fillRect(0, 118, 512, 10);
    bctx.fillStyle = '#FFFFFF';
    bctx.font = 'bold 36px sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('🏁 START / FINISH PJOK 🏃', 256, 48);
    bctx.font = 'bold 24px sans-serif';
    bctx.fillStyle = '#FEF08A';
    bctx.fillText('LARI RINTANGAN SDN SUSUKAN 03', 256, 90);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.5, side: THREE.DoubleSide });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), bannerMat);
    bannerMesh.position.set(0, 4.0, 0);
    bannerMesh.rotation.y = Math.PI / 2;
    archGroup.add(bannerMesh);
    this.obstacleCourseGroup.add(archGroup);

    // Helper to create a realistic SD hurdle / gawang rintangan (height ~ 0.72)
    const createHurdle = (matA: THREE.Material, matB: THREE.Material) => {
      const hGroup = new THREE.Group();
      // 2 horizontal feet on ground
      const footGeo = new THREE.BoxGeometry(0.12, 0.05, 0.75);
      const footL = new THREE.Mesh(footGeo, whiteMat);
      footL.position.set(-1.45, 0.025, 0);
      const footR = new THREE.Mesh(footGeo, whiteMat);
      footR.position.set(1.45, 0.025, 0);
      // 2 upright posts
      const upGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.7, 12);
      const upL = new THREE.Mesh(upGeo, whiteMat);
      upL.position.set(-1.45, 0.35, 0);
      upL.castShadow = true;
      const upR = new THREE.Mesh(upGeo, whiteMat);
      upR.position.set(1.45, 0.35, 0);
      upR.castShadow = true;
      // Crossbar board with stripes
      const boardGroup = new THREE.Group();
      boardGroup.position.set(0, 0.65, 0);
      const segWidth = 3.1 / 7;
      for (let s = 0; s < 7; s++) {
        const segMat = s % 2 === 0 ? matA : matB;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.18, 0.06), segMat);
        seg.position.set(-1.55 + segWidth * (s + 0.5), 0, 0);
        seg.castShadow = true;
        boardGroup.add(seg);
      }
      hGroup.add(footL, footR, upL, upR, boardGroup);
      return hGroup;
    };

    // Helper for 3 cones
    const createCones = () => {
      const cGroup = new THREE.Group();
      const coneGeo = new THREE.ConeGeometry(0.24, 0.58, 14);
      const baseGeo = new THREE.BoxGeometry(0.5, 0.04, 0.5);
      const offsets = [-0.85, 0, 0.85];
      for (const ox of offsets) {
        const coneMesh = new THREE.Mesh(coneGeo, orangeMat);
        coneMesh.position.set(ox, 0.29, 0);
        coneMesh.castShadow = true;
        const baseMesh = new THREE.Mesh(baseGeo, orangeMat);
        baseMesh.position.set(ox, 0.02, 0);
        // white reflective ring
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.14, 14), whiteMat);
        ring.position.set(ox, 0.27, 0);
        cGroup.add(coneMesh, baseMesh, ring);
      }
      return cGroup;
    };

    // Helper for foam block
    const createFoamBox = (mat: THREE.Material) => {
      const fGroup = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 0.7), mat);
      box.position.set(0, 0.3, 0);
      box.castShadow = true;
      // White stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.12, 0.72), whiteMat);
      stripe.position.set(0, 0.3, 0);
      fGroup.add(box, stripe);
      return fGroup;
    };

    // Helper for tires
    const createTires = () => {
      const tGroup = new THREE.Group();
      const tireGeo = new THREE.TorusGeometry(0.38, 0.13, 10, 16);
      tireGeo.rotateX(-Math.PI / 2);
      const t1 = new THREE.Mesh(tireGeo, darkMat);
      t1.position.set(-0.55, 0.13, 0);
      t1.castShadow = true;
      const t2 = new THREE.Mesh(tireGeo, darkMat);
      t2.position.set(0.55, 0.13, 0);
      t2.castShadow = true;
      tGroup.add(t1, t2);
      return tGroup;
    };

    // Obstacle configs (8 obstacles synchronized with OBSTACLES_LIST)
    const OBSTACLE_DEFS: {
      trackDist: number;
      type: 'hurdle' | 'cones' | 'box' | 'tires';
      matA?: THREE.Material;
      matB?: THREE.Material;
    }[] = [
      { trackDist: 14.0, type: 'hurdle', matA: redMat, matB: whiteMat },
      { trackDist: 26.0, type: 'cones' },
      { trackDist: 42.0, type: 'hurdle', matA: yellowMat, matB: darkMat },
      { trackDist: 50.0, type: 'box', matA: blueMat },
      { trackDist: 68.0, type: 'hurdle', matA: redMat, matB: whiteMat },
      { trackDist: 80.0, type: 'tires' },
      { trackDist: 90.0, type: 'cones' },
      { trackDist: 108.0, type: 'hurdle', matA: blueMat, matB: whiteMat },
    ];

    OBSTACLE_DEFS.forEach((cfg) => {
      const pt = getObstacleTrackPoint(cfg.trackDist);
      let model: THREE.Group;
      if (cfg.type === 'hurdle') {
        model = createHurdle(cfg.matA || redMat, cfg.matB || whiteMat);
      } else if (cfg.type === 'cones') {
        model = createCones();
      } else if (cfg.type === 'box') {
        model = createFoamBox(cfg.matA || blueMat);
      } else {
        model = createTires();
      }
      model.position.set(pt.x, 0, pt.z);
      model.rotation.order = 'YXZ';
      model.rotation.y = pt.angle;

      this.obstacleCourseGroup.add(model);
      this.obstacleMeshes.push({
        group: model,
        isKnocked: false,
        targetRotX: 0,
      });
    });

    // 4 Floating Golden Bonus Stars along track
    const starGeo = new THREE.OctahedronGeometry(0.32, 0);
    const starDists = [20.0, 46.0, 74.0, 99.0];
    starDists.forEach((sDist) => {
      const pt = getObstacleTrackPoint(sDist);
      const star = new THREE.Mesh(starGeo, goldStarMat);
      star.position.set(pt.x, 1.25, pt.z);
      this.obstacleCourseGroup.add(star);
      this.bonusStarMeshes.push(star);
    });

    this.obstacleCourseGroup.visible = false;
    this.group.add(this.obstacleCourseGroup);
  }

  private buildStreetTrafficAndZebraCross() {
    const trafficRoot = new THREE.Group();

    // 1. 3D Zebra Cross across the 24-unit Main Road in front of School Gate (x = 0, z = 65.0..89.0, center z = 77.0)
    const zebraGroup = new THREE.Group();
    zebraGroup.position.set(0, 0.028, 77.0);

    const stripeMat = new THREE.MeshBasicMaterial({
      color: '#F8FAFC',
      side: THREE.DoubleSide,
    });
    const stopLineMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 10; i++) {
      const stripeGeo = new THREE.PlaneGeometry(7.2, 1.48);
      stripeGeo.rotateX(-Math.PI / 2);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, 0, -10.35 + i * 2.3);
      stripe.userData.softwareColor = '#F8FAFC';
      zebraGroup.add(stripe);
    }

    // Yellow Stop Lines on both sides of the Zebra Cross (x = ±5.8, spanning the 22.8-unit roadway)
    [-5.8, 5.8].forEach((stopX) => {
      const stopGeo = new THREE.PlaneGeometry(0.55, 22.8);
      stopGeo.rotateX(-Math.PI / 2);
      const stopLine = new THREE.Mesh(stopGeo, stopLineMat);
      stopLine.position.set(stopX, 0.002, 0);
      stopLine.userData.softwareColor = '#FACC15';
      zebraGroup.add(stopLine);
    });

    const zebraLabel = createNPCLabelSprite(
      '🚸 ZEBRA CROSS SDN SUSUKAN 03',
      'Klik Pak Joko (Satpam) untuk Misi Menyebrangkan Siswa!',
      '#DC2626'
    );
    zebraLabel.sprite.position.set(0, 5.4, -12.2);
    zebraLabel.sprite.scale.set(4.1, 0.96, 1);
    zebraGroup.add(zebraLabel.sprite);

    // Realistic 3D "STOP" Sign Paddle raised beside Pak Joko on the North sidewalk curb
    this.crossingStopSignGroup = new THREE.Group();
    const poleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 10),
      this.getMat('#E2E8F0', 0.35)
    );
    poleMesh.position.y = 1.6;
    const octMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.88, 0.12, 8),
      this.getMat('#DC2626', 0.35)
    );
    octMesh.rotation.x = Math.PI / 2;
    octMesh.position.y = 3.45;
    const innerRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 0.14, 8),
      this.getMat('#FFFFFF', 0.3)
    );
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.y = 3.45;
    const innerRed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.16, 8),
      this.getMat('#DC2626', 0.35)
    );
    innerRed.rotation.x = Math.PI / 2;
    innerRed.position.y = 3.45;
    const centerBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.24, 0.18),
      this.getMat('#FFFFFF', 0.25)
    );
    centerBar.position.y = 3.45;
    this.crossingStopSignGroup.add(poleMesh, octMesh, innerRim, innerRed, centerBar);
    this.crossingStopSignGroup.position.set(4.6, 0, 63.6);
    this.crossingStopSignGroup.visible = false;
    trafficRoot.add(this.crossingStopSignGroup);

    trafficRoot.add(zebraGroup);

    // 2. Helper to build a Realistic-Scale 3D Moving Car (Mobil: ~4.5w x 3.9h x 10.2l vs 3.35h SD Student & 4.25h Adult)
    const createMovingCar = (bodyHex: string, roofHex: string, isSUV: boolean): {
      group: THREE.Group;
      wheels: THREE.Object3D[];
    } => {
      const car = new THREE.Group();
      const wheels: THREE.Object3D[] = [];
      const bodyMat = this.getMat(bodyHex, 0.28);
      const roofMat = this.getMat(roofHex, 0.32);
      const glassMat = this.getMat('#1E293B', 0.16);
      const tireMat = this.getMat('#0F172A', 0.85);
      const rimMat = this.getMat('#CBD5E1', 0.3);
      const bumperMat = this.getMat('#1E293B', 0.65);
      const headLightMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
      const tailLightMat = new THREE.MeshBasicMaterial({ color: '#EF4444' });

      const carLen = isSUV ? 10.4 : 9.8;
      const carWidth = isSUV ? 4.5 : 4.35;

      // Lower chassis body (height 1.55, centered at y = 1.45, bottom clearance at y = 0.68)
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth, 1.55, carLen),
        bodyMat
      );
      chassis.position.y = 1.45;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      car.add(chassis);

      // Front & Rear Bumpers + Front Radiator Grille
      const frontBumper = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth + 0.14, 0.42, 0.36),
        bumperMat
      );
      frontBumper.position.set(0, 0.92, carLen * 0.5 + 0.06);
      const rearBumper = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth + 0.14, 0.42, 0.36),
        bumperMat
      );
      rearBumper.position.set(0, 0.92, -carLen * 0.5 - 0.06);
      const frontGrille = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.54, 0.12),
        bumperMat
      );
      frontGrille.position.set(0, 1.45, carLen * 0.5 + 0.04);
      car.add(frontBumper, rearBumper, frontGrille);

      // Upper Cabin Greenhouse (top at y = 3.98 for SUV / 3.80 for Sedan — taller than 3.35-unit child!)
      const cabinLen = isSUV ? 6.2 : 5.2;
      const cabinHeight = isSUV ? 1.52 : 1.38;
      const cabinCenterY = 2.22 + cabinHeight * 0.5;
      const cabinOffsetZ = isSUV ? -0.45 : -0.35;

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth - 0.48, cabinHeight, cabinLen),
        roofMat
      );
      cabin.position.set(0, cabinCenterY, cabinOffsetZ);
      cabin.castShadow = true;
      car.add(cabin);

      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth - 0.72, cabinHeight - 0.28, cabinLen + 0.14),
        glassMat
      );
      windshield.position.set(0, cabinCenterY, cabinOffsetZ);
      car.add(windshield);

      // Left & Right Side Mirrors
      [-1, 1].forEach((side) => {
        const mirror = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.28, 0.26),
          bodyMat
        );
        mirror.position.set(side * (carWidth * 0.5 + 0.16), 2.35, 1.35);
        car.add(mirror);
      });

      // Headlights (+Z front) & Taillights (-Z rear)
      const frontZ = carLen * 0.5 + 0.05;
      [-1.48, 1.48].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.14), headLightMat);
        hl.position.set(lx, 1.56, frontZ);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.14), tailLightMat);
        tl.position.set(lx, 1.6, -frontZ);
        car.add(hl, tl);
      });

      // 4 Realistic Wheels (radius 0.82 -> diameter 1.64 units = ~65cm)
      const wheelX = carWidth * 0.5 - 0.05;
      const wheelZ = isSUV ? 3.15 : 2.95;
      const wheelCoords: [number, number][] = [
        [-wheelX, wheelZ],
        [wheelX, wheelZ],
        [-wheelX, -wheelZ],
        [wheelX, -wheelZ],
      ];
      wheelCoords.forEach(([wx, wz]) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(wx, 0.82, wz);
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.82, 0.82, 0.55, 20),
          tireMat
        );
        tire.rotation.z = Math.PI / 2;
        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.46, 0.58, 12),
          rimMat
        );
        rim.rotation.z = Math.PI / 2;
        wGroup.add(tire, rim);
        car.add(wGroup);
        wheels.push(wGroup);
      });

      return { group: car, wheels };
    };

    // 3. Helper to build a Realistic-Scale 3D Moving Motorcycle + Full-Scale Adult Rider (Motor: 4.5l x 1.8w x 3.98h)
    const createMovingMotorcycle = (
      bikeHex: string,
      jacketHex: string,
      helmetHex: string
    ): { group: THREE.Group; wheels: THREE.Object3D[] } => {
      const moto = new THREE.Group();
      const wheels: THREE.Object3D[] = [];
      const bodyMat = this.getMat(bikeHex, 0.32);
      const darkMat = this.getMat('#18181B', 0.78);
      const chromeMat = this.getMat('#E2E8F0', 0.25);
      const jacketMat = this.getMat(jacketHex, 0.62);
      const pantsMat = this.getMat('#0F172A', 0.82);
      const skinMat = this.getMat('#D99B72', 0.45);
      const helmetMat = this.getMat(helmetHex, 0.28);
      const visorMat = this.getMat('#0284C7', 0.18);

      // Front & Rear Wheels (radius 0.62 -> diameter 1.24 units = ~50cm, matching parked motorcycles)
      [1.48, -1.38].forEach((wz) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(0, 0.62, wz);
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.62, 0.34, 18),
          darkMat
        );
        tire.rotation.z = Math.PI / 2;
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.38, 12),
          chromeMat
        );
        hub.rotation.z = Math.PI / 2;
        wGroup.add(tire, hub);
        moto.add(wGroup);
        wheels.push(wGroup);
      });

      // Scooter / Motorcycle main body, front shield, seat & handlebars (matching createMotorcycleModel)
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 3.55), bodyMat);
      frame.position.set(0, 1.18, 0);
      frame.castShadow = true;

      const frontFairing = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.85, 0.72), bodyMat);
      frontFairing.position.set(0, 1.82, 1.25);
      frontFairing.rotation.x = -0.2;
      frontFairing.castShadow = true;

      const handlebar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.78, 12),
        chromeMat
      );
      handlebar.rotation.z = Math.PI / 2;
      handlebar.position.set(0, 2.75, 1.12);

      const headlamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.34, 0.14),
        new THREE.MeshBasicMaterial({ color: '#FEF08A' })
      );
      headlamp.position.set(0, 2.15, 1.62);

      const tailLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.26, 0.12),
        new THREE.MeshBasicMaterial({ color: '#EF4444' })
      );
      tailLamp.position.set(0, 1.75, -1.78);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.32, 1.95), darkMat);
      seat.position.set(0, 1.92, -0.55);
      moto.add(frame, frontFairing, handlebar, headlamp, tailLamp, seat);

      // Full-Scale Adult Rider sitting on the 1.92-high seat (Adult standing height = 4.25, seated helmet top = 3.98)
      const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.38, 0.72), jacketMat);
      riderTorso.position.set(0, 2.76, -0.42);
      riderTorso.rotation.x = 0.18;
      riderTorso.castShadow = true;

      const riderHead = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.88, 0.88), skinMat);
      riderHead.position.set(0, 3.72, -0.26);

      const riderHelmet = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 16), helmetMat);
      riderHelmet.position.set(0, 3.82, -0.26);
      riderHelmet.castShadow = true;

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.38), visorMat);
      visor.position.set(0, 3.8, 0.22);

      [-0.76, 0.76].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.25, 0.44), jacketMat);
        arm.position.set(ax, 2.72, 0.32);
        arm.rotation.x = -1.12;
        arm.castShadow = true;

        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.25, 0.52), pantsMat);
        leg.position.set(ax * 0.62, 1.42, 0.16);
        leg.rotation.x = -0.42;
        leg.castShadow = true;

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.28, 0.72), darkMat);
        shoe.position.set(ax * 0.62, 0.82, 0.48);
        moto.add(arm, leg, shoe);
      });

      moto.add(riderTorso, riderHead, riderHelmet, visor);
      return { group: moto, wheels };
    };

    // 4. Spawn 8 Realistic Street Vehicles across the 24-unit Road (North lane z=65..77 going West -1, South lane z=77..89 going East +1)
    const vehicleSpecs: {
      type: 'car' | 'suv' | 'moto';
      laneZ: number;
      dir: 1 | -1;
      startX: number;
      speed: number;
      c1: string;
      c2: string;
      c3?: string;
    }[] = [
      // North lane (Westbound dir = -1, z = 68.0..71.5)
      { type: 'car', laneZ: 71.4, dir: -1, startX: 98, speed: 15.5, c1: '#EF4444', c2: '#DC2626' },
      { type: 'moto', laneZ: 67.8, dir: -1, startX: 54, speed: 18.2, c1: '#2563EB', c2: '#16A34A', c3: '#FACC15' },
      { type: 'suv', laneZ: 71.6, dir: -1, startX: -28, speed: 14.8, c1: '#F8FAFC', c2: '#E2E8F0' },
      { type: 'moto', laneZ: 68.0, dir: -1, startX: -84, speed: 17.5, c1: '#DC2626', c2: '#0284C7', c3: '#FFFFFF' },
      // South lane (Eastbound dir = 1, z = 82.5..86.2)
      { type: 'suv', laneZ: 82.6, dir: 1, startX: -96, speed: 15.2, c1: '#0284C7', c2: '#0369A1' },
      { type: 'moto', laneZ: 86.0, dir: 1, startX: -48, speed: 18.6, c1: '#16A34A', c2: '#EA580C', c3: '#FACC15' },
      { type: 'car', laneZ: 82.4, dir: 1, startX: 32, speed: 16.0, c1: '#F59E0B', c2: '#D97706' },
      { type: 'moto', laneZ: 85.8, dir: 1, startX: 88, speed: 17.8, c1: '#9333EA', c2: '#1E293B', c3: '#38BDF8' },
    ];

    this.streetVehicles = [];
    vehicleSpecs.forEach((spec) => {
      const built =
        spec.type === 'moto'
          ? createMovingMotorcycle(spec.c1, spec.c2, spec.c3 || '#FACC15')
          : createMovingCar(spec.c1, spec.c2, spec.type === 'suv');
      built.group.position.set(spec.startX, 0, spec.laneZ);
      built.group.rotation.y = spec.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      trafficRoot.add(built.group);
      this.streetVehicles.push({
        group: built.group,
        wheels: built.wheels,
        laneZ: spec.laneZ,
        dir: spec.dir,
        speed: spec.speed,
        currentSpeed: spec.speed,
        length: spec.type === 'moto' ? 4.6 : 10.6,
      });
    });

    this.group.add(trafficRoot);
  }

  public setCleanupMissionState(
    stage: CleanupMissionStage,
    collectedIds: string[],
    onTrashPickedUp?: (item: SchoolTrashItemInfo) => void
  ) {
    this.cleanupStage = stage;
    this.collectedTrashSet = new Set(collectedIds);
    this.onTrashPickedUpCallback = onTrashPickedUp;

    this.trashNodeMap.forEach((node, id) => {
      node.group.visible = stage === 'collecting' && !this.collectedTrashSet.has(id);
    });

    if (stage !== 'sorting') {
      this.thrownTrashGroup.visible = false;
      this.trashThrowActive = false;
      this.activeOpenBin = null;
    }
  }

  public getNearestUncollectedTrash(
    playerX: number,
    playerZ: number
  ): SchoolTrashItemInfo | null {
    let best: SchoolTrashItemInfo | null = null;
    let bestDistSq = Infinity;
    for (const item of SCHOOL_TRASH_ITEMS) {
      if (this.collectedTrashSet.has(item.id)) continue;
      const dx = playerX - item.pos[0];
      const dz = playerZ - item.pos[1];
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = item;
      }
    }
    return best;
  }

  public manualPickupTrashById(
    itemId: string,
    soundEnabled = true
  ): SchoolTrashItemInfo | null {
    const node = this.trashNodeMap.get(itemId);
    if (!node || this.collectedTrashSet.has(itemId)) return null;
    this.collectedTrashSet.add(itemId);
    node.group.visible = false;
    soundFX.playPop(soundEnabled);
    if (this.onTrashPickedUpCallback) {
      this.onTrashPickedUpCallback(node.info);
    }
    return node.info;
  }

  public executeTrashSortThrow(
    item: SchoolTrashItemInfo,
    chosenBin: TrashCategoryId,
    soundEnabled = true
  ): TrashSortResult {
    const binInfo = TRASH_BINS_INFO[chosenBin];
    const correctBinInfo = TRASH_BINS_INFO[item.category];
    const isCorrect = item.category === chosenBin;

    soundFX.playSoccerKick(soundEnabled);
    this.thrownTrashMat.color.set(item.colorHex);
    this.trashThrowStart.set(30.0, 2.35, 48.8);
    this.trashThrowEnd.set(binInfo.binX, 1.82, binInfo.binZ);
    this.trashThrowTimer = 0;
    this.trashThrowActive = true;
    this.thrownTrashGroup.visible = true;
    this.thrownTrashGroup.position.copy(this.trashThrowStart);
    this.activeOpenBin = chosenBin;
    this.binOpenTimer = 1.25;
    this.trashLastSortCorrect = isCorrect;

    const principalComment = isCorrect
      ? `Tepat sekali! ${item.icon} ${item.name} masuk ke ${binInfo.label}. ${item.explanation}`
      : `Kurang tepat! ${item.icon} ${item.name} seharusnya masuk ke ${correctBinInfo.label} (${correctBinInfo.shortLabel}). ${item.explanation}`;

    const kepsek = this.npcs.find((n) => n.role === 'kepsek');
    if (kepsek) {
      kepsek.currentDialogue = principalComment;
      this.renderBubbleForNPC(kepsek);
      this.sharedBubbleScale = 1.0;
    }

    return {
      item,
      chosenBin,
      correctBin: item.category,
      isCorrect,
      principalComment,
    };
  }

  public setMathMissionMode(active: boolean) {
    this.mathMissionActive = active;
    this.mathBoardMesh.visible = active;
    if (!active) {
      this.mathLastAnswerCorrect = null;
      this.mathFeedbackTimer = 0;
    } else {
      this.syncMathChalkboard(
        'MATEMATIKA KELAS 1 SD',
        '1 + 1 = 2',
        'Penjumlahan 1 Angka & 2 Angka — Bu Maya, S.Pd.',
        null
      );
    }
  }

  public syncMathChalkboard(
    title: string,
    equation: string,
    subtext: string,
    isCorrect: boolean | null,
    teacherComment?: string
  ) {
    this.mathLastAnswerCorrect = isCorrect;
    if (isCorrect !== null) {
      this.mathFeedbackTimer = 1.3;
    }

    const ctx = this.mathBoardCtx;
    const w = this.mathBoardCanvas.width;
    const h = this.mathBoardCanvas.height;

    // 1. Classic Green School Slate Background + Wooden Frame
    ctx.fillStyle = '#78350F';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = isCorrect === true ? '#065F46' : isCorrect === false ? '#7F1D1D' : '#14532D';
    ctx.fillRect(14, 14, w - 28, h - 28);

    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, w - 44, h - 44);

    // 2. Top Header Title
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 62);

    // 3. Large Chalk Equation in Center
    ctx.fillStyle = isCorrect === true ? '#4ADE80' : isCorrect === false ? '#FCA5A5' : '#FFFFFF';
    ctx.font = '900 66px monospace';
    ctx.fillText(equation, w / 2, 148);

    // 4. Bottom Subtext / Place-Value Hint
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 23px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtext, w / 2, 210);

    this.mathBoardTex.needsUpdate = true;

    if (teacherComment) {
      const buMaya = this.npcs.find((n) => n.name.includes('Bu Maya'));
      if (buMaya) {
        buMaya.currentDialogue = teacherComment;
        this.renderBubbleForNPC(buMaya);
        this.sharedBubbleScale = 1.0;
      }
    }
  }

  public setDampuMissionMode(active: boolean) {
    this.dampuMissionActive = active;
    this.dampuGacoThrowActive = false;
    this.dampuGacoThrowTimer = 0;
    if (active && this.dampuGacoGroup) {
      const firstSq = DAMPU_SQUARE_LOCAL_COORDS[1];
      this.dampuGacoGroup.position.set(firstSq[0], 0.012, firstSq[1]);
    }
  }

  public executeDampuGacoThrow(
    targetSquareId: number,
    isGoodThrow: boolean,
    comment: string,
    soundEnabled = true
  ) {
    soundFX.playPop(soundEnabled);
    const localCoords = DAMPU_SQUARE_LOCAL_COORDS[targetSquareId] || [0, -5.5];
    const jitterX = isGoodThrow ? 0 : (Math.random() > 0.5 ? 0.85 : -0.85);
    const jitterZ = isGoodThrow ? 0 : 0.72;
    this.dampuGacoStart.set(0, 1.35, -7.2);
    this.dampuGacoEnd.set(localCoords[0] + jitterX, 0.012, localCoords[1] + jitterZ);
    this.dampuGacoThrowActive = true;
    this.dampuGacoThrowTimer = 0;

    const wulan = this.npcs.find((n) => n.name.includes('Wulan'));
    if (wulan && comment) {
      wulan.currentDialogue = comment;
      this.renderBubbleForNPC(wulan);
      this.sharedBubbleScale = 1.0;
    }
  }

  public syncDampuHopComment(
    comment: string,
    isSuccess: boolean,
    soundEnabled = true
  ) {
    if (isSuccess) {
      soundFX.playJump(soundEnabled);
    } else {
      soundFX.playKeeperSave(soundEnabled);
    }
    const wulan = this.npcs.find((n) => n.name.includes('Wulan'));
    if (wulan && comment) {
      wulan.currentDialogue = comment;
      this.renderBubbleForNPC(wulan);
      this.sharedBubbleScale = 1.0;
    }
  }

  public setJumpRopeMissionMode(active: boolean) {
    this.jumpRopeMissionActive = active;
    this.jumpRopeSpeedMultiplier = 1.0;
    if (active) {
      const intan = this.npcs.find((n) => n.name.includes('Intan'));
      if (intan) {
        intan.currentDialogue =
          'Ayo berdiri di tengah tali karet! Aku dan Dewi siap memutar tali dari Tingkat Mata Kaki sampai Tingkat Merdeka!';
        this.renderBubbleForNPC(intan);
        this.sharedBubbleScale = 1.0;
      }
    } else {
      // When jump rope mission ends, reset Kartika, Dewi, and Intan back to their default play positions
      this.resetJumpRopeGroupPositions(true);
    }
  }

  public resetJumpRopeGroupPositions(snapImmediately = false) {
    const dewi = this.npcs.find(
      (n) => n.name.includes('Dewi') && n.name.includes('Pemutar Tali')
    );
    const intan = this.npcs.find(
      (n) => n.name.includes('Intan') && n.name.includes('Pemutar Tali')
    );
    const kartika = this.npcs.find(
      (n) => n.name.includes('Kartika') && n.name.includes('Lompat Tali')
    );

    if (dewi) {
      dewi.behavior = 'turn_rope';
      dewi.activity = 'Memutar Ujung Tali Karet Barat';
      dewi.stageTargetPos.set(-15.8, 0, 29.5);
      dewi.stageTargetRotY = Math.PI / 2;
      dewi.currentStageIdx = 0;
      if (dewi.labelSprite) dewi.labelSprite.visible = true;
      if (snapImmediately) {
        dewi.group.position.set(-15.8, 0, 29.5);
        dewi.group.rotation.y = Math.PI / 2;
        dewi.isTransitioningWalk = false;
        dewi.hips.position.y = 1.22;
        dewi.hips.rotation.set(0, 0, 0);
        dewi.leftLeg.rotation.set(0, 0, 0);
        dewi.rightLeg.rotation.set(0, 0, 0);
        dewi.leftArm.rotation.set(0, 0, 0);
        dewi.rightArm.rotation.set(0, 0, 0);
        this.updateNPCLabel(dewi, dewi.activity);
      } else {
        const d = Math.hypot(-15.8 - dewi.group.position.x, 29.5 - dewi.group.position.z);
        dewi.isTransitioningWalk = d > 0.35;
        this.updateNPCLabel(
          dewi,
          dewi.isTransitioningWalk ? 'Berjalan: Lompat Tali' : dewi.activity
        );
      }
    }

    if (intan) {
      intan.behavior = 'turn_rope';
      intan.activity = 'Memutar Ujung Tali Karet Timur';
      intan.stageTargetPos.set(-9.2, 0, 29.5);
      intan.stageTargetRotY = -Math.PI / 2;
      intan.currentStageIdx = 0;
      if (intan.labelSprite) intan.labelSprite.visible = true;
      if (snapImmediately) {
        intan.group.position.set(-9.2, 0, 29.5);
        intan.group.rotation.y = -Math.PI / 2;
        intan.isTransitioningWalk = false;
        intan.hips.position.y = 1.22;
        intan.hips.rotation.set(0, 0, 0);
        intan.leftLeg.rotation.set(0, 0, 0);
        intan.rightLeg.rotation.set(0, 0, 0);
        intan.leftArm.rotation.set(0, 0, 0);
        intan.rightArm.rotation.set(0, 0, 0);
        this.updateNPCLabel(intan, intan.activity);
      } else {
        const d = Math.hypot(-9.2 - intan.group.position.x, 29.5 - intan.group.position.z);
        intan.isTransitioningWalk = d > 0.35;
        this.updateNPCLabel(
          intan,
          intan.isTransitioningWalk ? 'Berjalan: Lompat Tali' : intan.activity
        );
      }
    }

    if (kartika) {
      kartika.behavior = 'jump_rope';
      kartika.activity = 'Melompati Tali Karet Gelang';
      kartika.stageTargetPos.set(-12.5, 0, 29.5);
      kartika.stageTargetRotY = 0;
      kartika.currentStageIdx = 0;
      if (kartika.labelSprite) kartika.labelSprite.visible = true;
      if (snapImmediately) {
        kartika.group.position.set(-12.5, 0, 29.5);
        kartika.group.rotation.y = 0;
        kartika.isTransitioningWalk = false;
        kartika.hips.position.y = 1.22;
        kartika.hips.rotation.set(0, 0, 0);
        kartika.leftLeg.rotation.set(0, 0, 0);
        kartika.rightLeg.rotation.set(0, 0, 0);
        kartika.leftArm.rotation.set(0, 0, 0);
        kartika.rightArm.rotation.set(0, 0, 0);
        this.updateNPCLabel(kartika, kartika.activity);
      } else {
        const d = Math.hypot(-12.5 - kartika.group.position.x, 29.5 - kartika.group.position.z);
        kartika.isTransitioningWalk = d > 0.35;
        this.updateNPCLabel(
          kartika,
          kartika.isTransitioningWalk ? 'Berjalan: Lompat Tali' : kartika.activity
        );
      }
    }
  }

  public syncJumpRopeComment(
    comment: string,
    isSuccess: boolean,
    ropeSpeedMultiplier: number,
    soundEnabled = true
  ) {
    this.jumpRopeSpeedMultiplier = ropeSpeedMultiplier;
    if (isSuccess) {
      soundFX.playJump(soundEnabled);
    } else {
      soundFX.playKeeperSave(soundEnabled);
    }
    const intan = this.npcs.find((n) => n.name.includes('Intan'));
    if (intan && comment) {
      intan.currentDialogue = comment;
      this.renderBubbleForNPC(intan);
      this.sharedBubbleScale = 1.0;
    }
  }

  public setKelerengMissionMode(active: boolean) {
    this.kelerengMissionActive = active;
    this.kelerengShotActive = false;
    this.kelerengShotTimer = 0;
    this.resetKelerengMarbles();
    if (active) {
      const bimo = this.npcs.find((n) => n.name.includes('Bimo'));
      if (bimo) {
        bimo.currentDialogue =
          'Ayo bidik 7 kelereng kaca di segitiga tengah! Sentil gacomu pas di Zona Hijau atau Emas!';
        this.renderBubbleForNPC(bimo);
        this.sharedBubbleScale = 1.0;
      }
    }
  }

  public resetKelerengMarbles() {
    this.kelerengShotActive = false;
    this.kelerengShotTimer = 0;
    this.kelerengTargetMarbles.forEach((m) => {
      m.knockedOut = false;
      m.mesh.position.set(m.homeX, 0.11, m.homeZ);
    });
    if (this.kelerengShooterA) {
      this.kelerengShooterA.position.set(0, 0.135, 2.05);
    }
    if (this.kelerengShooterB) {
      this.kelerengShooterB.position.set(1.25, 0.135, -0.2);
    }
  }

  public executeKelerengFlick(
    targetIndex: number,
    isHit: boolean,
    isPerfect: boolean,
    comment: string,
    soundEnabled = true
  ) {
    const idx = Math.max(0, Math.min(this.kelerengTargetMarbles.length - 1, targetIndex));
    const targetMarble = this.kelerengTargetMarbles[idx];
    this.kelerengShotTargetIdx = idx;
    this.kelerengShotHit = isHit;
    this.kelerengShotActive = true;
    this.kelerengShotTimer = 0;
    this.kelerengGacoStart.set(0, 0.135, 2.05);

    if (targetMarble) {
      if (isHit) {
        this.kelerengGacoEnd.set(targetMarble.homeX, 0.135, targetMarble.homeZ);
        targetMarble.knockedOut = true;
      } else {
        const missOffsetX = targetMarble.homeX >= 0 ? -0.58 : 0.58;
        this.kelerengGacoEnd.set(
          targetMarble.homeX + missOffsetX,
          0.135,
          targetMarble.homeZ - 0.55
        );
      }
    }

    if (isPerfect || isHit) {
      soundFX.playPop(soundEnabled);
    } else {
      soundFX.playKeeperSave(soundEnabled);
    }

    const bimo = this.npcs.find((n) => n.name.includes('Bimo'));
    if (bimo && comment) {
      bimo.currentDialogue = comment;
      this.renderBubbleForNPC(bimo);
      this.sharedBubbleScale = 1.0;
    }
  }

  public setCrossingMissionMode(active: boolean) {
    this.crossingMissionActive = active;
    this.crossingTrafficStopped = false;
    this.crossingActionTimer = 0;
    this.crossingWaveSuccess = true;
    if (this.crossingStopSignGroup) {
      this.crossingStopSignGroup.visible = active;
      this.crossingStopSignGroup.position.set(4.6, 0, 63.6);
    }
    if (active) {
      const satpam = this.npcs.find((n) => n.role === 'satpam');
      if (satpam) {
        satpam.currentDialogue =
          'Siap di Zebra Cross! Tiup peluit & angkat rambu STOP saat indikator di Zona Hijau/Emas agar mobil & motor berhenti!';
        this.renderBubbleForNPC(satpam);
        this.sharedBubbleScale = 1.0;
      }
    }
  }

  public executeCrossingSignal(
    _waveIndex: number,
    isSafe: boolean,
    isPerfect: boolean,
    comment: string,
    soundEnabled = true
  ) {
    this.crossingWaveSuccess = isSafe;
    this.crossingTrafficStopped = isSafe;
    this.crossingActionTimer = 1.65;

    if (isSafe) {
      soundFX.playWhistle(soundEnabled);
      if (isPerfect) {
        soundFX.playGoalCheer(soundEnabled);
      }
    } else {
      soundFX.playKeeperSave(soundEnabled);
    }

    // Reset Dika & Rani to the South sidewalk (z = 90.4) so they visibly walk across the 24-unit Zebra Cross to the school gate
    if (isSafe) {
      const dika = this.npcs.find((n) => n.name.includes('Dika (Siswa Penyeberang)'));
      const rani = this.npcs.find((n) => n.name.includes('Rani (Siswa Penyeberang)'));
      if (dika) {
        dika.group.position.set(-1.3, 0, 90.4);
      }
      if (rani) {
        rani.group.position.set(1.3, 0, 90.4);
      }
    }

    const satpam = this.npcs.find((n) => n.role === 'satpam');
    if (satpam && comment) {
      satpam.currentDialogue = comment;
      this.renderBubbleForNPC(satpam);
      this.sharedBubbleScale = 1.0;
    }
  }

  public setEcobrickMissionMode(active: boolean) {
    this.ecobrickMissionActive = active;
    if (active) {
      this.ecobrickIsScattered = true;
      const laras = this.npcs.find((n) => n.name.includes('Laras'));
      if (laras) {
        laras.currentDialogue =
          'Ya ampun! Angin kencang membuat susunan Ecobrick "I LOVE SUGA" berantakan! Ayo bantu Laras menyusun puzzle Ecobrick kembali!';
        this.renderBubbleForNPC(laras);
        this.sharedBubbleScale = 1.0;
      }
    }
  }

  public setEcobrickScatteredState(scattered: boolean) {
    if (this.ecobrickIsScattered === scattered) return;
    this.ecobrickIsScattered = scattered;
    const laras = this.npcs.find((n) => n.name.includes('Laras'));
    if (laras) {
      if (scattered) {
        laras.currentDialogue =
          'Ya ampun! Angin kencang barusan membuat huruf Ecobrick "I LOVE SUGA" berantakan! Klik Misi Ecobrick untuk membantu Laras menyusunnya!';
      } else {
        laras.currentDialogue =
          'Hore! Monumen Ecobrick Merah Putih "I LOVE SUGA" sudah tersusun rapi dan indah kembali!';
      }
      this.renderBubbleForNPC(laras);
      this.sharedBubbleScale = 1.0;
    }
  }

  public syncEcobrickComment(comment: string, isSuccess: boolean, soundEnabled = true) {
    const laras = this.npcs.find((n) => n.name.includes('Laras'));
    if (laras && comment) {
      laras.currentDialogue = comment;
      this.renderBubbleForNPC(laras);
      this.sharedBubbleScale = 1.0;
    }
    if (!isSuccess) {
      soundFX.playKeeperSave(soundEnabled);
    }
  }

  public setTonoMissionMode(active: boolean) {
    this.tonoMissionActive = active;
    this.tonoActionTimer = 0;
    this.tonoMissionSuccess = true;
    if (active) {
      const tono = this.npcs.find((n) => n.name.includes('Tono'));
      if (tono) {
        tono.currentDialogue =
          'Aduh... aku mau beli jajanan di depan sekolah tapi bingung hitung harga jajan dan uang kembalianku. Tolong bantu aku ya!';
        this.renderBubbleForNPC(tono);
        this.sharedBubbleScale = 1.0;
      }
    }
  }

  public syncTonoComment(comment: string, isSuccess: boolean, soundEnabled = true) {
    this.tonoMissionSuccess = isSuccess;
    this.tonoActionTimer = 3.5;
    const tono = this.npcs.find((n) => n.name.includes('Tono'));
    if (tono && comment) {
      tono.currentDialogue = comment;
      this.renderBubbleForNPC(tono);
      this.sharedBubbleScale = 1.0;
    }
    if (isSuccess) {
      soundFX.playCoin(soundEnabled);
    } else {
      soundFX.playBuzzer(soundEnabled);
    }
  }

  public setObstacleCourseActive(active: boolean) {
    this.obstacleCourseActive = active;
    if (this.obstacleCourseGroup) {
      this.obstacleCourseGroup.visible = active;
    }
    if (!active) {
      this.resetObstacles();
    }
  }

  public knockObstacle(index: number) {
    if (index >= 0 && index < this.obstacleMeshes.length) {
      this.obstacleMeshes[index].isKnocked = true;
      this.obstacleMeshes[index].targetRotX = 0.85;
    }
  }

  public resetObstacles() {
    for (const obs of this.obstacleMeshes) {
      obs.isKnocked = false;
      obs.targetRotX = 0;
      obs.group.rotation.x = 0;
    }
  }

  public syncPakBudiCoach(comment: string, isSuccess: boolean, soundEnabled = true) {
    const pakBudi = this.npcs.find((n) => n.name.includes('Pak Budi'));
    if (pakBudi) {
      pakBudi.currentDialogue = comment;
      this.renderBubbleForNPC(pakBudi);
      this.sharedBubbleScale = 1.0;
    }
    if (isSuccess) {
      soundFX.playCheer(soundEnabled);
    } else {
      soundFX.playWhistle(soundEnabled);
    }
  }

  /**
   * Computes the Upacara Bendera formation slots around the Flagpole (0, 0, -22.5):
   * - 3 Paskibra Flag-Raising NPCs right in front (South) of the flagpole at z = -19.8 facing North (Math.PI)
   * - All Adult / Teacher NPCs (Kepsek, Guru, Satpam) lined up in a neat row North of the flagpole (z = -28.8) facing South (0) in salute
   * - All Student NPCs lined up neatly by class (Kelas 1..Kelas 6) South of the flagpole (z = -11.2 southward) facing North (Math.PI) in salute
   */
  private computeCeremonyFormationSlots() {
    this.ceremonySlots.clear();

    // 1. Identify the 3 Paskibra Flag-Raising Officers (Petugas Pengibar Bendera)
    const siti =
      this.npcs.find((n) => n.name.includes('Siti (Kelas 5A')) ||
      this.npcs.find((n) => n.role === 'siswa_putri');
    const damar =
      this.npcs.find((n) => n.name.includes('Damar (Kelas 4A')) ||
      this.npcs.find((n) => n.role === 'siswa_putra' && n !== siti);
    const laras =
      this.npcs.find((n) => n.name.includes('Laras (Kelas 5A')) ||
      this.npcs.find((n) => n.role === 'siswa_putri' && n !== siti && n !== damar);

    const paskibraSet = new Set<NPCInstance>();
    if (damar) {
      paskibraSet.add(damar);
      this.ceremonySlots.set(damar, {
        x: -1.55,
        z: -19.85,
        rotY: Math.PI,
        ceremonyRole: 'paskibra_left',
        ceremonyLabel: 'Petugas Pengerek Bendera Merah Putih',
      });
    }
    if (siti) {
      paskibraSet.add(siti);
      this.ceremonySlots.set(siti, {
        x: 0.0,
        z: -19.55,
        rotY: Math.PI,
        ceremonyRole: 'paskibra_center',
        ceremonyLabel: 'Petugas Pembentang Bendera (Hormat)',
      });
    }
    if (laras) {
      paskibraSet.add(laras);
      this.ceremonySlots.set(laras, {
        x: 1.55,
        z: -19.85,
        rotY: Math.PI,
        ceremonyRole: 'paskibra_right',
        ceremonyLabel: 'Petugas Pengulur Tali Bendera',
      });
    }

    // 2. All Adult / Teacher NPCs (Kepsek, Guru, Satpam) lined up in a neat row North of the flagpole (z = -28.8), facing South (rotY = 0)
    const adults = this.npcs.filter(
      (n) =>
        (n.role === 'kepsek' || n.role === 'guru' || n.role === 'satpam') &&
        n.group.children.length > 0
    );
    // Put Kepsek in the center of the North row
    const kepsekList = adults.filter((a) => a.role === 'kepsek');
    const otherAdults = adults.filter((a) => a.role !== 'kepsek');
    const orderedAdults: NPCInstance[] = [];
    const half = Math.floor(otherAdults.length / 2);
    orderedAdults.push(...otherAdults.slice(0, half), ...kepsekList, ...otherAdults.slice(half));

    const totalAdults = orderedAdults.length;
    const adultSpacingX = 2.05;
    const adultStartX = -((totalAdults - 1) * adultSpacingX) * 0.5;
    orderedAdults.forEach((adult, idx) => {
      const ax = adultStartX + idx * adultSpacingX;
      const az = adult.role === 'kepsek' ? -27.6 : -28.9;
      this.ceremonySlots.set(adult, {
        x: ax,
        z: az,
        rotY: 0, // Facing South (+Z) toward the flagpole and students
        ceremonyRole: 'teacher_salute',
        ceremonyLabel:
          adult.role === 'kepsek'
            ? 'Pembina Upacara · Hormat Bendera'
            : 'Barisan Guru & Staf · Hormat Bendera',
      });
    });

    // 3. All Remaining Student NPCs grouped by Class (Kelas 1..Kelas 6) South of the flagpole, facing North (rotY = Math.PI)
    const classBuckets: NPCInstance[][] = [[], [], [], [], [], []];
    const unassignedStudents: NPCInstance[] = [];

    for (const npc of this.npcs) {
      if (paskibraSet.has(npc)) continue;
      if (npc.role !== 'siswa_putra' && npc.role !== 'siswa_putri') continue;
      if (npc.group.children.length === 0) continue;

      const match = npc.name.match(/Kelas\s*([1-6])/i);
      if (match) {
        const gradeIdx = Math.min(5, Math.max(0, parseInt(match[1], 10) - 1));
        classBuckets[gradeIdx].push(npc);
      } else {
        unassignedStudents.push(npc);
      }
    }

    // Distribute any students without an explicit class number into the smallest class buckets so all 6 columns look balanced
    for (const st of unassignedStudents) {
      let minIdx = 0;
      for (let g = 1; g < 6; g++) {
        if (classBuckets[g].length < classBuckets[minIdx].length) {
          minIdx = g;
        }
      }
      classBuckets[minIdx].push(st);
    }

    // 6 Class columns South of the flagpole: x = -15, -9, -3, +3, +9, +15
    const classColumnXs = [-15.0, -9.0, -3.0, 3.0, 9.0, 15.0];
    classBuckets.forEach((bucket, gradeIdx) => {
      const colCenterX = classColumnXs[gradeIdx];
      bucket.forEach((student, idxInClass) => {
        // Neat single/paired column per class starting at z = -10.8 going South (+Z)
        const subCol = idxInClass % 2; // 0 = left file, 1 = right file
        const row = Math.floor(idxInClass / 2);
        const sx =
          bucket.length <= 5
            ? colCenterX
            : colCenterX + (subCol === 0 ? -0.82 : 0.82);
        const sz =
          bucket.length <= 5
            ? -10.8 + idxInClass * 1.95
            : -10.8 + row * 2.1;

        this.ceremonySlots.set(student, {
          x: sx,
          z: sz,
          rotY: Math.PI, // Facing North (-Z) toward the Flagpole
          ceremonyRole: 'student_salute',
          ceremonyLabel: `Barisan Kelas ${gradeIdx + 1} · Hormat Bendera`,
        });
      });
    });
  }

  public setOpeningCeremonyMode(active: boolean, snapImmediately = true) {
    const wasActive = this.openingCeremonyActive;
    this.openingCeremonyActive = active;

    if (active) {
      if (this.ceremonySlots.size === 0) {
        this.computeCeremonyFormationSlots();
      }
      this.ceremonySlots.forEach((slot, npc) => {
        if (snapImmediately) {
          npc.group.position.set(slot.x, 0, slot.z);
          npc.group.rotation.y = slot.rotY;
        }
        npc.hips.position.y = 1.22;
        npc.hips.rotation.set(0, 0, 0);
        npc.leftLeg.rotation.set(0, 0, 0);
        npc.rightLeg.rotation.set(0, 0, 0);
        this.updateNPCLabel(npc, slot.ceremonyLabel);
      });

      const kepsek = this.npcs.find((n) => n.role === 'kepsek');
      if (kepsek) {
        kepsek.currentDialogue =
          'Kepada Sang Merah Putih... HORMAT GRAK! Mari kita nyanyikan Lagu Kebangsaan Indonesia Raya dengan khidmat!';
        this.renderBubbleForNPC(kepsek);
        this.sharedBubbleScale = 1.0;
      }
    } else if (wasActive) {
      // Ceremony finished! All NPCs disperse and return to their respective classrooms & courtyard activities
      for (const npc of this.npcs) {
        if (npc.role === 'pedagang' || npc.group.children.length === 0) continue;

        if (npc.labelSprite) {
          npc.labelSprite.visible = true;
        }

        if (
          (npc.behavior === 'patrol_loop' || npc.behavior === 'futsal_player') &&
          npc.patrolWaypoints &&
          npc.patrolWaypoints.length > 0
        ) {
          this.updateNPCLabel(npc, npc.activity);
        } else {
          this.advanceToActivityStage(npc, npc.currentStageIdx, 0, true, snapImmediately);
        }
      }

      // Explicitly guarantee jump rope trio (Kartika, Dewi, Intan) positions & alignments
      this.resetJumpRopeGroupPositions(snapImmediately);
    }
  }

  public setCeremonyFlagProgress(progress: number) {
    this.ceremonyFlagProgress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  public setPenaltyMinigameMode(
    active: boolean,
    aimZone: PenaltyZoneId = 'kiri_atas',
    missionType: PJOKMissionMode = 'penalty'
  ) {
    const wasActive = this.penaltyModeActive;
    const prevType = this.activeMissionType;
    this.penaltyModeActive = active;
    this.activeMissionType = missionType;
    this.penaltyAimZone = aimZone;

    this.penaltySpotMesh.visible = active;
    this.penaltyTargetGroup.visible = active && this.penaltyShotState === 'idle';
    this.basketballMesh.visible = active && missionType === 'basket';
    this.futsalBallMesh.visible = !active || missionType === 'penalty';

    if (active) {
      if (missionType === 'basket') {
        this.penaltySpotMesh.position.set(12.2, 0.025, 10.0);
        this.penaltyTargetGroup.rotation.y = -Math.PI / 2;
      } else {
        this.penaltySpotMesh.position.set(-9.8, 0.025, 10.0);
        this.penaltyTargetGroup.rotation.y = Math.PI / 2;
      }
    }

    if (active && (!wasActive || prevType !== missionType)) {
      this.resetPenaltyBallToSpot();
    }
  }

  public resetPenaltyBallToSpot() {
    this.penaltyShotState = 'idle';
    this.penaltyShotTimer = 0;
    this.keeperDiveTargetZ = 10.0;
    this.keeperDiveTargetY = 1.22;
    this.keeperDiveRoll = 0;
    if (this.activeMissionType === 'basket') {
      this.basketballMesh.position.set(12.85, 2.38, 10.0);
      this.basketballMesh.rotation.set(0, 0, 0);
    } else {
      this.futsalBallMesh.position.set(-9.8, 0.38, 10.0);
    }
    if (this.penaltyModeActive) {
      this.penaltyTargetGroup.visible = true;
    }
  }

  public executeBasketballThrow(
    zone: PenaltyZoneId,
    powerPercent: number,
    soundEnabled = true
  ): PenaltyKickResult {
    this.penaltyAimZone = zone;
    this.penaltyTargetGroup.visible = false;
    soundFX.playSoccerKick(soundEnabled);

    const targetInfo = BASKET_ZONES[zone];
    let outcome: PenaltyShotOutcome = 'goal';

    if (powerPercent > 91) {
      outcome = 'post'; // Hits high off backboard
    } else if (powerPercent >= 50 && powerPercent <= 89) {
      // Green Sweet Spot! High chance of scoring into the ring
      const isCenterShot = zone === 'tengah_bawah' || zone === 'tengah_atas';
      const missChance = isCenterShot ? 0.08 : 0.16;
      outcome = Math.random() < missChance ? 'saved' : 'goal';
    } else {
      // Weak shot (<50%)
      outcome = Math.random() < 0.28 ? 'goal' : 'saved';
    }

    this.penaltyBallStart.set(12.85, 2.55, 10.0);
    if (outcome === 'goal') {
      // Ball lands squarely in the center of the East Basketball Rim (22.75, 7.5, 10.0) and drops straight through the net!
      this.penaltyBallEnd.set(22.75, 7.55, 10.0);
      this.penaltyBallRebound.set(22.75, 0.38, 10.0);
    } else if (outcome === 'saved') {
      // Clanks off the front/side of the orange rim and bounces back toward free-throw area
      const rimZ = targetInfo.targetZ === 10.0 ? 10.42 : targetInfo.targetZ;
      this.penaltyBallEnd.set(22.25, 7.52, rimZ);
      this.penaltyBallRebound.set(16.8, 0.38, 10.0 + (rimZ - 10.0) * 2.2);
    } else {
      // Overpowered: hits top of backboard and ricochets back
      this.penaltyBallEnd.set(23.32, 8.95, targetInfo.targetZ);
      this.penaltyBallRebound.set(15.5, 0.38, targetInfo.targetZ);
    }

    this.penaltyLastOutcome = outcome;
    this.penaltyShotState = 'flying';
    this.penaltyShotTimer = 0;

    let teacherComment = '';
    if (outcome === 'goal') {
      teacherComment = `SWISH! Bola basket masuk mulus ke ring (${targetInfo.label})! Nilai PJOK kamu makin tinggi!`;
    } else if (outcome === 'saved') {
      teacherComment = `Hampir masuk! Bola memantul di bibir ring basket. Ayo lempar di zona hijau!`;
    } else {
      teacherComment = `Lemparan terlalu keras mengenai papan atas! Jaga power di zona hijau ya!`;
    }

    const pakBudi = this.npcs.find((n) => n.name.includes('Pak Budi'));
    if (pakBudi) {
      pakBudi.currentDialogue = teacherComment;
      this.renderBubbleForNPC(pakBudi);
      this.sharedBubbleScale = 1.0;
    }

    return {
      outcome,
      zone,
      keeperZone: zone,
      power: powerPercent,
      teacherComment,
    };
  }

  public executePenaltyKick(
    zone: PenaltyZoneId,
    powerPercent: number,
    soundEnabled = true
  ): PenaltyKickResult {
    this.penaltyAimZone = zone;
    this.penaltyTargetGroup.visible = false;
    soundFX.playSoccerKick(soundEnabled);

    const targetInfo = PENALTY_ZONES[zone];
    const allZones: PenaltyZoneId[] = [
      'kiri_atas',
      'tengah_atas',
      'kanan_atas',
      'kiri_bawah',
      'tengah_bawah',
      'kanan_bawah',
    ];

    let outcome: PenaltyShotOutcome = 'goal';
    let keeperZone: PenaltyZoneId = allZones[Math.floor(Math.random() * allZones.length)];

    // Determine outcome based on Power Timing & Aim Placement:
    // Sweet spot is 50%..89% power; >92% risks hitting crossbar/post; <45% is slower and easier for keeper
    if (powerPercent > 92) {
      outcome = 'post';
    } else if (powerPercent >= 50 && powerPercent <= 89) {
      // Sweet spot shot! High accuracy & speed
      const isCorner = zone !== 'tengah_atas' && zone !== 'tengah_bawah';
      const saveChance = isCorner ? 0.14 : 0.28;
      if (Math.random() < saveChance) {
        outcome = 'saved';
        keeperZone = zone;
      } else {
        outcome = 'goal';
        if (keeperZone === zone) {
          keeperZone = allZones[(allZones.indexOf(zone) + 2) % allZones.length];
        }
      }
    } else {
      // Weak or slightly off-timed shot (<50% or 90..92%)
      const saveChance = zone === 'tengah_atas' || zone === 'tengah_bawah' ? 0.55 : 0.38;
      if (Math.random() < saveChance) {
        outcome = 'saved';
        keeperZone = zone;
      } else {
        outcome = 'goal';
        if (keeperZone === zone) {
          keeperZone = allZones[(allZones.indexOf(zone) + 1) % allZones.length];
        }
      }
    }

    const keeperTarget = PENALTY_ZONES[keeperZone];
    this.keeperDiveTargetZ = keeperTarget.targetZ;
    this.keeperDiveTargetY = keeperZone.endsWith('atas') ? 1.85 : 0.95;
    this.keeperDiveRoll =
      keeperTarget.targetZ > 10.5 ? 0.65 : keeperTarget.targetZ < 9.5 ? -0.65 : 0;

    this.penaltyBallStart.set(-9.8, 0.38, 10.0);
    if (outcome === 'goal') {
      this.penaltyBallEnd.set(-22.8, targetInfo.targetY, targetInfo.targetZ);
      this.penaltyBallRebound.set(-23.1, 0.38, targetInfo.targetZ);
    } else if (outcome === 'saved') {
      this.penaltyBallEnd.set(-20.4, keeperTarget.targetY, keeperTarget.targetZ);
      this.penaltyBallRebound.set(
        -15.2,
        0.38,
        10.0 + (keeperTarget.targetZ - 10.0) * 0.6
      );
    } else {
      // Hit crossbar or post!
      const postZ =
        targetInfo.targetZ > 11.0 ? 13.65 : targetInfo.targetZ < 9.0 ? 6.35 : 10.0;
      const postY = postZ === 10.0 ? 4.82 : targetInfo.targetY;
      this.penaltyBallEnd.set(-21.75, postY, postZ);
      this.penaltyBallRebound.set(-14.5, 0.38, postZ * 0.85 + 1.5);
    }

    this.penaltyLastOutcome = outcome;
    this.penaltyShotState = 'flying';
    this.penaltyShotTimer = 0;

    let teacherComment = '';
    if (outcome === 'goal') {
      const goalLines = [
        `GOOOL! Tendangan ke ${targetInfo.label} sangat akurat! Nilai olahraga kamu makin tinggi!`,
        `Luar biasa! Bola bersarang telak di ${targetInfo.label}! Teknik tendangan nilai A+!`,
        `Mantap sekali! Kiper tidak sanggup menjangkau bola di ${targetInfo.label}!`,
      ];
      teacherComment = goalLines[Math.floor(Math.random() * goalLines.length)];
    } else if (outcome === 'saved') {
      teacherComment = `Wah, tendangan ke ${targetInfo.label} berhasil ditepis kiper Kevin! Ayo bidik pojok dengan power zona hijau!`;
    } else {
      teacherComment = `Aduh, tendangan terlalu keras hingga membentur tiang gawang! Jaga power di zona hijau ya!`;
    }

    // Update Pak Budi (Guru PJOK) speech bubble & voice commentary
    const pakBudi = this.npcs.find((n) => n.name.includes('Pak Budi'));
    if (pakBudi) {
      pakBudi.currentDialogue = teacherComment;
      this.renderBubbleForNPC(pakBudi);
      this.sharedBubbleScale = 1.0;
    }

    return {
      outcome,
      zone,
      keeperZone,
      power: powerPercent,
      teacherComment,
    };
  }

  private createArticulatedNPC(options: {
    name: string;
    activity: string;
    role: NPCRole;
    shirtHex: string;
    pantsHex: string;
    skinHex?: string;
    tieHex?: string;
    hatType?: 'topi_sd' | 'peci' | 'baret' | 'topi_olahraga' | 'pita' | 'none';
    hasSkirt?: boolean;
    hasBackpack?: boolean;
    backpackHex?: string;
    behavior: NPCBehavior;
    position: [number, number];
    floorY?: number;
    rotationY?: number;
    patrolWaypoints?: [number, number][];
    moveSpeed?: number;
    dialogues: string[];
    activitySchedule?: NPCActivityStage[];
    initialStageOffset?: number;
    spawnMeshVisuals?: boolean;
  }): NPCInstance {
    const isAdult =
      options.role === 'guru' ||
      options.role === 'kepsek' ||
      options.role === 'satpam' ||
      options.role === 'pedagang';
    const scaleFactor = isAdult ? 1.24 : 1.0;

    // Automatically place indoor NPCs on top of the 0.45-unit ceramic room floor slab
    const px = options.position[0];
    const pz = options.position[1];
    const isIndoorCoord = pz < -34.0 || px < -36.5 || px > 36.5;
    const baseY = options.floorY !== undefined ? options.floorY : isIndoorCoord ? 0.45 : 0;
    const baseRotY = options.rotationY ?? 0;

    const root = new THREE.Group();
    root.position.set(px, baseY, pz);
    root.rotation.y = baseRotY;
    root.scale.setScalar(scaleFactor);

    const hips = new THREE.Group();
    hips.position.set(0, 1.22, 0);
    root.add(hips);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.24, 0);
    hips.add(headPivot);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.88, 1.12, 0);
    hips.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.88, 1.12, 0);
    hips.add(rightArm);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.31, 0, 0);
    hips.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.31, 0, 0);
    hips.add(rightLeg);

    const badgeColor =
      options.role === 'kepsek'
        ? '#FACC15'
        : options.role === 'guru'
        ? '#38BDF8'
        : options.role === 'satpam'
        ? '#4ADE80'
        : '#F87171';

    let labelSprite: THREE.Sprite | undefined;
    let labelCanvas: HTMLCanvasElement | undefined;
    let labelTexture: THREE.CanvasTexture | undefined;
    let eyesGroup: THREE.Group | undefined;
    let mouthGroup: THREE.Group | undefined;

    if (options.spawnMeshVisuals !== false) {
      const npcIdx = this.npcs.length;
      const skinTonesPalette = ['#F6D2B8', '#EAC09E', '#DFAB82', '#C68B59', '#9F693E'];
      const chosenSkinHex =
        options.skinHex || skinTonesPalette[npcIdx % skinTonesPalette.length];

      // Determine expressive FaceExpressionId matching NPC personality, role & activity
      let expression: FaceExpressionId = 'ceria';
      if (
        options.role === 'kepsek' ||
        options.name.includes('Hendra') ||
        options.name.includes('Ratna') ||
        options.name.includes('Rina') ||
        options.name.includes('Dedi') ||
        options.name.includes('Sari')
      ) {
        expression = 'kacamata';
      } else if (
        options.behavior === 'futsal_player' ||
        options.behavior === 'coach_sideline' ||
        options.behavior === 'exercise_skj' ||
        options.behavior === 'hop_dampu' ||
        options.behavior === 'play_kelereng' ||
        options.behavior === 'jump_rope' ||
        options.behavior === 'turn_rope'
      ) {
        expression = npcIdx % 2 === 0 ? 'semangat' : 'ceria';
      } else if (options.behavior === 'clap_cheer') {
        expression = npcIdx % 4 === 0 ? 'kaget' : npcIdx % 2 === 0 ? 'semangat' : 'ceria';
      } else if (
        options.behavior === 'read_book' ||
        options.behavior === 'write_desk' ||
        options.behavior === 'type_computer' ||
        options.behavior === 'science_experiment' ||
        options.behavior === 'inspect_shelf' ||
        options.behavior === 'ceremony_salute'
      ) {
        expression =
          npcIdx % 4 === 0 ? 'kacamata' : npcIdx % 2 === 0 ? 'fokus' : 'ceria';
      } else {
        const exprCycle: FaceExpressionId[] = [
          'ceria',
          'semangat',
          'ceria',
          'fokus',
          'kacamata',
        ];
        expression = exprCycle[npcIdx % exprCycle.length];
      }

      const skinMat = this.getMat(chosenSkinHex, 0.42);
      const shirtMat = this.getMat(options.shirtHex, 0.76);
      const pantsMat = this.getMat(options.pantsHex, 0.82);
      const sockMat = this.getMat('#F8FAFC', 0.85);
      const shoeMat = this.getMat('#18181B', 0.28);
      const soleMat = this.getMat('#F8FAFC', 0.65);
      const stripeMat = this.getMat('#1E293B', 0.8);
      const goldMat = this.getMat('#FBBF24', 0.25);

      // --- 1. TORSO ASSEMBLY (Playable Character Style: Rounded Core + Collar Lapels + Belt Buckle + Pocket Badge) ---
      const torsoMesh = new THREE.Mesh(this.torsoCoreGeo, shirtMat);
      torsoMesh.position.set(0, 0.62, 0);
      torsoMesh.castShadow = true;
      torsoMesh.receiveShadow = true;
      hips.add(torsoMesh);

      const leftCollar = new THREE.Mesh(this.collarGeo, shirtMat);
      leftCollar.position.set(-0.24, 1.24, 0.18);
      leftCollar.rotation.set(0.15, 0.2, -0.22);
      const rightCollar = new THREE.Mesh(this.collarGeo, shirtMat);
      rightCollar.position.set(0.24, 1.24, 0.18);
      rightCollar.rotation.set(0.15, -0.2, 0.22);
      hips.add(leftCollar, rightCollar);

      // Gold 3D Belt Buckle on waist
      const buckleMesh = new THREE.Mesh(this.buckleGeo, goldMat);
      buckleMesh.position.set(0, 0.1, 0.32);
      hips.add(buckleMesh);

      // Chest Pocket + Gold Emblem Badge
      const pocketMesh = new THREE.Mesh(this.boxGeo, shirtMat);
      pocketMesh.scale.set(0.24, 0.26, 0.025);
      pocketMesh.position.set(0.26, 0.74, 0.318);
      const pocketBadge = new THREE.Mesh(this.boxGeo, goldMat);
      pocketBadge.scale.set(0.11, 0.11, 0.032);
      pocketBadge.position.set(0.26, 0.76, 0.322);
      hips.add(pocketMesh, pocketBadge);

      // 3D Tie (Dasi SD / Guru) or Pramuka Neckerchief (Kacu Hasduk)
      if (options.tieHex) {
        const isPramukaShirt = options.shirtHex.toUpperCase() === '#D6B588';
        const tieMat = this.getMat(options.tieHex, 0.52);
        if (isPramukaShirt) {
          const whiteTrimMat = this.getMat('#FFFFFF', 0.65);
          const leftFold = new THREE.Mesh(this.boxGeo, tieMat);
          leftFold.scale.set(0.15, 0.34, 0.07);
          leftFold.position.set(-0.11, 1.06, 0.33);
          leftFold.rotation.z = -0.35;
          const rightFold = new THREE.Mesh(this.boxGeo, tieMat);
          rightFold.scale.set(0.15, 0.34, 0.07);
          rightFold.position.set(0.11, 1.06, 0.33);
          rightFold.rotation.z = 0.35;
          const ringMesh = new THREE.Mesh(this.boxGeo, goldMat);
          ringMesh.scale.set(0.14, 0.1, 0.09);
          ringMesh.position.set(0, 0.91, 0.34);
          const kacuTip = new THREE.Mesh(this.boxGeo, tieMat);
          kacuTip.scale.set(0.21, 0.4, 0.06);
          kacuTip.position.set(0, 0.68, 0.34);
          const whiteBorder = new THREE.Mesh(this.boxGeo, whiteTrimMat);
          whiteBorder.scale.set(0.22, 0.055, 0.065);
          whiteBorder.position.set(0, 0.52, 0.345);
          hips.add(leftFold, rightFold, ringMesh, kacuTip, whiteBorder);
        } else {
          const knotMesh = new THREE.Mesh(this.boxGeo, tieMat);
          knotMesh.scale.set(0.16, 0.14, 0.08);
          knotMesh.position.set(0, 1.1, 0.34);
          const bladeMesh = new THREE.Mesh(this.boxGeo, tieMat);
          bladeMesh.scale.set(0.18, 0.6, 0.06);
          bladeMesh.position.set(0, 0.74, 0.34);
          hips.add(knotMesh, bladeMesh);
        }
      }

      if (options.hasSkirt) {
        const skirtMesh = new THREE.Mesh(this.boxGeo, pantsMat);
        skirtMesh.scale.set(1.28, 0.56, 0.68);
        skirtMesh.position.set(0, -0.18, 0);
        skirtMesh.castShadow = true;
        hips.add(skirtMesh);
      }

      if (options.hasBackpack) {
        const bagMat = this.getMat(options.backpackHex || '#1D4ED8', 0.6);
        const bagMesh = new THREE.Mesh(this.boxGeo, bagMat);
        bagMesh.scale.set(0.94, 1.0, 0.42);
        bagMesh.position.set(0, 0.66, -0.5);
        bagMesh.castShadow = true;
        const pocketFront = new THREE.Mesh(this.boxGeo, bagMat);
        pocketFront.scale.set(0.74, 0.48, 0.16);
        pocketFront.position.set(0, 0.48, -0.74);
        const safetyStrip = new THREE.Mesh(this.boxGeo, goldMat);
        safetyStrip.scale.set(0.66, 0.07, 0.03);
        safetyStrip.position.set(0, 0.86, -0.72);
        hips.add(bagMesh, pocketFront, safetyStrip);
      }

      // --- 2. HEAD & EXPRESSIVE FACE ASSEMBLY (Exact Playable Character Roblox Head + Face Expressions) ---
      const neckMesh = new THREE.Mesh(this.neckGeo, skinMat);
      neckMesh.position.set(0, 0.06, 0);
      headPivot.add(neckMesh);

      const headMesh = new THREE.Mesh(this.headBodyGeo, skinMat);
      headMesh.position.set(0, 0.52, 0);
      headMesh.castShadow = true;
      headMesh.receiveShadow = true;
      headPivot.add(headMesh);

      const headCap = new THREE.Mesh(this.headCapGeo, skinMat);
      headCap.position.set(0, 0.96, 0);
      headPivot.add(headCap);

      const leftEar = new THREE.Mesh(this.earGeo, skinMat);
      leftEar.position.set(-0.46, 0.52, 0);
      const rightEar = new THREE.Mesh(this.earGeo, skinMat);
      rightEar.position.set(0.46, 0.52, 0);
      headPivot.add(leftEar, rightEar);

      // High-res CanvasTexture Face Decal Plane (WebGL)
      const facePlane = new THREE.Mesh(
        this.facePlaneGeo,
        this.getFaceMat(chosenSkinHex, expression)
      );
      facePlane.position.set(0, 0.52, 0.422);
      facePlane.userData.skipSoftwareRender = true;
      headPivot.add(facePlane);

      // 3D Sculpted Facial Expression Features (Eyebrows, Blinking Eyes + Catchlights, Blush, Animated Mouth, 3D Glasses)
      [-0.19, 0.19].forEach((cx) => {
        const cheek = new THREE.Mesh(this.boxGeo, this.blushMat);
        cheek.scale.set(0.085, 0.045, 0.016);
        cheek.position.set(cx, 0.45, 0.425);
        headPivot.add(cheek);
      });

      const leftBrow = new THREE.Mesh(this.boxGeo, this.eyeMat);
      leftBrow.scale.set(0.115, 0.028, 0.022);
      const rightBrow = new THREE.Mesh(this.boxGeo, this.eyeMat);
      rightBrow.scale.set(0.115, 0.028, 0.022);
      const browY = expression === 'kaget' ? 0.64 : 0.615;
      leftBrow.position.set(-0.13, browY, 0.428);
      rightBrow.position.set(0.13, browY, 0.428);
      if (expression === 'semangat') {
        leftBrow.rotation.z = -0.22;
        rightBrow.rotation.z = 0.22;
      } else if (expression === 'fokus') {
        leftBrow.rotation.z = -0.1;
        rightBrow.rotation.z = 0.1;
      } else if (expression === 'kaget') {
        leftBrow.rotation.z = 0.16;
        rightBrow.rotation.z = -0.16;
      } else {
        leftBrow.rotation.z = 0.06;
        rightBrow.rotation.z = -0.06;
      }
      headPivot.add(leftBrow, rightBrow);

      eyesGroup = new THREE.Group();
      eyesGroup.position.set(0, 0.54, 0.428);
      const eyeH = expression === 'fokus' ? 0.072 : 0.088;
      [-0.125, 0.125].forEach((ex) => {
        const eyeMesh = new THREE.Mesh(this.boxGeo, this.eyeMat);
        eyeMesh.scale.set(0.062, eyeH, 0.022);
        eyeMesh.position.set(ex, 0, 0);
        const shineMesh = new THREE.Mesh(this.boxGeo, this.shineMat);
        shineMesh.scale.set(0.022, 0.024, 0.026);
        shineMesh.position.set(ex - 0.012, 0.016, 0.003);
        eyesGroup!.add(eyeMesh, shineMesh);
      });
      headPivot.add(eyesGroup);

      if (expression === 'kacamata') {
        [-0.13, 0.13].forEach((gx) => {
          const topBar = new THREE.Mesh(this.boxGeo, this.glassesFrameMat);
          topBar.scale.set(0.15, 0.022, 0.032);
          topBar.position.set(gx, 0.59, 0.436);
          const botBar = new THREE.Mesh(this.boxGeo, this.glassesFrameMat);
          botBar.scale.set(0.15, 0.02, 0.032);
          botBar.position.set(gx, 0.49, 0.436);
          const leftRim = new THREE.Mesh(this.boxGeo, this.glassesFrameMat);
          leftRim.scale.set(0.02, 0.11, 0.032);
          leftRim.position.set(gx - 0.068, 0.54, 0.436);
          const rightRim = new THREE.Mesh(this.boxGeo, this.glassesFrameMat);
          rightRim.scale.set(0.02, 0.11, 0.032);
          rightRim.position.set(gx + 0.068, 0.54, 0.436);
          headPivot.add(topBar, botBar, leftRim, rightRim);
        });
        const bridge = new THREE.Mesh(this.boxGeo, this.glassesFrameMat);
        bridge.scale.set(0.06, 0.022, 0.032);
        bridge.position.set(0, 0.55, 0.436);
        headPivot.add(bridge);
      }

      mouthGroup = new THREE.Group();
      mouthGroup.position.set(0, 0.40, 0.428);
      if (expression === 'ceria' || expression === 'kacamata') {
        const mouthBg = new THREE.Mesh(this.boxGeo, this.mouthRedMat);
        mouthBg.scale.set(0.16, 0.075, 0.02);
        const teethBar = new THREE.Mesh(this.boxGeo, this.shineMat);
        teethBar.scale.set(0.14, 0.024, 0.024);
        teethBar.position.set(0, 0.022, 0.002);
        const tongue = new THREE.Mesh(this.boxGeo, this.tongueMat);
        tongue.scale.set(0.08, 0.024, 0.024);
        tongue.position.set(0, -0.02, 0.002);
        mouthGroup.add(mouthBg, teethBar, tongue);
      } else if (expression === 'semangat') {
        const grinBorder = new THREE.Mesh(this.boxGeo, this.eyeMat);
        grinBorder.scale.set(0.18, 0.068, 0.02);
        const grinTeeth = new THREE.Mesh(this.boxGeo, this.shineMat);
        grinTeeth.scale.set(0.16, 0.046, 0.024);
        grinTeeth.position.set(0, 0, 0.002);
        mouthGroup.add(grinBorder, grinTeeth);
      } else if (expression === 'kaget') {
        const oOuter = new THREE.Mesh(this.boxGeo, this.eyeMat);
        oOuter.scale.set(0.085, 0.095, 0.02);
        const oInner = new THREE.Mesh(this.boxGeo, this.mouthRedMat);
        oInner.scale.set(0.058, 0.068, 0.024);
        oInner.position.set(0, 0, 0.002);
        mouthGroup.add(oOuter, oInner);
      } else {
        const smileCenter = new THREE.Mesh(this.boxGeo, this.eyeMat);
        smileCenter.scale.set(0.12, 0.024, 0.022);
        const smileCornerR = new THREE.Mesh(this.boxGeo, this.eyeMat);
        smileCornerR.scale.set(0.035, 0.024, 0.022);
        smileCornerR.position.set(0.068, 0.012, 0);
        smileCornerR.rotation.z = 0.35;
        mouthGroup.add(smileCenter, smileCornerR);
      }
      headPivot.add(mouthGroup);

      // --- 3. 3D HAIR & PIGTAILS / BANGS ---
      const hairColors = ['#18181B', '#27170E', '#3B2314'];
      const hairMat = this.getMat(hairColors[npcIdx % hairColors.length], 0.65);
      const hairTop = new THREE.Mesh(this.boxGeo, hairMat);
      hairTop.scale.set(0.92, 0.24, 0.88);
      hairTop.position.set(0, 0.86, -0.02);
      hairTop.castShadow = true;

      const backHair = new THREE.Mesh(this.boxGeo, hairMat);
      backHair.scale.set(0.9, 0.52, 0.22);
      backHair.position.set(0, 0.62, -0.36);

      const bangs = new THREE.Mesh(this.boxGeo, hairMat);
      bangs.scale.set(0.84, 0.14, 0.14);
      bangs.position.set(0, 0.79, 0.39);
      headPivot.add(hairTop, backHair, bangs);

      // Twin Pigtails (Kuncir Dua + Ikatan Merah) for Female Students
      if (options.role === 'siswa_putri' || options.hasSkirt) {
        const scrunchieMat = this.getMat('#DC2626', 0.5);
        [-0.54, 0.54].forEach((xPos) => {
          const tie = new THREE.Mesh(this.boxGeo, scrunchieMat);
          tie.scale.set(0.14, 0.14, 0.14);
          tie.position.set(xPos, 0.56, -0.08);
          const tail = new THREE.Mesh(this.boxGeo, hairMat);
          tail.scale.set(0.23, 0.46, 0.23);
          tail.position.set(xPos * 1.15, 0.34, -0.08);
          tail.rotation.z = xPos < 0 ? 0.22 : -0.22;
          tail.castShadow = true;
          headPivot.add(tie, tail);
        });
      }

      // --- 4. HATS (Topi SD, Baret Pramuka, Peci, Topi Olahraga, Pita Rambut) ---
      if (options.hatType === 'topi_sd') {
        const redCapMat = this.getMat('#991B1B', 0.6);
        const whiteFrontMat = this.getMat('#F8FAFC', 0.6);
        const capCrown = new THREE.Mesh(this.boxGeo, redCapMat);
        capCrown.scale.set(0.92, 0.28, 0.92);
        capCrown.position.set(0, 0.96, 0);
        const capFront = new THREE.Mesh(this.boxGeo, whiteFrontMat);
        capFront.scale.set(0.55, 0.26, 0.06);
        capFront.position.set(0, 0.96, 0.45);
        const visor = new THREE.Mesh(this.boxGeo, redCapMat);
        visor.scale.set(0.84, 0.07, 0.42);
        visor.position.set(0, 0.83, 0.48);
        visor.rotation.x = 0.12;
        headPivot.add(capCrown, capFront, visor);
      } else if (options.hatType === 'baret') {
        const baretMat = this.getMat('#451A03', 0.85);
        const baretCrown = new THREE.Mesh(this.boxGeo, baretMat);
        baretCrown.scale.set(0.96, 0.24, 0.92);
        baretCrown.position.set(0.05, 0.98, 0);
        baretCrown.rotation.z = -0.14;
        const badge = new THREE.Mesh(this.boxGeo, goldMat);
        badge.scale.set(0.18, 0.16, 0.06);
        badge.position.set(-0.22, 0.98, 0.45);
        headPivot.add(baretCrown, badge);
      } else if (options.hatType === 'peci') {
        const peciMat = this.getMat('#0F172A', 0.9);
        const peci = new THREE.Mesh(this.boxGeo, peciMat);
        peci.scale.set(0.9, 0.32, 0.88);
        peci.position.set(0, 1.02, 0);
        headPivot.add(peci);
      } else if (options.hatType === 'topi_olahraga') {
        const blueCapMat = this.getMat('#1E3A8A', 0.6);
        const capCrown = new THREE.Mesh(this.boxGeo, blueCapMat);
        capCrown.scale.set(0.92, 0.28, 0.92);
        capCrown.position.set(0, 0.96, 0);
        const visor = new THREE.Mesh(this.boxGeo, blueCapMat);
        visor.scale.set(0.84, 0.07, 0.42);
        visor.position.set(0, 0.83, 0.48);
        visor.rotation.x = 0.12;
        headPivot.add(capCrown, visor);
      } else if (options.hatType === 'pita') {
        const ribbonMat = this.getMat('#DC2626', 0.45);
        const bowCenter = new THREE.Mesh(this.boxGeo, ribbonMat);
        bowCenter.scale.set(0.14, 0.14, 0.14);
        bowCenter.position.set(0, 1.02, 0.32);
        const bowLeft = new THREE.Mesh(this.boxGeo, ribbonMat);
        bowLeft.scale.set(0.24, 0.18, 0.1);
        bowLeft.position.set(-0.16, 1.04, 0.32);
        bowLeft.rotation.z = 0.2;
        const bowRight = new THREE.Mesh(this.boxGeo, ribbonMat);
        bowRight.scale.set(0.24, 0.18, 0.1);
        bowRight.position.set(0.16, 1.04, 0.32);
        bowRight.rotation.z = -0.2;
        headPivot.add(bowCenter, bowLeft, bowRight);
      }

      // --- 5. ARMS (Sleeve + Cuff Trim + Forearm + Blocky Hand Gripper) ---
      [leftArm, rightArm].forEach((armPivot) => {
        const sleeve = new THREE.Mesh(this.boxGeo, shirtMat);
        sleeve.scale.set(0.55, 0.52, 0.55);
        sleeve.position.set(0, -0.18, 0);
        sleeve.castShadow = true;

        const cuff = new THREE.Mesh(this.boxGeo, shirtMat);
        cuff.scale.set(0.57, 0.08, 0.57);
        cuff.position.set(0, -0.43, 0);

        const forearm = new THREE.Mesh(this.boxGeo, skinMat);
        forearm.scale.set(0.49, 0.55, 0.49);
        forearm.position.set(0, -0.70, 0);
        forearm.castShadow = true;

        const hand = new THREE.Mesh(this.boxGeo, skinMat);
        hand.scale.set(0.45, 0.22, 0.47);
        hand.position.set(0, -1.02, 0);
        hand.castShadow = true;

        armPivot.add(sleeve, cuff, forearm, hand);
      });

      // --- 6. LEGS (Shorts/Pants + Knee Skin + Striped White Socks + White-Soled School Shoes) ---
      [leftLeg, rightLeg].forEach((legPivot) => {
        if (isAdult) {
          const longPants = new THREE.Mesh(this.boxGeo, pantsMat);
          longPants.scale.set(0.56, 0.96, 0.58);
          longPants.position.set(0, -0.48, 0);
          longPants.castShadow = true;
          legPivot.add(longPants);
        } else {
          const shorts = new THREE.Mesh(this.boxGeo, pantsMat);
          shorts.scale.set(0.57, 0.58, 0.59);
          shorts.position.set(0, -0.29, 0);
          shorts.castShadow = true;

          const calfSkin = new THREE.Mesh(this.boxGeo, skinMat);
          calfSkin.scale.set(0.51, 0.22, 0.51);
          calfSkin.position.set(0, -0.66, 0);
          calfSkin.castShadow = true;

          const sock = new THREE.Mesh(this.boxGeo, sockMat);
          sock.scale.set(0.52, 0.32, 0.53);
          sock.position.set(0, -0.88, 0);
          sock.castShadow = true;

          const stripe1 = new THREE.Mesh(this.boxGeo, stripeMat);
          stripe1.scale.set(0.535, 0.035, 0.545);
          stripe1.position.set(0, -0.76, 0);
          const stripe2 = new THREE.Mesh(this.boxGeo, stripeMat);
          stripe2.scale.set(0.535, 0.035, 0.545);
          stripe2.position.set(0, -0.82, 0);

          legPivot.add(shorts, calfSkin, sock, stripe1, stripe2);
        }

        const shoeUpper = new THREE.Mesh(this.boxGeo, shoeMat);
        shoeUpper.scale.set(0.57, 0.20, 0.72);
        shoeUpper.position.set(0, -1.08, 0.06);
        shoeUpper.castShadow = true;

        const sole = new THREE.Mesh(this.boxGeo, soleMat);
        sole.scale.set(0.59, 0.07, 0.75);
        sole.position.set(0, -1.185, 0.06);

        legPivot.add(shoeUpper, sole);
      });

      const createdLabel = createNPCLabelSprite(options.name, options.activity, badgeColor);
      labelSprite = createdLabel.sprite;
      labelCanvas = createdLabel.canvas;
      labelTexture = createdLabel.texture;
      labelSprite.position.set(0, 3.85, 0);
      root.add(labelSprite);
    }

    // Build default multi-stage schedule if none was explicitly provided
    const schedule: NPCActivityStage[] =
      options.activitySchedule && options.activitySchedule.length > 0
        ? options.activitySchedule
        : [
            {
              activity: options.activity,
              behavior: options.behavior,
              position: [px, pz],
              rotationY: baseRotY,
              duration: 10,
              dialogues: options.dialogues,
            },
          ];

    const rawOffset = options.initialStageOffset ?? 0;
    const safeOffset = Math.floor(Math.abs(Number.isFinite(rawOffset) ? rawOffset : 0));
    const startStageIdx = schedule.length > 0 ? safeOffset % schedule.length : 0;
    const startStage = schedule[startStageIdx] || schedule[0];
    const startPos = startStage?.position ?? [px, pz];
    const startRotY = startStage?.rotationY ?? baseRotY;

    root.position.set(startPos[0], baseY, startPos[1]);
    root.rotation.y = startRotY;

    if (labelCanvas && labelTexture) {
      drawNPCLabelCanvas(labelCanvas, options.name, startStage.activity, badgeColor);
      labelTexture.needsUpdate = true;
    }

    const activeDialogues =
      startStage.dialogues && startStage.dialogues.length > 0
        ? startStage.dialogues
        : options.dialogues;
    const initialMsg = activeDialogues[0] || 'Halo!';
    this.group.add(root);

    const wp = options.patrolWaypoints;
    const npc: NPCInstance = {
      name: options.name,
      activity: startStage.activity,
      role: options.role,
      group: root,
      hips,
      head: headPivot,
      eyesGroup,
      mouthGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      behavior: startStage.behavior,
      phaseOffset: Math.random() * Math.PI * 2,
      basePos: new THREE.Vector3(startPos[0], baseY, startPos[1]),
      targetPos: new THREE.Vector3(
        wp && wp.length > 1 ? wp[1][0] : startPos[0],
        baseY,
        wp && wp.length > 1 ? wp[1][1] : startPos[1]
      ),
      moveSpeed: options.moveSpeed ?? 4.8,
      patrolWaypoints: wp,
      currentWaypointIdx: 1,
      activitySchedule: schedule,
      currentStageIdx: startStageIdx,
      stageTimer: startStage.duration * (0.65 + Math.random() * 0.5),
      isTransitioningWalk: false,
      stageTargetPos: new THREE.Vector3(startPos[0], baseY, startPos[1]),
      stageTargetRotY: startRotY,
      badgeColor,
      labelCanvas,
      labelTexture,
      labelSprite,
      dialogues: activeDialogues,
      currentDialogue: initialMsg,
      wasPlayerNear: false,
      nextCycleTime: 0,
    };

    this.npcs.push(npc);
    return npc;
  }

  private updateNPCLabel(npc: NPCInstance, activityText: string) {
    if (!npc.labelCanvas || !npc.labelTexture) return;
    drawNPCLabelCanvas(npc.labelCanvas, npc.name, activityText, npc.badgeColor);
    npc.labelTexture.needsUpdate = true;
  }

  private advanceToActivityStage(
    npc: NPCInstance,
    nextIdx: number,
    elapsed: number,
    forceTransition = false,
    snapImmediately = false
  ) {
    if (npc.activitySchedule.length <= 1 && !forceTransition) {
      npc.stageTimer = 10;
      return;
    }

    const stage = npc.activitySchedule[nextIdx % npc.activitySchedule.length];
    npc.currentStageIdx = nextIdx % npc.activitySchedule.length;
    npc.activity = stage.activity;
    npc.behavior = stage.behavior;
    npc.stageTimer = stage.duration * (0.85 + Math.random() * 0.3);

    if (stage.dialogues && stage.dialogues.length > 0) {
      npc.dialogues = stage.dialogues;
      this.pickNextRandomDialogue(npc, elapsed);
    }

    const targetX = stage.position ? stage.position[0] : npc.basePos.x;
    const targetZ = stage.position ? stage.position[1] : npc.basePos.z;
    const targetY = npc.basePos.y;
    npc.stageTargetPos.set(targetX, targetY, targetZ);

    if (stage.rotationY !== undefined) {
      npc.stageTargetRotY = stage.rotationY;
    }

    const isTargetIndoor =
      targetZ < -34.0 || targetX < -36.5 || targetX > 36.5;

    if (snapImmediately) {
      npc.group.position.set(targetX, isTargetIndoor ? 0.45 : 0, targetZ);
      npc.group.rotation.y = npc.stageTargetRotY;
      npc.isTransitioningWalk = false;
      npc.hips.position.y = 1.22;
      npc.hips.rotation.set(0, 0, 0);
      npc.leftLeg.rotation.set(0, 0, 0);
      npc.rightLeg.rotation.set(0, 0, 0);
      npc.leftArm.rotation.set(0, 0, 0);
      npc.rightArm.rotation.set(0, 0, 0);
      npc.head.rotation.set(0, 0, 0);
      this.updateNPCLabel(npc, stage.activity);
    } else {
      const dist = Math.hypot(
        npc.stageTargetPos.x - npc.group.position.x,
        npc.stageTargetPos.z - npc.group.position.z
      );
      npc.isTransitioningWalk = dist > 0.35;
      const displayLabel = npc.isTransitioningWalk
        ? `Berjalan: ${stage.activity}`
        : stage.activity;
      this.updateNPCLabel(npc, displayLabel);
    }
  }

  private renderBubbleForNPC(npc: NPCInstance) {
    const key = `${npc.name}::${npc.activity}::${npc.currentDialogue}`;
    if (key === this.lastBubbleRenderKey) return;
    this.lastBubbleRenderKey = key;

    const accentHex =
      npc.role === 'kepsek'
        ? '#B45309'
        : npc.role === 'guru'
        ? '#0369A1'
        : npc.role === 'satpam'
        ? '#15803D'
        : npc.role === 'pedagang'
        ? '#C2410C'
        : '#B91C1C';

    drawSpeechBubbleCanvas(
      this.sharedBubbleCanvas,
      npc.name,
      npc.activity,
      npc.currentDialogue,
      accentHex
    );
    this.sharedBubbleTexture.needsUpdate = true;
  }

  private buildPlayerContextualReply(npc: NPCInstance): string {
    const shortName = npc.name.split('(')[0].trim();
    if (npc.role === 'kepsek') {
      return `Selamat pagi ${shortName}! Saya siap rajin belajar dan mengharumkan SDN SUSUKAN 03!`;
    }
    if (npc.role === 'guru') {
      return `Selamat pagi ${shortName}! Saya siap memperhatikan materi dan mengerjakan tugas dengan rapi!`;
    }
    if (npc.role === 'satpam') {
      return `Selamat pagi ${shortName}! Terima kasih sudah menjaga keamanan gerbang SDN SUSUKAN 03!`;
    }
    if (npc.role === 'pedagang') {
      return `Permisi ${shortName}, saya mau beli jajanannya satu porsi ya, aromanya sedap sekali!`;
    }
    return `Halo ${shortName}! Seru sekali kegiatan ${npc.activity.toLowerCase()}, ayo kita semangat bareng!`;
  }

  private buildPlayerSuggestedReplies(npc: NPCInstance): string[] {
    const shortName = npc.name.split('(')[0].trim();
    if (npc.role === 'kepsek') {
      return [
        `Selamat pagi ${shortName}! Saya siap rajin belajar di SDN SUSUKAN 03!`,
        `Permisi ${shortName}, semoga Bapak sehat selalu hari ini!`,
        `Siap Pak! Kami akan menjaga kebersihan dan ketertiban sekolah!`,
      ];
    }
    if (npc.role === 'guru') {
      return [
        `Selamat pagi ${shortName}! Saya siap memperhatikan pelajaran hari ini!`,
        `Permisi ${shortName}, bolehkah saya bertanya tentang materi ini?`,
        `Terima kasih atas ilmunya ${shortName}, tugasnya sudah saya kerjakan!`,
      ];
    }
    if (npc.role === 'satpam') {
      return [
        `Selamat pagi ${shortName}! Terima kasih sudah menjaga gerbang SDN SUSUKAN 03!`,
        `Permisi ${shortName}, saya izin masuk ke halaman sekolah ya!`,
        `Semangat bertugas menjaga keamanan sekolah kita ya ${shortName}!`,
      ];
    }
    if (npc.role === 'pedagang') {
      return [
        `Permisi ${shortName}, saya mau beli jajanannya satu porsi ya!`,
        `Wah harum sekali ${shortName}, berapa harga satu porsinya?`,
        `Terima kasih ${shortName}, jajanan di depan sekolah enak sekali!`,
      ];
    }
    return [
      `Halo ${shortName}! Ayo kita belajar dan semangat bareng!`,
      `Hai ${shortName}, seru sekali kegiatan ${npc.activity.toLowerCase()}!`,
      `Nanti waktu istirahat kita main bareng di halaman sekolah ya, ${shortName}!`,
    ];
  }

  private triggerPlayerSpeechBubble(
    playerName: string,
    genderStyle: 'putra' | 'putri',
    replyText: string,
    soundEnabled: boolean
  ) {
    this.playerCurrentReply = replyText;
    this.playerBubbleTimer = 4.6;
    const renderKey = `${playerName}::${replyText}`;
    if (renderKey !== this.lastPlayerRenderKey) {
      this.lastPlayerRenderKey = renderKey;
      drawSpeechBubbleCanvas(
        this.playerBubbleCanvas,
        `${playerName} (Kamu)`,
        'Dialog Karakter Utama',
        replyText,
        '#16A34A'
      );
      this.playerBubbleTexture.needsUpdate = true;
    }
    soundFX.playPlayerCharacterVoice(replyText, genderStyle, soundEnabled);
  }

  private pickNextRandomDialogue(npc: NPCInstance, elapsed: number) {
    if (npc.dialogues.length === 0) return;
    let chosen = npc.dialogues[Math.floor(Math.random() * npc.dialogues.length)];
    if (npc.dialogues.length > 1 && chosen === npc.currentDialogue) {
      const idx = (npc.dialogues.indexOf(chosen) + 1) % npc.dialogues.length;
      chosen = npc.dialogues[idx];
    }
    npc.currentDialogue = chosen;
    npc.nextCycleTime = elapsed + 10.5;
  }

  /**
   * Pre-records/preloads human speech audio for the closest NPCs around (x, z)
   * so voice playback starts with zero latency as the player walks around.
   */
  public preloadNearbyDialogues(playerX: number, playerZ: number) {
    const scored = this.npcs
      .map((npc) => ({
        npc,
        dist: Math.hypot(playerX - npc.group.position.x, playerZ - npc.group.position.z),
      }))
      .filter((item) => item.dist <= 35.0)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);

    if (scored.length === 0) return;

    const toPreload: { text: string; npcName: string; role: string }[] = [];
    for (const { npc } of scored) {
      if (npc.currentDialogue) {
        toPreload.push({
          text: npc.currentDialogue,
          npcName: npc.name,
          role: npc.role,
        });
      }
    }
    if (toPreload.length > 0) {
      soundFX.preloadDialogues(toPreload);
    }
  }

  public triggerRandomChatForNearest(
    playerX: number,
    playerZ: number,
    elapsed: number,
    soundEnabled = true,
    playerName = 'Budi Santoso',
    genderStyle: 'putra' | 'putri' = 'putra',
    customMessage?: string
  ): ActiveNPCDialogue | null {
    let bestNpc: NPCInstance | null = null;
    let bestDist = Infinity;

    for (const npc of this.npcs) {
      const d = Math.hypot(playerX - npc.group.position.x, playerZ - npc.group.position.z);
      if (d < bestDist) {
        bestDist = d;
        bestNpc = npc;
      }
    }

    const cleanCustom = customMessage?.trim();

    if (bestNpc && bestDist <= 22.0) {
      // Advance the NPC to their next activity stage when player interacts, or cycle their dialogue!
      if (!cleanCustom) {
        if (bestNpc.activitySchedule.length > 1) {
          this.advanceToActivityStage(bestNpc, bestNpc.currentStageIdx + 1, elapsed);
        } else {
          this.pickNextRandomDialogue(bestNpc, elapsed);
        }
      }
      this.renderBubbleForNPC(bestNpc);
      bestNpc.wasPlayerNear = true;
      this.sharedBubbleScale = Math.max(this.sharedBubbleScale, 0.55);
      soundFX.playChatBubble(soundEnabled);

      const playerReply = cleanCustom || this.buildPlayerContextualReply(bestNpc);
      this.triggerPlayerSpeechBubble(playerName, genderStyle, playerReply, soundEnabled);

      const rawRatio = THREE.MathUtils.clamp(1 - (bestDist - 2.4) / (15.0 - 2.4), 0.15, 1);
      const voiceVolume = Math.pow(rawRatio, 1.45);

      return {
        npcName: bestNpc.name,
        npcActivity: bestNpc.activity,
        role: bestNpc.role,
        message: bestNpc.currentDialogue,
        distance: bestDist,
        voiceVolume,
        playerReply,
        suggestedReplies: this.buildPlayerSuggestedReplies(bestNpc),
        stageIndex: bestNpc.currentStageIdx + 1,
        totalStages: bestNpc.activitySchedule.length,
      };
    }

    // When no NPC is within 22 units, allow the Player Character to speak the custom message or manual greeting aloud with 3D bubble!
    const soloLines = [
      'Halo teman-teman semuanya! Aku siswa SDN SUSUKAN 03 yang semangat belajar!',
      'Ayo kita keliling ruang kelas dan menyapa Bapak Ibu Guru serta teman-teman!',
      'Lingkungan SDN SUSUKAN 03 dan Taman Ecobrick I LOVE SUGA bersih dan asri sekali!',
    ];
    const soloMsg = cleanCustom || soloLines[this.soloGreetingIdx % soloLines.length];
    if (!cleanCustom) {
      this.soloGreetingIdx++;
    }
    soundFX.playChatBubble(soundEnabled);
    this.triggerPlayerSpeechBubble(playerName, genderStyle, soloMsg, soundEnabled);
    return null;
  }

  /**
   * Spawns a Classroom with 1 Teacher + 5 Students where every single NPC has a 4-stage
   * dynamic activity schedule (writing at desk -> raising hand -> walking to blackboard/cupboard/teacher desk -> discussing with friends).
   */
  private spawnClassroomWith5Students(options: {
    wing: 'west' | 'east';
    centerZ: number;
    gradeLabel: string;
    teacherName: string;
    teacherActivity: string;
    teacherShirt: string;
    teacherPants: string;
    teacherSkirt?: boolean;
    teacherHat?: 'peci' | 'none';
    teacherDialogues: string[];
    students: {
      name: string;
      gender: 'putra' | 'putri';
      activity: string;
      dialogues: string[];
    }[];
  }) {
    const dir = options.wing === 'west' ? -1 : 1;
    const faceStudentsRot = dir === -1 ? Math.PI / 2 : -Math.PI / 2;
    const faceBoardRot = dir === -1 ? -Math.PI / 2 : Math.PI / 2;

    // 1. Classroom Teacher with a 4-Stage Teaching Routine across the expanded classroom
    const teacherSchedule: NPCActivityStage[] = [
      {
        activity: options.teacherActivity,
        behavior: 'teach_board',
        position: [dir * 60.5, options.centerZ + 1.2],
        rotationY: faceStudentsRot,
        duration: 10,
        dialogues: options.teacherDialogues,
      },
      {
        activity: `Memeriksa Catatan Siswa ${options.gradeLabel}`,
        behavior: 'read_book',
        position: [dir * 54.8, options.centerZ - 0.5],
        rotationY: faceBoardRot,
        duration: 8.5,
        dialogues: [
          `Coba Ibu/Bapak periksa kerapian buku catatan kalian di barisan depan ${options.gradeLabel}.`,
          'Bagus sekali! Tulisan dan langkah pengerjaan soalnya sudah sangat rapi.',
          'Setelah selesai menulis, kita lanjutkan diskusi kelompok ya anak-anak!',
        ],
      },
      {
        activity: `Membimbing Diskusi Kelompok ${options.gradeLabel}`,
        behavior: 'chat_gesture',
        position: [dir * 48.5, options.centerZ + 0.5],
        rotationY: faceStudentsRot,
        duration: 8.5,
        dialogues: [
          'Apakah barisan belakang sudah paham materi hari ini? Jangan ragu bertanya ya!',
          'Ayo berdiskusi dengan teman sebangku untuk menyelesaikan latihan berikutnya.',
        ],
      },
      {
        activity: 'Mengambil Buku Paket di Lemari Kelas',
        behavior: 'inspect_shelf',
        position: [dir * 60.6, options.centerZ + 6.2],
        rotationY: dir === -1 ? 0 : Math.PI,
        duration: 7.0,
        dialogues: [
          'Sebentar ya, Bapak/Ibu ambil buku latihan tambahan dan alat peraga di lemari kelas.',
          'Semua buku paket Kurikulum Merdeka tersusun rapi di lemari kayu sudut kelas.',
        ],
      },
    ];

    this.createArticulatedNPC({
      name: options.teacherName,
      activity: options.teacherActivity,
      role: 'guru',
      shirtHex: options.teacherShirt,
      pantsHex: options.teacherPants,
      hasSkirt: options.teacherSkirt,
      hatType: options.teacherHat ?? 'none',
      behavior: 'teach_board',
      position: [dir * 60.5, options.centerZ + 1.2],
      rotationY: faceStudentsRot,
      dialogues: options.teacherDialogues,
      activitySchedule: teacherSchedule,
      initialStageOffset: 0,
    });

    // 2. 5 Student NPCs seated at the 5 classroom desks, each cycling through 4 distinct activities
    const seatCoords: [number, number][] = [
      [dir * 56.05, options.centerZ - 3.5], // Baris Depan Kiri
      [dir * 56.05, options.centerZ + 3.5], // Baris Depan Kanan
      [dir * 51.85, options.centerZ - 3.5], // Baris Tengah Kiri
      [dir * 51.85, options.centerZ + 3.5], // Baris Tengah Kanan
      [dir * 47.65, options.centerZ - 3.5], // Baris Belakang Kiri
    ];

    // Secondary classroom spots where students walk when they finish writing at their desk
    const activeSpots: {
      activity: string;
      behavior: NPCBehavior;
      pos: [number, number];
      rot: number;
      dialogues: string[];
    }[] = [
      {
        activity: 'Maju Mengerjakan Soal di Papan Tulis',
        behavior: 'teach_board',
        pos: [dir * 59.6, options.centerZ - 1.4],
        rot: faceBoardRot,
        dialogues: [
          `Aku selesai mencatat di bangku, sekarang maju mengerjakan soal di papan tulis ${options.gradeLabel}!`,
          'Senang sekali bisa menjawab soal di depan kelas dengan benar!',
        ],
      },
      {
        activity: 'Memilih Buku Bacaan di Lemari Kelas',
        behavior: 'inspect_shelf',
        pos: [dir * 60.4, options.centerZ + 5.8],
        rot: 0,
        dialogues: [
          'Catatanku sudah selesai! Sekarang aku memilih buku bacaan baru di lemari sudut kelas.',
          'Koleksi buku cerita dan kamus di lemari kelas kita lengkap sekali!',
        ],
      },
      {
        activity: 'Mengumpulkan Buku Tugas ke Meja Guru',
        behavior: 'read_book',
        pos: [dir * 57.8, options.centerZ - 4.8],
        rot: faceBoardRot,
        dialogues: [
          'Latihan soalku sudah rampung! Aku kumpulkan buku tugasku ke meja guru dulu ya.',
          'Semoga nilai tugas hari ini dapat bintang seratus dari Guru!',
        ],
      },
      {
        activity: 'Piket Merapikan & Menyapu Kelas',
        behavior: 'sweep_clean',
        pos: [dir * 44.8, options.centerZ + 4.8],
        rot: faceStudentsRot,
        dialogues: [
          'Selesai belajar di bangku, aku lanjut melaksanakan piket menyapu agar ruang kelas tetap bersih!',
          'Kelas yang luas dan bersih membuat semua teman betah belajar.',
        ],
      },
      {
        activity: 'Presentasi Membaca di Depan Kelas',
        behavior: 'read_book',
        pos: [dir * 58.8, options.centerZ + 2.5],
        rot: faceStudentsRot,
        dialogues: [
          `Teman-teman ${options.gradeLabel}, dengarkan hasil rangkuman yang kubacakan di depan kelas ya!`,
          'Setelah selesai presentasi di depan kelas, aku akan kembali duduk ke bangkuku.',
        ],
      },
    ];

    options.students.slice(0, 5).forEach((st, idx) => {
      const [sx, sz] = seatCoords[idx];
      const isPutri = st.gender === 'putri';
      const spot = activeSpots[idx % activeSpots.length];
      const neighborRot = idx % 2 === 0 ? 0 : Math.PI;

      const studentSchedule: NPCActivityStage[] = [
        {
          activity: st.activity,
          behavior: 'write_desk',
          position: [sx, sz],
          rotationY: faceBoardRot,
          duration: 9.5 + idx * 1.2,
          dialogues: st.dialogues,
        },
        {
          activity: 'Tunjuk Tangan Menjawab Pertanyaan Guru',
          behavior: 'raise_hand',
          position: [sx, sz],
          rotationY: faceBoardRot,
          duration: 6.5,
          dialogues: [
            `Saya tahu jawabannya Bu/Pak Guru! Izinkan saya maju ke depan kelas ${options.gradeLabel}!`,
            'Aku sudah selesai mencatat, sekarang giliran tunjuk tangan aktif di kelas!',
          ],
        },
        {
          activity: spot.activity,
          behavior: spot.behavior,
          position: spot.pos,
          rotationY: spot.rot,
          duration: 8.5,
          dialogues: spot.dialogues,
        },
        {
          activity: 'Berdiskusi & Tepuk Tangan Bersama Teman',
          behavior: idx % 2 === 0 ? 'chat_gesture' : 'clap_cheer',
          position: [sx, sz],
          rotationY: neighborRot,
          duration: 7.5,
          dialogues: [
            'Hore! Kegiatan tadi sudah selesai, sekarang kita berdiskusi kelompok dengan teman sebangku!',
            `Seru sekali belajar di ${options.gradeLabel}, habis ini kita lanjut kegiatan berikutnya!`,
          ],
        },
      ];

      this.createArticulatedNPC({
        name: `${st.name} (${options.gradeLabel})`,
        activity: st.activity,
        role: isPutri ? 'siswa_putri' : 'siswa_putra',
        shirtHex: '#F8FAFC',
        pantsHex: '#881337',
        tieHex: '#DC2626',
        hatType: idx === 0 ? 'topi_sd' : isPutri && idx % 2 === 1 ? 'pita' : 'none',
        hasSkirt: isPutri,
        behavior: 'write_desk',
        position: [sx, sz],
        rotationY: faceBoardRot,
        dialogues: st.dialogues,
        activitySchedule: studentSchedule,
        initialStageOffset: idx % 4,
      });
    });
  }

  private spawnAllSchoolNPCs() {
    // =========================================================================
    // A. DALAM RUANGAN GEDUNG UTARA YANG DIPERLUAS (LAB IPA, KEPSEK, GURU, PERPUS, LAB KOMP)
    // =========================================================================

    // 1. Dalam Ruang Lab IPA (x = -42.0, z = -50.75) — Guru + 3 Siswa Praktikum Multi-Kegiatan
    this.createArticulatedNPC({
      name: 'Bu Dewi, S.Si. (Guru IPA)',
      activity: 'Bimbingan Praktikum Mikroskop',
      role: 'guru',
      shirtHex: '#F8FAFC',
      pantsHex: '#1E293B',
      tieHex: '#15803D',
      hasSkirt: true,
      behavior: 'science_experiment',
      position: [-45.5, -56.5],
      rotationY: 0,
      dialogues: [
        'Selamat datang di Lab IPA! Hari ini kita mengamati jaringan daun di bawah mikroskop.',
        'Hati-hati saat memegang tabung reaksi kimia berwarna hijau dan biru di meja praktikum ya!',
      ],
      activitySchedule: [
        {
          activity: 'Bimbingan Praktikum Mikroskop',
          behavior: 'science_experiment',
          position: [-45.5, -56.5],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Perhatikan lensa objektif mikroskop ini, struktur sel tumbuhan terlihat sangat jelas!',
            'Putar makrometer mikroskop perlahan agar preparat daunnya fokus ya.',
          ],
        },
        {
          activity: 'Menjelaskan Rumus Sains di Papan Lab',
          behavior: 'teach_board',
          position: [-42.0, -59.8],
          rotationY: 0,
          duration: 8.5,
          dialogues: [
            'Setelah mengamati mikroskop, perhatikan reaksi fotosintesis 6CO2 + 6H2O di papan tulis Lab!',
            'Catat hasil pengamatan kalian di buku laporan praktikum IPA.',
          ],
        },
        {
          activity: 'Mengecek Tabung Reaksi Meja Timur',
          behavior: 'inspect_shelf',
          position: [-38.0, -55.8],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Bagus! Larutan indikator warna hijau dan biru di tabung reaksi ini sudah tercampur rata.',
            'Habis praktikum kimia sederhana ini, kita rapikan alat-alat laboratorium bersama.',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Fajar (Siswa Kelas 5A)',
      activity: 'Mengamati Preparat Mikroskop',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      behavior: 'science_experiment',
      position: [-38.0, -52.5],
      rotationY: Math.PI,
      dialogues: [
        'Wah keren! Di lensa mikroskop sel daunnya terlihat jelas seperti susunan bata!',
      ],
      activitySchedule: [
        {
          activity: 'Mengamati Preparat Mikroskop',
          behavior: 'science_experiment',
          position: [-38.0, -52.5],
          rotationY: Math.PI,
          duration: 9.0,
          dialogues: [
            'Wah keren! Di lensa mikroskop sel daunnya terlihat jelas seperti susunan bata!',
            'Habis mengamati mikroskop ini, aku mau pindah mencatat laporan dan mencoba tabung reaksi.',
          ],
        },
        {
          activity: 'Mencatat Laporan Eksperimen IPA',
          behavior: 'write_desk',
          position: [-45.5, -52.5],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Pengamatan mikroskop selesai! Sekarang aku menggambar bentuk stomata daun di buku laporan.',
            'Setelah selesai menulis laporan, aku mau mengamati lemari alat peraga sains!',
          ],
        },
        {
          activity: 'Mengamati Alat Peraga di Lemari Lab',
          behavior: 'inspect_shelf',
          position: [-49.2, -57.5],
          rotationY: -Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Di lemari Lab IPA ada globe bumi, model kerangka, dan gelas ukur kimia!',
            'Seru banget bisa berganti-ganti kegiatan praktikum di Lab IPA!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Kirana (Siswi Kelas 5A)',
      activity: 'Mencampur Larutan Tabung Reaksi',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hasSkirt: true,
      hatType: 'pita',
      behavior: 'science_experiment',
      position: [-45.5, -49.5],
      rotationY: 0,
      dialogues: [
        'Aku sedang meneteskan larutan ekstrak daun pandan ke dalam tabung reaksi!',
      ],
      activitySchedule: [
        {
          activity: 'Mencampur Larutan Tabung Reaksi',
          behavior: 'science_experiment',
          position: [-45.5, -49.5],
          rotationY: 0,
          duration: 8.5,
          dialogues: [
            'Aku sedang meneteskan larutan indikator alami ke tabung reaksi di meja praktikum!',
            'Lihat, warnanya berubah jadi hijau zambrud yang cerah!',
          ],
        },
        {
          activity: 'Presentasi Hasil Praktikum ke Bu Dewi',
          behavior: 'raise_hand',
          position: [-42.0, -55.0],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Bu Dewi! Percobaan perubahan warna larutan kelompok kami sudah berhasil!',
            'Sekarang kami siap merapikan meja praktikum dan berdiskusi kesimpulan.',
          ],
        },
        {
          activity: 'Berdiskusi Kesimpulan Sains',
          behavior: 'clap_cheer',
          position: [-38.0, -49.5],
          rotationY: -Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Hore! Eksperimen IPA hari ini berhasil semua, ayo kita lanjut ke percobaan berikutnya!',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    // 2. Dalam Ruang Kepala Sekolah (x = -21.5, z = -50.75)
    this.createArticulatedNPC({
      name: 'Bpk. Drs. Hendra (Kepsek)',
      activity: 'Pembina Misi Kebersihan & Kepala Sekolah',
      role: 'kepsek',
      shirtHex: '#1D4ED8',
      pantsHex: '#0F172A',
      tieHex: '#FACC15',
      hatType: 'peci',
      behavior: 'write_desk',
      position: [-21.5, -58.2],
      rotationY: 0,
      dialogues: [
        'Selamat datang di Ruang Kepala Sekolah! Ayo ikuti Misi Kebersihan Sekolah: pungut sampah lalu pilah ke tong Organik, Anorganik, Daur Ulang, dan B3 agar nilai kebersihanmu A+!',
      ],
      activitySchedule: [
        {
          activity: 'Pembina Misi Kebersihan & Adiwiyata',
          behavior: 'write_desk',
          position: [-21.5, -58.2],
          rotationY: 0,
          duration: 10.0,
          dialogues: [
            'Selamat datang di Ruang Kepala Sekolah! Ayo ikuti Misi Kebersihan Sekolah: pungut sampah lalu pilah ke tong Organik, Anorganik, Daur Ulang, dan B3 agar nilai kebersihanmu A+!',
            'Semakin banyak sampah yang kamu kumpulkan dan semakin benar pemilahannya, nilai kebersihan kamu semakin bagus!',
          ],
        },
        {
          activity: 'Memeriksa Lemari Piala Adiwiyata',
          behavior: 'inspect_shelf',
          position: [-27.8, -51.5],
          rotationY: -Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Lihat piala Sekolah Adiwiyata SDN SUSUKAN 03! Ayo jaga kebersihan dengan memilah sampah Organik, Anorganik, Daur Ulang, dan B3!',
          ],
        },
        {
          activity: 'Menerima Tamu & Evaluasi di Sofa',
          behavior: 'chat_gesture',
          position: [-18.2, -47.8],
          rotationY: -Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Silakan duduk di sofa Ruang Kepala Sekolah! Kita bahas program sekolah ramah anak.',
            'Setelah berdiskusi di sofa, Bapak kembali memeriksa berkas di meja kerja.',
          ],
        },
      ],
    });

    // 3. Dalam Ruang Guru (x = 0.0, z = -50.75) — 3 Guru Multi-Kegiatan
    this.createArticulatedNPC({
      name: 'Pak Wahyu, S.Pd. (Guru)',
      activity: 'Memeriksa Buku PR Siswa',
      role: 'guru',
      shirtHex: '#C2A378',
      pantsHex: '#3E2723',
      tieHex: '#991B1B',
      hatType: 'peci',
      behavior: 'write_desk',
      position: [-4.5, -54.5],
      rotationY: 0,
      dialogues: [
        'Silakan masuk ke Ruang Guru! Bapak sedang mengoreksi tumpukan buku PR Matematika.',
      ],
      activitySchedule: [
        {
          activity: 'Memeriksa Buku PR Siswa',
          behavior: 'write_desk',
          position: [-4.5, -54.5],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Silakan masuk ke Ruang Guru! Bapak sedang mengoreksi tumpukan buku PR Matematika.',
            'Nilai latihan berhitung minggu ini bagus-bagus, habis ini Bapak catat di papan jadwal.',
          ],
        },
        {
          activity: 'Menulis Jadwal Piket di Papan Guru',
          behavior: 'teach_board',
          position: [0.0, -59.8],
          rotationY: 0,
          duration: 8.0,
          dialogues: [
            'Selesai memeriksa PR, Bapak memperbarui jadwal ujian dan piket guru di papan pengumuman.',
            'Semua kegiatan sekolah terjadwal rapi setiap minggunya!',
          ],
        },
        {
          activity: 'Rapat Koordinasi dengan Ibu Ratna',
          behavior: 'chat_gesture',
          position: [1.8, -51.0],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Bu Ratna, materi evaluasi semester ini sudah selesai saya rekap semuanya!',
            'Mari kita siapkan kegiatan ekstrakurikuler Pramuka dan Olahraga untuk siswa.',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Ibu Ratna, S.Pd. (Koord. Guru)',
      activity: 'Menyusun Jadwal & RPP',
      role: 'guru',
      shirtHex: '#C2A378',
      pantsHex: '#5C4028',
      tieHex: '#78350F',
      hasSkirt: true,
      behavior: 'read_book',
      position: [4.5, -54.5],
      rotationY: 0,
      dialogues: [
        'Ibu sedang merapikan daftar hadir dan jadwal pelajaran Kurikulum Merdeka.',
      ],
      activitySchedule: [
        {
          activity: 'Menyusun Jadwal & RPP di Meja',
          behavior: 'read_book',
          position: [4.5, -54.5],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Ibu sedang merapikan daftar hadir dan modul ajar Kurikulum Merdeka.',
            'Setelah selesai menyusun RPP, Ibu akan mengambil arsip rapor di lemari.',
          ],
        },
        {
          activity: 'Mengambil Arsip Rapor di Lemari',
          behavior: 'inspect_shelf',
          position: [7.8, -58.5],
          rotationY: Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Buku absen dan map rapor Kelas 1 sampai Kelas 6 tersimpan rapi di lemari Ruang Guru.',
            'Pastikan ketua kelas mengambil buku presensi setiap pagi ya!',
          ],
        },
        {
          activity: 'Berdiskusi Evaluasi Belajar Siswa',
          behavior: 'chat_gesture',
          position: [-1.5, -48.5],
          rotationY: -Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Perkembangan membaca dan berhitung siswa-siswi kita meningkat pesat bulan ini!',
            'Habis berdiskusi, Ibu kembali ke meja kerja untuk menyiapkan materi esok hari.',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    // 4. Dalam Ruang Perpustakaan (x = 21.5, z = -50.75) — Pustakawan + 3 Siswa Multi-Kegiatan
    this.createArticulatedNPC({
      name: 'Bu Sari (Pustakawan SD)',
      activity: 'Mendata Peminjaman Buku',
      role: 'guru',
      shirtHex: '#0F766E',
      pantsHex: '#1E293B',
      hasSkirt: true,
      behavior: 'write_desk',
      position: [15.5, -56.2],
      rotationY: 0,
      dialogues: [
        'Harap tenang di dalam Ruang Perpustakaan ya! Pilih buku cerita di rak belakang.',
      ],
      activitySchedule: [
        {
          activity: 'Mendata Kartu Peminjaman Buku',
          behavior: 'write_desk',
          position: [15.5, -56.2],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Jangan lupa catat nama dan kelasmu di kartu peminjaman buku perpustakaan ya.',
            'Setelah mendata kartu buku, Ibu akan menata koleksi buku baru di rak belakang.',
          ],
        },
        {
          activity: 'Menata Koleksi Buku di Rak Utama',
          behavior: 'inspect_shelf',
          position: [21.5, -59.2],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Ibu sedang merapikan buku Ensiklopedia Sains dan Dongeng Nusantara di rak perpustakaan.',
            'Buku yang sudah selesai dibaca dikembalikan sesuai nomor raknya ya!',
          ],
        },
        {
          activity: 'Membimbing Siswa Membaca di Meja',
          behavior: 'read_book',
          position: [24.2, -52.5],
          rotationY: 0,
          duration: 8.0,
          dialogues: [
            'Bagus sekali! Membaca 15 menit setiap hari membuat wawasanmu semakin luas!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Nabila (Siswi Kelas 4A)',
      activity: 'Membaca Ensiklopedia di Meja',
      role: 'siswa_putri',
      shirtHex: '#D6B588',
      pantsHex: '#4E321B',
      tieHex: '#DC2626',
      hatType: 'baret',
      hasSkirt: true,
      behavior: 'read_book',
      position: [23.8, -51.5],
      rotationY: Math.PI,
      dialogues: [
        'Ssst! Aku sedang asyik membaca buku Dongeng Nusantara dan Ensiklopedia Antariksa.',
      ],
      activitySchedule: [
        {
          activity: 'Membaca Ensiklopedia di Meja Baca',
          behavior: 'read_book',
          position: [23.8, -51.5],
          rotationY: Math.PI,
          duration: 9.0,
          dialogues: [
            'Ssst! Aku sedang asyik membaca buku Ensiklopedia Tata Surya di meja perpustakaan.',
            'Sebentar lagi bab ini selesai, lalu aku mau mencari buku cerita rakyat di rak belakang!',
          ],
        },
        {
          activity: 'Memilih Buku Cerita Baru di Rak',
          behavior: 'inspect_shelf',
          position: [26.8, -59.0],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Buku Ensiklopedianya sudah selesai kubaca! Sekarang aku memilih buku Legenda Danau Toba di rak.',
            'Rak buku di perpustakaan baru kita tinggi dan koleksinya banyak sekali!',
          ],
        },
        {
          activity: 'Mencatat Pinjaman Buku ke Bu Sari',
          behavior: 'write_desk',
          position: [16.2, -53.2],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Bu Sari, saya mau meminjam buku cerita bergambar ini untuk dibaca di rumah ya!',
            'Habis mencatat kartu perpustakaan, aku kembali duduk membaca.',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Raka (Siswa Kelas 3A)',
      activity: 'Memilih Komik Sains di Rak',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      behavior: 'inspect_shelf',
      position: [18.5, -59.0],
      rotationY: Math.PI,
      dialogues: [
        'Aku sedang mencari buku Komik Sains Kuark tentang dinosaurus di rak perpustakaan!',
      ],
      activitySchedule: [
        {
          activity: 'Memilih Komik Sains di Rak Perpus',
          behavior: 'inspect_shelf',
          position: [18.5, -59.0],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Aku sedang mencari buku Komik Sains tentang dinosaurus di rak perpustakaan!',
            'Nah ketemu! Sekarang aku bawa bukunya ke meja baca.',
          ],
        },
        {
          activity: 'Membaca Buku Dinosaurus di Meja',
          behavior: 'read_book',
          position: [26.2, -51.5],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Wah ternyata Tyrannosaurus Rex ukurannya besar sekali! Seru banget baca di perpustakaan.',
            'Setelah selesai membaca, aku mau menceritakan isinya ke Nabila.',
          ],
        },
        {
          activity: 'Berdiskusi Cerita Buku dengan Teman',
          behavior: 'chat_gesture',
          position: [21.5, -48.0],
          rotationY: Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Tadi aku habis baca buku tentang dinosaurus dan luar angkasa, seru banget lho!',
            'Yuk kita cari buku petualangan lainnya di rak perpustakaan!',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    // 5. Dalam Ruang Lab Komputer (x = 42.0, z = -50.75) — Guru TIK + 2 Siswa Multi-Kegiatan
    this.createArticulatedNPC({
      name: 'Pak Andi, S.Kom. (Guru TIK)',
      activity: 'Mengajar Komputer & TIK',
      role: 'guru',
      shirtHex: '#1E3A8A',
      pantsHex: '#0F172A',
      tieHex: '#38BDF8',
      behavior: 'teach_board',
      position: [42.0, -59.5],
      rotationY: 0,
      dialogues: [
        'Selamat datang di Lab Komputer! Hari ini kita belajar mengetik 10 jari dan menggambar digital.',
      ],
      activitySchedule: [
        {
          activity: 'Menjelaskan Materi TIK di Papan Lab',
          behavior: 'teach_board',
          position: [42.0, -59.5],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Hari ini kita belajar mengetik 10 jari dan membuat poster digital di Lab Komputer.',
            'Perhatikan langkah menyimpan dokumen di layar papan tulis ya!',
          ],
        },
        {
          activity: 'Membimbing Siswa di Meja PC Barat',
          behavior: 'read_book',
          position: [37.5, -52.5],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Bagus sekali! Posisi jari tanganmu di atas keyboard sudah tepat.',
            'Jangan lupa tekan Ctrl + S untuk menyimpan hasil gambarmu ya.',
          ],
        },
        {
          activity: 'Mengecek Jaringan PC Meja Timur',
          behavior: 'type_computer',
          position: [46.5, -52.5],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Semua komputer PC di Lab Komputer sudah terhubung ke jaringan lokal sekolah dengan lancar!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Bagas (Siswa Kelas 5A)',
      activity: 'Mengetik di Komputer PC',
      role: 'siswa_putra',
      shirtHex: '#D6B588',
      pantsHex: '#4E321B',
      tieHex: '#DC2626',
      hatType: 'baret',
      behavior: 'type_computer',
      position: [46.0, -54.0],
      rotationY: Math.PI,
      dialogues: [
        'Klik, ketik, ketik! Aku sedang membuat poster kebersihan sekolah di komputer!',
      ],
      activitySchedule: [
        {
          activity: 'Mengetik Poster di Komputer PC',
          behavior: 'type_computer',
          position: [46.0, -54.0],
          rotationY: Math.PI,
          duration: 9.5,
          dialogues: [
            'Klik, ketik, ketik! Aku sedang membuat poster Adiwiyata sekolah di komputer!',
            'Sebentar lagi desainku selesai, lalu aku tunjukkan ke Pak Andi!',
          ],
        },
        {
          activity: 'Tunjuk Tangan Meminta Penilaian Guru',
          behavior: 'raise_hand',
          position: [46.0, -54.0],
          rotationY: Math.PI,
          duration: 6.5,
          dialogues: [
            'Pak Andi! Desain poster digital saya di komputer sudah selesai dibuat!',
            'Habis dinilai Pak Guru, aku mau melihat karya gambar teman di meja sebelah.',
          ],
        },
        {
          activity: 'Melihat Karya Digital di PC Sebelah',
          behavior: 'chat_gesture',
          position: [38.2, -50.2],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Wah gambar 3D di layar komputer meja ini bagus banget warnanya!',
            'Sekarang aku kembali ke komputerku untuk latihan mengetik cepat.',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Aurel (Siswi Kelas 6A)',
      activity: 'Menggambar Desain 3D di PC',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hasSkirt: true,
      hatType: 'pita',
      behavior: 'type_computer',
      position: [38.0, -54.0],
      rotationY: Math.PI,
      dialogues: [
        'Aku sedang menggambar gedung sekolah SDN SUSUKAN 03 dengan aplikasi gambar digital!',
      ],
      activitySchedule: [
        {
          activity: 'Menggambar Desain 3D di PC',
          behavior: 'type_computer',
          position: [38.0, -54.0],
          rotationY: Math.PI,
          duration: 9.0,
          dialogues: [
            'Aku sedang menggambar gedung sekolah SDN SUSUKAN 03 di aplikasi desain komputer!',
            'Setelah selesai mewarnai atapnya, aku mau mencatat rumus shortcut keyboard.',
          ],
        },
        {
          activity: 'Mencatat Materi TIK di Papan Depan',
          behavior: 'write_desk',
          position: [42.0, -56.5],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Aku maju sebentar untuk menyalin daftar tombol pintasan keyboard dari papan tulis Lab.',
          ],
        },
        {
          activity: 'Bertepuk Tangan Apresiasi Karya TIK',
          behavior: 'clap_cheer',
          position: [41.5, -48.5],
          rotationY: 0,
          duration: 7.0,
          dialogues: [
            'Karya desain teman-teman di Lab Komputer keren-keren semuanya!',
          ],
        },
      ],
      initialStageOffset: 2,
    });

    // =========================================================================
    // B. SAYAP BARAT: RUANG KELAS 1, KELAS 2, KELAS 3 (MASING-MASING 5 SISWA + 1 GURU)
    // =========================================================================

    // 1. Ruang Kelas 1 (z = -24.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'west',
      centerZ: -24.0,
      gradeLabel: 'Kelas 1A',
      teacherName: 'Bu Maya, S.Pd. (Guru Kelas 1)',
      teacherActivity: 'Mengajar Matematika Penjumlahan & Membaca',
      teacherShirt: '#C2A378',
      teacherPants: '#5C4028',
      teacherSkirt: true,
      teacherDialogues: [
        'Ayo anak-anak Kelas 1A, hari ini kita belajar Matematika Penjumlahan 1 angka dan 2 angka di papan tulis!',
        'Sekarang kita berhitung bersama-sama: satu ditambah satu sama dengan dua, dua belas ditambah lima belas sama dengan dua puluh tujuh!',
        'Siapa yang mau ikut Game Misi Matematika Kelas 1 bersama Ibu Maya agar nilai rapor Matematikanya A+?',
      ],
      students: [
        {
          name: 'Dika',
          gender: 'putra',
          activity: 'Mengeja Huruf di Bangku Depan',
          dialogues: [
            'Bu Guru, saya sudah bisa membaca kalimat I-N-I B-U-D-I sampai lancar!',
            'Habis mengeja di bangku, aku mau maju menulis huruf di papan tulis.',
          ],
        },
        {
          name: 'Lani',
          gender: 'putri',
          activity: 'Menulis Huruf Tegak Bersambung',
          dialogues: [
            'Aku sedang menulis huruf A sampai Z di buku garis tiga dengan rapi!',
            'Setelah selesai menulis, aku mau memilih buku cerita bergambar di lemari kelas.',
          ],
        },
        {
          name: 'Bima',
          gender: 'putra',
          activity: 'Berhitung Jari 1 sampai 10',
          dialogues: [
            'Satu ditambah satu sama dengan dua! Dua ditambah dua sama dengan empat!',
            'Sebentar lagi aku kumpulkan buku berhitungku ke meja Bu Maya!',
          ],
        },
        {
          name: 'Salsa',
          gender: 'putri',
          activity: 'Membaca Buku Bergambar',
          dialogues: [
            'Buku bacaan Kelas 1 banyak gambar hewan dan buah-buahan yang lucu!',
            'Habis membaca, giliranku merapikan sudut kelas dan berdiskusi bersama teman.',
          ],
        },
        {
          name: 'Rafi',
          gender: 'putra',
          activity: 'Menyalin Tulisan Papan Tulis',
          dialogues: [
            'Sebentar lagi catatanku selesai, lalu aku mau maju membaca di depan kelas!',
            'Bangku di sebelah kananku masih kosong, ayo duduk belajar bersama kami!',
          ],
        },
      ],
    });

    // 2. Ruang Kelas 2 (z = -6.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'west',
      centerZ: -6.0,
      gradeLabel: 'Kelas 2A',
      teacherName: 'Bu Rini, S.Pd. (Guru Kelas 2)',
      teacherActivity: 'Mengajar Berhitung & Perkalian',
      teacherShirt: '#0F766E',
      teacherPants: '#1E293B',
      teacherSkirt: true,
      teacherDialogues: [
        'Anak-anak Kelas 2A, perhatikan cara menjumlahkan bersusun 25 + 35 = 60 di papan tulis!',
        'Siapa yang sudah hafal perkalian dua dan perkalian lima? Angkat tangan!',
        'Kerjakan latihan soal nomor 1 sampai 5 di buku kotak-kotak Matematika ya.',
      ],
      students: [
        {
          name: 'Putri',
          gender: 'putri',
          activity: 'Mengerjakan Soal Penjumlahan',
          dialogues: [
            '25 ditambah 35 hasilnya 60! Setelah selesai menyalin, aku mau maju ke papan tulis!',
            'Ayo duduk belajar bareng di bangku Kelas 2A!',
          ],
        },
        {
          name: 'Galih',
          gender: 'putra',
          activity: 'Menghafal Tabel Perkalian',
          dialogues: [
            'Dua kali tiga sama dengan enam, lima kali lima sama dengan dua puluh lima!',
            'Habis menghafal perkalian, aku mau mengambil buku latihan di lemari kelas.',
          ],
        },
        {
          name: 'Tiara',
          gender: 'putri',
          activity: 'Menghitung dengan Penggaris',
          dialogues: [
            'Aku menggaris buku Matematika pakai penggaris kayu supaya rapi!',
            'Kalau sudah selesai semua, aku kumpulkan bukuku ke meja Bu Rini.',
          ],
        },
        {
          name: 'Arka',
          gender: 'putra',
          activity: 'Menjawab Soal Matematika',
          dialogues: [
            'Bu Guru! Saya tahu jawaban soal nomor tiga di papan tulis!',
            'Pelajaran Matematika jadi mudah kalau kita aktif berganti kegiatan belajar.',
          ],
        },
        {
          name: 'Meisya',
          gender: 'putri',
          activity: 'Mencatat Rumus Berhitung',
          dialogues: [
            'Ruang Kelas 2A sekarang luas dan terang sekali, nyaman buat belajar!',
            'Sebentar lagi giliranku maju membacakan jawaban di depan teman-teman.',
          ],
        },
      ],
    });

    // 3. Ruang Kelas 3 (z = 12.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'west',
      centerZ: 12.0,
      gradeLabel: 'Kelas 3A',
      teacherName: 'Pak Ahmad, S.Pd. (Guru Kelas 3)',
      teacherActivity: 'Mengajar Bahasa & Puisi',
      teacherShirt: '#C2A378',
      teacherPants: '#3E2723',
      teacherHat: 'peci',
      teacherDialogues: [
        'Perhatikan papan tulis Kelas 3A! Hari ini kita belajar membaca puisi dan dongeng Nusantara.',
        'Gunakan intonasi suara yang jelas saat membacakan puisi di depan kelas ya.',
        'Siapa yang berani maju ke depan kelas menceritakan dongeng Malin Kundang?',
      ],
      students: [
        {
          name: 'Riko',
          gender: 'putra',
          activity: 'Menulis Karangan & Puisi',
          dialogues: [
            'Aku sedang menulis puisi berjudul "Sekolahku yang Hijau dan Bersih" di buku SiDu!',
            'Setelah selesai menulis bait terakhir, aku akan maju mendeklamasikan puisiku!',
          ],
        },
        {
          name: 'Kezia',
          gender: 'putri',
          activity: 'Membaca Cerita Rakyat',
          dialogues: [
            'Cerita Danau Toba dan Timun Mas di buku Bahasa Indonesia seru banget!',
            'Habis selesai bab ini, aku mau menukar buku dongeng lain di lemari kelas.',
          ],
        },
        {
          name: 'Dafa',
          gender: 'putra',
          activity: 'Menyusun Kalimat Utama',
          dialogues: [
            'Aku sedang mencari ide pokok paragraf pertama di buku bacaan Kelas 3A.',
            'Sebentar lagi tugasku selesai dan siap dikumpulkan ke meja Pak Ahmad!',
          ],
        },
        {
          name: 'Zahra',
          gender: 'putri',
          activity: 'Latihan Deklamasi Puisi',
          dialogues: [
            'Aku berlatih ekspresi puisi dulu di bangku, lalu membantu piket merapikan kelas!',
            'Senang sekali semua teman di Kelas 3A aktif berkegiatan!',
          ],
        },
        {
          name: 'Gilang',
          gender: 'putra',
          activity: 'Mencatat Kosakata Baru',
          dialogues: [
            'Hari ini aku belajar banyak kosakata Bahasa Indonesia yang baku!',
            'Habis mencatat, aku akan maju membacakan arti kosakata di depan kelas.',
          ],
        },
      ],
    });

    // 4. Dalam Toilet Guru (x = -53.0, z = 26.5)
    this.createArticulatedNPC({
      name: 'Pak Hendra Staf (Toilet Guru)',
      activity: 'Mencuci Tangan di Wastafel',
      role: 'guru',
      shirtHex: '#0F766E',
      pantsHex: '#0F172A',
      behavior: 'wash_hands',
      position: [-60.5, 26.5],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Mencuci tangan dengan sabun di wastafel membuat tangan bersih dari kuman dan kapur tulis.',
      ],
      activitySchedule: [
        {
          activity: 'Mencuci Tangan di Wastafel Guru',
          behavior: 'wash_hands',
          position: [-60.5, 26.5],
          rotationY: -Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Mencuci tangan dengan sabun di wastafel membuat tangan bersih dari debu kapur tulis.',
            'Setelah cuci tangan, saya rapikan kerah seragam di depan cermin wastafel.',
          ],
        },
        {
          activity: 'Merapikan Seragam di Cermin',
          behavior: 'stretch_body',
          position: [-58.0, 26.5],
          rotationY: -Math.PI / 2,
          duration: 7.0,
          dialogues: [
            'Seragam kerja sudah rapi kembali! Sekarang kita cek kebersihan lantai kamar mandi.',
          ],
        },
        {
          activity: 'Mengecek Kebersihan Toilet Guru',
          behavior: 'sweep_clean',
          position: [-48.5, 25.0],
          rotationY: Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Toilet Guru selalu dijaga tetap wangi, kering, dan bersih setiap hari!',
          ],
        },
      ],
    });

    // 5. Dalam Toilet Siswa (x = -53.0, z = 38.0)
    this.createArticulatedNPC({
      name: 'Edo (Siswa Kelas 2A)',
      activity: 'Cuci Tangan Pakai Sabun',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      behavior: 'wash_hands',
      position: [-60.5, 38.0],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Gosok telapak dan punggung tangan pakai sabun di wastafel sebelum kembali ke kelas!',
      ],
      activitySchedule: [
        {
          activity: 'Cuci Tangan 6 Langkah Pakai Sabun',
          behavior: 'wash_hands',
          position: [-60.5, 38.0],
          rotationY: -Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Gosok telapak dan punggung tangan pakai sabun di wastafel sampai bersih!',
            'Habis mencuci tangan, aku mau mengeringkan tangan dan merapikan topi SD di cermin.',
          ],
        },
        {
          activity: 'Merapikan Dasi & Topi di Cermin',
          behavior: 'stretch_body',
          position: [-57.5, 39.2],
          rotationY: -Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Nah, dasi merah dan seragam putihku sudah rapi! Siap kembali belajar dengan segar!',
          ],
        },
        {
          activity: 'Menjaga Kebersihan Wastafel Siswa',
          behavior: 'sweep_clean',
          position: [-49.5, 37.5],
          rotationY: Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Jangan lupa matikan keran air setelah selesai mencuci tangan supaya hemat air ya!',
          ],
        },
      ],
    });

    // =========================================================================
    // C. SAYAP TIMUR: RUANG KELAS 4, KELAS 5, KELAS 6 (MASING-MASING 5 SISWA + 1 GURU) & KANTIN
    // =========================================================================

    // 1. Ruang Kelas 4 (z = -24.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'east',
      centerZ: -24.0,
      gradeLabel: 'Kelas 4A',
      teacherName: 'Bu Lestari, S.Pd. (Guru Kelas 4)',
      teacherActivity: 'Mengajar Peta Nusantara (IPS)',
      teacherShirt: '#881337',
      teacherPants: '#1E293B',
      teacherSkirt: true,
      teacherDialogues: [
        'Di Kelas 4A hari ini kita mempelajari Peta Kepulauan Nusantara dan keragaman budaya!',
        'Ingat semboyan bangsa kita: Bhinneka Tunggal Ika, berbeda-beda tetapi tetap satu jua.',
        'Coba sebutkan nama ibu kota provinsi yang ada di Pulau Jawa dan Sumatera!',
      ],
      students: [
        {
          name: 'Bayu',
          gender: 'putra',
          activity: 'Mencatat Pelajaran IPS',
          dialogues: [
            'Aku senang sekali belajar peta Indonesia dan rumah adat Nusantara di Kelas 4A!',
            'Selesai mencatat, aku akan maju menunjuk letak pulau di papan tulis!',
          ],
        },
        {
          name: 'Citra',
          gender: 'putri',
          activity: 'Menggambar Peta Pulau Jawa',
          dialogues: [
            'Aku sedang mewarnai peta Pulau Jawa dan Bali di buku atlas Kelas 4A!',
            'Habis mewarnai peta, aku mau mengambil buku ensiklopedia budaya di lemari.',
          ],
        },
        {
          name: 'Rendy',
          gender: 'putra',
          activity: 'Menghafal Lagu Daerah',
          dialogues: [
            'Selain rumah adat, kita juga belajar lagu daerah Ampar-Ampar Pisang dan Yamko Rambe Yamko!',
            'Sebentar lagi kukumpulkan tugas rangkuman IPS ke meja Bu Lestari.',
          ],
        },
        {
          name: 'Syifa',
          gender: 'putri',
          activity: 'Mencatat Sila Pancasila',
          dialogues: [
            'Pelajaran PPKN dan IPS mengajarkan kita hidup rukun dan saling menghormati teman.',
            'Selesai menulis, aku ikut piket merapikan kelas supaya tetap bersih!',
          ],
        },
        {
          name: 'Yoga',
          gender: 'putra',
          activity: 'Membaca Atlas Indonesia',
          dialogues: [
            'Aku baru tahu kalau garis khatulistiwa melewati Kota Pontianak di Kalimantan Barat!',
            'Habis membaca atlas, giliranku maju presentasi di depan teman-teman Kelas 4A!',
          ],
        },
      ],
    });

    // 2. Ruang Kelas 5 (z = -6.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'east',
      centerZ: -6.0,
      gradeLabel: 'Kelas 5A',
      teacherName: 'Pak Reza, S.Pd. (Guru Kelas 5)',
      teacherActivity: 'Mengajar Sains IPA & Ekosistem',
      teacherShirt: '#C2A378',
      teacherPants: '#1E293B',
      teacherHat: 'peci',
      teacherDialogues: [
        'Anak-anak Kelas 5A, perhatikan skema fotosintesis dan rantai makanan di papan tulis!',
        'Tumbuhan hijau berperan sebagai produsen yang mengubah energi cahaya matahari.',
        'Diskusikan bersama teman sebangku contoh rantai makanan di ekosistem sawah ya!',
      ],
      students: [
        {
          name: 'Rina',
          gender: 'putri',
          activity: 'Diskusi Kelompok Sains IPA',
          dialogues: [
            'Kami di Kelas 5A sedang merangkum materi rantai makanan dan ekosistem sawah!',
            'Setelah merangkum, aku akan maju menggambar skema produsen dan konsumen di papan tulis!',
          ],
        },
        {
          name: 'Farhan',
          gender: 'putra',
          activity: 'Menggambar Skema Rantai Makanan',
          dialogues: [
            'Padi dimakan belalang, belalang dimakan katak, katak dimakan ular, lalu elang!',
            'Selesai menggambar skema, aku mau mengambil buku referensi biologi di lemari.',
          ],
        },
        {
          name: 'Mawar',
          gender: 'putri',
          activity: 'Mencatat Organ Pernapasan',
          dialogues: [
            'Minggu lalu kita belajar organ pernapasan, hari ini lanjut rantai makanan ekosistem!',
            'Sebentar lagi aku kumpulkan buku tugas IPA ke meja Pak Reza.',
          ],
        },
        {
          name: 'Ilham',
          gender: 'putra',
          activity: 'Menjawab Pertanyaan Guru',
          dialogues: [
            'Pak Guru! Jamur dan bakteri berperan sebagai pengurai atau dekomposer di alam!',
            'Habis menjawab soal, aku lanjut merapikan pojok baca Kelas 5A.',
          ],
        },
        {
          name: 'Nadia',
          gender: 'putri',
          activity: 'Membaca Buku Paket IPA',
          dialogues: [
            'Habis membaca buku paket di bangku, aku maju mempresentasikan kesimpulan kelompok!',
            'Bangku belakang kanan masih kosong buat kamu duduk belajar!',
          ],
        },
      ],
    });

    // 3. Ruang Kelas 6 (z = 12.0) — 5 Siswa + 1 Guru (Multi-Kegiatan)
    this.spawnClassroomWith5Students({
      wing: 'east',
      centerZ: 12.0,
      gradeLabel: 'Kelas 6A',
      teacherName: 'Pak Hendarto, M.Pd. (Guru Kelas 6)',
      teacherActivity: 'Bimbingan Ujian Akhir SD',
      teacherShirt: '#1E3A8A',
      teacherPants: '#0F172A',
      teacherHat: 'peci',
      teacherDialogues: [
        'Fokus anak-anak Kelas 6A! Perhatikan cara menghitung volume tabung dan kubus di papan tulis.',
        'Persiapan Ujian Akhir Sekolah harus matang agar kalian semua lulus dengan nilai terbaik!',
        'Kalau ada langkah rumus pecahan yang belum paham, langsung tanyakan ke Bapak ya.',
      ],
      students: [
        {
          name: 'Aldi',
          gender: 'putra',
          activity: 'Latihan Soal Ujian Kelulusan',
          dialogues: [
            'Soal nomor 5 tentang volume prisma sudah berhasil kukerjakan dengan rumus dari Pak Hendarto!',
            'Sekarang aku siap maju menuliskan cara penyelesaiannya di papan tulis!',
          ],
        },
        {
          name: 'Bella',
          gender: 'putri',
          activity: 'Menghitung Luas Permukaan Tabung',
          dialogues: [
            'Rumus volume tabung adalah pi kali jari-jari kuadrat kali tinggi!',
            'Selesai menghitung soal ini, aku mau mengambil buku bank soal ujian di lemari.',
          ],
        },
        {
          name: 'Satria',
          gender: 'putra',
          activity: 'Mengerjakan Tryout Matematika',
          dialogues: [
            'Targetku di ujian kelulusan SD tahun ini dapat nilai seratus di Matematika dan IPA!',
            'Lembar jawaban tryoutku sudah selesai dan siap dikumpulkan ke meja Pak Hendarto!',
          ],
        },
        {
          name: 'Vina',
          gender: 'putri',
          activity: 'Merangkum Materi Ujian SD',
          dialogues: [
            'Buku catatanku berisi rangkuman materi dari Kelas 4 sampai Kelas 6!',
            'Setelah merangkum, kita peregangan dan merapikan kelas bersama-sama.',
          ],
        },
        {
          name: 'Rehan',
          gender: 'putra',
          activity: 'Memeriksa Jawaban Pecahan',
          dialogues: [
            'Jangan lupa samakan penyebutnya dulu sebelum menjumlahkan pecahan campuran!',
            'Habis memeriksa jawaban, aku maju membahas soal pecahan di depan kelas!',
          ],
        },
      ],
    });

    // 4. Dalam Kantin Sehat SD (x = 53.0, z = 32.5) — Ibu Kantin + 3 Siswa Multi-Kegiatan
    this.createArticulatedNPC({
      name: 'Bu Siti (Ibu Kantin Sehat)',
      activity: 'Meracik Bakso & Soto Hangat',
      role: 'guru',
      shirtHex: '#16A34A',
      pantsHex: '#1E293B',
      hasSkirt: true,
      behavior: 'chat_gesture',
      position: [57.2, 32.5],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Silakan masuk ke dalam Kantin Sehat! Kuah bakso dan soto ayamnya masih mengepul hangat Nak!',
      ],
      activitySchedule: [
        {
          activity: 'Meracik Bakso & Soto di Etalase',
          behavior: 'science_experiment',
          position: [57.2, 32.5],
          rotationY: -Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Silakan masuk ke dalam Kantin Sehat! Kuah bakso dan soto ayamnya masih mengepul hangat Nak!',
            'Semua jajanan di kantin ini sehat, bersih, dan tanpa pengawet.',
          ],
        },
        {
          activity: 'Mengantar Pesanan ke Meja Siswa',
          behavior: 'chat_gesture',
          position: [51.8, 30.5],
          rotationY: -Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Ini pesanan bakso kuah dan jus jeruk segarnya Nak, selamat menikmati ya!',
            'Jangan lupa berdoa dulu sebelum makan di kantin.',
          ],
        },
        {
          activity: 'Merapikan & Membersihkan Meja Kantin',
          behavior: 'sweep_clean',
          position: [51.8, 35.5],
          rotationY: -Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Ibu bersihkan meja kantin dulu supaya siswa berikutnya nyaman saat makan istirahat.',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Doni (Siswa Kelas 3A)',
      activity: 'Makan Bakso di Dalam Kantin',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      behavior: 'eat_snack',
      position: [48.2, 27.0],
      rotationY: Math.PI / 2,
      dialogues: [
        'Nyam nyam! Makan bakso kuah hangat langsung di meja dalam Kantin Sehat nikmat sekali!',
      ],
      activitySchedule: [
        {
          activity: 'Memesan Bakso di Etalase Kantin',
          behavior: 'raise_hand',
          position: [52.5, 31.0],
          rotationY: Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Bu Siti, saya pesan bakso kuah satu porsi pakai tahu dan pangsit rebus ya!',
            'Setelah pesanan siap, aku bawa mangkuknya ke meja makan kantin.',
          ],
        },
        {
          activity: 'Makan Bakso Hangat di Meja Kantin',
          behavior: 'eat_snack',
          position: [48.2, 27.0],
          rotationY: Math.PI / 2,
          duration: 10.0,
          dialogues: [
            'Nyam nyam! Makan bakso kuah hangat di meja Kantin Sehat nikmat sekali!',
            'Habis selesai makan bakso, aku mau mengobrol dengan teman dan mengembalikan mangkuk.',
          ],
        },
        {
          activity: 'Mengobrol Istirahat Bersama Teman',
          behavior: 'clap_cheer',
          position: [46.5, 32.5],
          rotationY: 0,
          duration: 7.5,
          dialogues: [
            'Kenyang sekali habis makan di Kantin Sehat! Sebentar lagi kita siap masuk kelas lagi.',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    this.createArticulatedNPC({
      name: 'Alya (Siswi Kelas 4A)',
      activity: 'Minum Jus Buah di Kantin',
      role: 'siswa_putri',
      shirtHex: '#881337',
      pantsHex: '#881337',
      hasSkirt: true,
      behavior: 'eat_snack',
      position: [48.2, 38.0],
      rotationY: Math.PI / 2,
      dialogues: [
        'Jus jeruk dan roti isi di dalam Kantin Sehat segar banget untuk bekal istirahat!',
      ],
      activitySchedule: [
        {
          activity: 'Minum Jus Buah & Roti di Meja',
          behavior: 'eat_snack',
          position: [48.2, 38.0],
          rotationY: Math.PI / 2,
          duration: 9.5,
          dialogues: [
            'Jus jeruk dan roti isi di dalam Kantin Sehat segar banget untuk bekal istirahat!',
            'Habis minum jus, aku mau memilih buah potong di etalase Bu Siti.',
          ],
        },
        {
          activity: 'Memilih Buah Segar di Etalase Kantin',
          behavior: 'inspect_shelf',
          position: [52.5, 34.5],
          rotationY: Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Di etalase Kantin Sehat ada potongan pepaya, melon, dan pisang yang manis!',
          ],
        },
        {
          activity: 'Bercerita Seru Saat Jam Istirahat',
          behavior: 'chat_gesture',
          position: [46.5, 35.5],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Jam istirahat di kantin yang luas ini seru banget, kita bisa makan sambil bercerita!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    // =========================================================================
    // D. AREA LUAR: LAPANGAN UPACARA, KORIDOR, LAPANGAN OLAHRAGA, ECOBRICK & GERBANG
    // =========================================================================

    // 1. Petugas Upacara & Siswa Lapangan Upacara (Multi-Kegiatan: Hormat -> Baris-Berbaris -> Senam SKJ -> Istirahat)
    this.createArticulatedNPC({
      name: 'Siti (Kelas 5A · Petugas Upacara)',
      activity: 'Latihan Pengibar Bendera',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      hasSkirt: true,
      behavior: 'ceremony_salute',
      position: [0, -16.5],
      rotationY: Math.PI,
      dialogues: [
        'Sikap sempurna! Hormat kepada Bendera Merah Putih di tiang upacara!',
      ],
      activitySchedule: [
        {
          activity: 'Latihan Hormat Bendera Merah Putih',
          behavior: 'ceremony_salute',
          position: [0, -16.5],
          rotationY: Math.PI,
          duration: 9.5,
          dialogues: [
            'Sikap sempurna! Hormat kepada Bendera Merah Putih di tiang upacara!',
            'Setelah latihan hormat bendera, kita lanjut latihan langkah tegap menuju tiang bendera.',
          ],
        },
        {
          activity: 'Memeriksa Tali Tiang Bendera',
          behavior: 'inspect_shelf',
          position: [0, -21.2],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Aku memastikan pengait dan tali tiang bendera Merah Putih berfungsi lancar untuk upacara Senin!',
            'Habis mengecek tiang bendera, kita lanjut pemanasan Senam Pagi SKJ!',
          ],
        },
        {
          activity: 'Memimpin Senam Pagi SKJ di Lapangan',
          behavior: 'exercise_skj',
          position: [-5.5, -15.5],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Satu, dua, tiga, empat! Ayo rentangkan tangan dan ikuti irama Senam Pagi SKJ!',
            'Badan jadi segar dan bersemangat setelah senam bersama di lapangan!',
          ],
        },
        {
          activity: 'Berdiskusi Evaluasi Petugas Upacara',
          behavior: 'clap_cheer',
          position: [5.5, -15.5],
          rotationY: -Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Latihan petugas upacara tadi kompak sekali! Mari kita ulangi lagi dari posisi barisan!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Damar (Kelas 4A · Siswa Aktif)',
      activity: 'Senam Pagi SKJ di Lapangan',
      role: 'siswa_putra',
      shirtHex: '#FACC15',
      pantsHex: '#14532D',
      hatType: 'topi_olahraga',
      behavior: 'exercise_skj',
      position: [-8.5, -16.5],
      rotationY: Math.PI,
      dialogues: [
        'Senam pagi di lapangan membuat tubuh sehat dan kuat!',
      ],
      activitySchedule: [
        {
          activity: 'Senam Pagi SKJ di Lapangan',
          behavior: 'exercise_skj',
          position: [-8.5, -16.5],
          rotationY: Math.PI,
          duration: 9.0,
          dialogues: [
            'Gerakan Senam SKJ pagi ini seru sekali! Satu dua tiga empat, lompat semangat!',
            'Selesai senam di lapangan, aku mau jalan menyapu piket teras gedung utara.',
          ],
        },
        {
          activity: 'Piket Menyapu Teras Gedung Utama',
          behavior: 'sweep_clean',
          position: [-12.0, -32.0],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Setelah olahraga pagi, aku membantu piket menyapu koridor teras supaya bebas daun kering!',
            'Habis menyapu teras, aku mau membaca pengumuman di depan Ruang Guru.',
          ],
        },
        {
          activity: 'Membaca Mading Teras Sekolah',
          behavior: 'read_book',
          position: [6.0, -32.5],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Karya puisi dan gambar siswa yang ditempel di teras gedung utama bagus-bagus ya!',
            'Sekarang aku kembali ke lapangan untuk ikut latihan baris-berbaris.',
          ],
        },
        {
          activity: 'Latihan Baris-Berbaris & Hormat',
          behavior: 'ceremony_salute',
          position: [6.5, -16.5],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Siap grak! Lencang kanan grak! Aku berlatih baris-berbaris bersama Siti di lapangan upacara.',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    // 2. Siswa Pengamat & Perawat Taman Ecobrick "I LOVE SUGA" di Dekat Gerbang
    this.createArticulatedNPC({
      name: 'Laras (Kelas 5A · Duta Adiwiyata)',
      activity: 'Merawat Taman Ecobrick I LOVE SUGA',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasSkirt: true,
      behavior: 'inspect_shelf',
      position: [14.8, 51.2],
      rotationY: 0,
      dialogues: [
        'Aku sedang merawat tanaman bunga di Taman Ecobrick bertuliskan "I LOVE SUGA"!',
      ],
      activitySchedule: [
        {
          activity: 'Merawat Taman Ecobrick I LOVE SUGA',
          behavior: 'inspect_shelf',
          position: [14.8, 51.2],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Lihat instalasi Ecobrick Merah Putih bertuliskan "I LOVE SUGA" ini, hasil karya daur ulang siswa SDN SUSUKAN 03!',
            'Selesai menyiram bunga di taman ecobrick, aku mau menyapa Pak Joko di Pos Satpam.',
          ],
        },
        {
          activity: 'Menyapu Halaman Dekat Gerbang',
          behavior: 'sweep_clean',
          position: [6.5, 49.5],
          rotationY: -Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Sebagai Duta Adiwiyata, aku rajin menjaga kebersihan area gerbang utama sekolah!',
            'Habis menyapu halaman depan, kita foto dan tepuk tangan di depan monumen I LOVE SUGA!',
          ],
        },
        {
          activity: 'Kagum & Tepuk Tangan di Ecobrick',
          behavior: 'clap_cheer',
          position: [17.5, 51.0],
          rotationY: -0.35,
          duration: 8.0,
          dialogues: [
            'Hore! Warna Merah Putih pada huruf 3D "I LOVE SUGA" tampak menyala dan indah sekali!',
          ],
        },
      ],
    });

    // 3. Guru PJOK & Pemain Futsal di Lapangan Olahraga
    this.createArticulatedNPC({
      name: 'Pak Budi (Guru PJOK)',
      activity: 'Penguji Misi Olahraga & Guru PJOK',
      role: 'guru',
      shirtHex: '#15803D',
      pantsHex: '#0F172A',
      tieHex: '#FACC15',
      hatType: 'topi_olahraga',
      behavior: 'coach_sideline',
      position: [0, -3.5],
      rotationY: 0,
      dialogues: [
        'Prit! Mau ikut Ujian Penalti, Basket, atau Lari Rintangan Keliling Lapangan? Lari cepat sambil melompati rintangan gawang!',
      ],
      activitySchedule: [
        {
          activity: 'Penguji Misi PJOK (Penalti, Basket, Lari Rintangan)',
          behavior: 'coach_sideline',
          position: [0, -3.5],
          rotationY: 0,
          duration: 9.5,
          dialogues: [
            'Prit! Ayo ikuti Misi Lari Rintangan Keliling Lapangan, Ujian Penalti, atau Basket PJOK bersama Pak Budi!',
            'Klik tombol Lari Rintangan untuk berlari keliling lapangan sambil melompati gawang rintangan!',
          ],
        },
        {
          activity: 'Memantau Serangan di Sisi Timur',
          behavior: 'clap_cheer',
          position: [14.5, -3.5],
          rotationY: -0.4,
          duration: 8.0,
          dialogues: [
            'Tendangan yang bagus! Mau nilai pelajaran olahraga bagus? Ayo ikuti ujian penalti 10 tendangan!',
          ],
        },
        {
          activity: 'Memimpin Peregangan Otot PJOK',
          behavior: 'exercise_skj',
          position: [-14.5, -3.5],
          rotationY: 0.4,
          duration: 8.0,
          dialogues: [
            'Jangan lupa peregangan otot kaki sebelum mengikuti Misi Tendangan Penalti PJOK ya!',
          ],
        },
      ],
    });

    const futsalPlayers = [
      {
        name: 'Rizky (Kelas 5 · Pemain Futsal)',
        activity: 'Giring Bola & Serang Gawang',
        x: -10,
        z: 7,
        waypoints: [
          [-14, 7],
          [12, 12],
          [-6, 15],
          [-14, 7],
        ] as [number, number][],
        dialogues: [
          'Oper ke sini! Aku siap menggiring bola dan mencetak gol!',
          'Pertandingan futsal antar kelas di lapangan olahraga seru banget!',
        ],
      },
      {
        name: 'Galih (Kelas 6 · Penyerang)',
        activity: 'Lari Mencetak Gol Futsal',
        x: 10,
        z: 13,
        waypoints: [
          [14, 13],
          [-11, 8],
          [8, 5],
          [14, 13],
        ] as [number, number][],
        dialogues: [
          'Tendangan jarak jauh ke gawang! Awas kiper!',
          'Habis main futsal kita mampir minum es di Kantin Sehat yuk!',
        ],
      },
      {
        name: 'Kevin (Kelas 4 · Kiper)',
        activity: 'Menjaga Gawang Futsal',
        x: -19,
        z: 10,
        waypoints: [
          [-19.5, 6.5],
          [-19.5, 13.5],
        ] as [number, number][],
        dialogues: [
          'Gawang Barat aman terjaga! Fokus perhatikan arah bola!',
          'Menjadi kiper melatih ketangkasan dan refleks tubuh!',
        ],
      },
    ];

    futsalPlayers.forEach((fp) => {
      this.createArticulatedNPC({
        name: fp.name,
        activity: fp.activity,
        role: 'siswa_putra',
        shirtHex: '#FACC15',
        pantsHex: '#14532D',
        hatType: 'none',
        behavior: 'futsal_player',
        position: [fp.x, fp.z],
        patrolWaypoints: fp.waypoints,
        moveSpeed: 9.2,
        dialogues: fp.dialogues,
      });
    });

    // 4. Satpam Sekolah & Area Jajanan Gerbang (Multi-Kegiatan)
    this.createArticulatedNPC({
      name: 'Pak Joko (Satpam SDN SUSUKAN 03)',
      activity: 'Menjaga Gerbang & Lalu Lintas',
      role: 'satpam',
      shirtHex: '#1E3A8A',
      pantsHex: '#0F172A',
      tieHex: '#F8FAFC',
      hatType: 'topi_olahraga',
      behavior: 'guard_wave',
      position: [-6.5, 55.5],
      rotationY: 0,
      dialogues: [
        'Lihat karya Taman Ecobrick bertuliskan "I LOVE SUGA" di samping gerbang SDN SUSUKAN 03, keren sekali ya!',
      ],
      activitySchedule: [
        {
          activity: 'Mengatur Lalu Lintas Gerbang Utama',
          behavior: 'guard_wave',
          position: [-6.5, 55.5],
          rotationY: 0,
          duration: 10.0,
          dialogues: [
            'Selamat datang di SDN SUSUKAN 03! Hati-hati saat menyeberang jalan raya di depan gerbang ya!',
            'Lihat karya Taman Ecobrick Merah Putih bertuliskan "I LOVE SUGA" di samping gerbang sekolah!',
          ],
        },
        {
          activity: 'Patroli Keamanan Area Parkiran',
          behavior: 'inspect_shelf',
          position: [-22.0, 50.5],
          rotationY: -Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Bapak sedang mengecek keamanan mobil dan motor Bapak/Ibu Guru di area parkiran barat.',
            'Semua kendaraan terparkir rapi dan aman, sekarang Bapak patroli ke sisi timur.',
          ],
        },
        {
          activity: 'Memeriksa Taman Ecobrick & Pos',
          behavior: 'ceremony_salute',
          position: [8.5, 54.0],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Lingkungan gerbang sekolah dan Taman Ecobrick "I LOVE SUGA" aman, tertib, dan asri!',
          ],
        },
      ],
    });

    // Two Elementary Students crossing the 24-unit Zebra Cross in front of Main Gate
    this.createArticulatedNPC({
      name: 'Dika (Siswa Penyeberang)',
      activity: 'Menyeberang di Zebra Cross Depan Gerbang',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      hasBackpack: true,
      backpackHex: '#2563EB',
      behavior: 'raise_hand',
      position: [-1.3, 90.4],
      rotationY: Math.PI,
      dialogues: [
        'Terima kasih Pak Joko Satpam! Kami jadi aman menyeberang di Zebra Cross menuju gerbang sekolah!',
        'Mobil dan motor sudah berhenti di belakang garis kuning, ayo kita menyeberang bersama!',
      ],
      activitySchedule: [
        {
          activity: 'Menunggu Aba-aba Satpam di Trotoar Seberang',
          behavior: 'raise_hand',
          position: [-1.3, 90.4],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Pak Joko, tolong bantu kami menyeberang jalan raya yang ramai mobil dan motor ini ya!',
          ],
        },
        {
          activity: 'Menyeberang Zebra Cross ke Gerbang Sekolah',
          behavior: 'guard_wave',
          position: [-1.3, 62.6],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Hore! Sudah sampai dengan selamat di depan gerbang SDN SUSUKAN 03!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Rani (Siswa Penyeberang)',
      activity: 'Menyeberang di Zebra Cross Depan Gerbang',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasBackpack: true,
      backpackHex: '#EC4899',
      behavior: 'raise_hand',
      position: [1.3, 90.4],
      rotationY: Math.PI,
      dialogues: [
        'Selalu tengok kanan dan kiri, lalu menyeberang di Zebra Cross bersama Pak Satpam!',
        'Terima kasih sudah menghentikan mobil dan motor untuk kami!',
      ],
      activitySchedule: [
        {
          activity: 'Menunggu Menyeberang di Trotoar Seberang',
          behavior: 'raise_hand',
          position: [1.3, 90.4],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Ayo Dika, kita tunggu aba-aba peluit dari Pak Joko Satpam dulu sebelum menyeberang!',
          ],
        },
        {
          activity: 'Masuk Gerbang Lewat Zebra Cross',
          behavior: 'guard_wave',
          position: [1.3, 62.6],
          rotationY: Math.PI,
          duration: 7.5,
          dialogues: [
            'Alhamdulillah aman menyeberang jalan! Terima kasih Pak Satpam!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Tono (Kelas 2A)',
      activity: 'Beli Cilok di Depan Gerbang',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      hasBackpack: true,
      backpackHex: '#DC2626',
      behavior: 'eat_snack',
      position: [14.5, 61.5],
      rotationY: 0,
      dialogues: [
        'Aduh... aku mau beli jajanan di depan sekolah tapi bingung hitung harga jajan dan uang kembalianku! Klik [Bantu Jajan] untuk membantuku ya!',
        'Mang Asep, Bang Udin, dan Mang Dedi jajanan gerobaknya enak-enak! Ayo bantu aku hitung uang jajanku!',
      ],
      activitySchedule: [
        {
          activity: 'Beli Jajan & Hitung Kembalian',
          behavior: 'eat_snack',
          position: [14.5, 61.5],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Aduh... aku mau beli jajanan di depan gerbang tapi bingung hitung harga jajan dan uang kembalianku! Klik [Bantu Jajan] untuk membantuku ya!',
            'Mang Asep, beli cilok bumbu kacang dan batagornya ya! Bantu Tono hitung kembaliannya yuk!',
          ],
        },
        {
          activity: 'Memilih Telur Gulung Bang Udin',
          behavior: 'raise_hand',
          position: [25.0, 61.5],
          rotationY: 0,
          duration: 8.5,
          dialogues: [
            'Bang Udin, beli telur gulung tiga tusuk pakai saus tomat ya!',
            'Setelah beli telur gulung, aku mau minum es doger segar di sebelah!',
          ],
        },
        {
          activity: 'Minum Es Doger Segar Mang Dedi',
          behavior: 'eat_snack',
          position: [35.5, 61.5],
          rotationY: 0,
          duration: 8.5,
          dialogues: [
            'Sluuurp! Es doger roti tawar Mang Dedi segar sekali diminum habis makan jajanan!',
            'Habis ini aku mau melihat Taman Ecobrick I LOVE SUGA di dekat gerbang!',
          ],
        },
      ],
    });

    this.createArticulatedNPC({
      name: 'Mang Asep (Tukang Cilok)',
      activity: 'Meracik Cilok & Bumbu Kacang',
      role: 'pedagang',
      shirtHex: '#16A34A',
      pantsHex: '#1E293B',
      behavior: 'vendor_stand',
      position: [14.5, 64.6],
      floorY: 0,
      spawnMeshVisuals: false,
      dialogues: [
        'Cilok Bandung hangat Dek! Bumbu kacang spesial, dua ribuan aja!',
        'Batagor tahunya masih hangat baru diangkat dari kukusan!',
      ],
    });

    this.createArticulatedNPC({
      name: 'Bang Udin (Telur Gulung)',
      activity: 'Menggoreng Telur Gulung SD',
      role: 'pedagang',
      shirtHex: '#DC2626',
      pantsHex: '#1E293B',
      behavior: 'vendor_stand',
      position: [25.0, 64.6],
      floorY: 0,
      spawnMeshVisuals: false,
      dialogues: [
        'Telur gulung gurih baru digoreng Dek! Satu tusuk seribu rupiah!',
        'Ada sosis bakar dan cimol hangat juga nih, silakan dipilih!',
      ],
    });

    this.createArticulatedNPC({
      name: 'Mang Dedi (Es Doger)',
      activity: 'Menyajikan Es Doger & Roti',
      role: 'pedagang',
      shirtHex: '#0284C7',
      pantsHex: '#1E293B',
      behavior: 'vendor_stand',
      position: [35.5, 64.6],
      floorY: 0,
      spawnMeshVisuals: false,
      dialogues: [
        'Es doger segar pakai roti tawar, tape, dan susu kental manis Dek!',
        'Cocok banget diminum siang-siang sehabis olahraga atau pulang sekolah!',
      ],
    });

    // ============================================================================
    // RUANG UKS (USAHA KESEHATAN SEKOLAH) — West Wing (-63.5..-41.5, z = 44.0..56.8)
    // ============================================================================
    this.createArticulatedNPC({
      name: 'Bu Nisa, A.Md.Kep. (Petugas UKS)',
      activity: 'Memeriksa Kesehatan Siswa di UKS',
      role: 'guru',
      shirtHex: '#F8FAFC',
      pantsHex: '#0F172A',
      tieHex: '#DC2626',
      hatType: 'none',
      behavior: 'science_experiment',
      position: [-56.2, 53.2],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Selamat datang di Ruang UKS SDN SUSUKAN 03! Jangan lupa sarapan bergizi dan minum air putih yang cukup ya!',
      ],
      activitySchedule: [
        {
          activity: 'Memeriksa Kesehatan Siswa di UKS',
          behavior: 'science_experiment',
          position: [-56.2, 53.2],
          rotationY: -Math.PI / 2,
          duration: 9.5,
          dialogues: [
            'Selamat datang di Ruang UKS SDN SUSUKAN 03! Kalau badan terasa pusing atau lemas saat upacara, segera istirahat di ranjang UKS ya.',
            'Ibu sedang memeriksa suhu tubuh dan kondisi kesehatan siswa yang beristirahat di Ruang UKS.',
          ],
        },
        {
          activity: 'Mengecek Obat & Kotak P3K UKS',
          behavior: 'inspect_shelf',
          position: [-55.8, 46.2],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Persediaan perban steril, antiseptik, minyak kayu putih, dan obat P3K di lemari Ruang UKS selalu lengkap dan rapi.',
            'Dokter Kecil SDN SUSUKAN 03 rajin membantu Ibu mengecek kelengkapan kotak P3K setiap minggu!',
          ],
        },
        {
          activity: 'Mencatat Buku Pemeriksaan UKS',
          behavior: 'write_desk',
          position: [-49.2, 45.4],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Ibu sedang mencatat data tinggi badan, berat badan, dan kebersihan kuku siswa di buku rekam kesehatan UKS.',
            'Biasakan Perilaku Hidup Bersih dan Sehat (PHBS) dengan mencuci tangan pakai sabun ya Nak!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Fajar (Dokter Kecil · Kelas 4A)',
      activity: 'Menimbang Berat & Tinggi Badan',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      behavior: 'stretch_body',
      position: [-46.2, 54.2],
      rotationY: 0.4,
      dialogues: [
        'Aku bertugas sebagai Dokter Kecil SDN SUSUKAN 03 di Ruang UKS hari ini!',
      ],
      activitySchedule: [
        {
          activity: 'Menimbang Berat & Tinggi Badan',
          behavior: 'stretch_body',
          position: [-46.2, 54.2],
          rotationY: 0.4,
          duration: 9.0,
          dialogues: [
            'Wah, tinggi badanku bertambah dua sentimeter bulan ini! Ayo ukur tinggi dan berat badanmu di timbangan UKS!',
            'Sebagai Dokter Kecil SD, aku senang membantu Bu Nisa menjaga kesehatan teman-teman di sekolah.',
          ],
        },
        {
          activity: 'Merapikan Peralatan P3K UKS',
          behavior: 'inspect_shelf',
          position: [-53.2, 46.4],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Kapas, plester luka, dan cairan antiseptik sudah kususun rapi di lemari P3K Ruang UKS.',
            'Kalau ada teman yang terjatuh saat olahraga di lapangan, Dokter Kecil siap memberi pertolongan pertama!',
          ],
        },
        {
          activity: 'Belajar Pertolongan Pertama (P3K)',
          behavior: 'raise_hand',
          position: [-48.8, 48.8],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Bu Nisa, saya siap mempraktikkan cara membalut luka ringan dan mengecek kebersihan gigi teman-teman!',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    this.createArticulatedNPC({
      name: 'Citra (Kelas 3A · Istirahat UKS)',
      activity: 'Minum Air Hangat di Ruang UKS',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasSkirt: true,
      behavior: 'eat_snack',
      position: [-56.8, 47.4],
      rotationY: Math.PI / 2,
      dialogues: [
        'Tadi kepalaku sempat sedikit pusing, tapi setelah minum teh hangat dan istirahat di Ruang UKS rasanya sudah segar kembali!',
      ],
      activitySchedule: [
        {
          activity: 'Minum Air Hangat di Ruang UKS',
          behavior: 'eat_snack',
          position: [-56.8, 47.4],
          rotationY: Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Terima kasih Bu Nisa! Setelah diberi minyak kayu putih dan minum air hangat di Ruang UKS, badanku sudah enak kembali.',
            'Ranjang Ruang UKS SDN SUSUKAN 03 bersih, rapi, dan sejuk sekali untuk beristirahat.',
          ],
        },
        {
          activity: 'Peregangan Ringan Setelah Pulih',
          behavior: 'stretch_body',
          position: [-53.5, 51.8],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Alhamdulillah sekarang aku sudah sehat dan tidak lemas lagi! Besok aku harus sarapan pagi sebelum berangkat sekolah.',
          ],
        },
        {
          activity: 'Pamit Kembali ke Kelas pada Bu Nisa',
          behavior: 'chat_gesture',
          position: [-49.5, 49.2],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Bu Nisa dan Fajar, terima kasih sudah merawatku di Ruang UKS ya! Aku siap kembali mengikuti pelajaran di kelas.',
          ],
        },
      ],
      initialStageOffset: 2,
    });

    // ============================================================================
    // MUSHOLA SEKOLAH (MUSHOLA AL-IKHLAS) — East Wing (41.5..63.5, z = 44.0..56.8)
    // ============================================================================
    this.createArticulatedNPC({
      name: 'Pak Ustaz Ahmad, S.Pd.I. (Guru Agama)',
      activity: 'Membimbing Tadarus & Doa di Mushola',
      role: 'guru',
      shirtHex: '#F8FAFC',
      pantsHex: '#064E3B',
      tieHex: '#10B981',
      hatType: 'peci',
      behavior: 'teach_board',
      position: [61.2, 50.4],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Assalamualaikum anak-anak! Mari kita jaga kesucian Mushola Al-Ikhlas SDN SUSUKAN 03 dan rajin beribadah tepat waktu.',
      ],
      activitySchedule: [
        {
          activity: 'Membimbing Tadarus & Doa di Mihrab',
          behavior: 'teach_board',
          position: [61.2, 50.4],
          rotationY: -Math.PI / 2,
          duration: 9.5,
          dialogues: [
            'Assalamualaikum warahmatullahi wabarakatuh! Selamat datang di Mushola Al-Ikhlas SDN SUSUKAN 03.',
            'Sebelum belajar, mari kita berdoa agar diberi ilmu yang bermanfaat dan akhlak yang mulia.',
          ],
        },
        {
          activity: 'Menyimak Bacaan Al-Quran Siswa',
          behavior: 'read_book',
          position: [56.8, 48.2],
          rotationY: Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'MasyaAllah, bacaan tajwid dan makhraj huruf anak-anak di Mushola Sekolah semakin lancar dan merdu!',
            'Ayo baca pelan-pelan dengan tartil, perhatikan panjang pendek harakatnya ya Nak.',
          ],
        },
        {
          activity: 'Merapikan Rak Al-Quran & Iqro',
          behavior: 'inspect_shelf',
          position: [52.0, 46.2],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Selesai membaca Al-Quran atau buku Iqro, jangan lupa dikembalikan dengan rapi ke rak kayu Mushola ya.',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Zaki (Kelas 4A · Mengaji di Mushola)',
      activity: 'Mengaji Al-Quran di Meja Rehal',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'peci',
      behavior: 'read_book',
      position: [57.8, 46.9],
      rotationY: Math.PI / 2,
      dialogues: [
        'Bismillahirrahmanirrahim... Aku sedang latihan membaca surat pendek Juz Amma di meja rehal Mushola.',
      ],
      activitySchedule: [
        {
          activity: 'Mengaji Al-Quran di Meja Rehal',
          behavior: 'read_book',
          position: [57.8, 46.9],
          rotationY: Math.PI / 2,
          duration: 9.5,
          dialogues: [
            'Bismillahirrahmanirrahim... Aku sedang tadarus membaca Surat Al-Ikhlas dan An-Nas di Mushola Sekolah.',
            'Suasana di dalam Mushola Al-Ikhlas tenang, wangi, dan sejuk sekali untuk belajar mengaji.',
          ],
        },
        {
          activity: 'Bertanya Tajwid ke Pak Ustaz Ahmad',
          behavior: 'raise_hand',
          position: [57.8, 50.4],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Pak Ustaz Ahmad, apakah hukum bacaan nun mati bertemu huruf ba pada ayat ini disebut Iqlab?',
            'Terima kasih Pak Ustaz, sekarang aku makin paham hukum bacaan tajwid!',
          ],
        },
        {
          activity: 'Mengambil Buku Iqro di Rak Mushola',
          behavior: 'inspect_shelf',
          position: [53.4, 46.2],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Koleksi mushaf Al-Quran dan buku Juz Amma di rak Mushola SDN SUSUKAN 03 tersusun rapi sekali.',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    this.createArticulatedNPC({
      name: 'Nabila (Kelas 5A · Tadarus Mushola)',
      activity: 'Membaca Surat Pendek Al-Quran',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasSkirt: true,
      behavior: 'read_book',
      position: [57.8, 53.9],
      rotationY: Math.PI / 2,
      dialogues: [
        'Setiap waktu istirahat pagi, kami senang berkumpul di Mushola Sekolah untuk sholat Dhuha dan tadarus bersama.',
      ],
      activitySchedule: [
        {
          activity: 'Membaca Surat Pendek Al-Quran',
          behavior: 'read_book',
          position: [57.8, 53.9],
          rotationY: Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Setiap waktu istirahat pagi, kami senang berkumpul di Mushola Sekolah untuk sholat Dhuha dan tadarus bersama.',
            'Sajadah hijau berhiaskan benang emas di Mushola sekolah kita lembut dan harum sekali!',
          ],
        },
        {
          activity: 'Merapikan Sajadah & Mukena Mushola',
          behavior: 'sweep_clean',
          position: [50.2, 52.8],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Aku membantu piket merapikan barisan sajadah shaf belakang agar Mushola selalu bersih dan nyaman.',
          ],
        },
        {
          activity: 'Berdiskusi Akhlak Terpuji di Mushola',
          behavior: 'chat_gesture',
          position: [53.8, 52.5],
          rotationY: 0,
          duration: 8.0,
          dialogues: [
            'Pak Ustaz mengajarkan kita untuk selalu berkata sopan kepada guru dan menyayangi teman di sekolah.',
          ],
        },
      ],
      initialStageOffset: 2,
    });

    this.createArticulatedNPC({
      name: 'Hafiz (Kelas 2A · Berdoa di Mushola)',
      activity: 'Berdoa & Dzikir Pagi di Sajadah',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'peci',
      behavior: 'read_book',
      position: [54.4, 49.5],
      rotationY: Math.PI / 2,
      dialogues: [
        'Robbi zidni ilma warzuqni fahma... Ya Allah tambahkanlah ilmuku dan berikanlah aku pemahaman yang baik. Aamiin!',
      ],
      activitySchedule: [
        {
          activity: 'Berdoa & Dzikir Pagi di Sajadah',
          behavior: 'read_book',
          position: [54.4, 49.5],
          rotationY: Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Robbi zidni ilma warzuqni fahma... Ya Allah tambahkanlah ilmuku dan berikanlah aku pemahaman yang baik. Aamiin!',
            'Aku senang belajar doa sehari-hari bersama Pak Ustaz Ahmad di Mushola SDN SUSUKAN 03.',
          ],
        },
        {
          activity: 'Setoran Hafalan Juz Amma',
          behavior: 'raise_hand',
          position: [50.2, 48.2],
          rotationY: Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Pak Ustaz, saya sudah hafal Surat Al-Fatihah, An-Nas, Al-Falaq, dan Al-Ikhlas dengan lancar!',
          ],
        },
        {
          activity: 'Menyalami & Hormat ke Pak Ustaz',
          behavior: 'ceremony_salute',
          position: [58.2, 51.6],
          rotationY: Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Terima kasih Pak Ustaz Ahmad sudah membimbing kami mengaji dan berdoa di Mushola sekolah!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    // ============================================================================
    // ARENA PERMAINAN TRADISIONAL INDONESIA DI SEBELAH LAPANGAN OLAHRAGA (z = 29.5)
    // 1. Lompat Tali Karet (-12.5, 29.5) | 2. Dampu Bulan (1.5, 29.5) | 3. Kelereng (14.5, 29.5)
    // ============================================================================

    // --- 1. Kelompok Lompat Tali Karet Gelang (x = -12.5, z = 29.5) ---
    this.createArticulatedNPC({
      name: 'Kartika (Kelas 4A · Lompat Tali)',
      activity: 'Melompati Tali Karet Gelang',
      role: 'siswa_putri',
      shirtHex: '#FACC15',
      pantsHex: '#14532D',
      hatType: 'pita',
      behavior: 'jump_rope',
      position: [-12.5, 29.5],
      rotationY: 0,
      dialogues: [
        'Satu, dua, tiga, lompat! Seru sekali bermain lompat tali karet gelang di sebelah lapangan olahraga!',
      ],
      activitySchedule: [
        {
          activity: 'Melompati Tali Karet Gelang',
          behavior: 'jump_rope',
          position: [-12.5, 29.5],
          rotationY: 0,
          duration: 10.5,
          dialogues: [
            'Satu, dua, tiga, lompat tinggi! Jangan sampai kaki menyentuh ayunan tali karet gelang ya!',
            'Permainan tradisional lompat tali karet membuat badan lincah dan sehat seperti olahraga!',
          ],
        },
        {
          activity: 'Lompat Tali Tingkat Merdeka!',
          behavior: 'jump_rope',
          position: [-12.5, 29.5],
          rotationY: Math.PI,
          duration: 9.5,
          dialogues: [
            'Hore! Aku sudah lolos tinggi lutut, pinggang, dan dada! Sekarang lompat tali tingkat Merdeka!',
            'Ayo teman-teman ikut bermain lompat tali karet di sebelah lapangan olahraga!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Dewi (Kelas 4A · Pemutar Tali)',
      activity: 'Memutar Ujung Tali Karet Barat',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasSkirt: true,
      behavior: 'turn_rope',
      position: [-15.8, 29.5],
      rotationY: Math.PI / 2,
      dialogues: [
        'Aku dan Intan kompak memutar tali karet gelang warna-warni ini! Ayo Kartika lompat terus!',
        'Tali karet ini kami rangkai sendiri dari ratusan karet gelang lho!',
      ],
      activitySchedule: [
        {
          activity: 'Memutar Ujung Tali Karet Barat',
          behavior: 'turn_rope',
          position: [-15.8, 29.5],
          rotationY: Math.PI / 2,
          duration: 11.0,
          dialogues: [
            'Aku dan Intan kompak memutar tali karet gelang warna-warni ini! Ayo Kartika lompat terus!',
            'Tali karet ini kami rangkai sendiri dari ratusan karet gelang lho!',
          ],
        },
        {
          activity: 'Menyemangati Pelompat Tali Karet',
          behavior: 'clap_cheer',
          position: [-15.8, 29.5],
          rotationY: Math.PI / 2,
          duration: 7.5,
          dialogues: [
            'Hebat sekali lompatannya! Kaki tidak menyentuh karet sama sekali!',
            'Siapa lagi yang mau mencoba lompat tali karet gelang bersama kami?',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Intan (Kelas 4A · Pemutar Tali)',
      activity: 'Memutar Ujung Tali Karet Timur',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      hasSkirt: true,
      behavior: 'turn_rope',
      position: [-9.2, 29.5],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Ayunan tali karetnya stabil! Ayo klik tombol Misi Lompat Tali untuk ikut melompat dari tingkat Mata Kaki sampai Merdeka!',
        'Aku dan Dewi siap memutar tali karet gelang warna-warni untukmu! Berani coba Misi Lompat Tali?',
      ],
      activitySchedule: [
        {
          activity: 'Memutar Ujung Tali Karet Timur',
          behavior: 'turn_rope',
          position: [-9.2, 29.5],
          rotationY: -Math.PI / 2,
          duration: 11.0,
          dialogues: [
            'Ayunan tali karetnya stabil! Ayo klik tombol Misi Lompat Tali untuk ikut melompat dari tingkat Mata Kaki sampai Merdeka!',
            'Aku dan Dewi siap memutar tali karet gelang warna-warni untukmu! Berani coba Misi Lompat Tali?',
          ],
        },
        {
          activity: 'Mengatur Irama Putaran Tali Karet',
          behavior: 'turn_rope',
          position: [-9.2, 29.5],
          rotationY: -Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Ritme putaran tali tetap stabil! Bersiap untuk tingkat pinggang dan dada!',
            'Semangat Kartika! Tali karet berputar semakin seru!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    // --- 2. Kelompok Permainan Dampu Bulan / Engklek Besar Menghadap Selatan (x = 1.5, z = 26.3..39.45) ---
    this.createArticulatedNPC({
      name: 'Wulan (Kelas 3A · Main Dampu Bulan)',
      activity: 'Engklek Satu Kaki Menghadap Selatan',
      role: 'siswa_putri',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'pita',
      hasSkirt: true,
      behavior: 'hop_dampu',
      position: [1.5, 26.3],
      rotationY: 0,
      dialogues: [
        'Hup, hup! Arena Dampu Bulan sekarang menghadap Selatan! Ayo klik tombol Misi Dampu Bulan untuk ikut bermain!',
      ],
      activitySchedule: [
        {
          activity: 'Melempar Gaco & Engklek Petak 1-3 (Menghadap Selatan)',
          behavior: 'hop_dampu',
          position: [1.5, 28.5],
          rotationY: 0,
          duration: 8.5,
          dialogues: [
            'Lempar gaco ke petak sasaran, lalu melompat engklek satu kaki menghadap Selatan melewati petak 1 sampai 3!',
            'Ayo ikut Misi Bermain Dampu Bulan bersamaku dan Mentari!',
          ],
        },
        {
          activity: 'Melompat Sayap & Puncak Dampu Bulan Selatan',
          behavior: 'hop_dampu',
          position: [1.5, 37.3],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Hup! Di petak kembar 4-5 dan 7-8 kita mendarat Dampu 2 kaki, lalu berhenti di Puncak Bulan Selatan!',
            'Seru banget main permainan tradisional Dampu Bulan besar menghadap Selatan!',
          ],
        },
        {
          activity: 'Bertepuk Tangan Menyemangati di Pinggir Dampu Bulan',
          behavior: 'clap_cheer',
          position: [-2.2, 31.8],
          rotationY: Math.PI / 2,
          duration: 8.0,
          dialogues: [
            'Ayo teman-teman! Klik tombol Misi Dampu Bulan di atas untuk menguji ketepatan lempar gaco dan lompatan engklekmu!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Mentari (Kelas 3A · Main Dampu Bulan)',
      activity: 'Giliran Lempar Gaco Dampu Bulan',
      role: 'siswa_putri',
      shirtHex: '#FACC15',
      pantsHex: '#14532D',
      hatType: 'topi_olahraga',
      behavior: 'clap_cheer',
      position: [5.2, 31.8],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Permainan Dampu Bulan melatih keseimbangan kaki dan ketepatan melempar gaco! Ayo main Misi Dampu Bulan!',
      ],
      activitySchedule: [
        {
          activity: 'Menyemangati Teman di Dampu Bulan',
          behavior: 'clap_cheer',
          position: [5.2, 31.8],
          rotationY: -Math.PI / 2,
          duration: 8.5,
          dialogues: [
            'Wah hebat Wulan! Keseimbangan satu kakimu melompat ke arah Selatan mantap sekali!',
            'Ayo kamu juga ikutan main Misi Dampu Bulan dari Petak 1 sampai Puncak Bulan!',
          ],
        },
        {
          activity: 'Engklek Satu Kaki Menghadap Selatan di Petak 3-6',
          behavior: 'hop_dampu',
          position: [1.5, 35.1],
          rotationY: 0,
          duration: 9.0,
          dialogues: [
            'Hup, hup! Gacoku sudah di petak sasaran! Aku melompat menghadap Selatan tanpa menginjak garis!',
            'Siapa yang mau ikut Misi Dampu Bulan bersama kami di pinggir lapangan olahraga?',
          ],
        },
        {
          activity: 'Mendarat di Puncak Bulan Selatan',
          behavior: 'hop_dampu',
          position: [1.5, 39.2],
          rotationY: Math.PI,
          duration: 8.0,
          dialogues: [
            'Sampai di Puncak Bulan Selatan! Sekarang kita putar balik menghadap Utara untuk kembali ke garis start!',
          ],
        },
      ],
      initialStageOffset: 1,
    });

    // --- 3. Kelompok Permainan Kelereng / Gundu (x = 14.5, z = 29.5) ---
    this.createArticulatedNPC({
      name: 'Bimo (Kelas 4A · Main Kelereng)',
      activity: 'Membidik & Menyentil Kelereng Gaco',
      role: 'siswa_putra',
      shirtHex: '#F8FAFC',
      pantsHex: '#881337',
      tieHex: '#DC2626',
      hatType: 'topi_sd',
      behavior: 'play_kelereng',
      position: [12.4, 29.5],
      rotationY: Math.PI / 2,
      dialogues: [
        'Fokus bidik kelereng di dalam segitiga... Ctik! Ayo klik tombol Misi Kelereng untuk adu sentil gundu bersamaku!',
      ],
      activitySchedule: [
        {
          activity: 'Membidik & Menyentil Kelereng Gaco',
          behavior: 'play_kelereng',
          position: [12.4, 29.5],
          rotationY: Math.PI / 2,
          duration: 9.5,
          dialogues: [
            'Fokus bidik kelereng kaca di tengah lingkaran... Ctik! Ayo ikut Misi Bermain Kelereng bersamaku dan Ciko!',
            'Main kelereng atau gundu di sebelah lapangan olahraga saat istirahat seru sekali! Berani adu akurasi sentilan?',
          ],
        },
        {
          activity: 'Sorak Gembira Kelereng Kena Sasaran',
          behavior: 'clap_cheer',
          position: [13.2, 31.3],
          rotationY: 2.5,
          duration: 8.0,
          dialogues: [
            'Asyik! Sentilan jariku berhasil mengeluarkan kelereng dari dalam lingkaran kapur! Ayo giliranmu mencoba Misi Kelereng!',
            'Klik tombol Kelereng di atas untuk membidik 7 kelereng kaca warna-warni!',
          ],
        },
        {
          activity: 'Menyusun Pasangan Kelereng di Lingkaran',
          behavior: 'play_kelereng',
          position: [14.5, 31.5],
          rotationY: Math.PI,
          duration: 8.5,
          dialogues: [
            'Ayo kita pasang lagi 7 kelereng warna-warni di garis segitiga tengah lingkaran untuk Misi Bermain Kelereng!',
          ],
        },
      ],
      initialStageOffset: 0,
    });

    this.createArticulatedNPC({
      name: 'Ciko (Kelas 4A · Lawan Main Kelereng)',
      activity: 'Menyentil Kelereng dari Sisi Timur',
      role: 'siswa_putra',
      shirtHex: '#D6B588',
      pantsHex: '#4E321B',
      tieHex: '#DC2626',
      hatType: 'baret',
      behavior: 'play_kelereng',
      position: [16.6, 29.5],
      rotationY: -Math.PI / 2,
      dialogues: [
        'Lihat kelereng gaco susu milikku ini! Ayo ikutan Misi Bermain Kelereng bersama kami!',
      ],
      activitySchedule: [
        {
          activity: 'Menyentil Kelereng dari Sisi Timur',
          behavior: 'play_kelereng',
          position: [16.6, 29.5],
          rotationY: -Math.PI / 2,
          duration: 9.0,
          dialogues: [
            'Lihat kelereng gaco biru milikku ini! Ctik! Langsung mengenai kelereng target di tengah! Ayo kamu coba juga!',
            'Permainan tradisional kelereng melatih konsentrasi dan ketangkasan jari tangan kita.',
          ],
        },
        {
          activity: 'Mengamati Posisi Kelereng Lawan',
          behavior: 'inspect_shelf',
          position: [15.8, 27.6],
          rotationY: -0.4,
          duration: 8.5,
          dialogues: [
            'Wah jarak kelereng di segitiga tengah pas sekali, ayo klik tombol Misi Kelereng untuk mulai membidik!',
          ],
        },
        {
          activity: 'Tepuk Tangan Seru Main Kelereng',
          behavior: 'clap_cheer',
          position: [16.4, 31.0],
          rotationY: -2.2,
          duration: 8.0,
          dialogues: [
            'Seru banget! Di sebelah lapangan olahraga kita bisa main Misi Kelereng, Dampu Bulan, dan Lompat Tali Karet!',
          ],
        },
      ],
      initialStageOffset: 1,
    });
  }

  public update(
    elapsed: number,
    delta: number,
    playerX: number,
    playerZ: number,
    soundEnabled = true,
    playerY = 0,
    _playerName = 'Budi Santoso',
    _genderStyle: 'putra' | 'putri' = 'putra'
  ): ActiveNPCDialogue | null {
    // 1. Animate Futsal Ball, Basketball & Target Reticle
    if (this.penaltyModeActive && this.activeMissionType === 'basket') {
      const bTarget = BASKET_ZONES[this.penaltyAimZone];
      this.penaltyTargetGroup.position.x = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.x,
        bTarget.targetX,
        14,
        delta
      );
      this.penaltyTargetGroup.position.y = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.y,
        bTarget.targetY,
        14,
        delta
      );
      this.penaltyTargetGroup.position.z = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.z,
        bTarget.targetZ,
        14,
        delta
      );
      const pulse = 1 + Math.sin(elapsed * 7.5) * 0.12;
      this.penaltyTargetGroup.scale.set(pulse, pulse, 1);

      if (this.penaltyShotState === 'idle') {
        this.basketballMesh.visible = true;
        this.basketballMesh.position.set(12.85, 2.35, 10.0);
        this.basketballMesh.rotation.set(0, 0, 0);
      } else if (this.penaltyShotState === 'flying') {
        this.basketballMesh.visible = true;
        this.penaltyShotTimer += delta;
        const flightDuration = 0.68;
        const progress = Math.min(1, this.penaltyShotTimer / flightDuration);

        const bx = THREE.MathUtils.lerp(
          this.penaltyBallStart.x,
          this.penaltyBallEnd.x,
          progress
        );
        const bz = THREE.MathUtils.lerp(
          this.penaltyBallStart.z,
          this.penaltyBallEnd.z,
          progress
        );
        // High parabolic basketball shot arc
        const arcHeight = Math.sin(progress * Math.PI) * 3.35;
        const by =
          THREE.MathUtils.lerp(this.penaltyBallStart.y, this.penaltyBallEnd.y, progress) +
          arcHeight;

        this.basketballMesh.position.set(bx, Math.max(0.4, by), bz);
        this.basketballMesh.rotation.z -= delta * 18.0;
        this.basketballMesh.rotation.x += delta * 8.0;

        if (progress >= 1) {
          this.penaltyShotState = 'rebound';
          this.penaltyShotTimer = 0;
          if (this.penaltyLastOutcome === 'goal') {
            soundFX.playGoalCheer(soundEnabled);
          } else {
            soundFX.playKeeperSave(soundEnabled);
          }
        }
      } else if (this.penaltyShotState === 'rebound') {
        this.basketballMesh.visible = true;
        this.penaltyShotTimer += delta;
        const rebProgress = Math.min(1, this.penaltyShotTimer / 0.85);

        if (this.penaltyLastOutcome === 'goal') {
          // Swish straight down through the net (first 30% of rebound), then bounce on the court
          if (rebProgress < 0.32) {
            const netP = rebProgress / 0.32;
            this.basketballMesh.position.set(
              22.75,
              THREE.MathUtils.lerp(7.55, 5.85, netP),
              10.0
            );
          } else {
            const dropP = (rebProgress - 0.32) / 0.68;
            const bounce = Math.abs(Math.sin(dropP * Math.PI * 2.2)) * (1 - dropP) * 1.35;
            const by = THREE.MathUtils.lerp(5.85, 0.4, Math.min(1, dropP * 1.45)) + bounce;
            const bx = THREE.MathUtils.lerp(22.75, this.penaltyBallRebound.x, dropP);
            const bz = THREE.MathUtils.lerp(10.0, this.penaltyBallRebound.z, dropP);
            this.basketballMesh.position.set(bx, Math.max(0.4, by), bz);
          }
        } else {
          const bx = THREE.MathUtils.lerp(
            this.penaltyBallEnd.x,
            this.penaltyBallRebound.x,
            rebProgress
          );
          const bz = THREE.MathUtils.lerp(
            this.penaltyBallEnd.z,
            this.penaltyBallRebound.z,
            rebProgress
          );
          const bounce = Math.abs(Math.sin(rebProgress * Math.PI * 2.5)) * (1 - rebProgress) * 1.4;
          const by =
            THREE.MathUtils.lerp(this.penaltyBallEnd.y, 0.4, Math.min(1, rebProgress * 1.35)) +
            bounce;
          this.basketballMesh.position.set(bx, Math.max(0.4, by), bz);
          this.basketballMesh.rotation.z += delta * 8.0 * (1 - rebProgress);
        }
      }
    } else if (this.penaltyModeActive) {
      const targetInfo = PENALTY_ZONES[this.penaltyAimZone];
      this.penaltyTargetGroup.position.x = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.x,
        -21.35,
        14,
        delta
      );
      this.penaltyTargetGroup.position.y = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.y,
        targetInfo.targetY,
        14,
        delta
      );
      this.penaltyTargetGroup.position.z = THREE.MathUtils.damp(
        this.penaltyTargetGroup.position.z,
        targetInfo.targetZ,
        14,
        delta
      );
      const pulse = 1 + Math.sin(elapsed * 7.5) * 0.12;
      this.penaltyTargetGroup.scale.set(pulse, pulse, 1);

      if (this.penaltyShotState === 'idle') {
        this.futsalBallMesh.position.set(-9.8, 0.38, 10.0);
        this.futsalBallMesh.rotation.set(0, 0, 0);
      } else if (this.penaltyShotState === 'flying') {
        this.penaltyShotTimer += delta;
        const flightDuration = 0.52;
        const progress = Math.min(1, this.penaltyShotTimer / flightDuration);

        const bx = THREE.MathUtils.lerp(
          this.penaltyBallStart.x,
          this.penaltyBallEnd.x,
          progress
        );
        const bz = THREE.MathUtils.lerp(
          this.penaltyBallStart.z,
          this.penaltyBallEnd.z,
          progress
        );
        const arcHeight = Math.sin(progress * Math.PI) * 1.35;
        const by =
          THREE.MathUtils.lerp(this.penaltyBallStart.y, this.penaltyBallEnd.y, progress) +
          arcHeight * (1 - progress * 0.35);

        this.futsalBallMesh.position.set(bx, Math.max(0.38, by), bz);
        this.futsalBallMesh.rotation.x -= delta * 22.0;
        this.futsalBallMesh.rotation.z += delta * 18.0;

        if (progress >= 1) {
          this.penaltyShotState = 'rebound';
          this.penaltyShotTimer = 0;
          if (this.penaltyLastOutcome === 'goal') {
            soundFX.playGoalCheer(soundEnabled);
          } else {
            soundFX.playKeeperSave(soundEnabled);
          }
        }
      } else if (this.penaltyShotState === 'rebound') {
        this.penaltyShotTimer += delta;
        const rebProgress = Math.min(1, this.penaltyShotTimer / 0.85);
        const bx = THREE.MathUtils.lerp(
          this.penaltyBallEnd.x,
          this.penaltyBallRebound.x,
          rebProgress
        );
        const bz = THREE.MathUtils.lerp(
          this.penaltyBallEnd.z,
          this.penaltyBallRebound.z,
          rebProgress
        );
        const bounce = Math.abs(Math.sin(rebProgress * Math.PI * 2.5)) * (1 - rebProgress) * 0.8;
        const by =
          THREE.MathUtils.lerp(this.penaltyBallEnd.y, 0.38, Math.min(1, rebProgress * 1.4)) +
          bounce;
        this.futsalBallMesh.position.set(bx, Math.max(0.38, by), bz);
        this.futsalBallMesh.rotation.z += delta * 6.0 * (1 - rebProgress);
      }
    } else {
      const ballX = Math.sin(elapsed * 1.45) * 14.5;
      const ballZ = 10.0 + Math.cos(elapsed * 2.1) * 5.2;
      const ballBounce = Math.abs(Math.sin(elapsed * 6.5)) * 0.45;
      this.futsalBallMesh.position.set(ballX, 0.38 + ballBounce, ballZ);
      this.futsalBallMesh.rotation.x += delta * 5.0;
      this.futsalBallMesh.rotation.z -= delta * 4.2;
      this.basketballMesh.visible = false;
    }

    // 1B. Animate 3D School Trash Items & 4 Sorting Bins for Principal's Cleanup Mission (Manual Pickup Only!)
    if (this.cleanupStage === 'collecting') {
      const pulse = 1 + Math.sin(elapsed * 5.5) * 0.14;
      const nearPulse = 1.32 + Math.sin(elapsed * 11.0) * 0.22;
      this.trashNodeMap.forEach((node, id) => {
        if (this.collectedTrashSet.has(id)) {
          node.group.visible = false;
          return;
        }
        node.group.visible = true;
        const dist = Math.hypot(playerX - node.info.pos[0], playerZ - node.info.pos[1]);
        const isInPickupRange = dist <= 4.2;
        node.mesh.position.y =
          (isInPickupRange ? 0.48 : 0.36) +
          Math.abs(Math.sin(elapsed * (isInPickupRange ? 6.5 : 3.8) + node.info.pos[0])) * 0.16;
        node.mesh.rotation.y += delta * (isInPickupRange ? 4.5 : 2.2);
        const s = isInPickupRange ? nearPulse : pulse;
        node.ring.scale.set(s, s, 1);
      });
    } else if (this.cleanupStage === 'sorting') {
      if (this.binOpenTimer > 0) {
        this.binOpenTimer = Math.max(0, this.binOpenTimer - delta);
        if (this.binOpenTimer <= 0) {
          this.activeOpenBin = null;
        }
      }
      this.binLidMap.forEach((lidPivot, catId) => {
        const targetOpenRx = this.activeOpenBin === catId ? 1.18 : 0;
        lidPivot.rotation.x = THREE.MathUtils.damp(lidPivot.rotation.x, targetOpenRx, 14, delta);
      });

      if (this.trashThrowActive) {
        this.trashThrowTimer += delta;
        const duration = 0.55;
        const p = Math.min(1, this.trashThrowTimer / duration);
        const tx = THREE.MathUtils.lerp(this.trashThrowStart.x, this.trashThrowEnd.x, p);
        const tz = THREE.MathUtils.lerp(this.trashThrowStart.z, this.trashThrowEnd.z, p);
        const arc = Math.sin(p * Math.PI) * 2.15;
        const ty = THREE.MathUtils.lerp(this.trashThrowStart.y, this.trashThrowEnd.y, p) + arc;
        this.thrownTrashGroup.position.set(tx, ty, tz);
        this.thrownTrashMesh.rotation.x += delta * 14;
        this.thrownTrashMesh.rotation.z += delta * 11;

        if (p >= 1) {
          this.trashThrowActive = false;
          this.thrownTrashGroup.visible = false;
          if (this.trashLastSortCorrect) {
            soundFX.playGoalCheer(soundEnabled);
          } else {
            soundFX.playKeeperSave(soundEnabled);
          }
        }
      }
    } else {
      this.binLidMap.forEach((lidPivot) => {
        lidPivot.rotation.x = THREE.MathUtils.damp(lidPivot.rotation.x, 0, 10, delta);
      });
    }

    if (this.mathFeedbackTimer > 0) {
      this.mathFeedbackTimer = Math.max(0, this.mathFeedbackTimer - delta);
    }

    // 1C. Animate 3D Traditional Indonesian Games Props beside Lapangan Olahraga (Lompat Tali, Dampu Bulan, Kelereng)
    if (this.jumpRopePivot) {
      const ropeMult = this.jumpRopeMissionActive ? this.jumpRopeSpeedMultiplier : 1.0;
      this.jumpRopePivot.rotation.x += delta * 5.2 * ropeMult;
    }
    if (this.dampuGacoGroup) {
      if (this.dampuMissionActive) {
        if (this.dampuGacoThrowActive) {
          this.dampuGacoThrowTimer += delta;
          const p = Math.min(1, this.dampuGacoThrowTimer / 0.45);
          const gx = THREE.MathUtils.lerp(this.dampuGacoStart.x, this.dampuGacoEnd.x, p);
          const gz = THREE.MathUtils.lerp(this.dampuGacoStart.z, this.dampuGacoEnd.z, p);
          const gy =
            THREE.MathUtils.lerp(this.dampuGacoStart.y, this.dampuGacoEnd.y, p) +
            Math.sin(p * Math.PI) * 1.45;
          this.dampuGacoGroup.position.set(gx, gy, gz);
          if (p >= 1) {
            this.dampuGacoThrowActive = false;
          }
        }
      } else {
        // Slide Gaco token progressively North -> South along the South-facing Dampu Bulan squares (Petak 1 -> 8 -> Puncak Bulan)
        const dampuStops: [number, number][] = [
          [0, -5.5],
          [0, -3.3],
          [0, -1.1],
          [1.22, 1.1],
          [-1.22, 1.1],
          [0, 3.3],
          [1.22, 5.5],
          [0, 7.65],
        ];
        const stopIdx = Math.floor(elapsed * 0.45) % dampuStops.length;
        const targetStop = dampuStops[stopIdx];
        this.dampuGacoGroup.position.x = THREE.MathUtils.damp(
          this.dampuGacoGroup.position.x,
          targetStop[0],
          8,
          delta
        );
        this.dampuGacoGroup.position.y = 0.012;
        this.dampuGacoGroup.position.z = THREE.MathUtils.damp(
          this.dampuGacoGroup.position.z,
          targetStop[1],
          8,
          delta
        );
      }
    }
    if (this.kelerengShooterA && this.kelerengShooterB) {
      if (this.kelerengMissionActive) {
        if (this.kelerengShotActive) {
          this.kelerengShotTimer += delta;
          const p = Math.min(1, this.kelerengShotTimer / 0.42);
          this.kelerengShooterA.position.x = THREE.MathUtils.lerp(
            this.kelerengGacoStart.x,
            this.kelerengGacoEnd.x,
            p
          );
          this.kelerengShooterA.position.z = THREE.MathUtils.lerp(
            this.kelerengGacoStart.z,
            this.kelerengGacoEnd.z,
            p
          );
          if (p >= 1) {
            this.kelerengShotActive = false;
            if (this.kelerengShotHit) {
              soundFX.playGoalCheer(soundEnabled);
            }
          }
        } else {
          this.kelerengShooterA.position.x = THREE.MathUtils.damp(
            this.kelerengShooterA.position.x,
            0,
            8,
            delta
          );
          this.kelerengShooterA.position.z = THREE.MathUtils.damp(
            this.kelerengShooterA.position.z,
            2.05,
            8,
            delta
          );
        }

        // Smoothly slide knocked-out target marbles outside the chalk ring
        for (let mIdx = 0; mIdx < this.kelerengTargetMarbles.length; mIdx++) {
          const m = this.kelerengTargetMarbles[mIdx];
          const goalX = m.knockedOut ? m.knockOutX : m.homeX;
          const goalZ = m.knockedOut ? m.knockOutZ : m.homeZ;
          m.mesh.position.x = THREE.MathUtils.damp(m.mesh.position.x, goalX, 10, delta);
          m.mesh.position.z = THREE.MathUtils.damp(m.mesh.position.z, goalZ, 10, delta);
        }
      } else {
        const cycleA = (elapsed * 1.15) % 2.0;
        const pA = cycleA < 1.0 ? cycleA : 2.0 - cycleA;
        this.kelerengShooterA.position.x = THREE.MathUtils.lerp(-1.35, 0.32, pA);
        this.kelerengShooterA.position.z = Math.sin(elapsed * 2.3) * 0.28;

        const cycleB = ((elapsed + 0.9) * 1.15) % 2.0;
        const pB = cycleB < 1.0 ? cycleB : 2.0 - cycleB;
        this.kelerengShooterB.position.x = THREE.MathUtils.lerp(1.35, -0.32, pB);
        this.kelerengShooterB.position.z = Math.cos(elapsed * 2.1) * 0.28;
      }
    }

    // 1F. Animate Street Traffic (Cars & Motorcycles) + Zebra Cross Braking Logic
    if (this.crossingActionTimer > 0) {
      this.crossingActionTimer = Math.max(0, this.crossingActionTimer - delta);
      if (this.crossingActionTimer === 0) {
        this.crossingTrafficStopped = false;
      }
    }

    if (this.tonoActionTimer > 0) {
      this.tonoActionTimer = Math.max(0, this.tonoActionTimer - delta);
    }

    // Check if any pedestrian NPC is currently on the 24-unit Zebra Cross roadway (z between 65.0 and 89.0, |x| < 5.5)
    let pedestrianOnZebra = this.crossingTrafficStopped;
    if (!pedestrianOnZebra) {
      for (let i = 0; i < this.npcs.length; i++) {
        const p = this.npcs[i].group.position;
        if (Math.abs(p.x) < 5.2 && p.z > 65.0 && p.z < 89.0) {
          pedestrianOnZebra = true;
          break;
        }
      }
    }

    if (this.crossingStopSignGroup && this.crossingMissionActive) {
      const targetSignY = this.crossingTrafficStopped ? 0.85 : 0.0;
      this.crossingStopSignGroup.position.y = THREE.MathUtils.damp(
        this.crossingStopSignGroup.position.y,
        targetSignY,
        12,
        delta
      );
    }

    for (let i = 0; i < this.streetVehicles.length; i++) {
      const v = this.streetVehicles[i];
      const vx = v.group.position.x;
      const halfLen = v.length * 0.5;
      let shouldBrake = false;

      // Stop cleanly before the Zebra Cross yellow stop line (x = ±5.8) when traffic is stopped or pedestrian is crossing
      if (pedestrianOnZebra) {
        if (v.dir === -1 && vx - halfLen > 6.2 && vx - halfLen < 36.0) {
          shouldBrake = true;
        } else if (v.dir === 1 && vx + halfLen < -6.2 && vx + halfLen > -36.0) {
          shouldBrake = true;
        }
      }

      // Also avoid colliding with another vehicle ahead in the same sub-lane
      for (let j = 0; j < this.streetVehicles.length; j++) {
        if (i === j) continue;
        const other = this.streetVehicles[j];
        if (other.dir !== v.dir || Math.abs(other.laneZ - v.laneZ) > 2.4) continue;
        const distAhead = (other.group.position.x - vx) * v.dir;
        const minGap = (v.length + other.length) * 0.5 + 5.5;
        if (distAhead > 0 && distAhead < minGap) {
          shouldBrake = true;
          break;
        }
      }

      const targetSpeed = shouldBrake ? 0 : v.speed;
      v.currentSpeed = THREE.MathUtils.damp(v.currentSpeed, targetSpeed, shouldBrake ? 12 : 5, delta);
      const prevX = v.group.position.x;
      const nextX = prevX + v.dir * v.currentSpeed * delta;
      v.group.position.x = nextX;

      // Trigger synchronized 3D spatial engine + horn pass-by sound when a moving vehicle crosses playerX
      if (
        v.currentSpeed > 4.0 &&
        (prevX - playerX) * (nextX - playerX) <= 0 &&
        Math.abs(nextX - prevX) < 12.0
      ) {
        const distToPlayer = Math.hypot(playerX - nextX, playerZ - v.laneZ);
        if (distToPlayer < 48.0) {
          const isMoto = v.length < 6.0;
          const withHorn = distToPlayer < 28.0 && Math.random() < 0.32;
          soundFX.triggerVehiclePassBySound(
            isMoto ? 'moto' : 'car',
            distToPlayer,
            v.dir,
            withHorn,
            soundEnabled
          );
        }
      }

      // Wrap around at ends of the 270-unit road (x = ±132)
      if (v.dir === 1 && v.group.position.x > 132) {
        v.group.position.x = -132;
      } else if (v.dir === -1 && v.group.position.x < -132) {
        v.group.position.x = 132;
      }

      // Spin wheels proportional to linear speed and wheel radius
      const wheelSpin = v.currentSpeed * delta * 1.45;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.x += wheelSpin;
      }
    }

    let closestActiveDialogue: ActiveNPCDialogue | null = null;
    let closestNpcRef: NPCInstance | null = null;
    const VOICE_MIN_DIST = 2.4;
    const PROXIMITY_RADIUS = 15.0;

    // 2. Update all NPCs multi-stage schedules, walking transitions, kinematics & proximity speech bubbles
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const t = elapsed + npc.phaseOffset;

      if (npc.eyesGroup) {
        const blinkCycle = ((elapsed + npc.phaseOffset * 1.7) * 0.92) % 3.9;
        const targetEyeScaleY = blinkCycle > 3.75 ? 0.12 : 1.0;
        npc.eyesGroup.scale.y = THREE.MathUtils.damp(
          npc.eyesGroup.scale.y,
          targetEyeScaleY,
          24,
          delta
        );
      }

      // Opening Flag Ceremony (Upacara Bendera Merah Putih — Lagu Indonesia Raya)
      if (this.openingCeremonyActive) {
        const slot = this.ceremonySlots.get(npc);
        if (slot) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, slot.x, 12, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, slot.z, 12, delta);
          npc.group.rotation.y = slot.rotY;
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);

          const isFlagStillRising = this.ceremonyFlagProgress < 0.992;
          const lookUpAngle = -0.14 - this.ceremonyFlagProgress * 0.24;

          if (
            (slot.ceremonyRole === 'paskibra_left' || slot.ceremonyRole === 'paskibra_right') &&
            isFlagStillRising
          ) {
            // Synchronized hand-over-hand rope pulling (mengerek tali bendera) in rhythm with Indonesia Raya (112 BPM)
            const pullPhase =
              elapsed * 3.73 + (slot.ceremonyRole === 'paskibra_left' ? 0 : Math.PI);
            const leftPull = Math.sin(pullPhase) * 0.48;
            const rightPull = Math.cos(pullPhase) * 0.48;
            npc.leftArm.rotation.set(-2.05 + leftPull, 0, 0.16);
            npc.rightArm.rotation.set(-2.05 + rightPull, 0, -0.16);
            npc.head.rotation.set(lookUpAngle, 0, 0);
          } else {
            // Crisp Indonesian Flag Salute (Hormat Bendera Merah Putih: right hand raised to temple/cap visor)
            npc.rightArm.rotation.set(-2.38, 0, 0.38);
            npc.leftArm.rotation.set(0, 0, 0);
            npc.head.rotation.set(
              slot.ceremonyRole === 'teacher_salute' ? -0.1 : lookUpAngle * 0.65,
              0,
              0
            );
          }

          if (npc.labelSprite) {
            npc.labelSprite.visible =
              slot.ceremonyRole === 'paskibra_center' ||
              slot.ceremonyRole === 'paskibra_left' ||
              slot.ceremonyRole === 'paskibra_right' ||
              npc.role === 'kepsek';
          }
          continue;
        }
      }

      // Special positioning for Pak Joko (Satpam) and Crossing Students during Misi Seberang Jalan
      if (
        this.crossingMissionActive &&
        (npc.role === 'satpam' || npc.name.includes('Siswa Penyeberang'))
      ) {
        if (npc.role === 'satpam') {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 4.8, 10, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 63.6, 10, delta);
          npc.group.rotation.y = 0;
          const wave = Math.sin(t * 7.5) * 0.35;
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 4.5)) * 0.04;
          npc.hips.rotation.set(0, 0, 0);
          npc.rightArm.rotation.set(
            this.crossingTrafficStopped ? -2.65 : -1.85 + wave,
            0,
            -0.22
          );
          npc.leftArm.rotation.set(-0.65, 0, 0.15);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Komandan Misi Menyebrangkan Siswa di Zebra Cross',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.2,
            voiceVolume: 0.95,
          };
          continue;
        }

        // Dika & Rani (Siswa Penyeberang) walking across the 24-unit Zebra Cross (z = 90.4 -> 62.6)
        const isDika = npc.name.includes('Dika');
        const laneX = isDika ? -1.3 : 1.3;
        npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, laneX, 10, delta);
        npc.group.position.y = 0;
        if (this.crossingActionTimer > 0 && this.crossingWaveSuccess) {
          const progress = 1.0 - this.crossingActionTimer / 1.65;
          npc.group.position.z = THREE.MathUtils.lerp(90.4, 62.6, Math.min(1, progress));
          npc.group.rotation.y = Math.PI;
          const walkSwing = Math.sin(elapsed * 14.0 + (isDika ? 0 : Math.PI)) * 0.65;
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(elapsed * 14.0)) * 0.07;
          npc.leftLeg.rotation.set(walkSwing, 0, 0);
          npc.rightLeg.rotation.set(-walkSwing, 0, 0);
          npc.leftArm.rotation.set(-walkSwing * 0.7, 0, 0);
          npc.rightArm.rotation.set(walkSwing * 0.7, 0, 0);
        } else {
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 90.4, 8, delta);
          npc.group.rotation.y = Math.PI;
          const wave = Math.sin(t * 6.5) * 0.25;
          npc.hips.position.y = 1.22;
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          npc.rightArm.rotation.set(-1.7 + wave, 0, -0.2);
          npc.leftArm.rotation.set(0, 0, 0);
        }
        continue;
      }

      // Special positioning for Laras (Duta Adiwiyata) when Ecobrick is scattered by wind or during Ecobrick Puzzle Mission
      if (
        (this.ecobrickMissionActive || this.ecobrickIsScattered) &&
        npc.name.includes('Laras')
      ) {
        npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 21.4, 10, delta);
        npc.group.position.y = 0;
        npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 50.2, 10, delta);
        npc.group.rotation.y = -0.45;
        const clap = Math.abs(Math.sin(t * 7.8));
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.2)) * 0.06;
        npc.hips.rotation.set(0, 0, 0);
        if (this.ecobrickMissionActive) {
          npc.leftArm.rotation.set(-1.38, 0, -0.14 - clap * 0.28);
          npc.rightArm.rotation.set(-1.38, 0, 0.14 + clap * 0.28);
        } else {
          // Waving / calling the player over to help tidy up the wind-blown Ecobricks!
          const wave = Math.sin(t * 7.5) * 0.35;
          npc.rightArm.rotation.set(-1.95 + wave, 0, -0.25);
          npc.leftArm.rotation.set(-0.75, 0, 0.18);
        }
        npc.leftLeg.rotation.set(0, 0, 0);
        npc.rightLeg.rotation.set(0, 0, 0);
        if (this.ecobrickMissionActive) {
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Pemandu Misi Menyusun Puzzle Ecobrick I LOVE SUGA',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.2,
            voiceVolume: 0.94,
          };
          continue;
        }
      }

      // Special positioning and animations for Tono & Vendors during Misi Jajan Tono
      if (
        this.tonoMissionActive &&
        (npc.name.includes('Tono') || npc.role === 'pedagang')
      ) {
        if (npc.name.includes('Tono')) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 14.5, 10, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 61.5, 10, delta);
          npc.group.rotation.y = 0; // facing South toward Mang Asep & Bang Udin's pushcarts

          if (this.tonoActionTimer > 0 && this.tonoMissionSuccess) {
            // Happy jump & clap holding snacks
            const clap = Math.abs(Math.sin(t * 8.5));
            npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 6.5)) * 0.12;
            npc.hips.rotation.set(0, 0, 0);
            npc.leftArm.rotation.set(-1.42, 0, -0.15 - clap * 0.32);
            npc.rightArm.rotation.set(-1.42, 0, 0.15 + clap * 0.32);
            npc.leftLeg.rotation.set(0, 0, 0);
            npc.rightLeg.rotation.set(0, 0, 0);
          } else {
            // Puzzled / scratching head thinking about money & change
            npc.hips.position.y = 1.22 + Math.sin(t * 2.0) * 0.02;
            npc.head.rotation.set(0, 0, 0.18 + Math.sin(t * 1.5) * 0.08);
            npc.rightArm.rotation.set(-2.45 + Math.sin(t * 4.2) * 0.15, 0, 0.32); // scratching cap/head
            npc.leftArm.rotation.set(-0.95, 0, -0.18); // holding pocket / coins
            npc.leftLeg.rotation.set(0, 0, 0);
            npc.rightLeg.rotation.set(0, 0, 0);
          }

          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Sahabat Misi Hitung Uang Jajan & Kembalian',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.2,
            voiceVolume: 0.95,
          };
          continue;
        } else if (npc.role === 'pedagang') {
          // Food cart vendors wave and smile serving snacks
          const wave = Math.sin(t * 4.5) * 0.25;
          npc.rightArm.rotation.set(-1.25 + wave, 0, 0.15);
          npc.leftArm.rotation.set(-0.45, 0, 0);
          npc.hips.position.y = 1.22;
        }
      }

      // Special positioning for Bimo & Ciko during Kelereng / Gundu Mission
      if (
        this.kelerengMissionActive &&
        (npc.name.includes('Bimo') || npc.name.includes('Ciko'))
      ) {
        const isBimo = npc.name.includes('Bimo');
        const sideX = isBimo ? 12.1 : 16.9;
        npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, sideX, 10, delta);
        npc.group.position.y = 0;
        npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 29.5, 10, delta);
        npc.group.rotation.y = isBimo ? Math.PI / 2 : -Math.PI / 2;
        const clap = Math.abs(Math.sin(t * 8.0));
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.2)) * 0.06;
        npc.hips.rotation.set(0, 0, 0);
        npc.leftArm.rotation.set(-1.38, 0, -0.14 - clap * 0.28);
        npc.rightArm.rotation.set(-1.38, 0, 0.14 + clap * 0.28);
        npc.leftLeg.rotation.set(0, 0, 0);
        npc.rightLeg.rotation.set(0, 0, 0);
        if (isBimo) {
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Wasit & Lawan Misi Bermain Kelereng',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.1,
            voiceVolume: 0.92,
          };
        }
        continue;
      }

      // Special positioning for Intan, Dewi & Kartika during Lompat Tali Karet Mission
      if (
        this.jumpRopeMissionActive &&
        (npc.name.includes('Intan') ||
          (npc.name.includes('Dewi') && npc.name.includes('Pemutar Tali')) ||
          npc.name.includes('Kartika'))
      ) {
        if (npc.name.includes('Kartika')) {
          // Move Kartika slightly behind the rope to cheer for the player jumping at (-12.5, 29.5)
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, -12.5, 10, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 26.6, 10, delta);
          npc.group.rotation.y = 0;
          const clap = Math.abs(Math.sin(t * 8.2));
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.4)) * 0.06;
          npc.hips.rotation.set(0, 0, 0);
          npc.leftArm.rotation.set(-1.38, 0, -0.14 - clap * 0.28);
          npc.rightArm.rotation.set(-1.38, 0, 0.14 + clap * 0.28);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          continue;
        }
        const isIntan = npc.name.includes('Intan');
        const turnX = isIntan ? -9.2 : -15.8;
        npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, turnX, 10, delta);
        npc.group.position.y = 0;
        npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 29.5, 10, delta);
        npc.group.rotation.y = isIntan ? -Math.PI / 2 : Math.PI / 2;
        const swingSpeed = 5.2 * this.jumpRopeSpeedMultiplier;
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(elapsed * swingSpeed)) * 0.05;
        npc.hips.rotation.set(0, 0, 0);
        npc.leftArm.rotation.set(-1.2 + Math.sin(elapsed * swingSpeed) * 0.55, 0, -0.18);
        npc.rightArm.rotation.set(-1.2 + Math.cos(elapsed * swingSpeed) * 0.55, 0, 0.18);
        npc.leftLeg.rotation.set(0, 0, 0);
        npc.rightLeg.rotation.set(0, 0, 0);
        if (isIntan) {
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Pemutar Tali & Penguji Misi Lompat Tali',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.3,
            voiceVolume: 0.92,
          };
        }
        continue;
      }

      // Special positioning for Wulan & Mentari beside the South-facing Dampu Bulan court during Dampu Mission
      if (
        this.dampuMissionActive &&
        (npc.name.includes('Wulan') || npc.name.includes('Mentari'))
      ) {
        const isWulan = npc.name.includes('Wulan');
        const sideX = isWulan ? -2.3 : 5.3;
        const sideZ = isWulan ? 30.8 : 32.8;
        npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, sideX, 10, delta);
        npc.group.position.y = 0;
        npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, sideZ, 10, delta);
        npc.group.rotation.y = isWulan ? Math.PI / 2 : -Math.PI / 2;
        const clap = Math.abs(Math.sin(t * 8.0));
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.2)) * 0.06;
        npc.hips.rotation.set(0, 0, 0);
        npc.leftArm.rotation.set(-1.38, 0, -0.14 - clap * 0.28);
        npc.rightArm.rotation.set(-1.38, 0, 0.14 + clap * 0.28);
        npc.leftLeg.rotation.set(0, 0, 0);
        npc.rightLeg.rotation.set(0, 0, 0);
        if (isWulan) {
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Wasit & Teman Misi Dampu Bulan',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.4,
            voiceVolume: 0.9,
          };
        }
        continue;
      }

      // Special positioning for Bu Maya, S.Pd. (Guru Kelas 1) during Grade 1 Mathematics Mission
      if (npc.name.includes('Bu Maya')) {
        if (this.mathMissionActive) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, -60.8, 10, delta);
          npc.group.position.y = 0.45;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, -20.2, 10, delta);
          npc.group.rotation.y = 0.72;
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          if (this.mathFeedbackTimer > 0 && this.mathLastAnswerCorrect === true) {
            const clap = Math.abs(Math.sin(t * 8.5));
            npc.leftArm.rotation.set(-1.4, 0, -0.15 - clap * 0.32);
            npc.rightArm.rotation.set(-1.4, 0, 0.15 + clap * 0.32);
          } else {
            npc.leftArm.rotation.set(-0.45, 0, 0);
            npc.rightArm.rotation.set(-1.85 + Math.sin(t * 3.8) * 0.25, 0, 0.2);
          }
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Penguji Misi Matematika Kelas 1 SD',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 3.6,
            voiceVolume: 0.92,
          };
          continue;
        }
      }

      // Special positioning for Principal Bpk. Drs. Hendra beside Ruangan Kantin during Cleanup & Waste Sorting Mission
      if (npc.role === 'kepsek') {
        if (this.cleanupStage !== 'inactive') {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 24.2, 10, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 44.8, 10, delta);
          npc.group.rotation.y = 0.55;
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          if (this.cleanupStage === 'sorting' && this.binOpenTimer > 0 && this.trashLastSortCorrect) {
            const clap = Math.abs(Math.sin(t * 8.0));
            npc.leftArm.rotation.set(-1.4, 0, -0.15 - clap * 0.3);
            npc.rightArm.rotation.set(-1.4, 0, 0.15 + clap * 0.3);
          } else {
            npc.leftArm.rotation.set(-0.45, 0, 0);
            npc.rightArm.rotation.set(-1.75 + Math.sin(t * 3.5) * 0.25, 0, 0);
          }
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity:
              this.cleanupStage === 'collecting'
                ? 'Memimpin Misi Pungut Sampah Sekolah'
                : 'Penilai Pemilahan Sampah 4 Warna',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 4.2,
            voiceVolume: 0.9,
          };
          continue;
        } else {
          npc.group.position.y = npc.group.position.z < -34.0 ? 0.45 : 0;
        }
      }

      // Special positioning & animation for Pak Budi and Futsal Players during Obstacle Run Mission
      if (this.obstacleCourseActive) {
        if (npc.name.includes('Pak Budi')) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 0.0, 10, delta);
          npc.group.position.y = 0;
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 10.0, 10, delta);
          npc.group.rotation.y = 0; // facing South toward the running track
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          const clap = Math.abs(Math.sin(t * 7.5));
          npc.leftArm.rotation.set(-1.4, 0, -0.15 - clap * 0.3);
          npc.rightArm.rotation.set(-1.4, 0, 0.15 + clap * 0.3);
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Penguji Ujian Lari Rintangan PJOK',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 4.5,
            voiceVolume: 0.95,
          };
          continue;
        } else if (npc.behavior === 'futsal_player') {
          // Cheering sideline classmates
          const clap = Math.abs(Math.sin(t * 6.5));
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 4.5)) * 0.05;
          npc.leftArm.rotation.set(-1.35, 0, -0.12 - clap * 0.28);
          npc.rightArm.rotation.set(-1.35, 0, 0.12 + clap * 0.28);
          continue;
        }
      }

      // Special positioning & animation for Goalkeeper Kevin, Pak Budi, and Futsal Players during PJOK Mini-Games
      if (this.penaltyModeActive && this.activeMissionType === 'basket') {
        if (npc.name.includes('Pak Budi')) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, 15.6, 10, delta);
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 4.5, 10, delta);
          npc.group.rotation.y = 0.35;
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          if (this.penaltyShotState !== 'idle' && this.penaltyLastOutcome === 'goal') {
            const clap = Math.abs(Math.sin(t * 8.0));
            npc.leftArm.rotation.set(-1.4, 0, -0.15 - clap * 0.3);
            npc.rightArm.rotation.set(-1.4, 0, 0.15 + clap * 0.3);
          } else {
            npc.leftArm.rotation.set(-0.5, 0, 0);
            npc.rightArm.rotation.set(-1.8 + Math.sin(t * 3.5) * 0.25, 0, 0);
          }
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Penguji Ujian Praktik Basket PJOK',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 4.5,
            voiceVolume: 0.9,
          };
          continue;
        } else if (npc.behavior === 'futsal_player') {
          const sideX = npc.name.includes('Rizky') ? 14.0 : 18.2;
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, sideX, 8, delta);
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 15.8, 8, delta);
          npc.group.rotation.y = Math.PI;
          const clap = Math.abs(Math.sin(t * 7.5));
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.0)) * 0.06;
          npc.leftArm.rotation.set(-1.35, 0, -0.12 - clap * 0.28);
          npc.rightArm.rotation.set(-1.35, 0, 0.12 + clap * 0.28);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          continue;
        }
      } else if (this.penaltyModeActive) {
        if (npc.name.includes('Kevin')) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, -20.6, 12, delta);
          npc.group.rotation.y = Math.PI / 2;
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);

          if (this.penaltyShotState === 'idle') {
            const readySwayZ = 10.0 + Math.sin(elapsed * 3.8) * 0.85;
            npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, readySwayZ, 10, delta);
            npc.hips.position.y = 1.12 + Math.abs(Math.sin(elapsed * 6.0)) * 0.08;
            npc.hips.rotation.set(0, 0, 0);
            npc.leftArm.rotation.set(-0.85, 0, 0.45);
            npc.rightArm.rotation.set(-0.85, 0, -0.45);
          } else {
            npc.group.position.z = THREE.MathUtils.damp(
              npc.group.position.z,
              this.keeperDiveTargetZ,
              14,
              delta
            );
            npc.hips.position.y = THREE.MathUtils.damp(
              npc.hips.position.y,
              this.keeperDiveTargetY,
              14,
              delta
            );
            npc.hips.rotation.z = THREE.MathUtils.damp(
              npc.hips.rotation.z,
              this.keeperDiveRoll,
              14,
              delta
            );
            npc.leftArm.rotation.set(-2.75, 0, 0.25);
            npc.rightArm.rotation.set(-2.75, 0, -0.25);
          }
          continue;
        } else if (npc.name.includes('Pak Budi')) {
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, -9.5, 10, delta);
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 4.4, 10, delta);
          npc.group.rotation.y = -0.35;
          npc.hips.position.y = 1.22;
          npc.hips.rotation.set(0, 0, 0);
          if (this.penaltyShotState !== 'idle' && this.penaltyLastOutcome === 'goal') {
            const clap = Math.abs(Math.sin(t * 8.0));
            npc.leftArm.rotation.set(-1.4, 0, -0.15 - clap * 0.3);
            npc.rightArm.rotation.set(-1.4, 0, 0.15 + clap * 0.3);
          } else {
            npc.leftArm.rotation.set(-0.5, 0, 0);
            npc.rightArm.rotation.set(-1.8 + Math.sin(t * 3.5) * 0.25, 0, 0);
          }
          closestNpcRef = npc;
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: 'Penguji Ujian Praktik Penalti PJOK',
            role: npc.role,
            message: npc.currentDialogue,
            distance: 4.5,
            voiceVolume: 0.9,
          };
          continue;
        } else if (npc.behavior === 'futsal_player') {
          const sideX = npc.name.includes('Rizky') ? -12.5 : -7.2;
          npc.group.position.x = THREE.MathUtils.damp(npc.group.position.x, sideX, 8, delta);
          npc.group.position.z = THREE.MathUtils.damp(npc.group.position.z, 16.5, 8, delta);
          npc.group.rotation.y = Math.PI;
          const clap = Math.abs(Math.sin(t * 7.5));
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.0)) * 0.06;
          npc.leftArm.rotation.set(-1.35, 0, -0.12 - clap * 0.28);
          npc.rightArm.rotation.set(-1.35, 0, 0.12 + clap * 0.28);
          npc.leftLeg.rotation.set(0, 0, 0);
          npc.rightLeg.rotation.set(0, 0, 0);
          continue;
        }
      } else if (npc.name.includes('Kevin')) {
        npc.hips.rotation.set(0, 0, 0);
      }

      const distToPlayer = Math.hypot(
        playerX - npc.group.position.x,
        playerZ - npc.group.position.z
      );
      if (npc.labelSprite) {
        npc.labelSprite.visible = distToPlayer <= 25.0;
      }
      const isPlayerNear = distToPlayer <= PROXIMITY_RADIUS;

      if (isPlayerNear && !this.penaltyModeActive) {
        const rawRatio = THREE.MathUtils.clamp(
          1 - (distToPlayer - VOICE_MIN_DIST) / (PROXIMITY_RADIUS - VOICE_MIN_DIST),
          0,
          1
        );
        const voiceVolume = Math.pow(rawRatio, 1.45);

        if (!npc.wasPlayerNear) {
          npc.wasPlayerNear = true;
          this.pickNextRandomDialogue(npc, elapsed);
          soundFX.playChatBubble(soundEnabled);
        } else if (elapsed >= npc.nextCycleTime) {
          this.pickNextRandomDialogue(npc, elapsed);
        }

        if (!closestActiveDialogue || distToPlayer < closestActiveDialogue.distance) {
          closestActiveDialogue = {
            npcName: npc.name,
            npcActivity: npc.activity,
            role: npc.role,
            message: npc.currentDialogue,
            distance: distToPlayer,
            voiceVolume,
            playerReply: this.playerBubbleTimer > 0 ? this.playerCurrentReply : undefined,
            suggestedReplies: this.buildPlayerSuggestedReplies(npc),
            stageIndex: npc.currentStageIdx + 1,
            totalStages: npc.activitySchedule.length,
          };
          closestNpcRef = npc;
        }
      } else {
        npc.wasPlayerNear = false;
      }

      if (npc.behavior === 'vendor_stand') continue;

      // A. Continuous Patrol / Futsal Players
      if (
        (npc.behavior === 'patrol_loop' || npc.behavior === 'futsal_player') &&
        npc.patrolWaypoints &&
        npc.patrolWaypoints.length > 1
      ) {
        const wp = npc.patrolWaypoints[npc.currentWaypointIdx];
        npc.targetPos.set(wp[0], npc.basePos.y, wp[1]);

        const dx = npc.targetPos.x - npc.group.position.x;
        const dz = npc.targetPos.z - npc.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.45) {
          npc.currentWaypointIdx = (npc.currentWaypointIdx + 1) % npc.patrolWaypoints.length;
        } else {
          const step = Math.min(dist, npc.moveSpeed * delta);
          npc.group.position.x += (dx / dist) * step;
          npc.group.position.z += (dz / dist) * step;

          const desiredYaw = Math.atan2(dx, dz);
          let diff = desiredYaw - npc.group.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          npc.group.rotation.y += diff * Math.min(1, delta * 10);
        }

        const freq = npc.behavior === 'futsal_player' ? 11.5 : 6.8;
        const amp = npc.behavior === 'futsal_player' ? 0.95 : 0.58;
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * freq)) * 0.08;
        npc.leftArm.rotation.set(Math.sin(t * freq) * amp, 0, 0);
        npc.rightArm.rotation.set(-Math.sin(t * freq) * amp, 0, 0);
        npc.leftLeg.rotation.set(-Math.sin(t * freq) * amp, 0, 0);
        npc.rightLeg.rotation.set(Math.sin(t * freq) * amp, 0, 0);
        npc.head.rotation.set(0, Math.sin(t * 2.0) * 0.12, 0);
        continue;
      }

      // B. Multi-Stage Activity Progression: Walking to next activity spot vs Performing current activity
      if (npc.isTransitioningWalk) {
        const dx = npc.stageTargetPos.x - npc.group.position.x;
        const dz = npc.stageTargetPos.z - npc.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= 0.28) {
          npc.group.position.x = npc.stageTargetPos.x;
          npc.group.position.z = npc.stageTargetPos.z;
          const isTargetIndoor =
            npc.stageTargetPos.z < -34.0 ||
            npc.stageTargetPos.x < -36.5 ||
            npc.stageTargetPos.x > 36.5;
          npc.group.position.y = isTargetIndoor ? 0.45 : 0;
          npc.isTransitioningWalk = false;
          this.updateNPCLabel(npc, npc.activity);
        } else {
          // Brisk dispersal speed if walking a long distance back from the ceremony field
          const effectiveSpeed = dist > 18.0 ? Math.max(npc.moveSpeed, 11.5) : npc.moveSpeed;
          const step = Math.min(dist, effectiveSpeed * delta);
          npc.group.position.x += (dx / dist) * step;
          npc.group.position.z += (dz / dist) * step;
          const isNowIndoor =
            npc.group.position.z < -34.0 ||
            npc.group.position.x < -36.5 ||
            npc.group.position.x > 36.5;
          npc.group.position.y = isNowIndoor ? 0.45 : 0;

          const desiredYaw = Math.atan2(dx, dz);
          let diff = desiredYaw - npc.group.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          npc.group.rotation.y += diff * Math.min(1, delta * 10);

          // Brisk walking animation while moving to the new activity spot
          const walkFreq = dist > 18.0 ? 9.5 : 7.4;
          const walkAmp = 0.62;
          npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * walkFreq)) * 0.07;
          npc.leftArm.rotation.set(Math.sin(t * walkFreq) * walkAmp, 0, 0);
          npc.rightArm.rotation.set(-Math.sin(t * walkFreq) * walkAmp, 0, 0);
          npc.leftLeg.rotation.set(-Math.sin(t * walkFreq) * walkAmp, 0, 0);
          npc.rightLeg.rotation.set(Math.sin(t * walkFreq) * walkAmp, 0, 0);
          npc.head.rotation.set(0, Math.sin(t * 2.2) * 0.1, 0);
          continue;
        }
      }

      // Smoothly orient towards target activity rotation once at the spot
      let rotDiff = npc.stageTargetRotY - npc.group.rotation.y;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      npc.group.rotation.y += rotDiff * Math.min(1, delta * 8);

      // Count down current activity timer; when finished, switch to next activity in schedule!
      if (npc.activitySchedule.length > 1) {
        npc.stageTimer -= delta;
        if (npc.stageTimer <= 0) {
          this.advanceToActivityStage(npc, npc.currentStageIdx + 1, elapsed);
        }
      }

      // Reset baseline limb transforms before applying behavior pose
      npc.hips.position.y = 1.22;
      npc.leftLeg.rotation.set(0, 0, 0);
      npc.rightLeg.rotation.set(0, 0, 0);
      npc.leftArm.rotation.set(0, 0, 0);
      npc.rightArm.rotation.set(0, 0, 0);
      npc.head.rotation.set(0, 0, 0);

      // C. Apply Expressive 3D Kinematics for Current Activity Behavior
      if (npc.behavior === 'teach_board') {
        npc.rightArm.rotation.x = -1.65 + Math.sin(t * 3.4) * 0.35;
        npc.rightArm.rotation.z = -0.25 + Math.cos(t * 2.5) * 0.15;
        npc.leftArm.rotation.x = -0.45 + Math.sin(t * 2.2) * 0.18;
        npc.head.rotation.y = Math.sin(t * 1.4) * 0.38;
      } else if (npc.behavior === 'science_experiment') {
        npc.head.rotation.x = 0.28 + Math.sin(t * 2.0) * 0.08;
        npc.rightArm.rotation.x = -1.25 + Math.sin(t * 4.2) * 0.25;
        npc.leftArm.rotation.x = -1.05 + Math.cos(t * 3.8) * 0.2;
      } else if (npc.behavior === 'type_computer') {
        npc.leftArm.rotation.x = -1.15 + Math.sin(t * 11.0) * 0.14;
        npc.rightArm.rotation.x = -1.15 + Math.cos(t * 11.0) * 0.14;
        npc.head.rotation.y = Math.sin(t * 1.8) * 0.12;
      } else if (npc.behavior === 'write_desk') {
        npc.rightArm.rotation.x = -1.05 + Math.sin(t * 6.5) * 0.18;
        npc.rightArm.rotation.z = -0.12 + Math.cos(t * 5.0) * 0.08;
        npc.leftArm.rotation.x = -0.95;
        npc.head.rotation.x = 0.2;
        npc.head.rotation.y = Math.sin(t * 1.5) * 0.15;
      } else if (npc.behavior === 'raise_hand') {
        npc.rightArm.rotation.x = -2.68 + Math.sin(t * 4.5) * 0.12;
        npc.rightArm.rotation.z = -0.15;
        npc.leftArm.rotation.x = -0.65;
        npc.head.rotation.x = -0.08;
        npc.head.rotation.y = Math.sin(t * 2.0) * 0.18;
      } else if (npc.behavior === 'clap_cheer') {
        const clap = Math.abs(Math.sin(t * 7.5));
        npc.leftArm.rotation.x = -1.35;
        npc.rightArm.rotation.x = -1.35;
        npc.leftArm.rotation.z = -0.12 - clap * 0.28;
        npc.rightArm.rotation.z = 0.12 + clap * 0.28;
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(t * 5.0)) * 0.06;
        npc.head.rotation.x = Math.sin(t * 5.0) * 0.12;
      } else if (npc.behavior === 'stretch_body') {
        const stretch = Math.sin(t * 2.4);
        npc.leftArm.rotation.x = -2.35 + stretch * 0.35;
        npc.rightArm.rotation.x = -2.35 + stretch * 0.35;
        npc.leftArm.rotation.z = 0.35;
        npc.rightArm.rotation.z = -0.35;
        npc.head.rotation.y = Math.cos(t * 1.8) * 0.25;
      } else if (npc.behavior === 'inspect_shelf') {
        npc.rightArm.rotation.x = -1.55 + Math.sin(t * 3.0) * 0.32;
        npc.leftArm.rotation.x = -1.1 + Math.cos(t * 2.5) * 0.22;
        npc.head.rotation.x = -0.15 + Math.sin(t * 2.0) * 0.12;
        npc.head.rotation.y = Math.cos(t * 1.6) * 0.28;
      } else if (npc.behavior === 'sweep_clean') {
        const sweep = Math.sin(t * 4.8);
        npc.leftArm.rotation.x = -1.15 + sweep * 0.25;
        npc.rightArm.rotation.x = -1.25 - sweep * 0.25;
        npc.leftArm.rotation.z = sweep * 0.28;
        npc.rightArm.rotation.z = sweep * 0.28;
        npc.head.rotation.x = 0.22;
        npc.head.rotation.y = sweep * 0.18;
      } else if (npc.behavior === 'exercise_skj') {
        const jump = Math.abs(Math.sin(t * 5.5));
        npc.hips.position.y = 1.22 + jump * 0.14;
        npc.leftArm.rotation.x = -0.2;
        npc.rightArm.rotation.x = -0.2;
        npc.leftArm.rotation.z = 0.2 + jump * 2.1;
        npc.rightArm.rotation.z = -0.2 - jump * 2.1;
        npc.leftLeg.rotation.z = jump * 0.25;
        npc.rightLeg.rotation.z = -jump * 0.25;
      } else if (npc.behavior === 'wash_hands') {
        npc.leftArm.rotation.x = -1.15 + Math.sin(t * 6.0) * 0.2;
        npc.rightArm.rotation.x = -1.15 + Math.cos(t * 6.0) * 0.2;
        npc.leftArm.rotation.z = 0.22;
        npc.rightArm.rotation.z = -0.22;
        npc.head.rotation.x = 0.25;
      } else if (npc.behavior === 'ceremony_salute') {
        npc.rightArm.rotation.x = -2.35;
        npc.rightArm.rotation.z = 0.38;
        npc.leftArm.rotation.x = Math.sin(t * 2) * 0.04;
        npc.head.rotation.y = Math.sin(t * 1.2) * 0.05;
      } else if (npc.behavior === 'coach_sideline') {
        npc.leftArm.rotation.x = -0.6 + Math.sin(t * 4.5) * 0.35;
        npc.rightArm.rotation.x = -2.1 + Math.cos(t * 4.5) * 0.25;
        npc.head.rotation.y = Math.sin(elapsed * 1.45) * 0.45;
      } else if (npc.behavior === 'guard_wave') {
        npc.rightArm.rotation.x = -2.4;
        npc.rightArm.rotation.z = -0.35 + Math.sin(t * 5.0) * 0.28;
        npc.head.rotation.y = Math.sin(t * 1.5) * 0.25;
      } else if (npc.behavior === 'read_book') {
        npc.leftArm.rotation.x = -1.05;
        npc.rightArm.rotation.x = -1.05;
        npc.head.rotation.x = 0.24;
        npc.head.rotation.y = Math.sin(t * 1.6) * 0.1;
      } else if (npc.behavior === 'eat_snack') {
        npc.rightArm.rotation.x = -1.35 + Math.sin(t * 3.2) * 0.45;
        npc.leftArm.rotation.x = Math.sin(t * 2.0) * 0.12;
        npc.head.rotation.y = Math.sin(t * 1.4) * 0.18;
      } else if (npc.behavior === 'hop_dampu') {
        // One-legged hop (engklek Dampu Bulan): left knee bent up behind, hopping vertically on right foot
        const hop = Math.abs(Math.sin(t * 7.2));
        npc.hips.position.y = 1.22 + hop * 0.36;
        npc.leftLeg.rotation.x = 1.15 + Math.sin(t * 7.2) * 0.15;
        npc.rightLeg.rotation.x = -hop * 0.25;
        npc.leftArm.rotation.z = 0.65 + hop * 0.25;
        npc.rightArm.rotation.z = -0.65 - hop * 0.25;
        npc.leftArm.rotation.x = -0.35;
        npc.rightArm.rotation.x = -0.35;
        npc.head.rotation.x = 0.18;
      } else if (npc.behavior === 'play_kelereng') {
        // Crouching / squatting low to aim and flick marbles (menyentil kelereng gaco)
        npc.hips.position.y = 0.78 + Math.sin(t * 2.5) * 0.03;
        npc.leftLeg.rotation.x = -0.82;
        npc.rightLeg.rotation.x = -0.68;
        npc.leftArm.rotation.x = -0.75;
        const flick = Math.max(0, Math.sin(t * 4.8));
        npc.rightArm.rotation.x = -1.25 - flick * 0.55;
        npc.head.rotation.x = 0.32;
        npc.head.rotation.y = Math.sin(t * 1.8) * 0.12;
      } else if (npc.behavior === 'jump_rope') {
        // Synchronized jumping over the 3D rotating rubber-band rope (elapsed * 5.2)
        const ropeWave = Math.sin(elapsed * 5.2 - 0.35);
        const jumpHeight = Math.max(0, ropeWave) * 0.58;
        npc.hips.position.y = 1.22 + jumpHeight;
        npc.leftLeg.rotation.x = jumpHeight * 0.65;
        npc.rightLeg.rotation.x = jumpHeight * 0.65;
        npc.leftArm.rotation.x = -0.55 - jumpHeight * 0.85;
        npc.rightArm.rotation.x = -0.55 - jumpHeight * 0.85;
        npc.leftArm.rotation.z = 0.28 + jumpHeight * 0.35;
        npc.rightArm.rotation.z = -0.28 - jumpHeight * 0.35;
      } else if (npc.behavior === 'turn_rope') {
        // Synchronized circular arm cranking for the two rubber-rope turners
        const phase = elapsed * 5.2;
        npc.rightArm.rotation.x = -1.35 + Math.sin(phase) * 0.52;
        npc.rightArm.rotation.z = -0.25 + Math.cos(phase) * 0.42;
        npc.leftArm.rotation.x = -0.95 + Math.sin(phase) * 0.35;
        npc.hips.position.y = 1.22 + Math.abs(Math.sin(phase)) * 0.05;
      } else {
        npc.leftArm.rotation.x = -0.45 + Math.sin(t * 3.5) * 0.25;
        npc.rightArm.rotation.x = -0.65 + Math.cos(t * 3.2) * 0.3;
        npc.head.rotation.y = Math.sin(t * 1.8) * 0.22;
      }

      // Natural staggered eye blinking & expressive mouth animation on every NPC
      if (npc.eyesGroup) {
        const blinkCycle = ((elapsed + npc.phaseOffset * 1.7) * 0.92) % 3.9;
        const targetEyeScaleY = blinkCycle > 3.75 ? 0.12 : 1.0;
        npc.eyesGroup.scale.y = THREE.MathUtils.damp(
          npc.eyesGroup.scale.y,
          targetEyeScaleY,
          24,
          delta
        );
      }
      if (npc.mouthGroup) {
        const isCheeringOrTalking =
          npc === closestNpcRef ||
          npc.behavior === 'clap_cheer' ||
          npc.behavior === 'teach_board';
        const targetMouthScaleY = isCheeringOrTalking
          ? 0.85 + Math.abs(Math.sin(elapsed * 14.5 + npc.phaseOffset)) * 0.55
          : 1.0;
        npc.mouthGroup.scale.y = THREE.MathUtils.damp(
          npc.mouthGroup.scale.y,
          targetMouthScaleY,
          18,
          delta
        );
      }
    }

    // 3. Drive Spatial Distance-Attenuated NPC Voice (Player Character only speaks manually when triggered by user!)
    if (closestNpcRef && closestActiveDialogue) {
      const stereoPan = THREE.MathUtils.clamp(
        (closestNpcRef.group.position.x - playerX) / 10.0,
        -0.85,
        0.85
      );
      soundFX.updateSpatialDialogueVoice(
        closestNpcRef.name,
        closestNpcRef.role,
        closestActiveDialogue.message,
        closestActiveDialogue.voiceVolume,
        stereoPan,
        delta,
        soundEnabled
      );

      // Subtle talking head nod on the active speaking NPC
      closestNpcRef.head.rotation.x += Math.sin(elapsed * 14.0) * 0.06;
      if (closestNpcRef.mouthGroup) {
        closestNpcRef.mouthGroup.scale.y =
          0.8 + Math.abs(Math.sin(elapsed * 16.0)) * 0.65;
      }
    } else {
      soundFX.updateSpatialDialogueVoice('', '', '', 0, 0, delta, soundEnabled);
    }

    // 4. Update single shared 3D speech bubble above the closest active NPC (fades with distance!)
    const targetScale =
      closestNpcRef && closestActiveDialogue
        ? THREE.MathUtils.lerp(0.58, 1.0, closestActiveDialogue.voiceVolume)
        : 0.0;
    this.sharedBubbleScale = THREE.MathUtils.damp(this.sharedBubbleScale, targetScale, 10, delta);

    if (closestNpcRef && closestActiveDialogue && this.sharedBubbleScale > 0.01) {
      this.renderBubbleForNPC(closestNpcRef);
      const npcScale = closestNpcRef.group.scale.y || 1;
      this.sharedBubbleSprite.position.set(
        closestNpcRef.group.position.x,
        closestNpcRef.group.position.y + 5.15 * npcScale,
        closestNpcRef.group.position.z
      );
      this.sharedBubbleSprite.scale.set(
        4.8 * this.sharedBubbleScale,
        1.92 * this.sharedBubbleScale,
        1
      );
      this.sharedBubbleMaterial.opacity = THREE.MathUtils.clamp(
        0.25 + closestActiveDialogue.voiceVolume * 0.75,
        0.25,
        1.0
      );
      this.sharedBubbleSprite.visible = true;
    } else {
      this.sharedBubbleSprite.visible = false;
    }

    // 5. Update Player Character 3D Speech Bubble above the player's head
    if (this.playerBubbleTimer > 0) {
      this.playerBubbleTimer -= delta;
      const fadeAlpha = THREE.MathUtils.clamp(this.playerBubbleTimer / 0.6, 0, 1);
      this.playerBubbleMaterial.opacity = fadeAlpha;
      this.playerBubbleSprite.position.set(playerX, playerY + 4.35, playerZ);
      this.playerBubbleSprite.scale.set(4.5 * fadeAlpha, 1.8 * fadeAlpha, 1);
      this.playerBubbleSprite.visible = true;
    } else {
      this.playerBubbleSprite.visible = false;
    }

    // 6. Update Obstacle Course 3D animations (bonus stars rotation & obstacle knock tilt)
    if (this.obstacleCourseActive) {
      for (const star of this.bonusStarMeshes) {
        star.rotation.y += delta * 2.8;
      }
      for (const obs of this.obstacleMeshes) {
        obs.group.rotation.x = THREE.MathUtils.damp(obs.group.rotation.x, obs.targetRotX, 10, delta);
      }
    }

    return closestActiveDialogue;
  }
}
