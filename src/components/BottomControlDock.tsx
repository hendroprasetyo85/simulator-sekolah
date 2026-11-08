import React from 'react';
import {
  AnimationPoseId,
  BACKPACK_COLORS,
  CameraPresetId,
  CharacterConfig,
  FaceExpressionId,
  HairStyleId,
  HatStyleId,
  HandPropId,
  SCHOOL_LOCATIONS,
  SchoolLocationId,
  SKIN_TONES,
  TimeOfDayId,
  UniformPresetId,
  WeatherTypeId,
} from '../types/character';
import { soundFX } from '../utils/soundFX';

export type DockTabId = 'peta' | 'seragam' | 'kepala' | 'atribut' | 'animasi' | 'lingkungan';

interface BottomControlDockProps {
  config: CharacterConfig;
  activeTab: DockTabId;
  isCollapsed: boolean;
  onSelectTab: (tab: DockTabId) => void;
  onToggleCollapse: () => void;
  onChangeConfig: (partial: Partial<CharacterConfig>) => void;
  onTeleportToLocation: (locId: SchoolLocationId) => void;
  onRandomizeCharacter: () => void;
}

const UNIFORM_OPTIONS: { id: UniformPresetId; label: string; day: string }[] = [
  { id: 'merah_putih', label: 'Merah Putih', day: 'Senin–Selasa' },
  { id: 'pramuka', label: 'Pramuka Siaga', day: 'Rabu–Kamis' },
  { id: 'batik', label: 'Batik Nasional', day: 'Jumat' },
  { id: 'olahraga', label: 'Olahraga SD', day: 'Sabtu' },
];

const HAT_OPTIONS: { id: HatStyleId; label: string }[] = [
  { id: 'topi_sd', label: 'Topi SD Merah Putih' },
  { id: 'baret_pramuka', label: 'Baret Pramuka' },
  { id: 'peci', label: 'Peci Nasional' },
  { id: 'pita_rambut', label: 'Pita Merah' },
  { id: 'none', label: 'Tanpa Topi' },
];

const HAIR_OPTIONS: { id: HairStyleId; label: string }[] = [
  { id: 'pendek_rapi', label: 'Pendek Rapi' },
  { id: 'belah_samping', label: 'Belah Samping' },
  { id: 'kuncir_dua', label: 'Kuncir Dua' },
  { id: 'poni_rata', label: 'Poni Rata' },
];

const EXPRESSION_OPTIONS: { id: FaceExpressionId; label: string }[] = [
  { id: 'ceria', label: 'Senyum Ceria' },
  { id: 'semangat', label: 'Semangat' },
  { id: 'fokus', label: 'Fokus Belajar' },
  { id: 'kacamata', label: 'Kacamata Pintar' },
  { id: 'kaget', label: 'Terkejut' },
];

const PROP_OPTIONS: { id: HandPropId; label: string }[] = [
  { id: 'buku_sidu', label: 'Buku Tulis SiDu' },
  { id: 'penggaris_kayu', label: 'Penggaris Kayu' },
  { id: 'es_loli', label: 'Es Loli Kantin' },
  { id: 'bola_kasti', label: 'Bola Kasti' },
  { id: 'none', label: 'Tangan Kosong' },
];

const ANIMATION_OPTIONS: { id: AnimationPoseId; label: string }[] = [
  { id: 'idle', label: 'Siap Berdiri' },
  { id: 'hormat_bendera', label: 'Hormat Bendera' },
  { id: 'walk', label: 'Jalan Kaki' },
  { id: 'run', label: 'Lari Istirahat' },
  { id: 'senam_pagi', label: 'Senam SKJ' },
  { id: 'lompat_hore', label: 'Lompat Hore' },
  { id: 'baca_buku', label: 'Baca Buku' },
];

const CAMERA_OPTIONS: { id: CameraPresetId; label: string }[] = [
  { id: 'three_quarter', label: 'Sudut 3/4' },
  { id: 'front', label: 'Tampak Depan' },
  { id: 'portrait', label: 'Wajah & Topi' },
  { id: 'back_bag', label: 'Tampak Tas' },
  { id: 'playground', label: 'Kamera Ikut' },
  { id: 'aerial_map', label: 'Peta Udara Sekolah' },
];

const TIME_OPTIONS: { id: TimeOfDayId; label: string }[] = [
  { id: 'pagi_upacara', label: '07:00 Upacara Pagi' },
  { id: 'siang_istirahat', label: '10:00 Jam Istirahat' },
  { id: 'sore_pulang', label: '15:30 Pulang Sekolah' },
];

