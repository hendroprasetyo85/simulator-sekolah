export type UniformPresetId = 'merah_putih' | 'pramuka' | 'batik' | 'olahraga';

export type HatStyleId = 'topi_sd' | 'baret_pramuka' | 'peci' | 'pita_rambut' | 'none';

export type HairStyleId = 'pendek_rapi' | 'belah_samping' | 'kuncir_dua' | ' cepak' | 'poni_rata';

export type FaceExpressionId = 'ceria' | 'semangat' | 'fokus' | 'kacamata' | 'kaget';

export type HandPropId = 'buku_sidu' | 'es_loli' | 'penggaris_kayu' | 'bola_kasti' | 'none';

export type AnimationPoseId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'hormat_bendera'
  | 'senam_pagi'
  | 'lompat_hore'
  | 'baca_buku';

export type CameraPresetId =
  | 'front'
  | 'three_quarter'
  | 'portrait'
  | 'back_bag'
  | 'playground'
  | 'aerial_map';

export type TimeOfDayId = 'pagi_upacara' | 'siang_istirahat' | 'sore_pulang';

export type WeatherTypeId = 'cerah' | 'berawan' | 'hujan';

export type SchoolLocationId =
  | 'lapangan_upacara'
  | 'lapangan_olahraga'
  | 'permainan_tradisional'
  | 'ruang_kepsek'
  | 'ruang_guru'
  | 'perpustakaan'
  | 'lab_ipa'
  | 'lab_komputer'
  | 'kelas_1'
  | 'kelas_2'
  | 'kelas_3'
  | 'kelas_4'
  | 'kelas_5'
  | 'kelas_6'
  | 'kantin'
  | 'mushola'
  | 'ruang_uks'
  | 'toilet_guru'
  | 'toilet_siswa'
  | 'gerbang_sekolah'
  | 'parkiran'
  | 'tukang_jajanan';

export interface SchoolLocationInfo {
  id: SchoolLocationId;
  label: string;
  category: string;
  spawnPos: [number, number]; // [x, z]
  facingAngle: number; // rotation.y in radians
  description: string;
}

