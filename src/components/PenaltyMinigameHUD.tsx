import React, { useEffect, useRef, useState } from 'react';
import {
  BASKET_ZONES,
  PENALTY_ZONES,
  PenaltyKickResult,
  PenaltyShotOutcome,
  PenaltyZoneId,
  PJOKMissionMode,
} from '../three/SchoolPopulationNPCs';
import { soundFX } from '../utils/soundFX';

export interface PJOKGradeReport {
  missionType: PJOKMissionMode;
  goals: number;
  totalShots: number;
  score: number;
  letterGrade: string;
  predicate: string;
  teacherNote: string;
}

export function calculatePJOKGrade(
  goals: number,
  missionType: PJOKMissionMode = 'penalty'
): PJOKGradeReport {
  const isBasket = missionType === 'basket';
  let score = 50;
  let letterGrade = 'D';
  let predicate = 'Perlu Latihan Lagi';
  let teacherNote = isBasket
    ? 'Ayo bidik Swish Tengah atau Pantul Papan saat indikator di zona hijau agar nilai PJOK kamu bagus!'
    : 'Ayo bidik pojok gawang di zona hijau agar nilai olahragamu bagus!';

  if (goals >= 9) {
    score = goals === 10 ? 100 : 96;
    letterGrade = 'A+';
    predicate = 'Sangat Bagus (Istimewa)';
    teacherNote = isBasket
      ? 'Sempurna! Akurasi tembakan 3-point & lemparan basketmu luar biasa, nilai PJOK kamu A+!'
      : 'Sempurna! Akurasi tendangan penaltimu luar biasa, nilai PJOK kamu A+!';
  } else if (goals >= 7) {
    score = goals === 8 ? 90 : 85;
    letterGrade = 'A';
    predicate = 'Bagus Sekali';
    teacherNote = isBasket
      ? 'Hebat! Banyak bola basket masuk ke ring, nilai pelajaran olahragamu sangat bagus!'
      : 'Hebat! Kamu mencetak banyak gol, nilai pelajaran olahragamu sangat bagus!';
  } else if (goals >= 5) {
    score = goals === 6 ? 80 : 75;
    letterGrade = 'B+';
    predicate = 'Bagus (Lulus)';
    teacherNote = isBasket
      ? 'Bagus! Kamu lulus ujian praktik melempar bola basket PJOK!'
      : 'Bagus! Kamu lulus ujian praktik penalti PJOK!';
  } else if (goals >= 3) {
    score = 65;
    letterGrade = 'C';
    predicate = 'Cukup';
    teacherNote = 'Cukup baik, ayo coba lagi supaya nilai olahragamu menjadi A!';
  }

  return {
    missionType,
    goals,
    totalShots: 10,
    score,
    letterGrade,
    predicate,
    teacherNote,
  };
}

const ZONE_ORDER: PenaltyZoneId[] = [
  'kiri_atas',
  'tengah_atas',
  'kanan_atas',
  'kiri_bawah',
  'tengah_bawah',
  'kanan_bawah',
];

interface PenaltyMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  missionType: PJOKMissionMode;
  onSwitchMissionType: (mode: PJOKMissionMode) => void;
  aimZone: PenaltyZoneId;
  onSelectAimZone: (zone: PenaltyZoneId) => void;
  onExecuteKick: (
    zone: PenaltyZoneId,
    power: number,
    missionType: PJOKMissionMode
  ) => PenaltyKickResult | null;
  onResetBallForNextShot: () => void;
  onFinishMission: (report: PJOKGradeReport) => void;
  onExitMission: () => void;
}

