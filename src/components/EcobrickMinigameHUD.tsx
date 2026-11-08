import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface EcobrickGradeReport {
  score: number;
  letterGrade: string;
  predikat: string;
  assembledCount: number;
  perfectUprightCount: number;
  totalPieces: number;
}

interface EcobrickSlotDef {
  slotIndex: number;
  char: string;
  wordGroup: 'I' | 'LOVE' | 'SUGA';
}

const ECOBRICK_SLOTS: EcobrickSlotDef[] = [
  { slotIndex: 0, char: 'I', wordGroup: 'I' },
  { slotIndex: 1, char: 'L', wordGroup: 'LOVE' },
  { slotIndex: 2, char: 'O', wordGroup: 'LOVE' },
  { slotIndex: 3, char: 'V', wordGroup: 'LOVE' },
  { slotIndex: 4, char: 'E', wordGroup: 'LOVE' },
  { slotIndex: 5, char: 'S', wordGroup: 'SUGA' },
  { slotIndex: 6, char: 'U', wordGroup: 'SUGA' },
  { slotIndex: 7, char: 'G', wordGroup: 'SUGA' },
  { slotIndex: 8, char: 'A', wordGroup: 'SUGA' },
];

interface ScatteredPuzzlePiece {
  slotIndex: number;
  char: string;
  rotationDeg: number; // 0 = tegak (Merah di atas, Putih di bawah), 90, 180, 270 = miring/terbalik karena angin
  assembled: boolean;
}

function createWindScrambledPieces(): ScatteredPuzzlePiece[] {
  const angles = [90, 180, 270];
  const raw: ScatteredPuzzlePiece[] = ECOBRICK_SLOTS.map((slot, i) => ({
    slotIndex: slot.slotIndex,
    char: slot.char,
    rotationDeg: angles[(i * 2 + Math.floor(Math.random() * 3)) % angles.length],
    assembled: false,
  }));

  // Shuffle order so pieces are genuinely scrambled like a puzzle
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = raw[i];
    raw[i] = raw[j];
    raw[j] = tmp;
  }
  return raw;
}

interface EcobrickMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onTriggerWindScatter: () => void;
  onSnapEcobrickPiece: (
    slotIndex: number,
    char: string,
    isPerfectUpright: boolean,
    larasComment: string
  ) => void;
  onFinishMission: (report: EcobrickGradeReport) => void;
  onExitMission: () => void;
}

