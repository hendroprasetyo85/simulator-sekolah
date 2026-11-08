import React, { useEffect, useRef, useState } from 'react';
import {
  CeremonySongState,
  indonesiaRayaAudio,
} from '../utils/indonesiaRayaAudio';

export type CeremonyCameraView = 'panoramic' | 'paskibra' | 'north_teachers' | 'south_students';

interface OpeningCeremonyHUDProps {
  soundEnabled: boolean;
  cameraView: CeremonyCameraView;
  onChangeCameraView: (view: CeremonyCameraView) => void;
  onUpdateFlagProgress: (progress: number) => void;
  onFinishCeremony: () => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export const OpeningCeremonyHUD: React.FC<OpeningCeremonyHUDProps> = ({
  soundEnabled,
  cameraView,
  onChangeCameraView,
  onUpdateFlagProgress,
  onFinishCeremony,
}) => {
  const [songState, setSongState] = useState<CeremonySongState>(() => ({
    isPlaying: true,
    isAudioUnlocked: false,
    progress: 0,
    elapsedSec: 0,
    totalSec: 109.06,
    currentLyric: '🎺 Kepada Sang Bendera Merah Putih... HORMAT GRAK!',
    currentSection: 'Intro Fanfare Simfoni (Instrumental Asli)',
    trackType: 'instrumental',
    trackTitle: 'Instrumental Asli Indonesia Raya (Orkes Simfoni / Korsik)',
  }));
  const [isCompletedHold, setIsCompletedHold] = useState<boolean>(false);

  const onUpdateProgressRef = useRef(onUpdateFlagProgress);
  const onFinishRef = useRef(onFinishCeremony);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    onUpdateProgressRef.current = onUpdateFlagProgress;
  }, [onUpdateFlagProgress]);

  useEffect(() => {
    onFinishRef.current = onFinishCeremony;
  }, [onFinishCeremony]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    indonesiaRayaAudio.startCeremonyAnthem(soundEnabledRef.current, 'instrumental');
    onUpdateProgressRef.current(0);

    let rafId = 0;
    let lastTime = performance.now();
    let finishTimeout = 0;
    let hasTriggeredFinish = false;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const st = indonesiaRayaAudio.update(dt, soundEnabledRef.current);
      onUpdateProgressRef.current(st.progress);
      setSongState(st);

      if (st.progress >= 1.0 && !hasTriggeredFinish) {
        hasTriggeredFinish = true;
        setIsCompletedHold(true);
        finishTimeout = window.setTimeout(() => {
          onFinishRef.current();
        }, 3200);
      } else if (!hasTriggeredFinish) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (finishTimeout) {
        window.clearTimeout(finishTimeout);
      }
      indonesiaRayaAudio.stopCeremonyAnthem();
    };
  }, []);

  const handleUnlockAudio = () => {
    indonesiaRayaAudio.unlockAudio();
  };

  const pct = Math.round(songState.progress * 100);

  return (
    <div
      onClick={handleUnlockAudio}
      className="fixed inset-x-0 bottom-2 z-30 flex flex-col items-center px-2 pointer-events-none select-none"
    >
      {/* Top minimal ceremony badge & Audio activation button */}
      <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-red-500/60 rounded-full px-3.5 py-1.5 shadow-xl pointer-events-auto">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[11px] sm:text-xs font-extrabold tracking-wide text-white uppercase whitespace-nowrap">
          🇲🇨 Upacara Bendera · Korsik Instrumental
        </span>
        {!songState.isAudioUnlocked && (
          <button
            type="button"
            onClick={handleUnlockAudio}
            className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] animate-bounce shadow"
          >
            🎺 Aktifkan Suara Instrumental
          </button>
        )}
      </div>

      {/* Compact Bottom Ceremony Control & Live Instrumental Status Bar */}
      <div className="w-full max-w-xl bg-slate-950/92 backdrop-blur-md border border-slate-700/90 rounded-2xl px-3.5 py-2.5 shadow-2xl pointer-events-auto space-y-2">
        {/* Row 1: Instrumental Badge + Camera angle switcher + Skip button */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-amber-400">🎺</span>
            <span className="font-bold text-slate-200">
              Iringan Korsik Instrumental Upacara
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                handleUnlockAudio();
                const order: CeremonyCameraView[] = [
                  'panoramic',
                  'paskibra',
                  'south_students',
                  'north_teachers',
                ];
                const next = order[(order.indexOf(cameraView) + 1) % order.length];
                onChangeCameraView(next);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold border border-slate-600/80 transition-colors"
              title="Ganti Sudut Pandang Kamera Upacara"
            >
              🎥{' '}
              {cameraView === 'panoramic'
                ? 'Keliling'
                : cameraView === 'paskibra'
                ? '3 Paskibra'
                : cameraView === 'south_students'
                ? 'Siswa (Selatan)'
                : 'Guru (Utara)'}
            </button>

            <button
              type="button"
              onClick={() => {
                indonesiaRayaAudio.stopCeremonyAnthem();
                onFinishCeremony();
              }}
              className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white font-bold border border-slate-600/80 transition-colors"
              title="Akhiri upacara dan kembalikan seluruh NPC ke kegiatan masing-masing"
            >
              ⏭️ Selesai Upacara
            </button>
          </div>
        </div>

        {/* Row 2: Live Instrumental Section Display */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-3 py-2 text-center">
          {isCompletedHold ? (
            <p className="text-xs sm:text-sm font-extrabold text-emerald-300">
              ✨ Upacara Bendera Selesai! Seluruh Siswa & Guru Kembali ke Kegiatan Masing-Masing...
            </p>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {songState.currentSection} • {songState.trackTitle}
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-wide">
                {songState.currentLyric}
              </p>
            </div>
          )}
        </div>

        {/* Row 3: Synchronized Flag Hoisting Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-300">
              🚩 Penaikan Bendera Merah Putih:{' '}
              <strong className="text-white">{pct}%</strong> (Seirama Instrumental)
            </span>
            <span className="text-slate-400 font-mono">
              {formatTime(songState.elapsedSec)} / {formatTime(songState.totalSec)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-red-500 to-white transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
