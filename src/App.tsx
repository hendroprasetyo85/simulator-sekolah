/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BottomControlDock, DockTabId } from './components/BottomControlDock';
import {
  CharacterViewport3D,
  PenaltyViewportController,
} from './components/CharacterViewport3D';
import {
  CleanupGradeReport,
  CleanupMinigameHUD,
} from './components/CleanupMinigameHUD';
import {
  CrossingGradeReport,
  CrossingMinigameHUD,
} from './components/CrossingMinigameHUD';
import { DampuGradeReport, DampuMinigameHUD } from './components/DampuMinigameHUD';
import {
  EcobrickGradeReport,
  EcobrickMinigameHUD,
} from './components/EcobrickMinigameHUD';
import {
  JumpRopeGradeReport,
  JumpRopeMinigameHUD,
} from './components/JumpRopeMinigameHUD';
import {
  KelerengGradeReport,
  KelerengMinigameHUD,
} from './components/KelerengMinigameHUD';
import { MathGradeReport, MathMinigameHUD } from './components/MathMinigameHUD';
import { MobileInputState, MobileTouchControls } from './components/MobileTouchControls';
import {
  ObstacleRunGradeReport,
  ObstacleRunMinigameHUD,
} from './components/ObstacleRunMinigameHUD';
import {
  CeremonyCameraView,
  OpeningCeremonyHUD,
} from './components/OpeningCeremonyHUD';
import { PenaltyMinigameHUD, PJOKGradeReport } from './components/PenaltyMinigameHUD';
import {
  TonoGradeReport,
  TonoSnackMinigameHUD,
} from './components/TonoSnackMinigameHUD';
import {
  ActiveNPCDialogue,
  CleanupMissionStage,
  PenaltyZoneId,
  PJOKMissionMode,
  SCHOOL_TRASH_ITEMS,
  SchoolTrashItemInfo,
} from './three/SchoolPopulationNPCs';
import {
  AnimationPoseId,
  BACKPACK_COLORS,
  CameraPresetId,
  CharacterConfig,
  DEFAULT_CHARACTER_CONFIG,
  FaceExpressionId,
  HairStyleId,
  HatStyleId,
  HandPropId,
  SCHOOL_LOCATIONS,
  SchoolLocationId,
  SchoolLocationInfo,
  SKIN_TONES,
  UniformPresetId,
  WeatherTypeId,
} from './types/character';
import { soundFX } from './utils/soundFX';

const STUDENT_NAMES_PUTRA = [
  'Budi Santoso',
  'Rizky Pratama',
  'Dimas Saputra',
  'Fajar Nugroho',
  'Bagas Wijaya',
];
const STUDENT_NAMES_PUTRI = [
  'Siti Aminah',
  'Putri Lestari',
  'Nabila Zahra',
  'Alya Rahmawati',
  'Citra Kirana',
];

const CAMERA_CYCLE: CameraPresetId[] = ['three_quarter', 'playground', 'front', 'aerial_map'];
const WEATHER_CYCLE: WeatherTypeId[] = ['cerah', 'berawan', 'hujan'];
const WEATHER_LABELS: Record<WeatherTypeId, string> = {
  cerah: '☀️ Cerah',
  berawan: '⛅ Berawan',
  hujan: '🌧️ Hujan',
};

const GENERAL_MANUAL_PHRASES = [
  'Halo teman-teman semuanya! Semangat belajar di SDN SUSUKAN 03!',
  'Selamat pagi Bapak dan Ibu Guru!',
  'Ayo kita main bersama di halaman sekolah!',
  'Wah, Taman Ecobrick I LOVE SUGA bagus sekali!',
];