export const EcobrickMinigameHUD: React.FC<EcobrickMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onTriggerWindScatter,
  onSnapEcobrickPiece,
  onFinishMission,
  onExitMission,
}) => {
  const TOTAL_PIECES = ECOBRICK_SLOTS.length;
  const [phase, setPhase] = useState<'wind_intro' | 'playing' | 'finished'>('wind_intro');
  const [pieces, setPieces] = useState<ScatteredPuzzlePiece[]>(() => createWindScrambledPieces());
  const [targetSlotIdx, setTargetSlotIdx] = useState<number>(0);
  const [selectedPieceSlotIdx, setSelectedPieceSlotIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const [lastToast, setLastToast] = useState<{
    text: string;
    tone: 'perfect' | 'good' | 'warn';
  } | null>(null);

  const introTimerRef = useRef<number | null>(null);
  const onTriggerWindScatterRef = useRef(onTriggerWindScatter);
  onTriggerWindScatterRef.current = onTriggerWindScatter;

  const startWindScatterIntro = useCallback(() => {
    const fresh = createWindScrambledPieces();
    setPieces(fresh);
    setTargetSlotIdx(0);
    setSelectedPieceSlotIdx(fresh[0].slotIndex);
    setScore(0);
    setPerfectCount(0);
    setLastToast({
      text: '💨 Angin Kencang Menerbangkan Ecobrick "I LOVE SUGA"!',
      tone: 'warn',
    });
    setPhase('wind_intro');
    onTriggerWindScatterRef.current();

    if (introTimerRef.current) {
      window.clearTimeout(introTimerRef.current);
    }
    introTimerRef.current = window.setTimeout(() => {
      setPhase('playing');
      setLastToast({
        text: '🧩 Pilih huruf yang sesuai, putar tegak (Merah di atas), lalu pasang!',
        tone: 'good',
      });
    }, 1650);
  }, []);

  // Run wind-scatter animation ONLY ONCE on initial mount before starting the puzzle
  useEffect(() => {
    startWindScatterIntro();
    return () => {
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
      }
    };
  }, [startWindScatterIntro]);

  const buildReport = (finalScore: number, assembled: number, perfects: number): EcobrickGradeReport => {
    const clamped = Math.min(100, Math.max(0, finalScore));
    let letterGrade = 'C';
    let predikat = 'Perawat Taman Pemula';
    if (clamped >= 90) {
      letterGrade = 'A+';
      predikat = 'Juara Puzzle Duta Adiwiyata Ecobrick!';
    } else if (clamped >= 78) {
      letterGrade = 'A';
      predikat = 'Sangat Rapi Menyusun Ecobrick Merah Putih';
    } else if (clamped >= 64) {
      letterGrade = 'B';
      predikat = 'Cukup Terampil Merapihkan Ecobrick';
    }
    return {
      score: clamped,
      letterGrade,
      predikat,
      assembledCount: assembled,
      perfectUprightCount: perfects,
      totalPieces: TOTAL_PIECES,
    };
  };

  const selectedPiece = pieces.find((p) => p.slotIndex === selectedPieceSlotIdx && !p.assembled) ||
    pieces.find((p) => !p.assembled) ||
    null;

  const handleRotateSelected = useCallback(() => {
    if (phase !== 'playing' || !selectedPiece) return;
    soundFX.playPuzzleRotate(soundEnabled);
    setPieces((prev) =>
      prev.map((p) =>
        p.slotIndex === selectedPiece.slotIndex
          ? { ...p, rotationDeg: (p.rotationDeg + 90) % 360 }
          : p
      )
    );
  }, [phase, selectedPiece, soundEnabled]);

  const handlePlacePieceIntoSlot = useCallback(
    (slotToFill: number, pieceToUse: ScatteredPuzzlePiece | null) => {
      if (phase !== 'playing' || !pieceToUse || pieceToUse.assembled) return;
      const targetDef = ECOBRICK_SLOTS[slotToFill];
      if (!targetDef) return;

      // Check if the letter matches the target slot character (note: 'I','L','O','V','E','S','U','G','A' are all distinct!)
      if (pieceToUse.char !== targetDef.char) {
        setLastToast({
          text: `⚠️ Slot #${slotToFill + 1} untuk huruf "${targetDef.char}"! Pilih kepingan huruf "${targetDef.char}" di bawah.`,
          tone: 'warn',
        });
        onSnapEcobrickPiece(
          -1,
          pieceToUse.char,
          false,
          `Hmm, slot itu untuk huruf "${targetDef.char}" ${studentName.split(' ')[0]}! Cari kepingan Ecobrick huruf "${targetDef.char}" dulu ya!`
        );
        return;
      }

      const isUpright = pieceToUse.rotationDeg === 0;
      const earned = isUpright ? 12 : 9;
      const nextScore = Math.min(100, score + earned);
      const nextPerfect = perfectCount + (isUpright ? 1 : 0);

      const updatedPieces = pieces.map((p) =>
        p.slotIndex === pieceToUse.slotIndex ? { ...p, rotationDeg: 0, assembled: true } : p
      );
      const assembledTotal = updatedPieces.filter((p) => p.assembled).length;

      setPieces(updatedPieces);
      setScore(nextScore);
      setPerfectCount(nextPerfect);

      const firstName = studentName.split(' ')[0];
      const comment =
        assembledTotal >= TOTAL_PIECES
          ? `Horeee! Semua 9 huruf Ecobrick "I LOVE SUGA" sudah tersusun rapi dan tegak kembali! Terima kasih ${firstName}!`
          : isUpright
          ? `Sempurna ${firstName}! Huruf "${pieceToUse.char}" terpasang tegak lurus (Merah di atas, Putih di bawah) di monumen I LOVE SUGA!`
          : `Bagus ${firstName}! Huruf "${pieceToUse.char}" sudah kembali ke monumen! Lain kali putar tegak (0°) dulu agar dapat skor penuh ya!`;

      setLastToast({
        text: isUpright
          ? `✨ SEMPURNA! Huruf "${pieceToUse.char}" Terpasang Tegak (+12)`
          : `✅ BAGUS! Huruf "${pieceToUse.char}" Terpasang (+9 · Putar Tegak untuk +12)`,
        tone: isUpright ? 'perfect' : 'good',
      });

      onSnapEcobrickPiece(pieceToUse.slotIndex, pieceToUse.char, isUpright, comment);

      if (assembledTotal >= TOTAL_PIECES) {
        const finalScore = nextPerfect === TOTAL_PIECES ? 100 : nextScore;
        setScore(finalScore);
        const report = buildReport(finalScore, assembledTotal, nextPerfect);
        window.setTimeout(() => {
          setPhase('finished');
          onFinishMission(report);
          soundFX.playGoalCheer(soundEnabled);
        }, 650);
      } else {
        // Advance target slot to next empty slot in order 0..8
        const nextEmptySlot = ECOBRICK_SLOTS.find(
          (s) => !updatedPieces.find((up) => up.slotIndex === s.slotIndex)?.assembled
        );
        if (nextEmptySlot) {
          setTargetSlotIdx(nextEmptySlot.slotIndex);
        }
        const nextUnplaced = updatedPieces.find((up) => !up.assembled);
        if (nextUnplaced) {
          setSelectedPieceSlotIdx(nextUnplaced.slotIndex);
        }
      }
    },
    [
      phase,
      pieces,
      score,
      perfectCount,
      studentName,
      soundEnabled,
      onSnapEcobrickPiece,
      onFinishMission,
      TOTAL_PIECES,
    ]
  );

  // Keyboard shortcuts: R to Rotate 90°, Space/Enter to Place into Target Slot
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.code === 'KeyR') {
        e.preventDefault();
        handleRotateSelected();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handlePlacePieceIntoSlot(targetSlotIdx, selectedPiece);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleRotateSelected, handlePlacePieceIntoSlot, targetSlotIdx, selectedPiece]);

  const assembledCount = pieces.filter((p) => p.assembled).length;
  const finalReport =
    phase === 'finished' ? buildReport(score, assembledCount, perfectCount) : null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {lastToast && phase !== 'finished' && (
        <div
          className={`px-3.5 py-1 rounded-full text-xs font-extrabold border shadow-lg ${
            lastToast.tone === 'perfect'
              ? 'bg-amber-400/95 border-white text-slate-950'
              : lastToast.tone === 'good'
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-rose-600/95 border-white text-white'
          }`}
        >
          {lastToast.text}
        </div>
      )}

      {phase === 'finished' && finalReport ? (
        <div className="w-full max-w-xs bg-slate-950/90 border border-emerald-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-emerald-300 uppercase">
                Rapor Puzzle Ecobrick (Laras)
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {finalReport.score} ({finalReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Tersusun Rapi:{' '}
            <strong className="text-emerald-400">
              {finalReport.assembledCount}/{finalReport.totalPieces}
            </strong>{' '}
            · Tegak Sempurna:{' '}
            <strong className="text-amber-300">{finalReport.perfectUprightCount}x</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startWindScatterIntro}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              💨 Ulangi
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
        <div className="w-full max-w-lg bg-slate-950/88 border border-slate-700/80 rounded-2xl p-2.5 shadow-xl pointer-events-auto space-y-2">
          {/* Row 1: Header + Progress + Replay Wind + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[11px] shrink-0">
                ♻️ Puzzle Ecobrick
              </span>
              <span className="text-[11px] font-bold text-emerald-300 truncate">
                {phase === 'wind_intro'
                  ? '💨 Tertiup Angin Kencang...'
                  : `Target Slot: Huruf "${ECOBRICK_SLOTS[targetSlotIdx]?.char}"`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-white">
              <span>
                {assembledCount}/{TOTAL_PIECES}
              </span>
              <span className="text-amber-300">· ⭐ {score}</span>
              <button
                type="button"
                onClick={startWindScatterIntro}
                className="px-2 py-0.5 rounded-lg bg-sky-900/90 hover:bg-sky-700 text-sky-200 text-[10px] font-bold cursor-pointer"
                title="Ulangi Animasi Ecobrick Tertiup Angin"
              >
                💨 Angin
              </button>
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

          {/* Row 2: 9 Target Puzzle Slots of "I   L O V E   S U G A" */}
          <div className="flex items-center justify-center gap-1 bg-slate-900/95 px-2 py-1.5 rounded-xl border border-slate-800">
            {ECOBRICK_SLOTS.map((slot) => {
              const pieceState = pieces.find((p) => p.slotIndex === slot.slotIndex);
              const isAssembled = pieceState?.assembled;
              const isTarget = !isAssembled && targetSlotIdx === slot.slotIndex;
              const extraGap =
                slot.slotIndex === 0 || slot.slotIndex === 4 ? 'mr-2' : '';

              return (
                <button
                  key={slot.slotIndex}
                  type="button"
                  disabled={phase !== 'playing' || isAssembled}
                  onClick={() => {
                    setTargetSlotIdx(slot.slotIndex);
                    if (selectedPiece && selectedPiece.char === slot.char) {
                      handlePlacePieceIntoSlot(slot.slotIndex, selectedPiece);
                    }
                  }}
                  className={`relative w-8 h-9 rounded-lg font-black text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${extraGap} ${
                    isAssembled
                      ? 'border-2 border-emerald-400 shadow text-white'
                      : isTarget
                      ? 'border-2 border-amber-400 bg-amber-500/20 text-amber-200 scale-105'
                      : 'border border-dashed border-slate-600 bg-slate-800/70 text-slate-400 hover:border-slate-400'
                  }`}
                  style={
                    isAssembled
                      ? {
                          background:
                            'linear-gradient(to bottom, #DC2626 0%, #DC2626 58%, #F8FAFC 58%, #F8FAFC 100%)',
                        }
                      : undefined
                  }
                  title={`Slot Huruf ${slot.char}`}
                >
                  <span
                    className={
                      isAssembled
                        ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-white font-black'
                        : ''
                    }
                  >
                    {isAssembled ? slot.char : slot.char}
                  </span>
                  <span className="text-[8px] leading-none opacity-80">
                    {isAssembled ? '✓' : `#${slot.slotIndex + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 3: Scattered Ecobrick Pieces Tray + Rotate & Snap Buttons */}
          {phase === 'wind_intro' ? (
            <div className="py-2 text-center text-xs font-extrabold text-sky-300">
              💨 Wuuuush! Angin kencang mengacak susunan huruf Ecobrick di taman...
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {/* Unplaced Scattered Pieces */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 flex-1">
                {pieces.map((p) => {
                  if (p.assembled) return null;
                  const isSelected = selectedPiece?.slotIndex === p.slotIndex;
                  const isUpright = p.rotationDeg === 0;
                  return (
                    <button
                      key={p.slotIndex}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Clicking the already-selected piece rotates it 90°!
                          handleRotateSelected();
                        } else {
                          soundFX.playPop(soundEnabled);
                          setSelectedPieceSlotIdx(p.slotIndex);
                          setTargetSlotIdx(p.slotIndex);
                        }
                      }}
                      className={`relative w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-black text-sm transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-amber-400 scale-105 shadow-lg'
                          : 'opacity-85 hover:opacity-100 border border-slate-600'
                      }`}
                      style={{
                        background:
                          'linear-gradient(to bottom, #DC2626 0%, #DC2626 58%, #F8FAFC 58%, #F8FAFC 100%)',
                        transform: `rotate(${p.rotationDeg}deg)`,
                      }}
                      title={`Huruf ${p.char} (${isUpright ? 'Tegak 0°' : `Miring ${p.rotationDeg}° - Klik untuk putar`})`}
                    >
                      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] text-white">
                        {p.char}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Rotate & Snap Action Controls */}
              {selectedPiece && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRotateSelected}
                    className={`px-2.5 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                      selectedPiece.rotationDeg === 0
                        ? 'bg-emerald-950/90 border border-emerald-500/70 text-emerald-300'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                    title="Putar kepingan Ecobrick 90° agar Merah di atas & Putih di bawah [Tombol R]"
                  >
                    {selectedPiece.rotationDeg === 0
                      ? '✓ Tegak (0°)'
                      : `🔄 Putar (${selectedPiece.rotationDeg}°)`}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlacePieceIntoSlot(targetSlotIdx, selectedPiece)}
                    className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs active:scale-95 transition-all cursor-pointer"
                    title="Pasang kepingan Ecobrick ke slot monumen [Tombol SPASI]"
                  >
                    🧩 Pasang &ldquo;{selectedPiece.char}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