const WEATHER_OPTIONS: { id: WeatherTypeId; label: string }[] = [
  { id: 'cerah', label: '☀️ Cerah' },
  { id: 'berawan', label: '⛅ Berawan' },
  { id: 'hujan', label: '🌧️ Hujan' },
];

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  config,
  activeTab,
  isCollapsed,
  onSelectTab,
  onToggleCollapse,
  onChangeConfig,
  onTeleportToLocation,
  onRandomizeCharacter,
}) => {
  const handleSelect = (partial: Partial<CharacterConfig>) => {
    soundFX.playPop(config.soundEnabled);
    onChangeConfig(partial);
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      style={{
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(920px, 95vw)',
      }}
      className="fixed z-30 w-full pointer-events-auto"
    >
      {/* Top Quick Bar inside open Customization Drawer */}
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
        <div className="flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 shadow-lg">
          <span className="font-semibold text-white whitespace-nowrap shrink-0">
            {config.studentName}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap shrink-0">
            {config.gradeClass}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.playWhistle(config.soundEnabled);
              onRandomizeCharacter();
            }}
            className="bg-slate-900/95 border border-slate-700/80 hover:border-slate-500 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 shadow-lg"
          >
            Acak Karakter
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 shadow-lg"
          >
            ✕ Tutup Menu
          </button>
        </div>
      </div>

      {/* Main Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-3.5 sm:p-4 max-h-[62vh] overflow-y-auto">
        {/* Segmented Control Tabs + Exploded Rig Slider */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
            {(
              [
                ['peta', '1. Peta & Lokasi Sekolah'],
                ['seragam', '2. Seragam SD'],
                ['kepala', '3. Kepala & Wajah'],
                ['atribut', '4. Tas & Atribut'],
                ['animasi', '5. Pose & Animasi'],
                ['lingkungan', '6. Kamera, Waktu & Cuaca'],
              ] as [DockTabId, string][]
            ).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => {
                  soundFX.playPop(config.soundEnabled);
                  onSelectTab(tabId);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tabId
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Exploded Rig Inspection Slider */}
          <div className="flex items-center gap-2.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <label
              htmlFor="exploded-slider"
              className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
            >
              Inspeksi Rig
            </label>
            <input
              id="exploded-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={config.explodedFactor}
              onChange={(e) =>
                onChangeConfig({
                  explodedFactor: parseFloat(e.target.value),
                  isPlayMode: false,
                })
              }
              className="w-20 accent-red-500 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-slate-400 w-8 text-right">
              {Math.round(config.explodedFactor * 100)}%
            </span>
          </div>
        </div>

        {/* Tab 1: Peta & Teleportasi Dalam Ruangan & Fasilitas Sekolah */}
        {activeTab === 'peta' && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-slate-400">
                Semua Ruangan Terbuka & Bisa Dimasuki: Klik ruangan untuk masuk langsung atau jalan kaki (WASD):
              </span>
              <span className="text-xs text-amber-400 font-mono whitespace-nowrap shrink-0">
                {SCHOOL_LOCATIONS.length} Ruangan & Zona
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {SCHOOL_LOCATIONS.map((loc) => {
                const isSelected = config.activeLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onTeleportToLocation(loc.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-red-600/25 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-[11px] font-semibold leading-tight truncate">
                      {loc.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {loc.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Seragam SD */}
        {activeTab === 'seragam' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-6">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Pilih Setelan Seragam Sekolah Dasar
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {UNIFORM_OPTIONS.map((item) => {
                  const active = config.uniform === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleSelect({
                          uniform: item.id,
                          hat:
                            item.id === 'pramuka'
                              ? 'baret_pramuka'
                              : item.id === 'merah_putih'
                              ? 'topi_sd'
                              : config.hat,
                        })
                      }
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-red-600/20 border-red-500 text-white'
                          : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold whitespace-nowrap truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                        {item.day}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="text-xs font-medium text-slate-400 mb-2">Model Bawahan</div>
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    handleSelect({
                      genderStyle: 'putra',
                      hairStyle:
                        config.hairStyle === 'kuncir_dua' ? 'pendek_rapi' : config.hairStyle,
                    })
                  }
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    config.genderStyle === 'putra'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Putra (Celana)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelect({
                      genderStyle: 'putri',
                      hairStyle: 'kuncir_dua',
                    })
                  }
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    config.genderStyle === 'putri'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Putri (Rok Rempel)
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="student-name-input"
                className="block text-xs font-medium text-slate-400 mb-2"
              >
                Bordir Nama Dada (Maks 12 Huruf)
              </label>
              <input
                id="student-name-input"
                type="text"
                maxLength={14}
                value={config.studentName}
                onChange={(e) => onChangeConfig({ studentName: e.target.value })}
                placeholder="Nama Siswa..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Kepala, Rambut, Wajah & Warna Kulit */}
        {activeTab === 'kepala' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5">
              <div className="text-xs font-medium text-slate-400 mb-2">Ekspresi Wajah Blox</div>
              <div className="flex flex-wrap gap-1.5">
                {EXPRESSION_OPTIONS.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => handleSelect({ expression: exp.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.expression === exp.id
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">Gaya Rambut 3D</div>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_OPTIONS.map((hair) => (
                  <button
                    key={hair.id}
                    type="button"
                    onClick={() => handleSelect({ hairStyle: hair.id })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.hairStyle === hair.id
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {hair.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="text-xs font-medium text-slate-400 mb-2">Warna Kulit Karakter</div>
              <div className="flex items-center gap-2">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    title={tone.label}
                    onClick={() => handleSelect({ skinTone: tone.hex })}
                    style={{ backgroundColor: tone.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      config.skinTone === tone.hex
                        ? 'border-white scale-110 ring-2 ring-red-500'
                        : 'border-slate-800 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Atribut Sekolah, Topi, Dasi & Tas Ransel */}
        {activeTab === 'atribut' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">Penutup Kepala / Topi</div>
              <div className="flex flex-wrap gap-1.5">
                {HAT_OPTIONS.map((hat) => (
                  <button
                    key={hat.id}
                    type="button"
                    onClick={() => handleSelect({ hat: hat.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.hat === hat.id
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {hat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Benda di Tangan Kanan
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROP_OPTIONS.map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => handleSelect({ handProp: prop.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.handProp === prop.id
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {prop.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Tas Ransel & Dasi / Kacu
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelect({ hasTieOrNeckerchief: !config.hasTieOrNeckerchief })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    config.hasTieOrNeckerchief
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {config.hasTieOrNeckerchief ? '✓ Pakai Dasi/Kacu' : 'Tanpa Dasi'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect({ hasBackpack: !config.hasBackpack })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    config.hasBackpack
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {config.hasBackpack ? '✓ Tas Ransel' : 'Tanpa Tas'}
                </button>

                {config.hasBackpack && (
                  <div className="flex items-center gap-1.5 ml-1">
                    {BACKPACK_COLORS.map((bc) => (
                      <button
                        key={bc.id}
                        type="button"
                        title={bc.label}
                        onClick={() => handleSelect({ backpackColor: bc.hex })}
                        style={{ backgroundColor: bc.hex }}
                        className={`w-5 h-5 rounded-full border ${
                          config.backpackColor === bc.hex
                            ? 'border-white scale-110 ring-2 ring-red-500'
                            : 'border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Pose & Animasi */}
        {activeTab === 'animasi' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">
                Uji Animasi Karakter (Kinematika Sendi R6/R15)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ANIMATION_OPTIONS.map((anim) => (
                  <button
                    key={anim.id}
                    type="button"
                    onClick={() => {
                      if (anim.id === 'lompat_hore') {
                        soundFX.playJump(config.soundEnabled);
                      } else if (anim.id === 'hormat_bendera' || anim.id === 'senam_pagi') {
                        soundFX.playWhistle(config.soundEnabled);
                      } else {
                        soundFX.playPop(config.soundEnabled);
                      }
                      onChangeConfig({ animation: anim.id, isPlayMode: false });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.animation === anim.id && !config.isPlayMode
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundFX.playSchoolBell(true);
                }}
                className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-600 text-xs font-medium text-amber-400 whitespace-nowrap shrink-0"
              >
                Bunyikan Bel Sekolah
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Kamera, Waktu & Sistem Cuaca Dinamis */}
        {activeTab === 'lingkungan' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">Sudut Kamera Studio</div>
              <div className="flex flex-wrap gap-1.5">
                {CAMERA_OPTIONS.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() =>
                      handleSelect({
                        cameraPreset: cam.id,
                        isPlayMode: false,
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.cameraPreset === cam.id && !config.isPlayMode
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-xs font-medium text-slate-400 mb-2">Waktu & Pencahayaan</div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect({ timeOfDay: t.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.timeOfDay === t.id
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-400">Cuaca Dinamis Sekolah</span>
                <button
                  type="button"
                  onClick={() =>
                    handleSelect({ autoWeatherCycle: !config.autoWeatherCycle })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                    config.autoWeatherCycle
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {config.autoWeatherCycle ? '🔄 Siklus Otomatis ON' : '🔄 Otomatis OFF'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSelect({ weather: w.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      config.weather === w.id
                        ? 'bg-sky-500 border-sky-400 text-slate-950 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
