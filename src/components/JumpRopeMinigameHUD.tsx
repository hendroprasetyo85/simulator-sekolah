import React, { useEffect, useRef, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface JumpRopeGradeReport {
  score: number;
  letterGrade: string;
  predikat: string;
  successfulJumps: number;
  perfectJumps: number;
  totalJumps: number;
  maxCombo: number;
}

interface JumpRopeLevelInfo {
  levelNumber: number;
  name: string;
  heightBadge: string;
  ropeSpeed: number; // oscillation speed
  greenMin: number;
  greenMax: number;
  perfectMin: number;
  perfectMax: number;
  jumpBoost: number;
  colorHex: string;
  description: string;
}

const JUMP_ROPE_LEVELS: JumpRopeLevelInfo[] = [
  {
    levelNumber: 1,
    name: 'Tingkat 1: Mata Kaki',
    heightBadge: '🦶 Setinggi Mata Kaki',
    ropeSpeed: 0.95,
    greenMin: 34,
    greenMax: 82,
    perfectMin: 50,
    perfectMax: 66,
    jumpBoost: 0.95,
    colorHex: '#22C55E',
    description: 'Ayunan tali karet santai dari Intan & Dewi. Lompat saat indikator di zona hijau!',
  },
  {
    levelNumber: 2,
    name: 'Tingkat 2: Setinggi Lutut',
    heightBadge: '🦵 Setinggi Lutut',
    ropeSpeed: 1.18,
    greenMin: 36,
    greenMax: 80,
    perfectMin: 51,
    perfectMax: 65,
    jumpBoost: 1.08,
    colorHex: '#38BDF8',
    description: 'Tali karet naik setinggi lutut! Perhatikan irama putaran tangan Intan.',
  },
  {
    levelNumber: 3,
    name: 'Tingkat 3: Setinggi Pinggang',
    heightBadge: '腰 Setinggi Pinggang',
    ropeSpeed: 1.42,
    greenMin: 38,
    greenMax: 78,
    perfectMin: 52,
    perfectMax: 64,
    jumpBoost: 1.22,
    colorHex: '#FACC15',
    description: 'Ayunan tali makin cepat! Tekan [SPASI] tepat saat tali karet mengayun ke bawah.',
  },
  {
    levelNumber: 4,
    name: 'Tingkat 4: Setinggi Dada',
    heightBadge: '👕 Setinggi Dada',
    ropeSpeed: 1.68,
    greenMin: 40,
    greenMax: 76,
    perfectMin: 53,
    perfectMax: 63,
    jumpBoost: 1.35,
    colorHex: '#F97316',
    description: 'Tali karet diayun tinggi oleh Intan & Dewi! Lompat lebih tinggi agar tidak tersangkut!',
  },
  {
    levelNumber: 5,
    name: 'Tingkat 5: MERDEKA! 🙌',
    heightBadge: '🙌 Tingkat MERDEKA!',
    ropeSpeed: 1.95,
    greenMin: 42,
    greenMax: 74,
    perfectMin: 54,
    perfectMax: 62,
    jumpBoost: 1.52,
    colorHex: '#EC4899',
    description: 'Babak puncak Lompat Tali Merdeka! Buktikan kelincahanmu melewati ayunan tercepat!',
  },
];

interface JumpAttemptRecord {
  jumpNumber: number;
  levelName: string;
  outcome: 'perfect' | 'good' | 'tripped';
  points: number;
}

interface JumpRopeMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onExecuteJumpRopeLeap: (
    isSuccess: boolean,
    jumpBoost: number,
    intanComment: string,
    ropeSpeedMultiplier: number
  ) => void;
  onFinishMission: (report: JumpRopeGradeReport) => void;
  onExitMission: () => void;
}