export const SCHOOL_LOCATIONS: SchoolLocationInfo[] = [
  {
    id: 'lapangan_upacara',
    label: 'Lapangan Upacara',
    category: 'Lapangan Luar',
    spawnPos: [0, -16],
    facingAngle: Math.PI,
    description: 'Lapangan Upacara Bendera & Barisan Siswa di Depan Gedung Utama',
  },
  {
    id: 'lapangan_olahraga',
    label: 'Lapangan Olahraga',
    category: 'Lapangan Luar',
    spawnPos: [0, 10],
    facingAngle: Math.PI / 2,
    description: 'Lapangan Futsal & Basket SD Lengkap dengan Pertandingan Siswa',
  },
  {
    id: 'permainan_tradisional',
    label: 'Permainan Tradisional',
    category: 'Lapangan Luar',
    spawnPos: [1.5, 23.8],
    facingAngle: 0,
    description: 'Arena Permainan Tradisional SD di Sebelah Lapangan Olahraga: Dampu Bulan (Menghadap Selatan), Kelereng & Lompat Tali',
  },
  {
    id: 'ruang_guru',
    label: 'Dalam Ruang Guru',
    category: 'Interior Utara',
    spawnPos: [0, -45.5],
    facingAngle: Math.PI,
    description: 'Interior Ruang Guru Luas: Meja Guru, Papan Jadwal & Rapat Kurikulum',
  },
  {
    id: 'ruang_kepsek',
    label: 'Dalam Ruang Kepsek',
    category: 'Interior Utara',
    spawnPos: [-21.5, -45.5],
    facingAngle: Math.PI,
    description: 'Interior Ruang Kepala Sekolah Luas: Meja Kerja Kepsek, Lemari Piala & Sofa Tamu',
  },
  {
    id: 'perpustakaan',
    label: 'Dalam Perpustakaan',
    category: 'Interior Utara',
    spawnPos: [21.5, -45.5],
    facingAngle: Math.PI,
    description: 'Interior Perpustakaan Luas: Deretan Rak Buku, Pustakawan & Siswa Membaca',
  },
  {
    id: 'lab_ipa',
    label: 'Dalam Lab IPA',
    category: 'Interior Utara',
    spawnPos: [-42.0, -45.5],
    facingAngle: Math.PI,
    description: 'Interior Laboratorium IPA Luas: Meja Praktikum Mikroskop, Tabung Reaksi & Sains',
  },
  {
    id: 'lab_komputer',
    label: 'Dalam Lab Komputer',
    category: 'Interior Utara',
    spawnPos: [42.0, -45.5],
    facingAngle: Math.PI,
    description: 'Interior Lab Komputer Luas: Meja PC Lengkap, Praktik Mengetik & Menggambar Digital',
  },
  {
    id: 'kelas_1',
    label: 'Dalam Ruang Kelas 1',
    category: 'Interior Barat',
    spawnPos: [-45.0, -24.0],
    facingAngle: -Math.PI / 2,
    description: 'Interior Kelas 1A Luas: Guru & 5 Siswa Belajar Membaca A-B-C & Berhitung',
  },
  {
    id: 'kelas_2',
    label: 'Dalam Ruang Kelas 2',
    category: 'Interior Barat',
    spawnPos: [-45.0, -6.0],
    facingAngle: -Math.PI / 2,
    description: 'Interior Kelas 2A Luas: Guru & 5 Siswa Belajar Penjumlahan & Menggambar',
  },
  {
    id: 'kelas_3',
    label: 'Dalam Ruang Kelas 3',
    category: 'Interior Barat',
    spawnPos: [-45.0, 12.0],
    facingAngle: -Math.PI / 2,
    description: 'Interior Kelas 3A Luas: Guru & 5 Siswa Belajar Bahasa Indonesia & Puisi',
  },
  {
    id: 'kelas_4',
    label: 'Dalam Ruang Kelas 4',
    category: 'Interior Timur',
    spawnPos: [45.0, -24.0],
    facingAngle: Math.PI / 2,
    description: 'Interior Kelas 4A Luas: Guru & 5 Siswa Belajar Peta Kepulauan Nusantara',
  },
  {
    id: 'kelas_5',
    label: 'Dalam Ruang Kelas 5',
    category: 'Interior Timur',
    spawnPos: [45.0, -6.0],
    facingAngle: Math.PI / 2,
    description: 'Interior Kelas 5A Luas: Guru & 5 Siswa Belajar Sains Fotosintesis Tumbuhan',
  },
  {
    id: 'kelas_6',
    label: 'Dalam Ruang Kelas 6',
    category: 'Interior Timur',
    spawnPos: [45.0, 12.0],
    facingAngle: Math.PI / 2,
    description: 'Interior Kelas 6A Luas: Guru & 5 Siswa Bimbingan Persiapan Ujian Akhir',
  },
  {
    id: 'kantin',
    label: 'Dalam Kantin Sehat',
    category: 'Interior Timur',
    spawnPos: [45.5, 32.5],
    facingAngle: Math.PI / 2,
    description: 'Interior Kantin Sehat SD Luas: Etalase Bakso, Meja Makan & Siswa Istirahat',
  },
  {
    id: 'mushola',
    label: 'Dalam Mushola Sekolah',
    category: 'Interior Timur',
    spawnPos: [45.5, 50.4],
    facingAngle: Math.PI / 2,
    description: 'Interior Mushola Al-Ikhlas SD: Mihrab, Sajadah Berjamaah, Rak Al-Quran & Siswa Mengaji',
  },
  {
    id: 'ruang_uks',
    label: 'Dalam Ruang UKS',
    category: 'Interior Barat',
    spawnPos: [-45.5, 50.4],
    facingAngle: -Math.PI / 2,
    description: 'Interior Ruang UKS SD: Kasur Periksa, Lemari Obat P3K, Petugas UKS & Dokter Kecil',
  },
  {
    id: 'toilet_guru',
    label: 'Dalam Toilet Guru',
    category: 'Interior Barat',
    spawnPos: [-46.0, 26.5],
    facingAngle: -Math.PI / 2,
    description: 'Interior Toilet Guru Luas: Wastafel Cermin Bersih & Bilik Kamar Mandi Staf',
  },
  {
    id: 'toilet_siswa',
    label: 'Dalam Toilet Siswa',
    category: 'Interior Barat',
    spawnPos: [-46.0, 38.0],
    facingAngle: -Math.PI / 2,
    description: 'Interior Toilet Siswa Luas: Siswa Mencuci Tangan Pakai Sabun di Wastafel',
  },
  {
    id: 'gerbang_sekolah',
    label: 'Gerbang Sekolah & Ecobrick',
    category: 'Area Depan',
    spawnPos: [6, 48],
    facingAngle: Math.PI,
    description: 'Gerbang Utama SDN SUSUKAN 03, Pos Satpam & Taman Ecobrick "I LOVE SUGA"',
  },
  {
    id: 'parkiran',
    label: 'Parkiran Motor & Mobil',
    category: 'Area Depan',
    spawnPos: [-26, 48],
    facingAngle: 0,
    description: 'Kanopi Parkir Mobil Guru & Deretan Motor Matic Skala Realistis',
  },
  {
    id: 'tukang_jajanan',
    label: 'Tukang Jajanan SD',
    category: 'Area Depan',
    spawnPos: [22, 63],
    facingAngle: 0,
    description: 'Gerobak Cilok, Telur Gulung & Es Doger di Luar Gerbang Sekolah',
  },
];

