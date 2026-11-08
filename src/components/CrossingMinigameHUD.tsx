import React, { useEffect, useRef, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface CrossingGradeReport {
  score: number;
  letterGrade: string;
  predikat: string;
  studentsCrossed: number;
  perfectSignals: number;
  totalWaves: number;
}

interface CrossingWaveInfo {
  waveNumber: number;
  studentLabel: string;
  badgeText: string;
  badgeColor: string;
  speedMultiplier: number;
  greenMin: number;
  greenMax: number;
  perfectMin: number;
  perfectMax: number;
}

const CROSSING_WAVES: CrossingWaveInfo[] = [
  {
    waveNumber: 1,
    studentLabel: 'Dika & Rani (Kelas 1A)',
    badgeText: '🚸 Gelombang 1 · Kelas 1A',
    badgeColor: '#22C55E',
    speedMultiplier: 1.0,
    greenMin: 34,
    greenMax: 82,
    perfectMin: 50,
    perfectMax: 66,
  },
  {
    waveNumber: 2,
    studentLabel: 'Beni & Citra (Kelas 2A)',
    badgeText: '🚸 Gelombang 2 · Kelas 2A',
    badgeColor: '#38BDF8',
    speedMultiplier: 1.18,
    greenMin: 36,
    greenMax: 80,
    perfectMin: 51,
    perfectMax: 65,
  },
  {
    waveNumber: 3,
    studentLabel: 'Aldo & Sinta (Kelas 3A)',
    badgeText: '🚸 Gelombang 3 · Kelas 3A',
    badgeColor: '#FACC15',
    speedMultiplier: 1.35,
    greenMin: 38,
    greenMax: 78,
    perfectMin: 52,
    perfectMax: 64,
  },
  {
    waveNumber: 4,
    studentLabel: 'Fajar & Nabila (Kelas 4A)',
    badgeText: '🚸 Gelombang 4 · Kelas 4A',
    badgeColor: '#F97316',
    speedMultiplier: 1.52,
    greenMin: 40,
    greenMax: 76,
    perfectMin: 53,
    perfectMax: 63,
  },
  {
    waveNumber: 5,
    studentLabel: 'Rombongan Pulang Sekolah',
    badgeText: '🛑 Gelombang 5 · Jam Sibuk',
    badgeColor: '#EC4899',
    speedMultiplier: 1.72,
    greenMin: 42,
    greenMax: 74,
    perfectMin: 54,
    perfectMax: 62,
  },
];

interface CrossingMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onExecuteCrossingSignal: (
    waveIndex: number,
    isSafe: boolean,
    isPerfect: boolean,
    satpamComment: string
  ) => void;
  onFinishMission: (report: CrossingGradeReport) => void;
  onExitMission: () => void;
}

