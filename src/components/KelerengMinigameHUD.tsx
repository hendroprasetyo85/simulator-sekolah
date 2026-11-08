import React, { useEffect, useRef, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface KelerengGradeReport {
  score: number;
  letterGrade: string;
  predikat: string;
  marblesKnockedOut: number;
  perfectShots: number;
  totalShots: number;
}

export type KelerengAimDirection = 'kiri' | 'tengah' | 'kanan';

interface TargetMarbleConfig {
  index: number;
  name: string;
  colorHex: string;
  badgeText: string;
  requiredAim: KelerengAimDirection;
  greenMin: number;
  greenMax: number;
  perfectMin: number;
  perfectMax: number;
  speedMultiplier: number;
  hint: string;
}

export const KELERENG_TARGETS: TargetMarbleConfig[] = [
  {
    index: 0,
    name: 'Kelereng Biru Langit',
    colorHex: '#38BDF8',
    badgeText: '🔵 Tengah Segitiga',
    requiredAim: 'tengah',
    greenMin: 36,
    greenMax: 82,
    perfectMin: 52,
    perfectMax: 66,
    speedMultiplier: 1.0,
    hint: 'Pilih arah "⬆ Bidik Tengah" lalu sentil saat kekuatan di Zona Hijau/Emas!',
  },
  {
    index: 1,
    name: 'Kelereng Hijau Zamrud',
    colorHex: '#22C55E',
    badgeText: '🟢 Sudut Kiri Depan',
    requiredAim: 'kiri',
    greenMin: 38,
    greenMax: 80,
    perfectMin: 53,
    perfectMax: 65,
    speedMultiplier: 1.12,
    hint: 'Kelereng berada di sisi kiri segitiga! Pilih "↖ Bidik Kiri" lalu sentil!',
  },
  {
    index: 2,
    name: 'Kelereng Kuning Emas',
    colorHex: '#FACC15',
    badgeText: '🟡 Sudut Kanan Depan',
    requiredAim: 'kanan',
    greenMin: 38,
    greenMax: 80,
    perfectMin: 53,
    perfectMax: 65,
    speedMultiplier: 1.2,
    hint: 'Kelereng berada di sisi kanan segitiga! Pilih "↗ Bidik Kanan" lalu sentil!',
  },
  {
    index: 3,
    name: 'Kelereng Merah Muda',
    colorHex: '#EC4899',
    badgeText: '🩷 Kiri Belakang',
    requiredAim: 'kiri',
    greenMin: 40,
    greenMax: 78,
    perfectMin: 54,
    perfectMax: 64,
    speedMultiplier: 1.32,
    hint: 'Bidik ke "↖ Bidik Kiri" dengan kekuatan pas agar gaco tidak mati di lingkaran!',
  },
  {
    index: 4,
    name: 'Kelereng Ungu Kristal',
    colorHex: '#A855F7',
    badgeText: '🟣 Kanan Belakang',
    requiredAim: 'kanan',
    greenMin: 40,
    greenMax: 78,
    perfectMin: 54,
    perfectMax: 64,
    speedMultiplier: 1.44,
    hint: 'Arahkan ke "↗ Bidik Kanan" dan tekan [SPASI] di Zona Emas untuk sentilan telak!',
  },
  {
    index: 5,
    name: 'Kelereng Jingga Api',
    colorHex: '#F97316',
    badgeText: '🟠 Ujung Depan Segitiga',
    requiredAim: 'tengah',
    greenMin: 42,
    greenMax: 76,
    perfectMin: 54,
    perfectMax: 64,
    speedMultiplier: 1.56,
    hint: 'Kembali ke "⬆ Bidik Tengah"! Jaga ketepatan jari saat menyentil gaco!',
  },
  {
    index: 6,
    name: 'Kelereng Raja Toska',
    colorHex: '#14B8A6',
    badgeText: '👑 Kelereng Raja (Utara)',
    requiredAim: 'tengah',
    greenMin: 44,
    greenMax: 74,
    perfectMin: 55,
    perfectMax: 63,
    speedMultiplier: 1.72,
    hint: 'Babak penentuan! Bidik "⬆ Bidik Tengah" untuk mengeluarkan Kelereng Raja terakhir!',
  },
];

interface ShotRecord {
  shotNumber: number;
  marbleName: string;
  outcome: 'perfect' | 'hit' | 'miss';
  points: number;
}

interface KelerengMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onExecuteMarbleFlick: (
    targetIndex: number,
    isHit: boolean,
    isPerfect: boolean,
    bimoComment: string
  ) => void;
  onResetMarbles: () => void;
  onFinishMission: (report: KelerengGradeReport) => void;
  onExitMission: () => void;
}