export const PenaltyMinigameHUD: React.FC<PenaltyMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  missionType,
  onSwitchMissionType,
  aimZone,
  onSelectAimZone,
  onExecuteKick,
  onResetBallForNextShot,
  onFinishMission,
  onExitMission,
}) => {
  const TOTAL_CHANCES = 10;
  const isBasket = missionType === 'basket';
  const [shotsHistory, setShotsHistory] = useState<(PenaltyShotOutcome | null)[]>(
    Array(TOTAL_CHANCES).fill(null)
  );
  const [currentShotIdx, setCurrentShotIdx] = useState<number>(0);
  const [isKicking, setIsKicking] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<PenaltyKickResult | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [powerValue, setPowerValue] = useState<number>(68);

  const powerRef = useRef<number>(68);
  const powerDirRef = useRef<number>(1);
  const aimZoneRef = useRef<PenaltyZoneId>(aimZone);
  const isKickingRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  const missionTypeRef = useRef<PJOKMissionMode>(missionType);

  useEffect(() => {
    aimZoneRef.current = aimZone;
  }, [aimZone]);

  useEffect(() => {
    isKickingRef.current = isKicking;
  }, [isKicking]);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    missionTypeRef.current = missionType;
    // Reset 10 chances cleanly when switching between Penalti and Basket
    setShotsHistory(Array(TOTAL_CHANCES).fill(null));
    setCurrentShotIdx(0);
    setIsKicking(false);
    setLastResult(null);
    setIsCompleted(false);
    onResetBallForNextShot();
  }, [missionType]);

  // Oscillating Power & Accuracy Timing Bar
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const updateMeter = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isKickingRef.current && !isCompletedRef.current) {
        let next = powerRef.current + powerDirRef.current * dt * 118;
        if (next >= 100) {
          next = 100;
          powerDirRef.current = -1;
        } else if (next <= 8) {
          next = 8;
          powerDirRef.current = 1;
        }
        powerRef.current = next;
        setPowerValue(Math.round(next));
      }
      rafId = requestAnimationFrame(updateMeter);
    };

    rafId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const goalsScored = shotsHistory.filter((s) => s === 'goal').length;
  const liveReport = calculatePJOKGrade(goalsScored, missionType);

  const handleKickNow = () => {
    if (isKickingRef.current || isCompletedRef.current || currentShotIdx >= TOTAL_CHANCES) return;

    setIsKicking(true);
    const lockedPower = Math.round(powerRef.current);
    const chosenZone = aimZoneRef.current;
    const activeMode = missionTypeRef.current;

    const result = onExecuteKick(chosenZone, lockedPower, activeMode);
    if (!result) {
      setIsKicking(false);
      return;
    }

    setLastResult(result);
    const updatedHistory = [...shotsHistory];
    updatedHistory[currentShotIdx] = result.outcome;
    setShotsHistory(updatedHistory);

    const nextIdx = currentShotIdx + 1;
    window.setTimeout(() => {
      if (nextIdx >= TOTAL_CHANCES) {
        const finalGoals = updatedHistory.filter((s) => s === 'goal').length;
        const finalGrade = calculatePJOKGrade(finalGoals, activeMode);
        setIsCompleted(true);
        setIsKicking(false);
        onFinishMission(finalGrade);
        if (finalGoals >= 5) {
          soundFX.playGoalCheer(soundEnabled);
        }
      } else {
        setCurrentShotIdx(nextIdx);
        setIsKicking(false);
        setLastResult(null);
        onResetBallForNextShot();
        soundFX.playWhistle(soundEnabled);
      }
    }, 1350);
  };

  const handleRestartMission = () => {
    soundFX.playWhistle(soundEnabled);
    setShotsHistory(Array(TOTAL_CHANCES).fill(null));
    setCurrentShotIdx(0);
    setIsKicking(false);
    setLastResult(null);
    setIsCompleted(false);
    onResetBallForNextShot();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCompletedRef.current) return;
      const curIdx = ZONE_ORDER.indexOf(aimZoneRef.current);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        const col = curIdx % 3;
        const row = Math.floor(curIdx / 3);
        onSelectAimZone(ZONE_ORDER[row * 3 + Math.max(0, col - 1)]);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        const col = curIdx % 3;
        const row = Math.floor(curIdx / 3);
        onSelectAimZone(ZONE_ORDER[row * 3 + Math.min(2, col + 1)]);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        onSelectAimZone(ZONE_ORDER[curIdx % 3]);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        onSelectAimZone(ZONE_ORDER[3 + (curIdx % 3)]);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleKickNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const isSweetSpot = powerValue >= 50 && powerValue <= 89;
  const isOverpower = powerValue > 92;

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-2 px-3 select-none">
      {/* Compact floating outcome badge */}
      {lastResult && !isCompleted && (
        <div
          className={`px-3.5 py-1 rounded-full border shadow-lg text-xs font-extrabold tracking-wide ${
            lastResult.outcome === 'goal'
              ? 'bg-emerald-600/95 border-white text-white'
              : lastResult.outcome === 'saved'
              ? 'bg-red-600/95 border-white text-white'
              : 'bg-amber-600/95 border-white text-white'
          }`}
        >
          {lastResult.outcome === 'goal'
            ? isBasket
              ? '🏀 MASUK!'
              : '⚽ GOOOL!'
            : lastResult.outcome === 'saved'
            ? isBasket
              ? '❌ Meleset!'
              : '🧤 Ditepis!'
            : '💥 Tiang/Ring!'}
        </div>
      )}

      {isCompleted ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-amber-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-amber-300 uppercase">
                Rapor PJOK ({isBasket ? 'Basket' : 'Penalti'})
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {liveReport.score} ({liveReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            {isBasket ? 'Bola Masuk' : 'Gol'}:{' '}
            <strong className="text-emerald-400">{goalsScored}/10</strong> · {liveReport.predicate}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestartMission}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              🔄 Ulangi
            </button>
            <button
              type="button"
              onClick={onExitMission}
              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              ✅ Selesai
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-xl pointer-events-auto space-y-1.5">
          {/* Row 1: Mode Switch + Shot Counter + Score + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                disabled={isKicking}
                onClick={() => {
                  soundFX.playWhistle(soundEnabled);
                  onSwitchMissionType('penalty');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  !isBasket
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ⚽ Penalti
              </button>
              <button
                type="button"
                disabled={isKicking}
                onClick={() => {
                  soundFX.playWhistle(soundEnabled);
                  onSwitchMissionType('basket');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  isBasket
                    ? 'bg-orange-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🏀 Basket
              </button>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
              <span>#{Math.min(currentShotIdx + 1, TOTAL_CHANCES)}/10</span>
              <span className="text-emerald-400">
                · {isBasket ? 'Masuk' : 'Gol'}: {goalsScored}
              </span>
              <span className="text-amber-300">· ⭐ {liveReport.score}</span>
            </div>

            <button
              type="button"
              onClick={onExitMission}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
              title="Keluar Misi"
            >
              ✕
            </button>
          </div>

          {/* Row 2: Compact 6 Aim Buttons */}
          <div className="grid grid-cols-3 gap-1">
            {ZONE_ORDER.map((zId) => {
              const info = isBasket ? BASKET_ZONES[zId] : PENALTY_ZONES[zId];
              const selected = aimZone === zId;
              return (
                <button
                  key={zId}
                  type="button"
                  disabled={isKicking}
                  onClick={() => {
                    soundFX.playPop(soundEnabled);
                    onSelectAimZone(zId);
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors truncate cursor-pointer ${
                    selected
                      ? isBasket
                        ? 'bg-orange-500 text-slate-950 border-white'
                        : 'bg-emerald-500 text-slate-950 border-white'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-emerald-400/60'
                  }`}
                >
                  {info.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Row 3: Slim Power Bar + Action Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ left: '50%', width: '39%' }}
                  className="absolute inset-y-0 bg-emerald-500/40 border-x border-emerald-400/80"
                />
                <div
                  style={{ width: `${powerValue}%` }}
                  className={`h-full transition-none ${
                    isOverpower
                      ? 'bg-red-500'
                      : isSweetSpot
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isKicking}
              onClick={handleKickNow}
              className={`py-1.5 px-3.5 rounded-lg active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs shrink-0 cursor-pointer ${
                isBasket
                  ? 'bg-orange-500 hover:bg-orange-400'
                  : 'bg-amber-500 hover:bg-amber-400'
              }`}
            >
              {isKicking ? '...' : isBasket ? '🏀 LEMPAR' : '⚽ TENDANG'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