export default function App() {
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [activeTab, setActiveTab] = useState<DockTabId>('seragam');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);
  const [currentZone, setCurrentZone] = useState<SchoolLocationInfo>(SCHOOL_LOCATIONS[0]);
  const [activeDialogue, setActiveDialogue] = useState<ActiveNPCDialogue | null>(null);
  const [chatTriggerNonce, setChatTriggerNonce] = useState<number>(0);
  const [customSpeechText, setCustomSpeechText] = useState<string>('');
  const [draftSpeechInput, setDraftSpeechInput] = useState<string>('');
  const [isSpeechBoxOpen, setIsSpeechBoxOpen] = useState<boolean>(false);
  const [isPenaltyGameOpen, setIsPenaltyGameOpen] = useState<boolean>(false);
  const [pjokMissionType, setPjokMissionType] = useState<PJOKMissionMode>('penalty');
  const [penaltyAimZone, setPenaltyAimZone] = useState<PenaltyZoneId>('kiri_atas');
  const [pjokReport, setPjokReport] = useState<PJOKGradeReport | null>(null);

  // Principal's School Cleanup & Waste Sorting Mission State
  const [cleanupStage, setCleanupStage] = useState<CleanupMissionStage>('inactive');
  const [collectedTrashIds, setCollectedTrashIds] = useState<string[]>([]);
  const [lastPickedTrash, setLastPickedTrash] = useState<SchoolTrashItemInfo | null>(null);
  const [cleanupReport, setCleanupReport] = useState<CleanupGradeReport | null>(null);
  const [playerCoords, setPlayerCoords] = useState<[number, number]>([0, 22]);

  // Grade 1 Teacher (Bu Maya, S.Pd.) Mathematics Addition Mission State
  const [isMathGameOpen, setIsMathGameOpen] = useState<boolean>(false);
  const [mathReport, setMathReport] = useState<MathGradeReport | null>(null);

  // Traditional Dampu Bulan (Engklek) Mission State (Wulan & Mentari beside Lapangan Olahraga)
  const [isDampuGameOpen, setIsDampuGameOpen] = useState<boolean>(false);
  const [dampuReport, setDampuReport] = useState<DampuGradeReport | null>(null);

  // Traditional Lompat Tali Karet Mission State (Intan, Dewi & Kartika beside Lapangan Olahraga)
  const [isJumpRopeGameOpen, setIsJumpRopeGameOpen] = useState<boolean>(false);
  const [jumpRopeReport, setJumpRopeReport] = useState<JumpRopeGradeReport | null>(null);

  // Traditional Main Kelereng / Gundu Mission State (Bimo & Ciko beside Lapangan Olahraga)
  const [isKelerengGameOpen, setIsKelerengGameOpen] = useState<boolean>(false);
  const [kelerengReport, setKelerengReport] = useState<KelerengGradeReport | null>(null);

  // Satpam Pak Joko Zebra Cross Crossing Guard Mission State
  const [isCrossingGameOpen, setIsCrossingGameOpen] = useState<boolean>(false);
  const [crossingReport, setCrossingReport] = useState<CrossingGradeReport | null>(null);

  // Laras (Duta Adiwiyata) Ecobrick "I LOVE SUGA" Puzzle Mission State
  const [isEcobrickGameOpen, setIsEcobrickGameOpen] = useState<boolean>(false);
  const [ecobrickReport, setEcobrickReport] = useState<EcobrickGradeReport | null>(null);

  // Tono (Kelas 2A) Street Food Snack & Change Calculation Mission State
  const [isTonoGameOpen, setIsTonoGameOpen] = useState<boolean>(false);
  const [tonoReport, setTonoReport] = useState<TonoGradeReport | null>(null);

  // Pak Budi (Guru PJOK) Obstacle Run (Lari Rintangan Keliling Lapangan) State
  const [isObstacleRunOpen, setIsObstacleRunOpen] = useState<boolean>(false);
  const [obstacleRunReport, setObstacleRunReport] = useState<ObstacleRunGradeReport | null>(null);

  // Opening Flag Ceremony (Upacara Bendera Merah Putih — Lagu Indonesia Raya Full) active on app launch
  const [isOpeningCeremonyActive, setIsOpeningCeremonyActive] = useState<boolean>(true);
  const [ceremonyCameraView, setCeremonyCameraView] =
    useState<CeremonyCameraView>('panoramic');
  const [isMissionMenuOpen, setIsMissionMenuOpen] = useState<boolean>(false);

  const speechInputRef = useRef<HTMLInputElement | null>(null);
  const penaltyControllerRef = useRef<PenaltyViewportController | null>(null);

  const mobileInputRef = useRef<MobileInputState>({
    moveX: 0,
    moveZ: 0,
    isSprinting: false,
    jumpNonce: 0,
  });

  const handleStartPJOKMission = (mode: PJOKMissionMode = 'penalty') => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setPjokMissionType(mode);
    setPenaltyAimZone(mode === 'basket' ? 'tengah_bawah' : 'kiri_atas');
    setIsPenaltyGameOpen(true);
    const sportLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'lapangan_olahraga');
    if (sportLoc) {
      setCurrentZone(sportLoc);
    }
  };

  const handleStartCleanupMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setCollectedTrashIds([]);
    setLastPickedTrash(null);
    setCleanupStage('collecting');
  };

  const handleStartMathMission = () => {
    soundFX.playSchoolBell(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsMathGameOpen(true);
    const kelas1Loc = SCHOOL_LOCATIONS.find((l) => l.id === 'kelas_1');
    if (kelas1Loc) {
      setCurrentZone(kelas1Loc);
    }
  };

  const handleStartDampuMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsDampuGameOpen(true);
    const dampuLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'permainan_tradisional');
    if (dampuLoc) {
      setCurrentZone(dampuLoc);
    }
  };

  const handleStartJumpRopeMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsJumpRopeGameOpen(true);
    const tradLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'permainan_tradisional');
    if (tradLoc) {
      setCurrentZone(tradLoc);
    }
  };

  const handleStartKelerengMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsKelerengGameOpen(true);
    const tradLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'permainan_tradisional');
    if (tradLoc) {
      setCurrentZone(tradLoc);
    }
  };

  const handleStartCrossingMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsCrossingGameOpen(true);
    const gateLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'gerbang_sekolah');
    if (gateLoc) {
      setCurrentZone(gateLoc);
    }
  };

  const handleStartEcobrickMission = () => {
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsEcobrickGameOpen(true);
    const gateLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'gerbang_sekolah');
    if (gateLoc) {
      setCurrentZone(gateLoc);
    }
  };

  const handleStartTonoMission = () => {
    soundFX.playPop(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsObstacleRunOpen(false);
    setIsTonoGameOpen(true);
    const gateLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'gerbang_sekolah');
    if (gateLoc) {
      setCurrentZone(gateLoc);
    }
  };

  const handleStartObstacleRunMission = () => {
    soundFX.playWhistle(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsOpeningCeremonyActive(false);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(true);
    const sportLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'lapangan_olahraga');
    if (sportLoc) {
      setCurrentZone(sportLoc);
    }
  };

  const handleStartOpeningCeremony = () => {
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen(false);
    setIsDockCollapsed(true);
    setIsPenaltyGameOpen(false);
    setCleanupStage('inactive');
    setIsMathGameOpen(false);
    setIsDampuGameOpen(false);
    setIsJumpRopeGameOpen(false);
    setIsKelerengGameOpen(false);
    setIsCrossingGameOpen(false);
    setIsEcobrickGameOpen(false);
    setIsTonoGameOpen(false);
    setIsObstacleRunOpen(false);
    setCeremonyCameraView('panoramic');
    setIsOpeningCeremonyActive(true);
    const ceremonyLoc = SCHOOL_LOCATIONS.find((l) => l.id === 'lapangan_upacara');
    if (ceremonyLoc) {
      setCurrentZone(ceremonyLoc);
    }
  };

  const { nearestUncollectedTrash, nearestTrashDistance } = React.useMemo(() => {
    let best: SchoolTrashItemInfo | null = null;
    let bestDistSq = Infinity;
    for (const item of SCHOOL_TRASH_ITEMS) {
      if (collectedTrashIds.includes(item.id)) continue;
      const dx = playerCoords[0] - item.pos[0];
      const dz = playerCoords[1] - item.pos[1];
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = item;
      }
    }
    return {
      nearestUncollectedTrash: best,
      nearestTrashDistance: best ? Math.sqrt(bestDistSq) : Infinity,
    };
  }, [collectedTrashIds, playerCoords]);

  const handleChangeConfig = (partial: Partial<CharacterConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleTeleportToLocation = (locId: SchoolLocationId) => {
    soundFX.playPop(config.soundEnabled);
    setIsMissionMenuOpen(false);
    const targetInfo = SCHOOL_LOCATIONS.find((l) => l.id === locId);
    if (targetInfo) {
      setCurrentZone(targetInfo);
    }
    setConfig((prev) => ({
      ...prev,
      activeLocation: locId,
      locationTriggerNonce: prev.locationTriggerNonce + 1,
      explodedFactor: 0,
      cameraPreset: prev.cameraPreset === 'aerial_map' ? 'three_quarter' : prev.cameraPreset,
    }));
  };

  const handleCycleCamera = () => {
    soundFX.playPop(config.soundEnabled);
    const idx = CAMERA_CYCLE.indexOf(config.cameraPreset);
    const nextPreset = CAMERA_CYCLE[(idx + 1) % CAMERA_CYCLE.length];
    setConfig((prev) => ({ ...prev, cameraPreset: nextPreset }));
  };

  const handleCycleWeather = () => {
    soundFX.playPop(config.soundEnabled);
    const idx = WEATHER_CYCLE.indexOf(config.weather);
    const nextWeather = WEATHER_CYCLE[(idx + 1) % WEATHER_CYCLE.length];
    setConfig((prev) => ({ ...prev, weather: nextWeather }));
  };

  // Optional automatic dynamic weather transition every 40 seconds when autoWeatherCycle is enabled
  useEffect(() => {
    if (!config.autoWeatherCycle) return;
    const timer = window.setInterval(() => {
      setConfig((prev) => {
        const idx = WEATHER_CYCLE.indexOf(prev.weather);
        const nextWeather = WEATHER_CYCLE[(idx + 1) % WEATHER_CYCLE.length];
        return { ...prev, weather: nextWeather };
      });
    }, 40000);
    return () => window.clearInterval(timer);
  }, [config.autoWeatherCycle]);

  const handleRandomizeCharacter = () => {
    const isPutri = Math.random() > 0.5;
    const names = isPutri ? STUDENT_NAMES_PUTRI : STUDENT_NAMES_PUTRA;
    const randomName = names[Math.floor(Math.random() * names.length)];
    const uniforms: UniformPresetId[] = ['merah_putih', 'pramuka', 'batik', 'olahraga'];
    const chosenUniform = uniforms[Math.floor(Math.random() * uniforms.length)];
    const expressions: FaceExpressionId[] = ['ceria', 'semangat', 'fokus', 'kacamata', 'kaget'];
    const props: HandPropId[] = ['buku_sidu', 'penggaris_kayu', 'es_loli', 'bola_kasti', 'none'];
    const animations: AnimationPoseId[] = [
      'idle',
      'hormat_bendera',
      'senam_pagi',
      'lompat_hore',
      'baca_buku',
    ];
    const hairs: HairStyleId[] = isPutri
      ? ['kuncir_dua', 'poni_rata', 'belah_samping']
      : ['pendek_rapi', 'belah_samping'];
    const hats: HatStyleId[] =
      chosenUniform === 'pramuka'
        ? ['baret_pramuka', 'none']
        : isPutri
        ? ['topi_sd', 'pita_rambut', 'none']
        : ['topi_sd', 'peci', 'none'];

    setConfig((prev) => ({
      ...prev,
      studentName: randomName,
      genderStyle: isPutri ? 'putri' : 'putra',
      uniform: chosenUniform,
      skinTone: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].hex,
      expression: expressions[Math.floor(Math.random() * expressions.length)],
      hairStyle: hairs[Math.floor(Math.random() * hairs.length)],
      hat: hats[Math.floor(Math.random() * hats.length)],
      handProp: props[Math.floor(Math.random() * props.length)],
      backpackColor: BACKPACK_COLORS[Math.floor(Math.random() * BACKPACK_COLORS.length)].hex,
      hasBackpack: Math.random() > 0.15,
      hasTieOrNeckerchief: chosenUniform !== 'olahraga',
      animation: animations[Math.floor(Math.random() * animations.length)],
    }));
  };

  const handleManualSpeak = (messageToSpeak: string) => {
    const clean = messageToSpeak.trim();
    if (!clean) return;
    setCustomSpeechText(clean);
    setChatTriggerNonce((n) => n + 1);
    setDraftSpeechInput('');
  };

  const handleToggleSpeechBox = () => {
    soundFX.playPop(config.soundEnabled);
    setIsMissionMenuOpen(false);
    setIsSpeechBoxOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => speechInputRef.current?.focus(), 60);
      }
      return next;
    });
  };

  // Keyboard shortcuts: 'H' to toggle bottom dock, 'E' to open manual speech box
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        if (e.code === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setIsSpeechBoxOpen(false);
        }
        return;
      }
      if (e.code === 'KeyH') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        setIsMissionMenuOpen(false);
        setIsSpeechBoxOpen(true);
        window.setTimeout(() => speechInputRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isAnyMinigameOpen =
    isOpeningCeremonyActive ||
    isPenaltyGameOpen ||
    cleanupStage !== 'inactive' ||
    isMathGameOpen ||
    isDampuGameOpen ||
    isJumpRopeGameOpen ||
    isKelerengGameOpen ||
    isCrossingGameOpen ||
    isEcobrickGameOpen ||
    isTonoGameOpen ||
    isObstacleRunOpen;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* Minimal & Clean Top Bar (Hidden during active missions for a clean, unobstructed view) */}
      {!isAnyMinigameOpen && (
      <header className="fixed top-2 left-2 right-2 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left Pill: Brand + Quick Location Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-2.5 py-1.5 shadow-lg pointer-events-auto">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleTeleportToLocation('gerbang_sekolah');
            }}
            className="text-xs sm:text-sm font-extrabold tracking-tight text-white whitespace-nowrap pr-1"
          >
            BloxSD
          </a>

          <select
            aria-label="Pilih Lokasi Sekolah"
            value={config.activeLocation}
            onChange={(e) => handleTeleportToLocation(e.target.value as SchoolLocationId)}
            className="bg-slate-900/90 text-slate-100 text-xs font-medium px-2 py-1 rounded-lg border border-slate-700/80 focus:outline-none focus:border-amber-400 max-w-[145px] sm:max-w-[190px] truncate cursor-pointer"
          >
            {SCHOOL_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                📍 {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Pill: Compact Action Controls (Misi Dropdown, Bicara, Cuaca, Suara, Kamera, Menu) */}
        <div className="relative flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              soundFX.playPop(config.soundEnabled);
              setIsSpeechBoxOpen(false);
              setIsMissionMenuOpen((prev) => !prev);
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              isMissionMenuOpen
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
            }`}
            title="Pilih Misi Permainan Sekolah"
          >
            🎯 Misi
          </button>

          <button
            type="button"
            onClick={handleToggleSpeechBox}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              isSpeechBoxOpen
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-emerald-300 hover:bg-slate-800'
            }`}
            title="Ucapkan kalimat manual [E]"
          >
            💬 Bicara
          </button>

          <button
            type="button"
            onClick={handleCycleWeather}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
            title={`Cuaca: ${WEATHER_LABELS[config.weather]} (Klik untuk ganti)`}
          >
            {config.weather === 'hujan' ? '🌧️' : config.weather === 'berawan' ? '⛅' : '☀️'}
          </button>

          <button
            type="button"
            onClick={() => {
              const nextSound = !config.soundEnabled;
              if (!nextSound) {
                soundFX.stopAllVoices();
              } else {
                soundFX.playPop(true);
              }
              handleChangeConfig({ soundEnabled: nextSound });
            }}
            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
              config.soundEnabled
                ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800'
                : 'bg-slate-900 text-slate-500 hover:bg-slate-800'
            }`}
            title={config.soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
          >
            {config.soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            type="button"
            onClick={handleCycleCamera}
            className="hidden sm:inline-flex px-2 py-1 text-xs rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors"
            title="Ganti Sudut Kamera"
          >
            🎥
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playPop(config.soundEnabled);
              setIsMissionMenuOpen(false);
              setIsDockCollapsed((prev) => !prev);
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              isDockCollapsed
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {isDockCollapsed ? '⚙️ Menu' : '✕'}
          </button>

          {/* Compact Dropdown Menu for School Missions */}
          {isMissionMenuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-xl p-1.5 shadow-2xl space-y-1 z-30">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pilih Misi Sekolah
              </div>
              <button
                type="button"
                onClick={handleStartOpeningCeremony}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 transition-colors text-left"
              >
                <span>🇲🇨 Upacara Bendera</span>
                <span className="text-[10px] font-bold text-amber-300">Instrumental</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartPJOKMission('penalty')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>⚽ Penalti PJOK</span>
                {pjokReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {pjokReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleStartPJOKMission('basket')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-orange-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🏀 Basket PJOK</span>
                {pjokReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {pjokReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartObstacleRunMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-lime-400 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🏃 Lari Rintangan (Pak Budi)</span>
                {obstacleRunReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {obstacleRunReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartCleanupMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🧹 Kebersihan Sekolah</span>
                {cleanupReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {cleanupReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartMathMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>➕ Matematika Kelas 1</span>
                {mathReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {mathReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartDampuMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-pink-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🌙 Dampu Bulan</span>
                {dampuReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {dampuReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartJumpRopeMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🪢 Lompat Tali (Intan)</span>
                {jumpRopeReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {jumpRopeReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartKelerengMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🔮 Main Kelereng (Bimo)</span>
                {kelerengReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {kelerengReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartCrossingMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🚸 Seberang Jalan (Satpam)</span>
                {crossingReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {crossingReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartEcobrickMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>♻️ Puzzle Ecobrick (Laras)</span>
                {ecobrickReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {ecobrickReport.letterGrade}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleStartTonoMission}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:bg-slate-800/90 transition-colors text-left"
              >
                <span>🍢 Jajan Tono (Hitung Uang)</span>
                {tonoReport && (
                  <span className="text-[10px] font-bold text-amber-300">
                    {tonoReport.letterGrade}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>
      )}

      {/* Simple & Compact NPC Chat + Manual Speech Bar (Hidden during Mini-Games) */}
      {!isAnyMinigameOpen && (activeDialogue || isSpeechBoxOpen) ? (
        <div className="fixed top-13 left-1/2 -translate-x-1/2 z-10 w-[92vw] max-w-sm pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-2 text-xs shadow-xl space-y-1.5">
            {activeDialogue && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-300 truncate">
                    🔊 {activeDialogue.npcName.split('(')[0].trim()}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {activeDialogue.npcName.includes('Pak Budi') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartPJOKMission('penalty')}
                          className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                        >
                          ⚽ Penalti
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartPJOKMission('basket')}
                          className="px-2 py-0.5 rounded-md bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-[11px]"
                        >
                          🏀 Basket
                        </button>
                        <button
                          type="button"
                          onClick={handleStartObstacleRunMission}
                          className="px-2 py-0.5 rounded-md bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-[11px]"
                        >
                          🏃 Lari Rintangan
                        </button>
                      </>
                    )}
                    {activeDialogue.role === 'kepsek' && (
                      <button
                        type="button"
                        onClick={handleStartCleanupMission}
                        className="px-2 py-0.5 rounded-md bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[11px]"
                      >
                        🧹 Misi
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Bu Maya') ||
                      currentZone.id === 'kelas_1') && (
                      <button
                        type="button"
                        onClick={handleStartMathMission}
                        className="px-2 py-0.5 rounded-md bg-purple-400 hover:bg-purple-300 text-slate-950 font-bold text-[11px]"
                      >
                        ➕ MTK
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Wulan') ||
                      activeDialogue.npcName.includes('Mentari') ||
                      currentZone.id === 'permainan_tradisional') && (
                      <button
                        type="button"
                        onClick={handleStartDampuMission}
                        className="px-2 py-0.5 rounded-md bg-pink-400 hover:bg-pink-300 text-slate-950 font-bold text-[11px]"
                      >
                        🌙 Dampu Bulan
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Intan') ||
                      activeDialogue.npcName.includes('Dewi') ||
                      activeDialogue.npcName.includes('Kartika') ||
                      currentZone.id === 'permainan_tradisional') && (
                      <button
                        type="button"
                        onClick={handleStartJumpRopeMission}
                        className="px-2 py-0.5 rounded-md bg-rose-400 hover:bg-rose-300 text-slate-950 font-bold text-[11px]"
                      >
                        🪢 Lompat Tali
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Bimo') ||
                      activeDialogue.npcName.includes('Ciko') ||
                      currentZone.id === 'permainan_tradisional') && (
                      <button
                        type="button"
                        onClick={handleStartKelerengMission}
                        className="px-2 py-0.5 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px]"
                      >
                        🔮 Kelereng
                      </button>
                    )}
                    {(activeDialogue.role === 'satpam' ||
                      activeDialogue.npcName.includes('Siswa Penyeberang') ||
                      currentZone.id === 'gerbang_sekolah') && (
                      <button
                        type="button"
                        onClick={handleStartCrossingMission}
                        className="px-2 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px]"
                      >
                        🚸 Seberang Jalan
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Laras') ||
                      currentZone.id === 'gerbang_sekolah') && (
                      <button
                        type="button"
                        onClick={handleStartEcobrickMission}
                        className="px-2 py-0.5 rounded-md bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px]"
                      >
                        ♻️ Puzzle Ecobrick
                      </button>
                    )}
                    {(activeDialogue.npcName.includes('Tono') ||
                      activeDialogue.npcName.includes('Mang Asep') ||
                      activeDialogue.npcName.includes('Bang Udin') ||
                      activeDialogue.npcName.includes('Mang Dedi') ||
                      currentZone.id === 'gerbang_sekolah') && (
                      <button
                        type="button"
                        onClick={handleStartTonoMission}
                        className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                      >
                        🍢 Bantu Jajan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpeechBoxOpen((prev) => !prev);
                        window.setTimeout(() => speechInputRef.current?.focus(), 50);
                      }}
                      className="px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px]"
                    >
                      {isSpeechBoxOpen ? '✕' : '💬 Balas'}
                    </button>
                  </div>
                </div>
                <p className="text-slate-100 text-[11px] leading-snug line-clamp-2">
                  &ldquo;{activeDialogue.message}&rdquo;
                </p>
                {activeDialogue.playerReply && (
                  <p className="text-[11px] text-emerald-300 truncate">
                    <span className="font-semibold text-white">{config.studentName}:</span>{' '}
                    &ldquo;{activeDialogue.playerReply}&rdquo;
                  </p>
                )}
              </div>
            )}

            {isSpeechBoxOpen && (
              <div className={`${activeDialogue ? 'pt-1.5 border-t border-slate-800' : ''} space-y-1.5`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleManualSpeak(draftSpeechInput);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    ref={speechInputRef}
                    type="text"
                    value={draftSpeechInput}
                    onChange={(e) => setDraftSpeechInput(e.target.value)}
                    placeholder={`Ketik ucapan ${config.studentName.split(' ')[0]}...`}
                    maxLength={120}
                    className="flex-1 min-w-0 bg-slate-900 text-white placeholder-slate-400 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={!draftSpeechInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs shrink-0"
                  >
                    Ucapkan
                  </button>
                  {!activeDialogue && (
                    <button
                      type="button"
                      onClick={() => setIsSpeechBoxOpen(false)}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </form>

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {(activeDialogue?.suggestedReplies || GENERAL_MANUAL_PHRASES)
                    .slice(0, 3)
                    .map((phrase, i) => {
                      const shortLabels = ['👋 Sapa Sopan', '👍 Siap Semangat', '⚽ Ajak Main'];
                      return (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => handleManualSpeak(phrase)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-emerald-950 text-slate-200 hover:text-emerald-300 border border-slate-700/80 whitespace-nowrap shrink-0"
                          title={phrase}
                        >
                          {shortLabels[i] || '💬 Sapa'}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Fullscreen 3D Viewport */}
      <main className="w-full h-full">
        <CharacterViewport3D
          config={config}
          chatTriggerNonce={chatTriggerNonce}
          customSpeechText={customSpeechText}
          openingCeremonyActive={isOpeningCeremonyActive}
          ceremonyCameraView={ceremonyCameraView}
          penaltyMinigameActive={isPenaltyGameOpen}
          pjokMissionType={pjokMissionType}
          penaltyAimZone={penaltyAimZone}
          cleanupMissionStage={cleanupStage}
          collectedTrashIds={collectedTrashIds}
          mathMinigameActive={isMathGameOpen}
          dampuMinigameActive={isDampuGameOpen}
          jumpRopeMinigameActive={isJumpRopeGameOpen}
          kelerengMinigameActive={isKelerengGameOpen}
          crossingMinigameActive={isCrossingGameOpen}
          ecobrickMinigameActive={isEcobrickGameOpen}
          tonoMinigameActive={isTonoGameOpen}
          obstacleRunActive={isObstacleRunOpen}
          onTrashPickedUp={(item) => {
            setLastPickedTrash(item);
            setCollectedTrashIds((prev) =>
              prev.includes(item.id) ? prev : [...prev, item.id]
            );
          }}
          onRegisterPenaltyController={(ctrl) => {
            penaltyControllerRef.current = ctrl;
          }}
          mobileInputRef={mobileInputRef}
          onUpdatePlayerCoords={(x, z, nearest) => {
            setPlayerCoords([x, z]);
            setCurrentZone(nearest);
          }}
          onUpdateActiveDialogue={(diag) => {
            setActiveDialogue(diag);
          }}
        />
      </main>

      {/* Interactive 10-Shot PJOK Mini-Game HUD Overlay (Penalty Shootout & Basketball Hoop) */}
      {isPenaltyGameOpen && (
        <PenaltyMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          missionType={pjokMissionType}
          onSwitchMissionType={(mode) => {
            setPjokMissionType(mode);
            setPenaltyAimZone(mode === 'basket' ? 'tengah_bawah' : 'kiri_atas');
          }}
          aimZone={penaltyAimZone}
          onSelectAimZone={setPenaltyAimZone}
          onExecuteKick={(zone, power, mode) => {
            if (!penaltyControllerRef.current) return null;
            return penaltyControllerRef.current.executeKick(zone, power, mode);
          }}
          onResetBallForNextShot={() => {
            penaltyControllerRef.current?.resetBall();
          }}
          onFinishMission={(report) => {
            setPjokReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsPenaltyGameOpen(false);
          }}
        />
      )}

      {/* Interactive Principal's School Cleanup & 4-Bin Waste Sorting Game HUD Overlay */}
      {cleanupStage !== 'inactive' && (
        <CleanupMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          stage={cleanupStage}
          collectedIds={collectedTrashIds}
          nearestTrash={nearestUncollectedTrash}
          nearestTrashDistance={nearestTrashDistance}
          lastPickedItem={lastPickedTrash}
          onChangeStage={(nextStage) => {
            setLastPickedTrash(null);
            setCleanupStage(nextStage);
          }}
          onManualPickupTrash={(item) => {
            const picked = penaltyControllerRef.current?.manualPickupTrash(item.id);
            if (picked) {
              setLastPickedTrash(picked);
              setCollectedTrashIds((prev) =>
                prev.includes(picked.id) ? prev : [...prev, picked.id]
              );
            }
          }}
          onExecuteSortThrow={(item, chosenBin) => {
            if (!penaltyControllerRef.current) return null;
            return penaltyControllerRef.current.executeTrashSort(item, chosenBin);
          }}
          onRestartCleanupMission={() => {
            setCollectedTrashIds([]);
            setLastPickedTrash(null);
            setCleanupStage('collecting');
          }}
          onFinishCleanupMission={(report) => {
            setCleanupReport(report);
          }}
          onExitCleanupMission={() => {
            soundFX.playPop(config.soundEnabled);
            setCleanupStage('inactive');
          }}
        />
      )}

      {/* Interactive Grade 1 Teacher (Bu Maya, S.Pd.) Mathematics Addition Mini-Game HUD Overlay */}
      {isMathGameOpen && (
        <MathMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onSyncChalkboard={(title, equation, subtext, isCorrect, teacherComment) => {
            penaltyControllerRef.current?.syncMathChalkboard(
              title,
              equation,
              subtext,
              isCorrect,
              teacherComment
            );
          }}
          onFinishMission={(report) => {
            setMathReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsMathGameOpen(false);
          }}
        />
      )}

      {/* Interactive Traditional Dampu Bulan (Engklek) Mini-Game HUD Overlay */}
      {isDampuGameOpen && (
        <DampuMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onExecuteGacoThrow={(targetSquareId, isGoodThrow, comment) => {
            penaltyControllerRef.current?.executeDampuGacoThrow(
              targetSquareId,
              isGoodThrow,
              comment
            );
          }}
          onExecuteHop={(worldX, worldZ, comment, isSuccess) => {
            penaltyControllerRef.current?.executeDampuHop(
              worldX,
              worldZ,
              'engklek_1',
              comment,
              isSuccess
            );
          }}
          onFinishMission={(report) => {
            setDampuReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsDampuGameOpen(false);
          }}
        />
      )}

      {/* Interactive Traditional Lompat Tali Karet Mini-Game HUD Overlay (NPC Intan) */}
      {isJumpRopeGameOpen && (
        <JumpRopeMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onExecuteJumpRopeLeap={(
            isSuccess,
            jumpBoost,
            intanComment,
            ropeSpeedMultiplier
          ) => {
            penaltyControllerRef.current?.executeJumpRopeLeap(
              isSuccess,
              jumpBoost,
              intanComment,
              ropeSpeedMultiplier
            );
          }}
          onFinishMission={(report) => {
            setJumpRopeReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsJumpRopeGameOpen(false);
          }}
        />
      )}

      {/* Interactive Traditional Main Kelereng / Gundu Mini-Game HUD Overlay (NPC Bimo & Ciko) */}
      {isKelerengGameOpen && (
        <KelerengMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onExecuteMarbleFlick={(targetIndex, isHit, isPerfect, comment) => {
            penaltyControllerRef.current?.executeKelerengFlick(
              targetIndex,
              isHit,
              isPerfect,
              comment
            );
          }}
          onResetMarbles={() => {
            penaltyControllerRef.current?.resetKelerengMarbles();
          }}
          onFinishMission={(report) => {
            setKelerengReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsKelerengGameOpen(false);
          }}
        />
      )}

      {/* Interactive Satpam Pak Joko Zebra Cross Crossing Guard Mini-Game HUD Overlay */}
      {isCrossingGameOpen && (
        <CrossingMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onExecuteCrossingSignal={(waveIndex, isSafe, isPerfect, comment) => {
            penaltyControllerRef.current?.executeCrossingSignal(
              waveIndex,
              isSafe,
              isPerfect,
              comment
            );
          }}
          onFinishMission={(report) => {
            setCrossingReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsCrossingGameOpen(false);
          }}
        />
      )}

      {/* Interactive Laras (Duta Adiwiyata) Ecobrick "I LOVE SUGA" Puzzle Mini-Game HUD Overlay */}
      {isEcobrickGameOpen && (
        <EcobrickMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onTriggerWindScatter={() => {
            penaltyControllerRef.current?.triggerEcobrickWindScatter();
          }}
          onSnapEcobrickPiece={(slotIndex, char, isPerfectUpright, comment) => {
            penaltyControllerRef.current?.snapEcobrickPiece(
              slotIndex,
              char,
              isPerfectUpright,
              comment
            );
          }}
          onFinishMission={(report) => {
            setEcobrickReport(report);
          }}
          onExitMission={() => {
            soundFX.playPop(config.soundEnabled);
            setIsEcobrickGameOpen(false);
          }}
        />
      )}

      {/* Interactive Tono Snack & Change Calculation Mini-Game HUD Overlay */}
      {isTonoGameOpen && (
        <TonoSnackMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onClose={() => {
            soundFX.playPop(config.soundEnabled);
            setIsTonoGameOpen(false);
          }}
          onFinishMission={(report) => {
            setTonoReport(report);
          }}
          onSyncComment={(comment, isSuccess) => {
            penaltyControllerRef.current?.syncTonoComment(comment, isSuccess);
          }}
        />
      )}

      {/* Interactive Pak Budi Obstacle Run Mini-Game HUD Overlay (Lari Rintangan Keliling Lapangan) */}
      {isObstacleRunOpen && (
        <ObstacleRunMinigameHUD
          studentName={config.studentName}
          soundEnabled={config.soundEnabled}
          onClose={() => {
            soundFX.playPop(config.soundEnabled);
            setIsObstacleRunOpen(false);
          }}
          onFinishMission={(report) => {
            setObstacleRunReport(report);
          }}
          onSyncProgress={(dist, jumpY, isSprinting) => {
            penaltyControllerRef.current?.syncObstacleRunProgress(dist, jumpY, isSprinting);
          }}
          onKnockObstacle={(obsId) => {
            penaltyControllerRef.current?.knockObstacle(obsId);
          }}
          onResetObstacles={() => {
            penaltyControllerRef.current?.resetObstacles?.();
          }}
          onSyncComment={(comment, isSuccess) => {
            penaltyControllerRef.current?.syncPakBudiCoach(comment, isSuccess);
          }}
          onTriggerFall={(duration) => {
            penaltyControllerRef.current?.triggerFallAnimation?.(duration);
          }}
        />
      )}

      {/* Opening Flag Ceremony (Upacara Bendera Merah Putih — Lagu Indonesia Raya Full Tanpa Dipotong) */}
      {isOpeningCeremonyActive && (
        <OpeningCeremonyHUD
          soundEnabled={config.soundEnabled}
          cameraView={ceremonyCameraView}
          onChangeCameraView={setCeremonyCameraView}
          onUpdateFlagProgress={(progress) => {
            penaltyControllerRef.current?.setCeremonyFlagProgress(progress);
          }}
          onFinishCeremony={() => {
            soundFX.playPop(config.soundEnabled);
            setIsOpeningCeremonyActive(false);
          }}
        />
      )}

      {/* Mobile On-Screen Touch Controls (Joystick + Jump/Sprint/Chat) — also active while walking to search for trash! */}
      {isDockCollapsed &&
        !isOpeningCeremonyActive &&
        !isPenaltyGameOpen &&
        !isMathGameOpen &&
        !isDampuGameOpen &&
        !isJumpRopeGameOpen &&
        !isKelerengGameOpen &&
        !isCrossingGameOpen &&
        !isEcobrickGameOpen &&
        !isTonoGameOpen &&
        !isObstacleRunOpen &&
        cleanupStage !== 'sorting' && (
          <MobileTouchControls
            mobileInputRef={mobileInputRef}
            activeDialogue={activeDialogue}
            onTriggerChat={handleToggleSpeechBox}
          />
        )}

      {/* Collapsible Customization Drawer */}
      {!isAnyMinigameOpen && (
        <BottomControlDock
          config={config}
          activeTab={activeTab}
          isCollapsed={isDockCollapsed}
          onSelectTab={setActiveTab}
          onToggleCollapse={() => {
            soundFX.playPop(config.soundEnabled);
            setIsDockCollapsed((prev) => !prev);
          }}
          onChangeConfig={handleChangeConfig}
          onTeleportToLocation={(locId) => {
            handleTeleportToLocation(locId);
            setIsDockCollapsed(true);
          }}
          onRandomizeCharacter={handleRandomizeCharacter}
        />
      )}
    </div>
  );
}
