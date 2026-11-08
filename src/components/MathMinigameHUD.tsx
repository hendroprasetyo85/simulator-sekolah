import React, { useCallback, useEffect, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export type MathMissionMode = 'campuran' | 'satu_angka' | 'dua_angka';

export interface MathQuestionItem {
  id: number;
  category: 'satu_angka' | 'dua_angka';
  numA: number;
  numB: number;
  answer: number;
  options: number[];
  itemIcon: string;
  itemName: string;
  hintText: string;
}

export interface MathGradeReport {
  mode: MathMissionMode;
  correctCount: number;
  totalQuestions: number;
  score: number;
  letterGrade: string;
  predicate: string;
  teacherNote: string;
}

const COUNTING_OBJECTS = [
  { icon: '🍎', name: 'Apel Merah' },
  { icon: '✏️', name: 'Pensil Kayu' },
  { icon: '⭐', name: 'Bintang Emas' },
  { icon: '🍊', name: 'Jeruk Manis' },
  { icon: '📘', name: 'Buku Tulis' },
  { icon: '🍬', name: 'Permen Susu' },
  { icon: '🎈', name: 'Balon Warna' },
  { icon: '🍌', name: 'Pisang Matang' },
];

export function calculateMathGrade(
  correctCount: number,
  totalQuestions = 10,
  mode: MathMissionMode = 'campuran'
): MathGradeReport {
  const score = Math.round((correctCount / totalQuestions) * 100);
  const modeLabel =
    mode === 'satu_angka'
      ? 'Penjumlahan 1 Angka'
      : mode === 'dua_angka'
      ? 'Penjumlahan 2 Angka'
      : 'Penjumlahan 1 & 2 Angka';

  let letterGrade = 'D';
  let predicate = 'Perlu Latihan Lagi';
  let teacherNote = `Ayo berlatih lagi menghitung ${modeLabel} bersama Bu Maya di Ruang Kelas 1A ya!`;

  if (score >= 90) {
    letterGrade = 'A+';
    predicate = 'Bintang Matematika Kelas 1';
    teacherNote = `Luar biasa pintar! Kamu menguasai ${modeLabel} dengan sangat cepat dan tepat. Bu Maya bangga sekali!`;
  } else if (score >= 80) {
    letterGrade = 'A';
    predicate = 'Sangat Pandai Berhitung';
    teacherNote = `Hebat sekali! Kamu sudah mahir menghitung ${modeLabel} di papan tulis Kelas 1A!`;
  } else if (score >= 70) {
    letterGrade = 'B+';
    predicate = 'Pintar Berhitung (Lulus)';
    teacherNote = `Bagus! Kamu sudah lulus latihan ${modeLabel}. Terus teliti menjumlahkan satuan dan puluhan ya!`;
  } else if (score >= 50) {
    letterGrade = 'C';
    predicate = 'Cukup Baik';
    teacherNote = `Cukup bagus, perhatikan kembali jumlah satuan dan puluhan saat mengerjakan ${modeLabel} ya!`;
  }

  return {
    mode,
    correctCount,
    totalQuestions,
    score,
    letterGrade,
    predicate,
    teacherNote,
  };
}

function buildOptions(correctAnswer: number, isTwoDigit: boolean): number[] {
  const set = new Set<number>([correctAnswer]);
  const offsets = isTwoDigit
    ? [-10, -2, -1, 1, 2, 3, 10, -3, 4]
    : [-3, -2, -1, 1, 2, 3, 4];

  for (let i = 0; i < offsets.length && set.size < 4; i++) {
    const pickIdx = Math.floor(Math.random() * offsets.length);
    const candidate = correctAnswer + offsets[pickIdx];
    if (candidate >= 2 && !set.has(candidate)) {
      set.add(candidate);
    }
  }
  let fallback = correctAnswer + 1;
  while (set.size < 4) {
    if (!set.has(fallback)) set.add(fallback);
    fallback++;
  }

  return Array.from(set).sort(() => Math.random() - 0.5);
}

export function generateGrade1MathQuestions(
  mode: MathMissionMode,
  total = 10
): MathQuestionItem[] {
  const questions: MathQuestionItem[] = [];

  for (let i = 0; i < total; i++) {
    const isTwoDigit =
      mode === 'dua_angka' ? true : mode === 'satu_angka' ? false : i >= 5;

    const obj = COUNTING_OBJECTS[i % COUNTING_OBJECTS.length];
    let numA = 1;
    let numB = 1;
    let hintText = '';

    if (!isTwoDigit) {
      // Penjumlahan 1 Angka (1 s/d 9 + 1 s/d 9)
      if (i < 2) {
        numA = 1 + Math.floor(Math.random() * 4); // 1..4
        numB = 1 + Math.floor(Math.random() * 5); // 1..5
      } else {
        numA = 3 + Math.floor(Math.random() * 7); // 3..9
        numB = 2 + Math.floor(Math.random() * 8); // 2..9
      }
      hintText = `Hitung semua ${obj.icon} ${obj.name}: ${numA} ditambah ${numB}`;
    } else {
      // Penjumlahan 2 Angka Kelas 1 SD (10 s/d 48 + 10 s/d 39)
      const tensA = (1 + Math.floor(Math.random() * 3)) * 10; // 10, 20, 30
      const onesA = Math.floor(Math.random() * 6); // 0..5
      const tensB = (1 + Math.floor(Math.random() * 2)) * 10; // 10, 20
      const onesB = 1 + Math.floor(Math.random() * (9 - onesA)); // tanpa simpan berlebih agar ramah Kelas 1 SD
      numA = tensA + onesA;
      numB = tensB + onesB;
      const sumTens = tensA + tensB;
      const sumOnes = onesA + onesB;
      hintText = `Puluhan: ${tensA} + ${tensB} = ${sumTens}  ·  Satuan: ${onesA} + ${onesB} = ${sumOnes}`;
    }

    const answer = numA + numB;
    questions.push({
      id: i + 1,
      category: isTwoDigit ? 'dua_angka' : 'satu_angka',
      numA,
      numB,
      answer,
      options: buildOptions(answer, isTwoDigit),
      itemIcon: obj.icon,
      itemName: obj.name,
      hintText,
    });
  }

  return questions;
}

interface MathMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onSyncChalkboard: (
    title: string,
    equation: string,
    subtext: string,
    isCorrect: boolean | null,
    teacherComment?: string
  ) => void;
  onFinishMission: (report: MathGradeReport) => void;
  onExitMission: () => void;
}