export const CrossingMinigameHUD: React.FC<CrossingMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onExecuteCrossingSignal,
  onFinishMission,
  onExitMission,
}) => {
  const TOTAL_WAVES = CROSSING_WAVES.length;
  const [waveIdx, setWaveIdx] = useState<number>(0);
  const [phase, setPhase] = useState<'ready' | 'crossing' | 'finished'>('ready');
  const [meterPos, setMeterPos] = useState<number>(20);
  const [score, setScore] = useState<number>(0);
  const [safeCount, setSafeCount] = useState<number>(0);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const [lastToast, setLastToast] = useState<{
    text: string;
    tone: 'perfect' | 'good' | 'warn';
  } | null>(null);

  const meterRef = useRef<number>(20);
  const meterDirRef = useRef<number>(1);
  const timerRef = useRef<number | null>(null);

  const currentWave = CROSSING_WAVES[Math.min(CROSSING_WAVES.length - 1, waveIdx)];

  useEffect(() => {
    if (phase !== 'ready') return;
    let animId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      let next =
        meterRef.current +
        meterDirRef.current * dt * 112 * currentWave.speedMultiplier;
      if (next >= 98) {
        next = 98;
        meterDirRef.current = -1;
      } else if (next <= 4) {
        next = 4;
        meterDirRef.current = 1;
      }
      meterRef.current = next;
      setMeterPos(Math.round(next));
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [phase, currentWave.speedMultiplier]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const buildReport = (
    finalScore: number,
    crossed: number,
    perfects: number
  ): CrossingGradeReport => {
    const clamped = Math.min(100, Math.max(0, finalScore));
    let letterGrade = 'C';
    let predikat = 'Petugas Patroli Pemula';
    if (clamped >= 90) {
      letterGrade = 'A+';
      predikat = 'Teladan Patroli Keamanan Sekolah (PKS)!';
    } else if (clamped >= 78) {
      letterGrade = 'A';
      predikat = 'Sangat Sigap Membantu Pak Satpam';
    } else if (clamped >= 64) {
      letterGrade = 'B';
      predikat = 'Cukup Sigap Menjaga Zebra Cross';
    }
    return {
      score: clamped,
      letterGrade,
      predikat,
      studentsCrossed: crossed,
      perfectSignals: perfects,
      totalWaves: TOTAL_WAVES,
    };
  };

  const handleStopTrafficAndCross = () => {
    if (phase !== 'ready') return;
    const p = meterRef.current;
    const isPerfect = p >= currentWave.perfectMin && p <= currentWave.perfectMax;
    const isSafe = p >= currentWave.greenMin && p <= currentWave.greenMax;

    let earned = 0;
    let nextSafe = safeCount;
    let nextPerfect = perfectCount;
    let comment = '';

    if (isPerfect) {
      earned = 20;
      nextSafe += 1;
      nextPerfect += 1;
      comment = `PRIIIT! Sempurna ${studentName.split(' ')[0]}! Mobil & motor berhenti tertib, ${currentWave.studentLabel} menyeberang Zebra Cross dengan aman!`;
      setLastToast({
        text: `🛑 STOP SEMPURNA! ${currentWave.studentLabel} Menyeberang Aman! (+20)`,
        tone: 'perfect',
      });
      soundFX.playWhistle(soundEnabled);
    } else if (isSafe) {
      earned = 17;
      nextSafe += 1;
      comment = `Bagus sekali! Kendaraan berhenti di garis Zebra Cross, ayo silakan menyeberang ${currentWave.studentLabel}!`;
      setLastToast({
        text: `✅ AMAN MENYEBERANG! Kendaraan Berhenti Tertib (+17)`,
        tone: 'good',
      });
      soundFX.playWhistle(soundEnabled);
    } else {
      earned = 5;
      comment = `Hati-hati! Tunggu mobil & motor agak renggang di Zona Hijau sebelum mengangkat papan STOP ya!`;
      setLastToast({
        text: `⚠️ KURANG TEPAT! Perhatikan Jarak Mobil & Motor (+5)`,
        tone: 'warn',
      });
      soundFX.playKeeperSave(soundEnabled);
    }

    const nextScore = Math.min(100, score + earned);
    setScore(nextScore);
    setSafeCount(nextSafe);
    setPerfectCount(nextPerfect);
    setPhase('crossing');

    onExecuteCrossingSignal(waveIdx, isSafe, isPerfect, comment);

    const nextIdx = waveIdx + 1;
    timerRef.current = window.setTimeout(() => {
      if (nextIdx >= TOTAL_WAVES) {
        const report = buildReport(nextScore, nextSafe, nextPerfect);
        setPhase('finished');
        onFinishMission(report);
        if (nextScore >= 75) {
          soundFX.playGoalCheer(soundEnabled);
        }
      } else {
        setWaveIdx(nextIdx);
        setLastToast(null);
        setPhase('ready');
      }
    }, 1550);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'ready') {
        e.preventDefault();
        handleStopTrafficAndCross();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRestart = () => {
    soundFX.playWhistle(soundEnabled);
    setWaveIdx(0);
    setScore(0);
    setSafeCount(0);
    setPerfectCount(0);
    setLastToast(null);
    setPhase('ready');
  };

  const finalReport =
    phase === 'finished' ? buildReport(score, safeCount, perfectCount) : null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {lastToast && phase !== 'finished' && (
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-extrabold border shadow-lg ${
            lastToast.tone === 'perfect'
              ? 'bg-amber-500/95 border-white text-slate-950'
              : lastToast.tone === 'good'
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-rose-600/95 border-white text-white'
          }`}
        >
          {lastToast.text}
        </div>
      )}

      {phase === 'finished' && finalReport ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-emerald-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-emerald-300 uppercase">
                Rapor Patroli Satpam (PKS)
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {finalReport.score} ({finalReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Menyeberang Aman:{' '}
            <strong className="text-emerald-400">
              {finalReport.studentsCrossed}/{finalReport.totalWaves}
            </strong>{' '}
            · Tepat: <strong className="text-amber-300">{finalReport.perfectSignals}x</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
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
          {/* Row 1: Title + Wave Badge + Counter + Score + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-red-500 text-white font-extrabold text-[11px] shrink-0">
                🛑 Zebra Cross
              </span>
              <span
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-slate-950 truncate"
                style={{ backgroundColor: currentWave.badgeColor }}
              >
                {currentWave.studentLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-white">
              <span>#{Math.min(TOTAL_WAVES, waveIdx + 1)}/{TOTAL_WAVES}</span>
              <span className="text-amber-300">· ⭐ {score}</span>
              <button
                type="button"
                onClick={onExitMission}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
                title="Keluar Misi"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Row 2: Timing Bar + Stop & Cross Button side by side */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
              <div className="relative h-3.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-500/45 border-x border-emerald-400"
                  style={{
                    left: `${currentWave.greenMin}%`,
                    width: `${currentWave.greenMax - currentWave.greenMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-400/70 border-x border-amber-200"
                  style={{
                    left: `${currentWave.perfectMin}%`,
                    width: `${currentWave.perfectMax - currentWave.perfectMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-2 -ml-1 rounded-full bg-white shadow border border-red-500 transition-none"
                  style={{ left: `${meterPos}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={phase !== 'ready'}
              onClick={handleStopTrafficAndCross}
              className="py-2 px-3.5 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-black text-xs shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              {phase === 'ready' ? '🛑 STOP & SEBERANGKAN [SPASI]' : '🚸 Menyeberang...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