export const KelerengMinigameHUD: React.FC<KelerengMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onExecuteMarbleFlick,
  onResetMarbles,
  onFinishMission,
  onExitMission,
}) => {
  const TOTAL_SHOTS = KELERENG_TARGETS.length; // 7 target marbles
  const [shotIdx, setShotIdx] = useState<number>(0);
  const [selectedAim, setSelectedAim] = useState<KelerengAimDirection>('tengah');
  const [phase, setPhase] = useState<'aiming' | 'shooting' | 'finished'>('aiming');
  const [power, setPower] = useState<number>(20);
  const [score, setScore] = useState<number>(0);
  const [records, setRecords] = useState<ShotRecord[]>([]);
  const [bimoComment, setBimoComment] = useState<string>(
    `Ayo ${studentName.split(' ')[0]}! Ada 7 kelereng pasangan di segitiga tengah. Pilih arah bidikan yang sesuai lalu tekan [SPASI] di Zona Hijau!`
  );
  const [lastBanner, setLastBanner] = useState<{
    text: string;
    tone: 'perfect' | 'hit' | 'miss';
  } | null>(null);

  const powerRef = useRef<number>(20);
  const powerDirRef = useRef<number>(1);
  const shotTimeoutRef = useRef<number | null>(null);

  const currentTarget =
    KELERENG_TARGETS[Math.min(KELERENG_TARGETS.length - 1, shotIdx)];

  // Oscillate flick power meter smoothly
  useEffect(() => {
    if (phase !== 'aiming') return;
    let animId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      let next =
        powerRef.current +
        powerDirRef.current * dt * 112 * currentTarget.speedMultiplier;
      if (next >= 98) {
        next = 98;
        powerDirRef.current = -1;
      } else if (next <= 4) {
        next = 4;
        powerDirRef.current = 1;
      }
      powerRef.current = next;
      setPower(Math.round(next));
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [phase, currentTarget.speedMultiplier]);

  useEffect(() => {
    return () => {
      if (shotTimeoutRef.current) {
        window.clearTimeout(shotTimeoutRef.current);
      }
    };
  }, []);

  const computeGradeReport = (
    rawScore: number,
    allRecords: ShotRecord[]
  ): KelerengGradeReport => {
    const finalScore = Math.min(100, Math.max(0, rawScore));
    const marblesKnockedOut = allRecords.filter((r) => r.outcome !== 'miss').length;
    const perfectShots = allRecords.filter((r) => r.outcome === 'perfect').length;
    let letterGrade = 'C';
    let predikat = 'Pemula Gundu (Perlu Latihan Bidikan Jari)';
    if (finalScore >= 90) {
      letterGrade = 'A+';
      predikat = 'Master Gaco Kelereng SDN SUSUKAN 03!';
    } else if (finalScore >= 78) {
      letterGrade = 'A';
      predikat = 'Penembak Kelereng Jitu & Akurat';
    } else if (finalScore >= 64) {
      letterGrade = 'B';
      predikat = 'Baik (Sentilan Kelereng Cukup Terarah)';
    }
    return {
      score: finalScore,
      letterGrade,
      predikat,
      marblesKnockedOut,
      perfectShots,
      totalShots: TOTAL_SHOTS,
    };
  };

  const handleFlickMarble = () => {
    if (phase !== 'aiming') return;
    const p = powerRef.current;
    const isAimCorrect = selectedAim === currentTarget.requiredAim;
    const isPerfectPower =
      p >= currentTarget.perfectMin && p <= currentTarget.perfectMax;
    const isGoodPower =
      p >= currentTarget.greenMin && p <= currentTarget.greenMax;

    let outcome: 'perfect' | 'hit' | 'miss' = 'miss';
    let earned = 0;
    let comment = '';

    if (isAimCorrect && isPerfectPower) {
      outcome = 'perfect';
      earned = shotIdx === TOTAL_SHOTS - 1 ? 16 : 15;
      comment = `CTIK!! Sentilan sempurna! ${currentTarget.name} terpental jauh keluar lingkaran dan gacomu aman!`;
      setLastBanner({
        text: `🎯 CTIK SEMPURNA! ${currentTarget.name} Keluar Lingkaran! (+${earned} Poin)`,
        tone: 'perfect',
      });
      soundFX.playGoalCheer(soundEnabled);
    } else if (isAimCorrect && isGoodPower) {
      outcome = 'hit';
      earned = 12;
      comment = `Bagus sekali! Gacomu mengenai ${currentTarget.name} hingga keluar garis lingkaran kapur!`;
      setLastBanner({
        text: `✅ KENA SASARAN! ${currentTarget.name} Berhasil Diambil! (+${earned} Poin)`,
        tone: 'hit',
      });
    } else if (!isAimCorrect && isGoodPower) {
      outcome = 'miss';
      earned = 3;
      const dirLabel =
        currentTarget.requiredAim === 'kiri'
          ? 'Kiri'
          : currentTarget.requiredAim === 'kanan'
          ? 'Kanan'
          : 'Tengah';
      comment = `Kekuatan sentilanmu bagus, tapi arah bidikan meleset! Seharusnya bidik ke arah ${dirLabel}!`;
      setLastBanner({
        text: `⚠️ ARAH BIDIKAN MELESET! (Harusnya Bidik ${dirLabel} · +3 Poin)`,
        tone: 'miss',
      });
    } else {
      outcome = 'miss';
      earned = 0;
      const powerReason =
        p < currentTarget.greenMin
          ? 'terlalu pelan sehingga gaco tertinggal di dalam lingkaran'
          : 'terlalu keras sehingga melompati kelereng sasaran';
      comment = `Aduh! Sentilanmu ${powerReason}! Ayo fokus lagi untuk kelereng berikutnya!`;
      setLastBanner({
        text: `❌ MELESET! Sentilan ${p < currentTarget.greenMin ? 'Terlalu Pelan' : 'Terlalu Keras'}`,
        tone: 'miss',
      });
    }

    const nextScore = Math.min(100, score + earned);
    const newRec: ShotRecord = {
      shotNumber: shotIdx + 1,
      marbleName: currentTarget.name,
      outcome,
      points: earned,
    };
    const updatedRecords = [...records, newRec];

    setScore(nextScore);
    setRecords(updatedRecords);
    setBimoComment(comment);
    setPhase('shooting');

    onExecuteMarbleFlick(
      currentTarget.index,
      outcome !== 'miss',
      outcome === 'perfect',
      comment
    );

    const nextIdx = shotIdx + 1;
    shotTimeoutRef.current = window.setTimeout(() => {
      if (nextIdx >= TOTAL_SHOTS) {
        const finalReport = computeGradeReport(nextScore, updatedRecords);
        setPhase('finished');
        onFinishMission(finalReport);
      } else {
        setShotIdx(nextIdx);
        setSelectedAim(KELERENG_TARGETS[nextIdx].requiredAim);
        setLastBanner(null);
        setPhase('aiming');
      }
    }, 950);
  };

  // Spacebar shortcut to flick marble
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'aiming') {
        e.preventDefault();
        handleFlickMarble();
      } else if (e.code === 'ArrowLeft' && phase === 'aiming') {
        e.preventDefault();
        setSelectedAim('kiri');
      } else if (e.code === 'ArrowUp' && phase === 'aiming') {
        e.preventDefault();
        setSelectedAim('tengah');
      } else if (e.code === 'ArrowRight' && phase === 'aiming') {
        e.preventDefault();
        setSelectedAim('kanan');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRestart = () => {
    soundFX.playWhistle(soundEnabled);
    onResetMarbles();
    setShotIdx(0);
    setSelectedAim(KELERENG_TARGETS[0].requiredAim);
    setScore(0);
    setRecords([]);
    setLastBanner(null);
    setBimoComment(
      `Ketujuh kelereng sudah dipasang kembali di segitiga tengah! Ayo bidik dan sentil gacomu!`
    );
    setPhase('aiming');
  };

  const finalReport =
    phase === 'finished' ? computeGradeReport(score, records) : null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {lastBanner && phase !== 'finished' && (
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-extrabold border shadow-lg ${
            lastBanner.tone === 'perfect'
              ? 'bg-amber-500/95 border-white text-slate-950'
              : lastBanner.tone === 'hit'
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-red-600/95 border-white text-white'
          }`}
        >
          {lastBanner.text}
        </div>
      )}

      {phase === 'finished' && finalReport ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-sky-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-sky-300 uppercase">
                Rapor Main Kelereng
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {finalReport.score} ({finalReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Kelereng Dapat:{' '}
            <strong className="text-emerald-400">
              {finalReport.marblesKnockedOut}/{finalReport.totalShots}
            </strong>{' '}
            · Sempurna: <strong className="text-sky-300">{finalReport.perfectShots}x</strong>
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
          {/* Row 1: Title + Target Badge + Shot Counter + Score + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-sky-400 text-slate-950 font-extrabold text-[11px] shrink-0">
                🔮 Kelereng
              </span>
              <span
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-slate-950 truncate"
                style={{ backgroundColor: currentTarget.colorHex }}
              >
                {currentTarget.badgeText}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-white">
              <span>#{Math.min(TOTAL_SHOTS, shotIdx + 1)}/{TOTAL_SHOTS}</span>
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

          {/* Row 2: 3 Compact Aim Buttons */}
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'kiri', label: '↖ Kiri' },
                { id: 'tengah', label: '⬆ Tengah' },
                { id: 'kanan', label: '↗ Kanan' },
              ] as { id: KelerengAimDirection; label: string }[]
            ).map((btn) => {
              const isSelected = selectedAim === btn.id;
              const isRecommended = currentTarget.requiredAim === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => {
                    soundFX.playPop(soundEnabled);
                    setSelectedAim(btn.id);
                  }}
                  className={`py-1 px-2 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {btn.label}
                  {isRecommended && <span className="ml-1 text-[10px]">🎯</span>}
                </button>
              );
            })}
          </div>

          {/* Row 3: Power Bar + Flick Button side by side */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-800">
              <div className="relative h-3.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-500/45 border-x border-emerald-400"
                  style={{
                    left: `${currentTarget.greenMin}%`,
                    width: `${currentTarget.greenMax - currentTarget.greenMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-400/70 border-x border-amber-200"
                  style={{
                    left: `${currentTarget.perfectMin}%`,
                    width: `${currentTarget.perfectMax - currentTarget.perfectMin}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-2 -ml-1 rounded-full bg-white shadow border border-sky-500 transition-none"
                  style={{ left: `${power}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={phase !== 'aiming'}
              onClick={handleFlickMarble}
              className="py-2 px-3.5 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 font-black text-xs shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              {phase === 'aiming' ? '🤏 SENTIL [SPASI]' : '🔮...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