export const MathMinigameHUD: React.FC<MathMinigameHUDProps> = ({
  studentName,
  soundEnabled,
  onSyncChalkboard,
  onFinishMission,
  onExitMission,
}) => {
  const [mode, setMode] = useState<MathMissionMode>('campuran');
  const [questions, setQuestions] = useState<MathQuestionItem[]>(() =>
    generateGrade1MathQuestions('campuran', 10)
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [outcomes, setOutcomes] = useState<('correct' | 'wrong' | null)[]>(() =>
    Array(10).fill(null)
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex] || questions[0];
  const correctCount = outcomes.filter((o) => o === 'correct').length;
  const answeredCount = outcomes.filter((o) => o !== null).length;
  const liveReport = calculateMathGrade(correctCount, questions.length, mode);

  // Sync current question onto the 3D Kelas 1A Chalkboard whenever question changes
  useEffect(() => {
    if (!currentQuestion || isCompleted) return;
    if (selectedOption === null) {
      const catBadge =
        currentQuestion.category === 'satu_angka'
          ? 'PENJUMLAHAN 1 ANGKA'
          : 'PENJUMLAHAN 2 ANGKA';
      onSyncChalkboard(
        `SOAL #${currentIndex + 1} · ${catBadge}`,
        `${currentQuestion.numA} + ${currentQuestion.numB} = ?`,
        currentQuestion.hintText,
        null,
        `Soal nomor ${currentIndex + 1}: Berapakah hasil dari ${currentQuestion.numA} ditambah ${currentQuestion.numB}?`
      );
    }
  }, [currentIndex, currentQuestion, isCompleted, selectedOption]);

  const handleSelectMode = (nextMode: MathMissionMode) => {
    if (selectedOption !== null) return;
    soundFX.playPop(soundEnabled);
    const nextQuestions = generateGrade1MathQuestions(nextMode, 10);
    setMode(nextMode);
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setOutcomes(Array(10).fill(null));
    setSelectedOption(null);
    setIsCompleted(false);
  };

  const handleRestartQuiz = () => {
    soundFX.playWhistle(soundEnabled);
    const nextQuestions = generateGrade1MathQuestions(mode, 10);
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setOutcomes(Array(10).fill(null));
    setSelectedOption(null);
    setIsCompleted(false);
  };

  const handleChooseOption = useCallback(
    (chosenValue: number) => {
      if (selectedOption !== null || isCompleted || !currentQuestion) return;

      setSelectedOption(chosenValue);
      const isCorrect = chosenValue === currentQuestion.answer;

      if (isCorrect) {
        soundFX.playGoalCheer(soundEnabled);
      } else {
        soundFX.playKeeperSave(soundEnabled);
      }

      const nextOutcomes = [...outcomes];
      nextOutcomes[currentIndex] = isCorrect ? 'correct' : 'wrong';
      setOutcomes(nextOutcomes);

      const teacherFeedback = isCorrect
        ? `Pintar sekali ${studentName}! ${currentQuestion.numA} + ${currentQuestion.numB} = ${currentQuestion.answer}. Jawabanmu tepat!`
        : `Tetap semangat ${studentName}! ${currentQuestion.numA} + ${currentQuestion.numB} yang benar adalah ${currentQuestion.answer}.`;

      onSyncChalkboard(
        isCorrect ? '✓ JAWABAN BENAR!' : `✕ JAWABAN: ${currentQuestion.answer}`,
        `${currentQuestion.numA} + ${currentQuestion.numB} = ${currentQuestion.answer}`,
        currentQuestion.hintText,
        isCorrect,
        teacherFeedback
      );

      window.setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          const finalCorrect = nextOutcomes.filter((o) => o === 'correct').length;
          const finalReport = calculateMathGrade(finalCorrect, questions.length, mode);
          setIsCompleted(true);
          setSelectedOption(null);
          onFinishMission(finalReport);
          onSyncChalkboard(
            `NILAI MATEMATIKA: ${finalReport.score} (${finalReport.letterGrade})`,
            `BENAR ${finalCorrect} / ${questions.length} SOAL`,
            finalReport.predicate,
            finalReport.score >= 70,
            finalReport.teacherNote
          );
        } else {
          setSelectedOption(null);
          setCurrentIndex((prev) => prev + 1);
        }
      }, 1350);
    },
    [
      currentIndex,
      currentQuestion,
      isCompleted,
      mode,
      onFinishMission,
      onSyncChalkboard,
      outcomes,
      questions.length,
      selectedOption,
      soundEnabled,
      studentName,
    ]
  );

  // Keyboard shortcuts 1, 2, 3, 4 for selecting options A, B, C, D
  useEffect(() => {
    if (isCompleted || selectedOption !== null || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.code === 'Digit1' && currentQuestion.options[0] !== undefined) {
        e.preventDefault();
        handleChooseOption(currentQuestion.options[0]);
      } else if (e.code === 'Digit2' && currentQuestion.options[1] !== undefined) {
        e.preventDefault();
        handleChooseOption(currentQuestion.options[1]);
      } else if (e.code === 'Digit3' && currentQuestion.options[2] !== undefined) {
        e.preventDefault();
        handleChooseOption(currentQuestion.options[2]);
      } else if (e.code === 'Digit4' && currentQuestion.options[3] !== undefined) {
        e.preventDefault();
        handleChooseOption(currentQuestion.options[3]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQuestion, handleChooseOption, isCompleted, selectedOption]);

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-3 select-none">
      {selectedOption !== null && !isCompleted && (
        <div
          className={`px-3.5 py-1 rounded-full border shadow-lg text-xs font-black ${
            selectedOption === currentQuestion.answer
              ? 'bg-emerald-600/95 border-white text-white'
              : 'bg-rose-700/95 border-white text-white'
          }`}
        >
          {selectedOption === currentQuestion.answer
            ? `🎉 BENAR! ${currentQuestion.numA} + ${currentQuestion.numB} = ${currentQuestion.answer}`
            : `💡 Jawaban: ${currentQuestion.numA} + ${currentQuestion.numB} = ${currentQuestion.answer}`}
        </div>
      )}

      {isCompleted ? (
        <div className="w-full max-w-xs bg-slate-950/90 backdrop-blur-md border border-emerald-400/80 rounded-2xl p-3.5 shadow-2xl text-center pointer-events-auto space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-left">
              <div className="text-[10px] font-bold text-emerald-300 uppercase">
                Rapor Matematika Kelas 1
              </div>
              <div className="text-xs font-bold text-white truncate">{studentName}</div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
              {liveReport.score} ({liveReport.letterGrade})
            </div>
          </div>

          <div className="text-xs text-slate-300">
            Benar: <strong className="text-emerald-400">{correctCount}/{questions.length}</strong> ·{' '}
            {liveReport.predicate}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestartQuiz}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              🔄 Soal Baru
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
        currentQuestion && (
          <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-xl pointer-events-auto space-y-1.5">
            {/* Row 1: Mode Switch + Question Counter + Score + Exit */}
            <div className="flex items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  disabled={selectedOption !== null}
                  onClick={() => handleSelectMode('campuran')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    mode === 'campuran'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Campur
                </button>
                <button
                  type="button"
                  disabled={selectedOption !== null}
                  onClick={() => handleSelectMode('satu_angka')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    mode === 'satu_angka'
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1 Angka
                </button>
                <button
                  type="button"
                  disabled={selectedOption !== null}
                  onClick={() => handleSelectMode('dua_angka')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    mode === 'dua_angka'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2 Angka
                </button>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                <span>Soal {currentIndex + 1}/{questions.length}</span>
                <span className="text-emerald-400">· ✓ {correctCount}</span>
                {answeredCount > 0 && (
                  <span className="text-amber-300">· ⭐ {liveReport.score}</span>
                )}
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

            {/* Row 2: Equation + 4 Answer Buttons in a single compact row */}
            <div className="flex items-center gap-2">
              <div className="bg-emerald-950/90 border border-amber-600/80 rounded-xl px-2.5 py-1.5 shrink-0">
                <div className="text-sm sm:text-base font-black text-white font-mono whitespace-nowrap">
                  {currentQuestion.numA} + {currentQuestion.numB} ={' '}
                  <span className="text-amber-300">
                    {selectedOption !== null ? currentQuestion.answer : '?'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 flex-1">
                {currentQuestion.options.map((optValue, idx) => {
                  const isChosen = selectedOption === optValue;
                  const isRightAnswer = optValue === currentQuestion.answer;

                  let btnStyle =
                    'bg-slate-900 hover:bg-emerald-950 border-slate-700 hover:border-emerald-400 text-white';
                  if (selectedOption !== null) {
                    if (isRightAnswer) {
                      btnStyle = 'bg-emerald-500 border-white text-slate-950';
                    } else if (isChosen) {
                      btnStyle = 'bg-rose-600 border-white text-white';
                    } else {
                      btnStyle = 'bg-slate-900 border-slate-800 text-slate-500 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={`${currentQuestion.id}-${optValue}-${idx}`}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleChooseOption(optValue)}
                      className={`py-1.5 px-1 rounded-xl border font-black text-sm transition-all active:scale-95 cursor-pointer ${btnStyle}`}
                    >
                      {optValue}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
