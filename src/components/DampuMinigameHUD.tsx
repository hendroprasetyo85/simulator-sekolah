import React, { useEffect, useRef, useState } from 'react';
import { DAMPU_SQUARE_WORLD_COORDS } from '../three/SchoolPopulationNPCs';
import { soundFX } from '../utils/soundFX';

export interface DampuGradeReport {
  score: number;
  letterGrade: string;
  predikat: string;
  roundsCompleted: number;
  totalRounds: number;
}

export type DampuHopMoveType = 'engklek_1' | 'dampu_2' | 'lompati_gaco';

interface DampuStepRule {
  rowLabel: string;
  normalSquareId: number;
  normalMove: DampuHopMoveType;
  whenGacoInRowSquareId: number;
  whenGacoInRowMove: DampuHopMoveType;
  hintNormal: string;
  hintWithGaco: string;
}

interface DampuRoundConfig {
  roundNumber: number;
  targetSquareId: number;
  targetLabel: string;
  colorHex: string;
  steps: DampuStepRule[];
}

const DAMPU_ROUNDS: DampuRoundConfig[] = [
  {
    roundNumber: 1,
    targetSquareId: 1,
    targetLabel: 'Petak 1 (Merah Muda)',
    colorHex: '#EC4899',
    steps: [
      {
        rowLabel: 'Baris 1 (Ada Gaco di Petak 1)',
        normalSquareId: 1,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 2,
        whenGacoInRowMove: 'lompati_gaco',
        hintNormal: 'Engklek 1 kaki ke Petak 1',
        hintWithGaco: 'Petak 1 berisi Gaco! Pilih "🦘 Lompati Gaco" langsung ke Petak 2!',
      },
      {
        rowLabel: 'Baris 3 (Petak 3)',
        normalSquareId: 3,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 3,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Lanjut Engklek 1 kaki ke Petak 3',
        hintWithGaco: 'Lanjut Engklek 1 kaki ke Petak 3',
      },
      {
        rowLabel: 'Baris 4 (Sayap 4 & 5)',
        normalSquareId: 45,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 45,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Petak kembar Sayap 4-5! Mendarat Dampu 2 Kaki!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Sayap 4-5!',
      },
      {
        rowLabel: 'Baris 5 (Petak 6)',
        normalSquareId: 6,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 6,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki di Petak 6 (Leher)',
        hintWithGaco: 'Engklek 1 kaki di Petak 6',
      },
      {
        rowLabel: 'Baris 6 (Sayap Atas 7 & 8)',
        normalSquareId: 78,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 78,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Petak kembar Sayap 7-8! Mendarat Dampu 2 Kaki!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Sayap 7-8!',
      },
      {
        rowLabel: 'Puncak BULAN 🌙',
        normalSquareId: 9,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 9,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat 2 Kaki dengan bebas di Puncak BULAN!',
        hintWithGaco: 'Mendarat 2 Kaki di Puncak BULAN!',
      },
    ],
  },
  {
    roundNumber: 2,
    targetSquareId: 2,
    targetLabel: 'Petak 2 (Biru Langit)',
    colorHex: '#0284C7',
    steps: [
      {
        rowLabel: 'Baris 1 (Petak 1)',
        normalSquareId: 1,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 1,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki masuk ke Petak 1',
        hintWithGaco: 'Engklek 1 kaki masuk ke Petak 1',
      },
      {
        rowLabel: 'Baris 2 (Ada Gaco di Petak 2)',
        normalSquareId: 2,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 3,
        whenGacoInRowMove: 'lompati_gaco',
        hintNormal: 'Engklek 1 kaki ke Petak 2',
        hintWithGaco: 'Petak 2 ada Gaco! Pilih "🦘 Lompati Gaco" langsung ke Petak 3!',
      },
      {
        rowLabel: 'Baris 4 (Sayap 4 & 5)',
        normalSquareId: 45,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 45,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Petak kembar Sayap 4-5! Mendarat Dampu 2 Kaki!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Sayap 4-5!',
      },
      {
        rowLabel: 'Baris 5 (Petak 6)',
        normalSquareId: 6,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 6,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki di Petak 6',
        hintWithGaco: 'Engklek 1 kaki di Petak 6',
      },
      {
        rowLabel: 'Puncak BULAN 🌙',
        normalSquareId: 9,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 9,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
      },
    ],
  },
  {
    roundNumber: 3,
    targetSquareId: 3,
    targetLabel: 'Petak 3 (Kuning Cerah)',
    colorHex: '#EAB308',
    steps: [
      {
        rowLabel: 'Baris 1 (Petak 1)',
        normalSquareId: 1,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 1,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki ke Petak 1',
        hintWithGaco: 'Engklek 1 kaki ke Petak 1',
      },
      {
        rowLabel: 'Baris 2 (Petak 2)',
        normalSquareId: 2,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 2,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki ke Petak 2',
        hintWithGaco: 'Engklek 1 kaki ke Petak 2',
      },
      {
        rowLabel: 'Baris 3 (Ada Gaco di Petak 3)',
        normalSquareId: 3,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 45,
        whenGacoInRowMove: 'lompati_gaco',
        hintNormal: 'Engklek 1 kaki ke Petak 3',
        hintWithGaco: 'Petak 3 ada Gaco! Pilih "🦘 Lompati Gaco" langsung ke Sayap 4-5!',
      },
      {
        rowLabel: 'Baris 5 (Petak 6)',
        normalSquareId: 6,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 6,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki di Petak 6',
        hintWithGaco: 'Engklek 1 kaki di Petak 6',
      },
      {
        rowLabel: 'Puncak BULAN 🌙',
        normalSquareId: 9,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 9,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
      },
    ],
  },
  {
    roundNumber: 4,
    targetSquareId: 4,
    targetLabel: 'Sayap Petak 4 (Hijau)',
    colorHex: '#16A34A',
    steps: [
      {
        rowLabel: 'Baris 1-3 (Petak 2 & 3)',
        normalSquareId: 3,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 3,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki maju ke Petak 3',
        hintWithGaco: 'Engklek 1 kaki maju ke Petak 3',
      },
      {
        rowLabel: 'Baris 4 (Sayap 4 Ada Gaco -> Pijak Petak 5)',
        normalSquareId: 5,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 5,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Karena Petak 4 ada Gaco, pijak Petak 5 dengan Engklek 1 Kaki!',
        hintWithGaco: 'Karena Petak 4 ada Gaco, pijak Petak 5 dengan Engklek 1 Kaki!',
      },
      {
        rowLabel: 'Baris 5 (Petak 6)',
        normalSquareId: 6,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 6,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Lanjut Engklek 1 kaki ke Petak 6',
        hintWithGaco: 'Lanjut Engklek 1 kaki ke Petak 6',
      },
      {
        rowLabel: 'Baris 6 (Sayap Atas 7 & 8)',
        normalSquareId: 78,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 78,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Sayap 7-8!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Sayap 7-8!',
      },
      {
        rowLabel: 'Puncak BULAN 🌙',
        normalSquareId: 9,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 9,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
      },
    ],
  },
  {
    roundNumber: 5,
    targetSquareId: 6,
    targetLabel: 'Petak 6 Leher (Ungu)',
    colorHex: '#7C3AED',
    steps: [
      {
        rowLabel: 'Baris 1-3 (Petak 3)',
        normalSquareId: 3,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 3,
        whenGacoInRowMove: 'engklek_1',
        hintNormal: 'Engklek 1 kaki maju ke Petak 3',
        hintWithGaco: 'Engklek 1 kaki maju ke Petak 3',
      },
      {
        rowLabel: 'Baris 4 (Sayap 4 & 5)',
        normalSquareId: 45,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 45,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Sayap 4-5',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Sayap 4-5',
      },
      {
        rowLabel: 'Baris 5 (Ada Gaco di Petak 6)',
        normalSquareId: 6,
        normalMove: 'engklek_1',
        whenGacoInRowSquareId: 78,
        whenGacoInRowMove: 'lompati_gaco',
        hintNormal: 'Engklek 1 kaki di Petak 6',
        hintWithGaco: 'Petak 6 ada Gaco! Pilih "🦘 Lompati Gaco" langsung ke Sayap 7-8!',
      },
      {
        rowLabel: 'Puncak BULAN 🌙',
        normalSquareId: 9,
        normalMove: 'dampu_2',
        whenGacoInRowSquareId: 9,
        whenGacoInRowMove: 'dampu_2',
        hintNormal: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
        hintWithGaco: 'Mendarat Dampu 2 Kaki di Puncak BULAN!',
      },
    ],
  },
];