export const JumpRopeMinigameHUD: React.FC<JumpRopeMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onExecuteJumpRopeLeap,
  onFinishMission,
  onExitMission,
}) => {
  const TOTAL_JUMPS = 10; // 2 jumps per level across 5 traditional levels
  const [jumpIdx, setJumpIdx] = useState<number>(0);
  const [phase, setPhase] = useState<'ready' | 'cooldown' | 'finished'>('ready');
  const [ropePos, setRopePos] = useState<number>(15);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [history, setHistory] = useState<JumpAttemptRecord[]>([]);
  const [intanComment, setIntanComment] = useState<string>(
    `Ayo ${studentName.split(' ')[0]}! Aku dan Dewi yang memutar tali karetnya ya! Tekan [SPASI] saat indikator tepat di Zona Hijau!`
  );
  const [lastOutcomeBadge, setLastOutcomeBadge] = useState<{
    label: string;
    tone: 'perfect' | 'good' | 'tripped';
  } | null>(null);

  const ropePosRef = useRef<number>(15);
  const ropeDirRef = useRef<number>(1);
  const cooldownTimerRef = useRef<number | null>(null);

  const currentLevelIdx = Math.min(
    JUMP_ROPE_LEVELS.length - 1,
    Math.floor(jumpIdx / 2)
  );
  const currentLevel = JUMP_ROPE_LEVELS[currentLevelIdx];

  // Oscillate the rubber-band rope timing meter smoothly
  useEffect(() => {
    if (phase !== 'ready') return;
    let animId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      let next =
        ropePosRef.current + ropeDirRef.current * dt * 115 * currentLevel.ropeSpeed;
      if (next >= 98) {
        next = 98;
        ropeDirRef.current = -1;
      } else if (next <= 4) {
        next = 4;
        ropeDirRef.current = 1;
      }
      ropePosRef.current = next;
      setRopePos(Math.round(next));
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [phase, currentLevel.ropeSpeed]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const computeGradeReport = (
    finalScore: number,
    records: JumpAttemptRecord[],
    bestCombo: number
  ): JumpRopeGradeReport => {
    const clampedScore = Math.min(100, Math.max(0, finalScore));
    const successfulJumps = records.filter((r) => r.outcome !== 'tripped').length;
    const perfectJumps = records.filter((r) => r.outcome === 'perfect').length;
    let letterGrade = 'C';
    let predikat = 'Cukup Lincah (Perlu Latihan Ritme Lompat Tali)';
    if (clampedScore >= 90) {
      letterGrade = 'A+';
      predikat = 'Juara Lompat Tali Karet Tingkat Merdeka!';
    } else if (clampedScore >= 80) {
      letterGrade = 'A';
      predikat = 'Sangat Lincah & Kompak Lompat Tali';
    } else if (clampedScore >= 68) {
      letterGrade = 'B';
      predikat = 'Baik (Ketepatan Lompatan Bagus)';
    }
    return {
      score: clampedScore,
      letterGrade,
      predikat,
      successfulJumps,
      perfectJumps,
      totalJumps: TOTAL_JUMPS,
      maxCombo: bestCombo,
    };
  };

  const handleTriggerJump = () => {
    if (phase !== 'ready') return;
    const pos = ropePosRef.current;
    const isPerfect =
      pos >= currentLevel.perfectMin && pos <= currentLevel.perfectMax;
    const isGood =
      !isPerfect && pos >= currentLevel.greenMin && pos <= currentLevel.greenMax;

    let outcome: 'perfect' | 'good' | 'tripped' = 'tripped';
    let earnedPoints = 0;
    let nextCombo = 0;
    let comment = '';

    if (isPerfect) {
      outcome = 'perfect';
      nextCombo = combo + 1;
      earnedPoints = 10;
      comment = `SEMPURNA! Lompatan ${studentName.split(' ')[0]} di ${currentLevel.name} tinggi dan tepat sekali! (${nextCombo}x Beruntun!)`;
      setLastOutcomeBadge({
        label: `🌟 LOMPATAN SEMPURNA! (+${earnedPoints} Poin)`,
        tone: 'perfect',
      });
      soundFX.playGoalCheer(soundEnabled);
    } else if (isGood) {
      outcome = 'good';
      nextCombo = combo + 1;
      earnedPoints = 8;
      comment = `Bagus sekali! Kamu berhasil melompati ayunan tali karet di ${currentLevel.name}!`;
      setLastOutcomeBadge({
        label: `✅ LOLOS TALI KARET! (+${earnedPoints} Poin)`,
        tone: 'good',
      });
    } else {
      outcome = 'tripped';
      nextCombo = 0;
      earnedPoints = 0;
      const reason = pos < currentLevel.greenMin ? 'terlalu cepat' : 'terlambat';
      comment = `Aduh, kakimu tersangkut tali karet karena melompat ${reason}! Ayo fokus lagi di ayunan berikutnya!`;
      setLastOutcomeBadge({
        label: `⚠️ TERSANGKUT TALI KARET! (Lompat ${reason})`,
        tone: 'tripped',
      });
    }

    const nextScore = Math.min(100, score + earnedPoints);
    const nextMaxCombo = Math.max(maxCombo, nextCombo);
    const nextRecord: JumpAttemptRecord = {
      jumpNumber: jumpIdx + 1,
      levelName: currentLevel.name,
      outcome,
      points: earnedPoints,
    };
    const updatedHistory = [...history, nextRecord];

    setScore(nextScore);
    setCombo(nextCombo);
    setMaxCombo(nextMaxCombo);
    setHistory(updatedHistory);
    setIntanComment(comment);
    setPhase('cooldown');

    const nextJumpIdx = jumpIdx + 1;
    const nextLevelIdx = Math.min(
      JUMP_ROPE_LEVELS.length - 1,
      Math.floor(nextJumpIdx / 2)
    );
    const nextRopeSpeed = JUMP_ROPE_LEVELS[nextLevelIdx].ropeSpeed;

    onExecuteJumpRopeLeap(
      outcome !== 'tripped',
      outcome === 'perfect'
        ? currentLevel.jumpBoost * 1.15
        : outcome === 'good'
        ? currentLevel.jumpBoost
        : 0.38,
      comment,
      nextRopeSpeed
    );

    cooldownTimerRef.current = window.setTimeout(() => {
      if (nextJumpIdx >= TOTAL_JUMPS) {
        const finalReport = computeGradeReport(
          nextScore,
          updatedHistory,
          nextMaxCombo
        );
        setPhase('finished');
        onFinishMission(finalReport);
      } else {
        setJumpIdx(nextJumpIdx);
        setLastOutcomeBadge(null);
        setPhase('ready');
      }
    }, 950);
  };

  // Spacebar shortcut to jump
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'ready') {
        e.preventDefault();
        handleTriggerJump();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRestart = () => {
    soundFX.playWhistle(soundEnabled);
    setJumpIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHistory([]);
    setLastOutcomeBadge(null);
    setIntanComment(
      `Ayo kita mulai lagi dari Tingkat 1 (Mata Kaki)! Lompat tepat saat tali karet di Zona Hijau ya!`
    );
    setPhase('ready');
    onExecuteJumpRopeLeap(
      true,
      0.5,
      'Siap mulai lompat tali karet dari Tingkat 1!',
      JUMP_ROPE_LEVELS[0].ropeSpeed
    );
  };

  const finalReport =
    phase === 'finished'
      ? computeGradeReport(score, history, maxCombo)
      : null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {lastOutcomeBadge && phase !== 'finished' && (
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-extrabold border shadow-lg ${
            lastOutcomeBadge.tone === 'perfect'
              ? 'bg-amber-500/95 border-white text-slate-950'
              : lastOutcomeBadge.tone === 'good'
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-red-600/95 border-white text-white'
          }`}
        >
          {lastOutcomeBadge.label}
        </div>
      )}

      {phase === 'finished' && finalReport ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-pink-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-pink-300 uppercase">
                Rapor Lompat Tali
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {finalReport.score} ({finalReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Lolos: <strong className="text-emerald-400">{finalReport.successfulJumps}/{finalReport.totalJumps}</strong> ·
            Combo: <strong className="text-pink-300">{finalReport.maxCombo}x</strong>
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
          {/* Row 1: Title + Level + Jump Counter + Score + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-pink-500 text-slate-950 font-extrabold text-[11px] shrink-0">
                🪢 Lompat Tali
              </span>
              <span
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-slate-950 truncate"
                style={{ backgroundColor: currentLevel.colorHex }}
              >
                {currentLevel.heightBadge}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-white">
              <span>#{Math.min(TOTAL_JUMPS, jumpIdx + 1)}/{TOTAL_JUMPS}</span>
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

          {/* Row 2: Rhythm Timing Bar + Jump Button side by side */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
              <div className="relative h-3.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-500/45 border-x border-emerald-400"
                  style={{
                    left: `${currentLevel.greenMin}%`,
                    width: `${currentLevel.greenMax - currentLevel.greenMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-400/70 border-x border-amber-200"
                  style={{
                    left: `${currentLevel.perfectMin}%`,
                    width: `${currentLevel.perfectMax - currentLevel.perfectMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-2 -ml-1 rounded-full bg-white shadow border border-pink-500 transition-none"
                  style={{ left: `${ropePos}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={phase !== 'ready'}
              onClick={handleTriggerJump}
              className="py-2 px-3.5 rounded-lg bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-slate-950 font-black text-xs shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              {phase === 'ready' ? '🦘 LOMPAT [SPASI]' : '⏳...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
