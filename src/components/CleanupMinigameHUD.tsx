import React, { useEffect, useState } from 'react';
import {
  CleanupMissionStage,
  SCHOOL_TRASH_ITEMS,
  SchoolTrashItemInfo,
  TRASH_BINS_INFO,
  TrashCategoryId,
  TrashSortResult,
} from '../three/SchoolPopulationNPCs';
import { soundFX } from '../utils/soundFX';

export interface CleanupGradeReport {
  collectedCount: number;
  totalTrash: number;
  correctSortCount: number;
  score: number;
  letterGrade: string;
  predicate: string;
  principalNote: string;
}

export const MANUAL_PICKUP_MAX_DISTANCE = 4.2;

export function calculateCleanupGrade(
  collectedCount: number,
  correctSortCount: number,
  totalTrash = SCHOOL_TRASH_ITEMS.length
): CleanupGradeReport {
  // 40% weight from how much trash was collected + 60% weight from accurate sorting into Organik, Anorganik, Daur Ulang, B3
  const collectScore = (collectedCount / totalTrash) * 40;
  const sortScore = (correctSortCount / totalTrash) * 60;
  const rawScore = Math.round(collectScore + sortScore);
  const score = Math.max(40, Math.min(100, rawScore));

  let letterGrade = 'D';
  let predicate = 'Perlu Ditingkatkan';
  let principalNote =
    'Ayo keliling sekolah mencari lebih banyak sampah dan pilah sesuai jenis Organik, Anorganik, Daur Ulang, dan B3!';

  if (score >= 92) {
    letterGrade = 'A+';
    predicate = 'Duta Adiwiyata Teladan';
    principalNote =
      'Luar biasa! Kamu berkeliling memungut sampah hingga bersih dan memilah Organik, Anorganik, Daur Ulang, serta B3 dengan sangat tepat!';
  } else if (score >= 82) {
    letterGrade = 'A';
    predicate = 'Sangat Bersih & Peduli';
    principalNote =
      'Hebat sekali! Lingkungan SDN SUSUKAN 03 menjadi bersih dan pemilahan sampahmu sangat bagus!';
  } else if (score >= 70) {
    letterGrade = 'B+';
    predicate = 'Bersih (Lulus)';
    principalNote =
      'Bagus! Kamu sudah rajin mencari, memungut, dan memilah sampah sekolah. Tingkatkan lagi ketepatan pilahnya ya!';
  } else if (score >= 55) {
    letterGrade = 'C';
    predicate = 'Cukup Bersih';
    principalNote =
      `Cukup baik, ayo cari semua ${totalTrash} sampah di lingkungan sekolah dan perhatikan warna tong Organik, Anorganik, Daur Ulang, dan B3!`;
  }

  return {
    collectedCount,
    totalTrash,
    correctSortCount,
    score,
    letterGrade,
    predicate,
    principalNote,
  };
}

const BIN_ORDER: TrashCategoryId[] = ['organik', 'anorganik', 'daur_ulang', 'b3'];

interface CleanupMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  stage: CleanupMissionStage;
  collectedIds: string[];
  nearestTrash: SchoolTrashItemInfo | null;
  nearestTrashDistance: number;
  lastPickedItem: SchoolTrashItemInfo | null;
  onChangeStage: (nextStage: CleanupMissionStage) => void;
  onManualPickupTrash: (item: SchoolTrashItemInfo) => void;
  onExecuteSortThrow: (
    item: SchoolTrashItemInfo,
    chosenBin: TrashCategoryId
  ) => TrashSortResult | null;
  onRestartCleanupMission: () => void;
  onFinishCleanupMission: (report: CleanupGradeReport) => void;
  onExitCleanupMission: () => void;
}