interface DampuMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onExecuteGacoThrow: (targetSquareId: number, isGoodThrow: boolean, comment: string) => void;
  onExecuteHop: (worldX: number, worldZ: number, comment: string, isSuccess: boolean) => void;
  onFinishMission: (report: DampuGradeReport) => void;
  onExitMission: () => void;
}

export const DampuMinigameHUD: React.FC<DampuMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onExecuteGacoThrow,
  onExecuteHop,
  onFinishMission,
  onExitMission,
}) => {
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [phase, setPhase] = useState<'throw_gaco' | 'hopping' | 'finished'>('throw_gaco');
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [powerMeter, setPowerMeter] = useState<number>(50);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Tekan LEMPAR GACO saat indikator berada di Zona Hijau (40% - 82%)!'
  );
  const [lastOutcomeGood, setLastOutcomeGood] = useState<boolean | null>(null);

  const meterDirRef = useRef<number>(1);
  const meterValRef = useRef<number>(25);

  const currentRound = DAMPU_ROUNDS[roundIdx] || DAMPU_ROUNDS[0];
  const currentStep = currentRound.steps[stepIdx] || currentRound.steps[0];

  const isGacoRow =
    (currentRound.targetSquareId === 1 && stepIdx === 0) ||
    (currentRound.targetSquareId === 2 && stepIdx === 1) ||
    (currentRound.targetSquareId === 3 && stepIdx === 2) ||
    (currentRound.targetSquareId === 6 && stepIdx === 2);

  const expectedMove: DampuHopMoveType = isGacoRow
    ? currentStep.whenGacoInRowMove
    : currentStep.normalMove;
  const targetHopSquareId: number = isGacoRow
    ? currentStep.whenGacoInRowSquareId
    : currentStep.normalSquareId;
  const activeHintText: string = isGacoRow
    ? currentStep.hintWithGaco
    : currentStep.hintNormal;

  // Oscillate Gaco Throw accuracy bar when in throw_gaco phase
  useEffect(() => {
    if (phase !== 'throw_gaco') return;
    const interval = window.setInterval(() => {
      meterValRef.current += meterDirRef.current * 3.4;
      if (meterValRef.current >= 98) {
        meterValRef.current = 98;
        meterDirRef.current = -1;
      } else if (meterValRef.current <= 4) {
        meterValRef.current = 4;
        meterDirRef.current = 1;
      }
      setPowerMeter(Math.round(meterValRef.current));
    }, 30);
    return () => window.clearInterval(interval);
  }, [phase]);

  const handleThrowGaco = () => {
    if (phase !== 'throw_gaco') return;
    const p = meterValRef.current;
    const isSweetSpot = p >= 38 && p <= 84;
    const addedScore = isSweetSpot ? 10 : 6;
    setScore((prev) => Math.min(100, prev + addedScore));
    setLastOutcomeGood(isSweetSpot);

    const comment = isSweetSpot
      ? `Lemparan Gaco sempurna tepat di tengah ${currentRound.targetLabel}! Sekarang melompat ke Selatan!`
      : `Gaco mendarat agak di pinggir ${currentRound.targetLabel}, ayo lanjut melompat engklek ke Selatan!`;

    setStatusMessage(comment);
    onExecuteGacoThrow(currentRound.targetSquareId, isSweetSpot, comment);
    setStepIdx(0);
    setPhase('hopping');
  };

  const handleHopChoice = (chosenMove: DampuHopMoveType) => {
    if (phase !== 'hopping') return;
    const isCorrectMove = chosenMove === expectedMove;
    const coords = DAMPU_SQUARE_WORLD_COORDS[targetHopSquareId] || [1.5, 26.3];

    if (isCorrectMove) {
      const nextScore = Math.min(100, score + 3);
      setScore(nextScore);
      setLastOutcomeGood(true);

      const isLastStepInRound = stepIdx + 1 >= currentRound.steps.length;
      if (isLastStepInRound) {
        const roundDoneMsg = `Hore! Kamu berhasil mencapai 🌙 Puncak BULAN pada Ronde ${currentRound.roundNumber}!`;
        setStatusMessage(roundDoneMsg);
        onExecuteHop(coords[0], coords[1], roundDoneMsg, true);

        window.setTimeout(() => {
          if (roundIdx + 1 < DAMPU_ROUNDS.length) {
            // Reset player back to North Start Line (1.5, 24.3) for the next round
            const nextRound = DAMPU_ROUNDS[roundIdx + 1];
            onExecuteHop(
              1.5,
              24.3,
              `Ronde ${nextRound.roundNumber}: Bidik dan lempar Gaco ke ${nextRound.targetLabel}!`,
              true
            );
            setRoundIdx((r) => r + 1);
            setStepIdx(0);
            setPhase('throw_gaco');
            setStatusMessage(
              `Ronde ${nextRound.roundNumber}: Lempar Gaco ke ${nextRound.targetLabel}!`
            );
          } else {
            const finalScore = Math.min(100, nextScore + 5);
            setScore(finalScore);
            setPhase('finished');
            const letterGrade =
              finalScore >= 90
                ? 'A+'
                : finalScore >= 80
                ? 'A'
                : finalScore >= 70
                ? 'B'
                : 'C';
            const predikat =
              finalScore >= 90
                ? 'Master Dampu Bulan Nusantara!'
                : finalScore >= 80
                ? 'Sangat Terampil & Seimbang'
                : 'Cukup Terampil';
            onFinishMission({
              score: finalScore,
              letterGrade,
              predikat,
              roundsCompleted: DAMPU_ROUNDS.length,
              totalRounds: DAMPU_ROUNDS.length,
            });
          }
        }, 700);
      } else {
        const stepSuccessMsg = `Bagus! Gerakan tepat di ${currentStep.rowLabel}. Lanjut lompatan berikutnya!`;
        setStatusMessage(stepSuccessMsg);
        onExecuteHop(coords[0], coords[1], stepSuccessMsg, true);
        setStepIdx((s) => s + 1);
      }
    } else {
      soundFX.playKeeperSave(soundEnabled);
      setLastOutcomeGood(false);
      const wrongMsg = `Hati-hati hampir menginjak garis! ${activeHintText}`;
      setStatusMessage(wrongMsg);
      onExecuteHop(coords[0], coords[1], wrongMsg, false);
      // Still advance so younger Grade 1-6 players never get stuck
      const isLastStepInRound = stepIdx + 1 >= currentRound.steps.length;
      if (isLastStepInRound) {
        window.setTimeout(() => {
          if (roundIdx + 1 < DAMPU_ROUNDS.length) {
            const nextRound = DAMPU_ROUNDS[roundIdx + 1];
            onExecuteHop(1.5, 24.3, `Lanjut Ronde ${nextRound.roundNumber}!`, true);
            setRoundIdx((r) => r + 1);
            setStepIdx(0);
            setPhase('throw_gaco');
          } else {
            setPhase('finished');
          }
        }, 700);
      } else {
        setStepIdx((s) => s + 1);
      }
    }
  };

  // Spacebar shortcut for Gaco throw
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'throw_gaco') {
        e.preventDefault();
        handleThrowGaco();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const letterGrade =
    score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : 'C';

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 flex flex-col items-center px-3 pointer-events-none select-none">
      {phase === 'finished' ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-amber-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-amber-300 uppercase">
                Rapor Dampu Bulan
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {score} ({letterGrade})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRoundIdx(0);
                setStepIdx(0);
                setScore(0);
                setLastOutcomeGood(null);
                setPhase('throw_gaco');
                onExecuteHop(1.5, 24.3, 'Mari mulai ulang permainan Dampu Bulan!', true);
              }}
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
          {/* Row 1: Title + Round + Score + Close */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[11px] shrink-0">
                🌙 Dampu
              </span>
              <span className="text-[11px] font-bold text-slate-200 truncate">
                Ronde {currentRound.roundNumber}/{DAMPU_ROUNDS.length} · {currentRound.targetLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-amber-300">⭐ {score}</span>
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

          {/* Row 2: Throw Gaco Timing Bar + Button OR 3 Hop Buttons */}
          {phase === 'throw_gaco' ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 bg-emerald-500/40 border-x border-emerald-400"
                    style={{ left: '38%', width: '46%' }}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all duration-75"
                    style={{ width: `${powerMeter}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleThrowGaco}
                className="py-1.5 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 active:scale-95 cursor-pointer"
              >
                🎯 LEMPAR [SPASI]
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] text-amber-200 font-semibold truncate px-0.5">
                📍 {activeHintText}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleHopChoice('engklek_1')}
                  className={`py-1.5 px-2 rounded-lg font-extrabold text-[11px] border transition-all cursor-pointer ${
                    expectedMove === 'engklek_1'
                      ? 'bg-sky-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-sky-300 border-slate-700'
                  }`}
                >
                  🦵 1 Kaki
                </button>
                <button
                  type="button"
                  onClick={() => handleHopChoice('dampu_2')}
                  className={`py-1.5 px-2 rounded-lg font-extrabold text-[11px] border transition-all cursor-pointer ${
                    expectedMove === 'dampu_2'
                      ? 'bg-emerald-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-emerald-300 border-slate-700'
                  }`}
                >
                  🦶🦶 2 Kaki
                </button>
                <button
                  type="button"
                  onClick={() => handleHopChoice('lompati_gaco')}
                  className={`py-1.5 px-2 rounded-lg font-extrabold text-[11px] border transition-all cursor-pointer ${
                    expectedMove === 'lompati_gaco'
                      ? 'bg-amber-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-amber-300 border-slate-700'
                  }`}
                >
                  🦘 Lompati
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