export interface CharacterConfig {
  studentName: string;
  gradeClass: string;
  genderStyle: 'putra' | 'putri';
  skinTone: string;
  uniform: UniformPresetId;
  hat: HatStyleId;
  hairStyle: HairStyleId;
  hairColor: string;
  expression: FaceExpressionId;
  hasTieOrNeckerchief: boolean;
  hasBackpack: boolean;
  backpackColor: string;
  handProp: HandPropId;
  sockHeight: 'panjang' | 'pendek';
  animation: AnimationPoseId;
  explodedFactor: number; // 0 to 1 for rig inspection
  timeOfDay: TimeOfDayId;
  weather: WeatherTypeId;
  autoWeatherCycle: boolean;
  cameraPreset: CameraPresetId;
  activeLocation: SchoolLocationId;
  locationTriggerNonce: number;
  isPlayMode: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  studentName: 'Budi Santoso',
  gradeClass: 'Kelas 4A · SDN SUSUKAN 03',
  genderStyle: 'putra',
  skinTone: '#F4C29F',
  uniform: 'merah_putih',
  hat: 'topi_sd',
  hairStyle: 'pendek_rapi',
  hairColor: '#1E1B18',
  expression: 'ceria',
  hasTieOrNeckerchief: true,
  hasBackpack: true,
  backpackColor: '#1D4ED8',
  handProp: 'buku_sidu',
  sockHeight: 'panjang',
  animation: 'idle',
  explodedFactor: 0,
  timeOfDay: 'pagi_upacara',
  weather: 'cerah',
  autoWeatherCycle: false,
  cameraPreset: 'three_quarter',
  activeLocation: 'lapangan_upacara',
  locationTriggerNonce: 0,
  isPlayMode: true,
  soundEnabled: true,
};

export const SKIN_TONES = [
  { id: 'sawo_terang', label: 'Sawo Terang', hex: '#F4C29F' },
  { id: 'kuning_langsat', label: 'Kuning Langsat', hex: '#FAD6A5' },
  { id: 'sawo_matang', label: 'Sawo Matang', hex: '#D99B72' },
  { id: 'cokelat_nusantara', label: 'Cokelat Nusantara', hex: '#AD6E46' },
  { id: 'klasik_blox', label: 'Klasik Blox Kuning', hex: '#FACC15' },
];

export const BACKPACK_COLORS = [
  { id: 'biru_bca', label: 'Biru Elektrik', hex: '#1D4ED8' },
  { id: 'merah_sd', label: 'Merah Marun', hex: '#B91C1C' },
  { id: 'hijau_toska', label: 'Hijau Toska', hex: '#0F766E' },
  { id: 'ungu_ceria', label: 'Ungu Muda', hex: '#6D28D9' },
  { id: 'hitam_klasik', label: 'Hitam Abu', hex: '#334155' },
];