export const CleanupMinigameHUD: React.FC<CleanupMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  stage,
  collectedIds,
  nearestTrash,
  nearestTrashDistance,
  lastPickedItem,
  onChangeStage,
  onManualPickupTrash,
  onExecuteSortThrow,
  onRestartCleanupMission,
  onFinishCleanupMission,
  onExitCleanupMission,
}) => {
  const totalTrash = SCHOOL_TRASH_ITEMS.length;
  // Map of itemId -> boolean (true = sorted correctly, false = sorted wrongly)
  const [sortedOutcomes, setSortedOutcomes] = useState<Record<string, boolean>>({});
  const [isThrowing, setIsThrowing] = useState<boolean>(false);
  const [lastSortResult, setLastSortResult] = useState<TrashSortResult | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // List of collected items that have not been sorted yet
  const unsortedItems = SCHOOL_TRASH_ITEMS.filter(
    (item) => collectedIds.includes(item.id) && sortedOutcomes[item.id] === undefined
  );
  const currentItemToSort = unsortedItems[0] || null;

  const sortedCount = Object.keys(sortedOutcomes).length;
  const correctSortCount = Object.values(sortedOutcomes).filter(Boolean).length;
  const liveReport = calculateCleanupGrade(collectedIds.length, correctSortCount, totalTrash);

  const canManualPickup =
    stage === 'collecting' &&
    nearestTrash !== null &&
    nearestTrashDistance <= MANUAL_PICKUP_MAX_DISTANCE;

  // Automatically switch to 'sorting' when all 24 trash items are collected
  useEffect(() => {
    if (
      stage === 'collecting' &&
      collectedIds.length >= totalTrash &&
      unsortedItems.length > 0
    ) {
      const timer = window.setTimeout(() => {
        soundFX.playWhistle(soundEnabled);
        onChangeStage('sorting');
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [collectedIds.length, stage, totalTrash, unsortedItems.length]);

  const handleChooseBin = (chosenBin: TrashCategoryId) => {
    if (isThrowing || !currentItemToSort || isCompleted) return;

    setIsThrowing(true);
    const result = onExecuteSortThrow(currentItemToSort, chosenBin);
    if (!result) {
      setIsThrowing(false);
      return;
    }

    setLastSortResult(result);
    const nextOutcomes = {
      ...sortedOutcomes,
      [currentItemToSort.id]: result.isCorrect,
    };
    setSortedOutcomes(nextOutcomes);

    const remainingCollected = SCHOOL_TRASH_ITEMS.filter(
      (it) => collectedIds.includes(it.id) && nextOutcomes[it.id] === undefined
    );

    window.setTimeout(() => {
      setIsThrowing(false);
      setLastSortResult(null);

      if (remainingCollected.length === 0) {
        const finalCorrect = Object.values(nextOutcomes).filter(Boolean).length;
        const finalReport = calculateCleanupGrade(
          collectedIds.length,
          finalCorrect,
          totalTrash
        );
        setIsCompleted(true);
        onFinishCleanupMission(finalReport);
        if (finalReport.score >= 70) {
          soundFX.playGoalCheer(soundEnabled);
        }
      }
    }, 1350);
  };

  const handleRestartAll = () => {
    soundFX.playWhistle(soundEnabled);
    setSortedOutcomes({});
    setIsThrowing(false);
    setLastSortResult(null);
    setIsCompleted(false);
    onRestartCleanupMission();
  };

  // Keyboard shortcut 'F' for Manual Trash Pickup when in range, and '1-4' during sorting stage
  useEffect(() => {
    if (isCompleted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (stage === 'collecting') {
        if (e.code === 'KeyF' && canManualPickup && nearestTrash) {
          e.preventDefault();
          onManualPickupTrash(nearestTrash);
        }
        return;
      }

      if (stage === 'sorting' && !isThrowing) {
        if (e.code === 'Digit1') {
          e.preventDefault();
          handleChooseBin('organik');
        } else if (e.code === 'Digit2') {
          e.preventDefault();
          handleChooseBin('anorganik');
        } else if (e.code === 'Digit3') {
          e.preventDefault();
          handleChooseBin('daur_ulang');
        } else if (e.code === 'Digit4') {
          e.preventDefault();
          handleChooseBin('b3');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {/* Compact feedback pill */}
      {stage === 'collecting' && lastPickedItem && !canManualPickup && !isCompleted && (
        <div className="px-3.5 py-1 rounded-full bg-emerald-600/95 border border-white text-white text-xs font-extrabold shadow-lg">
          🖐️ +1 {lastPickedItem.icon} {lastPickedItem.name} ({collectedIds.length}/{totalTrash})
        </div>
      )}

      {stage === 'sorting' && lastSortResult && !isCompleted && (
        <div
          className={`px-3.5 py-1 rounded-full border shadow-lg text-xs font-extrabold ${
            lastSortResult.isCorrect
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-red-600/95 border-white text-white'
          }`}
        >
          {lastSortResult.isCorrect
            ? '✅ TEPAT!'
            : `❌ Harusnya ${TRASH_BINS_INFO[lastSortResult.correctBin].shortLabel}`}
        </div>
      )}

      {isCompleted ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-emerald-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-emerald-300 uppercase">
                Rapor Kebersihan
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {liveReport.score} ({liveReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Dipungut: <strong className="text-sky-300">{collectedIds.length}/{totalTrash}</strong> ·
            Pilah Benar: <strong className="text-emerald-400">{correctSortCount}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            {collectedIds.length < totalTrash && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop(soundEnabled);
                  setIsCompleted(false);
                  onChangeStage('collecting');
                }}
                className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer"
              >
                🖐️ Cari Sisa
              </button>
            )}
            <button
              type="button"
              onClick={handleRestartAll}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              🔄 Ulangi
            </button>
            <button
              type="button"
              onClick={onExitCleanupMission}
              className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              ✅ Selesai
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-xl pointer-events-auto space-y-1.5">
          {/* Row 1: Stage Switch + Progress + Score + Exit */}
          <div className="flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                disabled={isThrowing}
                onClick={() => {
                  soundFX.playPop(soundEnabled);
                  setIsCompleted(false);
                  onChangeStage('collecting');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  stage === 'collecting'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🖐️ Cari ({collectedIds.length}/{totalTrash})
              </button>
              <button
                type="button"
                disabled={isThrowing || collectedIds.length === 0}
                onClick={() => {
                  soundFX.playPop(soundEnabled);
                  onChangeStage('sorting');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors disabled:opacity-40 cursor-pointer ${
                  stage === 'sorting'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ♻️ Pilah ({sortedCount}/{collectedIds.length})
              </button>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
              <span className="text-emerald-400">✓ {correctSortCount}</span>
              <span className="text-amber-300">· ⭐ {liveReport.score}</span>
            </div>

            <button
              type="button"
              onClick={onExitCleanupMission}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
              title="Keluar Misi"
            >
              ✕
            </button>
          </div>

          {/* Row 2: Collecting OR Sorting Action */}
          {stage === 'collecting' ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-200 font-semibold truncate flex-1">
                {nearestTrash
                  ? `🧭 ${nearestTrash.icon} ${nearestTrash.name} (${nearestTrashDistance.toFixed(1)}m)`
                  : '🎉 Semua sampah terkumpul!'}
              </div>

              {nearestTrash && (
                <button
                  type="button"
                  disabled={!canManualPickup}
                  onClick={() => onManualPickupTrash(nearestTrash)}
                  className={`py-1.5 px-3 rounded-lg font-extrabold text-xs shrink-0 transition-all cursor-pointer ${
                    canManualPickup
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {canManualPickup ? '🖐️ Ambil [F]' : 'Dekati'}
                </button>
              )}

              {collectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playWhistle(soundEnabled);
                    onChangeStage('sorting');
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shrink-0 cursor-pointer"
                >
                  ♻️ Pilah
                </button>
              )}
            </div>
          ) : currentItemToSort ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                <span className="font-bold text-white truncate">
                  {currentItemToSort.icon} {currentItemToSort.name}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  Sisa {unsortedItems.length}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {BIN_ORDER.map((binId) => {
                  const bin = TRASH_BINS_INFO[binId];
                  const btnColors =
                    binId === 'organik'
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white'
                      : binId === 'anorganik'
                      ? 'bg-amber-500 hover:bg-amber-400 border-amber-200 text-slate-950'
                      : binId === 'daur_ulang'
                      ? 'bg-blue-600 hover:bg-blue-500 border-blue-300 text-white'
                      : 'bg-red-600 hover:bg-red-500 border-red-300 text-white';

                  return (
                    <button
                      key={binId}
                      type="button"
                      disabled={isThrowing}
                      onClick={() => handleChooseBin(binId)}
                      className={`py-1.5 px-1 rounded-lg border font-extrabold text-[11px] active:scale-95 disabled:opacity-50 truncate cursor-pointer ${btnColors}`}
                    >
                      {bin.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
