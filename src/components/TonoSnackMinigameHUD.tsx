import React, { useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface TonoGradeReport {
  score: number;
  correctCount: number;
  totalQuestions: number;
  letterGrade: string;
  predicate: string;
  notes: string;
}

export interface SnackItem {
  id: string;
  name: string;
  vendor: string;
  price: number;
  icon: string;
  unit: string;
}

export const SNACK_CATALOG: SnackItem[] = [
  {
    id: 'cilok',
    name: 'Cilok Bumbu Kacang',
    vendor: 'Mang Asep',
    price: 2000,
    icon: '🍢',
    unit: 'porsi',
  },
  {
    id: 'batagor',
    name: 'Batagor Tahu Renyah',
    vendor: 'Mang Asep',
    price: 4000,
    icon: '🥟',
    unit: 'porsi',
  },
  {
    id: 'telur_gulung',
    name: 'Telur Gulung Gurih',
    vendor: 'Bang Udin',
    price: 3000,
    icon: '🥢',
    unit: 'porsi (3 tusuk)',
  },
  {
    id: 'cimol',
    name: 'Cimol Bumbu Balado',
    vendor: 'Bang Udin',
    price: 2000,
    icon: '🍡',
    unit: 'bungkus',
  },
  {
    id: 'sosis_bakar',
    name: 'Sosis Bakar Mini',
    vendor: 'Bang Udin',
    price: 2500,
    icon: '🌭',
    unit: 'tusuk',
  },
  {
    id: 'es_doger',
    name: 'Es Doger Roti Spesial',
    vendor: 'Mang Dedi',
    price: 3000,
    icon: '🍧',
    unit: 'gelas',
  },
  {
    id: 'es_mambo',
    name: 'Es Mambo Pelangi',
    vendor: 'Mang Dedi',
    price: 1500,
    icon: '🧃',
    unit: 'batang',
  },
  {
    id: 'kue_leker',
    name: 'Kue Leker Cokelat Keju',
    vendor: 'Gerobak Leker',
    price: 2000,
    icon: '🥞',
    unit: 'lipat',
  },
];

interface StoryQuestion {
  id: number;
  title: string;
  pocketMoney: number;
  items: { item: SnackItem; qty: number }[];
  isAffordable: boolean;
  totalCost: number;
  correctChange: number; // if not affordable, represents shortage (negative)
  hint: string;
}

const STORY_QUESTIONS: StoryQuestion[] = [
  {
    id: 1,
    title: 'Soal 1: Cilok Hangat Mang Asep',
    pocketMoney: 5000,
    items: [{ item: SNACK_CATALOG[0], qty: 1 }], // 1 Cilok (2.000)
    isAffordable: true,
    totalCost: 2000,
    correctChange: 3000,
    hint: 'Uang Tono Rp 5.000 dikurangi harga 1 porsi Cilok Rp 2.000 = Rp 3.000.',
  },
  {
    id: 2,
    title: 'Soal 2: Telur Gulung & Es Doger',
    pocketMoney: 10000,
    items: [
      { item: SNACK_CATALOG[2], qty: 1 }, // 1 Telur Gulung (3.000)
      { item: SNACK_CATALOG[5], qty: 1 }, // 1 Es Doger (3.000)
    ],
    isAffordable: true,
    totalCost: 6000,
    correctChange: 4000,
    hint: 'Total jajan: Rp 3.000 + Rp 3.000 = Rp 6.000. Kembalian: Rp 10.000 - Rp 6.000 = Rp 4.000.',
  },
  {
    id: 3,
    title: 'Soal 3: Paket Jajan Komplit 3 Gerobak',
    pocketMoney: 10000,
    items: [
      { item: SNACK_CATALOG[1], qty: 1 }, // Batagor (4.000)
      { item: SNACK_CATALOG[3], qty: 1 }, // Cimol (2.000)
      { item: SNACK_CATALOG[6], qty: 1 }, // Es Mambo (1.500)
    ],
    isAffordable: true,
    totalCost: 7500,
    correctChange: 2500,
    hint: 'Total: Rp 4.000 + Rp 2.000 + Rp 1.500 = Rp 7.500. Kembalian: Rp 10.000 - Rp 7.500 = Rp 2.500.',
  },
  {
    id: 4,
    title: 'Soal 4: Tono Traktir Teman Sebangku',
    pocketMoney: 20000,
    items: [
      { item: SNACK_CATALOG[0], qty: 2 }, // 2 Cilok = 4.000
      { item: SNACK_CATALOG[2], qty: 2 }, // 2 Telur Gulung = 6.000
      { item: SNACK_CATALOG[5], qty: 2 }, // 2 Es Doger = 6.000
    ],
    isAffordable: true,
    totalCost: 16000,
    correctChange: 4000,
    hint: 'Total traktir: (2×2.000) + (2×3.000) + (2×3.000) = 4.000 + 6.000 + 6.000 = Rp 16.000. Kembalian: Rp 20.000 - Rp 16.000 = Rp 4.000.',
  },
  {
    id: 5,
    title: 'Soal 5: Cek Kecukupan Uang Saku Tono',
    pocketMoney: 5000,
    items: [
      { item: SNACK_CATALOG[1], qty: 1 }, // Batagor (4.000)
      { item: SNACK_CATALOG[5], qty: 1 }, // Es Doger (3.000)
    ],
    isAffordable: false,
    totalCost: 7000,
    correctChange: -2000, // Shortage Rp 2.000
    hint: 'Total belanja Rp 7.000 melebihi uang saku Tono Rp 5.000. Jadi uang Tono tidak cukup dan kurang Rp 2.000.',
  },
];

export function calculateTonoGrade(correctCount: number, totalQuestions: number): TonoGradeReport {
  const score = Math.round((correctCount / totalQuestions) * 100);
  let letterGrade = 'D';
  let predicate = 'Perlu Berlatih Berhitung';
  let notes = 'Ayo kita latihan berhitung harga belanja dan uang kembalian lagi ya Tono!';

  if (score >= 90) {
    letterGrade = 'A+';
    predicate = 'Juara Cerdas Belanja & Kembalian SD';
    notes = 'Luar biasa pintar! Tono sekarang sangat percaya diri jajan di depan gerbang sekolah dan uang kembaliannya selalu tepat!';
  } else if (score >= 75) {
    letterGrade = 'A';
    predicate = 'Pintar Menghitung Uang Jajan';
    notes = 'Hebat sekali! Berkat bantuanmu, Tono bisa berbelanja jajanan dengan tertib dan menghitung uang kembalian tanpa bingung!';
  } else if (score >= 60) {
    letterGrade = 'B';
    predicate = 'Cukup Teliti Berhitung';
    notes = 'Bagus! Tono sudah paham cara mengurangi uang jajan dengan total belanja. Terus tingkatkan ketelitian ya!';
  }

  return {
    score,
    correctCount,
    totalQuestions,
    letterGrade,
    predicate,
    notes,
  };
}

export function formatRupiah(num: number): string {
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  return `${isNeg ? '- ' : ''}Rp ${absNum.toLocaleString('id-ID')}`;
}

interface TonoSnackMinigameHUDProps {
  studentName?: string;
  soundEnabled?: boolean;
  onClose: () => void;
  onFinishMission: (report: TonoGradeReport) => void;
  onSyncComment?: (comment: string, isSuccess: boolean) => void;
}

export const TonoSnackMinigameHUD: React.FC<TonoSnackMinigameHUDProps> = ({
  studentName = 'Siswa',
  soundEnabled = true,
  onClose,
  onFinishMission,
  onSyncComment,
}) => {
  const [activeTab, setActiveTab] = useState<'soal' | 'bebas'>('soal');

  // --- State Mode 1: Tantangan Soal Cerita (5 Soal) ---
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userSelectedTotal, setUserSelectedTotal] = useState<number | null>(null);
  const [userSelectedChange, setUserSelectedChange] = useState<number | null>(null);
  const [userAffordableChoice, setUserAffordableChoice] = useState<boolean | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<{
    status: 'correct' | 'wrong' | null;
    message: string;
  }>({ status: null, message: '' });
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [solvedQuestionIds, setSolvedQuestionIds] = useState<number[]>([]);
  const [isQuizFinished, setIsQuizFinished] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<TonoGradeReport | null>(null);

  // --- State Mode 2: Warung Jajan Bebas ---
  const [freePocketMoney, setFreePocketMoney] = useState<number>(10000);
  const [freeCart, setFreeCart] = useState<Record<string, number>>({
    cilok: 1,
    es_doger: 1,
  });
  const [freeTotalGuess, setFreeTotalGuess] = useState<string>('');
  const [freeChangeGuess, setFreeChangeGuess] = useState<string>('');
  const [freeFeedback, setFreeFeedback] = useState<{
    status: 'correct' | 'wrong' | null;
    message: string;
  }>({ status: null, message: '' });

  const currentQ = STORY_QUESTIONS[currentQuestionIdx];

  // Helper options for Multiple Choice in Mode 1
  const generateMultipleChoiceOptions = (
    correctVal: number,
    step = 1000,
    minVal = 0
  ): number[] => {
    const list = [correctVal];
    const deltas = [-step, step, -2 * step, 2 * step, 3 * step, 4 * step];
    for (const d of deltas) {
      const candidate = correctVal + d;
      if (candidate >= minVal && !list.includes(candidate)) {
        list.push(candidate);
      }
      if (list.length >= 4) break;
    }
    return list.sort((a, b) => {
      const ha = Math.sin(a * 0.013 + correctVal * 0.007) * 10000;
      const hb = Math.sin(b * 0.013 + correctVal * 0.007) * 10000;
      return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
    });
  };

  const handleCheckStoryAnswer = () => {
    if (!currentQ) return;

    // Step 1: Validate totalCost for all questions (1-5)
    if (userSelectedTotal !== currentQ.totalCost) {
      soundFX.playBuzzer(soundEnabled);
      setQuestionFeedback({
        status: 'wrong',
        message:
          'Hitungan total harga jajan belum tepat. Perhatikan harga masing-masing jajanan ya!',
      });
      onSyncComment?.('Wah hitungan total harganya masih salah teman, coba cek lagi ya!', false);
      return;
    }

    // Step 2: For Question 5 (Affordability check) or Questions 1-4 (Change check)
    if (!currentQ.isAffordable) {
      if (userAffordableChoice !== false) {
        soundFX.playBuzzer(soundEnabled);
        setQuestionFeedback({
          status: 'wrong',
          message:
            'Ups, uang Tono Rp 5.000 tidak cukup untuk belanja Rp 7.000! Coba pilih "Tidak Cukup (Kurang)".',
        });
        onSyncComment?.('Waduh uangku tidak cukup untuk beli semua jajan ini!', false);
        return;
      }
      if (userSelectedChange !== currentQ.correctChange) {
        soundFX.playBuzzer(soundEnabled);
        setQuestionFeedback({
          status: 'wrong',
          message: `Uang Tono kurang ${formatRupiah(Math.abs(currentQ.correctChange))}. Coba periksa lagi nominal kekurangannya!`,
        });
        return;
      }
    } else {
      if (userSelectedChange !== currentQ.correctChange) {
        soundFX.playBuzzer(soundEnabled);
        setQuestionFeedback({
          status: 'wrong',
          message: `Kembalian yang dihitung belum pas. Uang Saku (${formatRupiah(currentQ.pocketMoney)}) - Total Belanja (${formatRupiah(currentQ.totalCost)}) = ${formatRupiah(currentQ.correctChange)}.`,
        });
        onSyncComment?.('Uang kembalian yang kudapat belum sesuai, ayo hitung lagi!', false);
        return;
      }
    }

    // Success!
    soundFX.playCoin(soundEnabled);
    soundFX.playPop(soundEnabled);
    if (!solvedQuestionIds.includes(currentQ.id)) {
      setSolvedQuestionIds((prev) => [...prev, currentQ.id]);
      setCorrectAnswersCount((prev) => prev + 1);
    }
    setQuestionFeedback({
      status: 'correct',
      message: `HEBAT! Hitunganmu tepat sekali! ${currentQ.hint}`,
    });
    onSyncComment?.('Horeee! Hitungannya pas banget! Terima kasih sudah bantu Tono jajan!', true);
  };

  const handleNextStoryQuestion = () => {
    soundFX.playPop(soundEnabled);
    setUserSelectedTotal(null);
    setUserSelectedChange(null);
    setUserAffordableChoice(null);
    setQuestionFeedback({ status: null, message: '' });

    if (currentQuestionIdx + 1 < STORY_QUESTIONS.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      // Quiz complete!
      const report = calculateTonoGrade(correctAnswersCount, STORY_QUESTIONS.length);
      setFinalReport(report);
      setIsQuizFinished(true);
      onFinishMission(report);
    }
  };

  // --- Mode 2 Handlers: Warung Jajan Bebas ---
  const freeTotalReal = Object.entries(freeCart).reduce((sum, [snackId, qty]) => {
    const item = SNACK_CATALOG.find((s) => s.id === snackId);
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const freeChangeReal = freePocketMoney - freeTotalReal;

  const handleUpdateCartQty = (snackId: string, delta: number) => {
    soundFX.playPop(soundEnabled);
    setFreeCart((prev) => {
      const current = prev[snackId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[snackId];
        return copy;
      }
      return { ...prev, [snackId]: next };
    });
    setFreeFeedback({ status: null, message: '' });
  };

  const handleCheckFreeCalculation = () => {
    const totalNum = parseInt(freeTotalGuess.replace(/[^0-9]/g, ''), 10);
    const changeNum = parseInt(freeChangeGuess.replace(/[^0-9-]/g, ''), 10);

    if (isNaN(totalNum)) {
      soundFX.playBuzzer(soundEnabled);
      setFreeFeedback({ status: 'wrong', message: 'Tuliskan tebakan Total Belanja terlebih dahulu ya!' });
      return;
    }

    if (totalNum !== freeTotalReal) {
      soundFX.playBuzzer(soundEnabled);
      setFreeFeedback({
        status: 'wrong',
        message: `Total belanja sebenarnya adalah ${formatRupiah(freeTotalReal)}. Coba hitung lagi!`,
      });
      return;
    }

    if (freeChangeReal >= 0) {
      if (isNaN(changeNum) || changeNum !== freeChangeReal) {
        soundFX.playBuzzer(soundEnabled);
        setFreeFeedback({
          status: 'wrong',
          message: `Uang kembalian yang harus diterima Tono adalah ${formatRupiah(freeChangeReal)} (${formatRupiah(freePocketMoney)} - ${formatRupiah(freeTotalReal)}).`,
        });
        return;
      }
    } else {
      // Uang tidak cukup
      if (isNaN(changeNum) || Math.abs(changeNum) !== Math.abs(freeChangeReal)) {
        soundFX.playBuzzer(soundEnabled);
        setFreeFeedback({
          status: 'wrong',
          message: `Uang Tono tidak cukup dan kurang ${formatRupiah(Math.abs(freeChangeReal))}!`,
        });
        return;
      }
    }

    // Correct!
    soundFX.playCoin(soundEnabled);
    setFreeFeedback({
      status: 'correct',
      message: `SEMPURNA! Total jajan ${formatRupiah(freeTotalReal)} dan ${
        freeChangeReal >= 0
          ? `kembaliannya ${formatRupiah(freeChangeReal)} diterima utuh di saku Tono!`
          : `kekurangannya ${formatRupiah(Math.abs(freeChangeReal))} berhasil terhitung!`
      }`,
    });
    onSyncComment?.('Mantap! Hitungan jajan di gerobak pas sekali!', true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border border-amber-500/35 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-900/40 via-slate-800 to-amber-900/30 border-b border-amber-500/25">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 text-lg border border-amber-500/30 shadow-inner">
              🍢
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-1.5">
                Misi Jajan Tono (Kelas 2A)
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                  Literasi Keuangan SD
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Bantu Tono menghitung harga jajanan gerobak depan sekolah & uang kembaliannya!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Tutup Misi"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/80 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              soundFX.playPop(soundEnabled);
              setActiveTab('soal');
            }}
            className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'soal'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📝 Tantangan Soal Belanja ({STORY_QUESTIONS.length} Soal)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundFX.playPop(soundEnabled);
              setActiveTab('bebas');
            }}
            className={`pb-2 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'bebas'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🛒 Warung Jajan Bebas (Simulasi)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'soal' ? (
            isQuizFinished && finalReport ? (
              // Quiz Finished Screen
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 text-3xl border border-amber-500/40 shadow-lg">
                  🏆
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-300">
                    Misi Selesai! Nilai: {finalReport.score} ({finalReport.letterGrade})
                  </h3>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    {finalReport.predicate}
                  </p>
                  <p className="text-xs text-slate-300 max-w-md mx-auto mt-2 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                    &ldquo;{finalReport.notes}&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playPop(soundEnabled);
                      setCurrentQuestionIdx(0);
                      setCorrectAnswersCount(0);
                      setIsQuizFinished(false);
                      setFinalReport(null);
                      setQuestionFeedback({ status: null, message: '' });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
                  >
                    🔄 Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-colors"
                  >
                    Selesai & Lanjut Main
                  </button>
                </div>
              </div>
            ) : (
              // Active Story Question
              <div className="space-y-3.5">
                {/* Question Info Bar */}
                <div className="flex items-center justify-between bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-xs">
                  <span className="font-bold text-amber-300">
                    {currentQ.title}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Soal {currentQuestionIdx + 1} dari {STORY_QUESTIONS.length}
                  </span>
                </div>

                {/* Pocket Money Visual Card */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-800/80 to-emerald-950/40 border border-emerald-500/30">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">👛</span>
                    <div>
                      <div className="text-[11px] text-emerald-300 font-semibold">
                        Uang Saku Jajan Tono:
                      </div>
                      <div className="text-base font-extrabold text-emerald-400">
                        {formatRupiah(currentQ.pocketMoney)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                      {currentQ.pocketMoney === 5000
                        ? '1 Lembar Rp 5.000'
                        : currentQ.pocketMoney === 10000
                        ? '1 Lembar Rp 10.000'
                        : '1 Lembar Rp 20.000'}
                    </span>
                  </div>
                </div>

                {/* Items to buy list */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>🛒 Jajanan yang Ingin Dibeli Tono:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQ.items.map(({ item, qty }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <div className="font-bold text-slate-200">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-amber-400 font-semibold">
                              {item.vendor} · {formatRupiah(item.price)} / {item.unit}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold text-xs border border-amber-500/25">
                            {qty} {item.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question Prompts & Inputs */}
                <div className="p-3.5 rounded-xl bg-slate-800/70 border border-amber-500/20 space-y-3">
                  {/* Step 1: Total Belanja */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 block">
                      1. Berapa Total Harga Belanja Jajan Tono?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {generateMultipleChoiceOptions(currentQ.totalCost, 1000).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            soundFX.playPop(soundEnabled);
                            setUserSelectedTotal(opt);
                          }}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                            userSelectedTotal === opt
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-102'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          {formatRupiah(opt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Cek Kecukupan Uang (For Question 5) or Kembalian (Questions 1-4) */}
                  {!currentQ.isAffordable ? (
                    <div className="space-y-2 pt-1 border-t border-slate-700/60">
                      <label className="text-xs font-bold text-slate-200 block">
                        2. Apakah Uang Saku Tono Cukup untuk Membeli Semua Jajanan?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop(soundEnabled);
                            setUserAffordableChoice(true);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                            userAffordableChoice === true
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          ✅ Cukup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playPop(soundEnabled);
                            setUserAffordableChoice(false);
                          }}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                            userAffordableChoice === false
                              ? 'bg-rose-500 text-white border-rose-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          ❌ Tidak Cukup (Kurang)
                        </button>
                      </div>

                      {userAffordableChoice === false && (
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-bold text-rose-300 block">
                            Berapa kekurangan uang jajan Tono?
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {generateMultipleChoiceOptions(
                              Math.abs(currentQ.correctChange),
                              1000,
                              500
                            ).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  soundFX.playPop(soundEnabled);
                                  setUserSelectedChange(-opt);
                                }}
                                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${
                                  userSelectedChange === -opt
                                    ? 'bg-rose-500 text-white border-rose-400 scale-102'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                                }`}
                              >
                                Kurang {formatRupiah(opt)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1 border-t border-slate-700/60">
                      <label className="text-xs font-bold text-slate-200 block">
                        2. Berapa Uang Kembalian yang Harus Diterima Tono?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {generateMultipleChoiceOptions(currentQ.correctChange, 1000).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              soundFX.playPop(soundEnabled);
                              setUserSelectedChange(opt);
                            }}
                            className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                              userSelectedChange === opt
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-102'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                          >
                            {formatRupiah(opt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Banner */}
                  {questionFeedback.status && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
                        questionFeedback.status === 'correct'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      <span className="text-base">
                        {questionFeedback.status === 'correct' ? '🎉' : '💡'}
                      </span>
                      <span>{questionFeedback.message}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {questionFeedback.status === 'correct' ? (
                      <button
                        type="button"
                        onClick={handleNextStoryQuestion}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        <span>
                          {currentQuestionIdx + 1 < STORY_QUESTIONS.length
                            ? 'Lanjut Soal Berikutnya ➡️'
                            : 'Lihat Rapor Belanja 🏆'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckStoryAnswer}
                        disabled={
                          userSelectedTotal === null ||
                          (currentQ.isAffordable && userSelectedChange === null) ||
                          (!currentQ.isAffordable && userAffordableChoice === null)
                        }
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <span>Periksa Jawaban 🔍</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            // Mode 2: Warung Jajan Bebas (Simulasi)
            <div className="space-y-4">
              {/* Pocket Money Selector */}
              <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Atur Uang Saku Tono:
                  </span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {formatRupiah(freePocketMoney)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[5000, 10000, 15000, 20000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => {
                        soundFX.playPop(soundEnabled);
                        setFreePocketMoney(nominal);
                        setFreeFeedback({ status: null, message: '' });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        freePocketMoney === nominal
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {nominal / 1000}rb
                    </button>
                  ))}
                </div>
              </div>

              {/* Snack Catalog Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Pilih Jajanan Gerobak Depan Sekolah:</span>
                  <span className="text-[11px] text-amber-400">
                    Klik [+] / [-] untuk beli
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {SNACK_CATALOG.map((snack) => {
                    const qty = freeCart[snack.id] || 0;
                    return (
                      <div
                        key={snack.id}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                          qty > 0
                            ? 'bg-amber-950/25 border-amber-500/40'
                            : 'bg-slate-800/50 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{snack.icon}</span>
                          <div>
                            <div className="font-bold text-slate-200">
                              {snack.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatRupiah(snack.price)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(snack.id, -1)}
                            disabled={qty === 0}
                            className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold text-amber-300">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(snack.id, 1)}
                            className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculation Guess Panel */}
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Tebakan Total Belanja (Rp):
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 6000"
                      value={freeTotalGuess}
                      onChange={(e) => setFreeTotalGuess(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-bold focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Tebakan Uang Kembalian (Rp):
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 4000 (atau -2000 jika kurang)"
                      value={freeChangeGuess}
                      onChange={(e) => setFreeChangeGuess(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400 text-sm"
                    />
                  </div>
                </div>

                {freeFeedback.status && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      freeFeedback.status === 'correct'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    <span>{freeFeedback.status === 'correct' ? '🎉' : '💡'}</span>
                    <span>{freeFeedback.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    Kunci: Uang Saku ({formatRupiah(freePocketMoney)}) - Total Belanja
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckFreeCalculation}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
                  >
                    Bayar & Cek Kembalian 🪙
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="shrink-0 px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>
            Sahabat Tono: <strong className="text-slate-200">{studentName}</strong>
          </span>
          <span className="text-amber-400/90 font-medium">
            SDN SUSUKAN 03 · Gerobak Jajanan Depan Gerbang
          </span>
        </div>
      </div>
    </div>
  );
};
