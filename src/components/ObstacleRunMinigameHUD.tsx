import React, { useEffect, useRef, useState } from 'react';
import { soundFX } from '../utils/soundFX';

export interface ObstacleRunGradeReport {
  score: number;
  letterGrade: string;
  predicate: string;
  clearedObstacles: number;
  perfectJumps: number;
  stumbles: number;
  totalObstacles: number;
  timeSeconds: number;
  teacherNote: string;
}

export interface ObstacleTrackItem {
  id: number;
  name: string;
  type: 'hurdle' | 'cones' | 'box' | 'tires';
  trackDist: number; // in meters/units along the circuit
  label: string;
  cleared?: boolean;
  outcome?: 'perfect' | 'good' | 'stumbled';
}

export const OBSTACLES_LIST: ObstacleTrackItem[] = [
  {
    id: 0,
    name: 'Gawang Rintangan 1',
    type: 'hurdle',
    trackDist: 14.0,
    label: 'Gawang Merah-Putih',
  },
  {
    id: 1,
    name: 'Kerucut Cones Latihan',
    type: 'cones',
    trackDist: 26.0,
    label: 'Kerucut Oranye 3 Baris',
  },
  {
    id: 2,
    name: 'Gawang Rintangan 2',
    type: 'hurdle',
    trackDist: 42.0,
    label: 'Gawang Kuning-Hitam',
  },
  {
    id: 3,
    name: 'Balok Busa PJOK',
    type: 'box',
    trackDist: 50.0,
    label: 'Balok Busa Biru',
  },
  {
    id: 4,
    name: 'Gawang Rintangan 3',
    type: 'hurdle',
    trackDist: 68.0,
    label: 'Gawang Merah-Putih',
  },
  {
    id: 5,
    name: 'Ban Bekas Kelincahan',
    type: 'tires',
    trackDist: 80.0,
    label: 'Ban Bekas Atletik',
  },
  {
    id: 6,
    name: 'Kerucut Cones Zig-Zag',
    type: 'cones',
    trackDist: 90.0,
    label: 'Kerucut Latihan Oranye',
  },
  {
    id: 7,
    name: 'Gawang Rintangan Terakhir',
    type: 'hurdle',
    trackDist: 108.0,
    label: 'Gawang Emas Finish',
  },
];

export const TOTAL_TRACK_DISTANCE = 124.8; // 1 lap around the sports field

export function calculateObstacleRunGrade(
  score: number,
  cleared: number,
  stumbles: number,
  timeSec: number
): ObstacleRunGradeReport {
  let letterGrade = 'B';
  let predicate = 'Cukup Baik';
  let teacherNote =
    'Sudah bagus berusaha keliling lapangan! Latih lagi kelincahan melompat dan stamina larimu!';

  if (score >= 720 && stumbles === 0) {
    letterGrade = 'A+';
    predicate = 'Pelari Tangguh (Istimewa)';
    teacherNote =
      'Luar biasa! Semua rintangan dilompati dengan sempurna tanpa tersandung sedikitpun. Nilai PJOK kamu A+!';
  } else if (score >= 580 && stumbles <= 1) {
    letterGrade = 'A';
    predicate = 'Sangat Bagus';
    teacherNote =
      'Bagus sekali! Kelincahan melompati gawang dan kecepatan larimu mengelilingi lapangan sangat mantap!';
  } else if (score >= 420) {
    letterGrade = 'B+';
    predicate = 'Baik (Lulus Praktik)';
    teacherNote =
      'Bagus! Kamu lulus ujian praktik lari rintangan atletik PJOK bersama Pak Budi!';
  }

  return {
    score,
    letterGrade,
    predicate,
    clearedObstacles: cleared,
    perfectJumps: Math.floor(score / 100),
    stumbles,
    totalObstacles: OBSTACLES_LIST.length,
    timeSeconds: Math.round(timeSec * 10) / 10,
    teacherNote,
  };
}

interface ObstacleRunMinigameHUDProps {
  studentName: string;
  soundEnabled: boolean;
  onClose: () => void;
  onFinishMission: (report: ObstacleRunGradeReport) => void;
  onSyncProgress: (distance: number, jumpY: number, isSprinting: boolean) => void;
  onKnockObstacle: (obstacleId: number) => void;
  onResetObstacles?: () => void;
  onSyncComment: (comment: string, isSuccess: boolean) => void;
  onTriggerFall?: (duration: number) => void;
}

const BONUS_STARS_DISTS = [20.0, 46.0, 74.0, 99.0];

export function ObstacleRunMinigameHUD({
  studentName,
  soundEnabled,
  onClose,
  onFinishMission,
  onSyncProgress,
  onKnockObstacle,
  onResetObstacles,
  onSyncComment,
  onTriggerFall,
}: ObstacleRunMinigameHUDProps) {
  // Game running state
  const [gameState, setGameState] = useState<'countdown' | 'running' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [clearedCount, setClearedCount] = useState<number>(0);
  const [stumbleCount, setStumbleCount] = useState<number>(0);
  const [floatingFeedback, setFloatingFeedback] = useState<{
    text: string;
    type: 'perfect' | 'good' | 'stumbled';
    id: number;
  } | null>(null);
  const [coachComment, setCoachComment] = useState<string>(
    'Prit! Bersedia... Siap... LARI! Lompat rintangan dengan tepat!'
  );
  const [finalReport, setFinalReport] = useState<ObstacleRunGradeReport | null>(null);

  // Mutable refs for physics loop (prevents 60fps effect teardown)
  const distanceRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const isSprintingRef = useRef<boolean>(false);
  const isJumpingRef = useRef<boolean>(false);
  const jumpTimeRef = useRef<number>(0);
  const jumpYRef = useRef<number>(0);
  const stumbleTimerRef = useRef<number>(0);
  const processedObstaclesRef = useRef<Set<number>>(new Set());
  const processedStarsRef = useRef<Set<number>>(new Set());
  const scoreRef = useRef<number>(0);
  const clearedCountRef = useRef<number>(0);
  const stumbleCountRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const onFinishMissionRef = useRef(onFinishMission);
  const onSyncProgressRef = useRef(onSyncProgress);
  const onKnockObstacleRef = useRef(onKnockObstacle);
  const onResetObstaclesRef = useRef(onResetObstacles);
  const onSyncCommentRef = useRef(onSyncComment);
  const onTriggerFallRef = useRef(onTriggerFall);

  useEffect(() => {
    onFinishMissionRef.current = onFinishMission;
    onSyncProgressRef.current = onSyncProgress;
    onKnockObstacleRef.current = onKnockObstacle;
    onResetObstaclesRef.current = onResetObstacles;
    onSyncCommentRef.current = onSyncComment;
    onTriggerFallRef.current = onTriggerFall;
  }, [
    onFinishMission,
    onSyncProgress,
    onKnockObstacle,
    onResetObstacles,
    onSyncComment,
    onTriggerFall,
  ]);

  // Countdown effect on start or replay
  useEffect(() => {
    if (gameState !== 'countdown') return;
    soundFX.playWhistle(soundEnabled);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setGameState('running');
          soundFX.playWhistle(soundEnabled);
          return 0;
        }
        soundFX.playPop(soundEnabled);
        return prev - 1;
      });
    }, 900);
    return () => window.clearInterval(interval);
  }, [gameState, soundEnabled]);

  // Jump execution helper
  const triggerJump = () => {
    if (gameState !== 'running') return;
    if (isJumpingRef.current) return; // already jumping

    isJumpingRef.current = true;
    jumpTimeRef.current = 0;
    setIsJumping(true);
    soundFX.playJump(soundEnabled);
  };

  // Keyboard controls listener (Space = Jump, Shift = Sprint)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isSprintingRef.current = true;
        setIsSprinting(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isSprintingRef.current = false;
        setIsSprinting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, soundEnabled]);

  // Main 60FPS Game Physics Loop (stable dependencies so rAF is never torn down mid-run)
  useEffect(() => {
    if (gameState !== 'running') return;

    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      elapsedTimeRef.current += dt;
      setElapsedTime(elapsedTimeRef.current);

      // Handle Stumble cooldown
      if (stumbleTimerRef.current > 0) {
        stumbleTimerRef.current -= dt;
      }

      // Calculate Running Speed
      let speed = 8.8; // base speed (units / sec)
      if (isSprintingRef.current) {
        speed = 12.4; // sprint speed
      }
      if (stumbleTimerRef.current > 0) {
        speed = 2.2; // slowed down while stumbling & getting back up
      }

      // Advance distance
      distanceRef.current += speed * dt;
      const curDist = distanceRef.current;
      setDistance(curDist);

      // Handle Jump Arc Physics (Parabola jump)
      let curJumpY = 0;
      if (isJumpingRef.current) {
        jumpTimeRef.current += dt;
        const jumpDuration = isSprintingRef.current ? 0.65 : 0.72;
        const t = jumpTimeRef.current / jumpDuration;
        if (t >= 1.0) {
          isJumpingRef.current = false;
          setIsJumping(false);
          curJumpY = 0;
        } else {
          // Sine parabola peaking around 1.35m
          curJumpY = Math.sin(t * Math.PI) * 1.35;
        }
      }
      jumpYRef.current = curJumpY;

      // Sync 3D Character Position & Camera in Viewport
      onSyncProgressRef.current(curDist, curJumpY, isSprintingRef.current);

      // Check Golden Bonus Stars along the track
      for (let sIdx = 0; sIdx < BONUS_STARS_DISTS.length; sIdx++) {
        if (processedStarsRef.current.has(sIdx)) continue;
        const sDiff = BONUS_STARS_DISTS[sIdx] - curDist;
        if (sDiff <= 0.75 && sDiff >= -0.75 && curJumpY >= 0.35) {
          processedStarsRef.current.add(sIdx);
          soundFX.playCoin(soundEnabled);
          scoreRef.current += 50;
          setScore(scoreRef.current);
          setFloatingFeedback({
            text: '⭐ BINTANG BONUS! +50',
            type: 'perfect',
            id: Date.now(),
          });
          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            setFloatingFeedback(null);
          }, 1200);
        }
      }

      // Check Obstacle Collisions
      for (const obs of OBSTACLES_LIST) {
        if (processedObstaclesRef.current.has(obs.id)) continue;

        const distDiff = obs.trackDist - curDist;

        // When character is crossing the obstacle zone (within [-0.75, +0.65] meters)
        if (distDiff <= 0.65 && distDiff >= -0.75) {
          processedObstaclesRef.current.add(obs.id);

          // Evaluate clearance based on jump height
          if (curJumpY >= 0.72) {
            // PERFECT LEAP!
            soundFX.playCheer(soundEnabled);
            soundFX.playCoin(soundEnabled);
            scoreRef.current += 100;
            clearedCountRef.current += 1;
            comboRef.current += 1;
            if (comboRef.current > maxComboRef.current) {
              maxComboRef.current = comboRef.current;
            }

            const praise =
              comboRef.current > 2
                ? `Luar biasa! ${comboRef.current}x Combo Lompatan Sempurna!`
                : 'Lompatan Sempurna! Indah sekali!';
            setCoachComment(praise);
            onSyncCommentRef.current(praise, true);

            setFloatingFeedback({
              text: `✨ SEMPURNA! +100 (${comboRef.current}x Combo)`,
              type: 'perfect',
              id: Date.now(),
            });
          } else if (curJumpY >= 0.38) {
            // GOOD LEAP!
            soundFX.playPop(soundEnabled);
            scoreRef.current += 70;
            clearedCountRef.current += 1;
            comboRef.current = Math.max(1, comboRef.current);

            const praise = 'Bagus! Rintangan berhasil dilewati!';
            setCoachComment(praise);
            onSyncCommentRef.current(praise, true);

            setFloatingFeedback({
              text: '👍 BERHASIL! +70',
              type: 'good',
              id: Date.now(),
            });
          } else {
            // STUMBLED / TRIPPED!
            soundFX.playStumble(soundEnabled);
            stumbleTimerRef.current = 1.1;
            stumbleCountRef.current += 1;
            scoreRef.current = Math.max(0, scoreRef.current - 10);
            comboRef.current = 0;
            // Instantly ground the character and trigger comical Roblox fall animation
            isJumpingRef.current = false;
            setIsJumping(false);
            curJumpY = 0;
            jumpYRef.current = 0;
            onTriggerFallRef.current?.(1.1);
            onKnockObstacleRef.current(obs.id);

            const critique = 'Aduh terjatuh! Ayo bangkit lagi, perhatikan jarak rintangan!';
            setCoachComment(critique);
            onSyncCommentRef.current(critique, false);

            setFloatingFeedback({
              text: '💥 TERJATUH! -10',
              type: 'stumbled',
              id: Date.now(),
            });
          }

          setScore(scoreRef.current);
          setClearedCount(clearedCountRef.current);
          setStumbleCount(stumbleCountRef.current);
          setCombo(comboRef.current);
          setMaxCombo(maxComboRef.current);

          if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = window.setTimeout(() => {
            setFloatingFeedback(null);
          }, 1400);
        }
      }

      // Check Lap Finish (distance >= TOTAL_TRACK_DISTANCE)
      if (curDist >= TOTAL_TRACK_DISTANCE) {
        setGameState('finished');
        soundFX.playWhistle(soundEnabled);
        soundFX.playCheer(soundEnabled);

        const report = calculateObstacleRunGrade(
          scoreRef.current,
          clearedCountRef.current,
          stumbleCountRef.current,
          elapsedTimeRef.current
        );
        setFinalReport(report);
        onFinishMissionRef.current(report);
        const finishPraise = `Prit! FINISH! Catatan waktu dan rintanganmu luar biasa, ${studentName}!`;
        setCoachComment(finishPraise);
        onSyncCommentRef.current(finishPraise, true);
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, soundEnabled, studentName]);

  // Find next upcoming obstacle
  const nextObstacle = OBSTACLES_LIST.find((o) => o.trackDist > distance);
  const distToNext = nextObstacle ? Math.max(0, nextObstacle.trackDist - distance) : null;
  const isNearObstacle = distToNext !== null && distToNext <= 4.2;
  const isInJumpZone = distToNext !== null && distToNext <= 2.8 && distToNext >= 0.2;

  // Track Progress Percentage
  const progressPercent = Math.min(100, Math.round((distance / TOTAL_TRACK_DISTANCE) * 100));

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* Top Bar: Mission Info & Live Stats */}
      <div className="w-full max-w-4xl mx-auto flex items-start justify-between gap-2 pointer-events-auto">
        {/* Left Card: Mission Title & Coach */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-lime-500/40 rounded-2xl p-2.5 shadow-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
            🏃
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-lime-400 uppercase">
                Ujian PJOK
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                1 Putaran Lapangan
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight">
              Lari Rintangan & Lompat Gawang
            </h2>
            <p className="text-[11px] text-slate-400">
              Guru Penguji: <span className="text-amber-300 font-semibold">Pak Budi, S.Pd.</span>
            </p>
          </div>
        </div>

        {/* Center / Right Stats Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Stopwatch */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg text-center">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Waktu
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-amber-300">
              {elapsedTime.toFixed(1)}s
            </span>
          </div>

          {/* Cleared Obstacles */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg text-center">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Rintangan
            </span>
            <span className="text-sm sm:text-base font-black text-lime-400">
              {clearedCount} / {OBSTACLES_LIST.length}
            </span>
          </div>

          {/* Score & Combo */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg text-center">
            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              Skor PJOK
            </span>
            <span className="text-sm sm:text-base font-black text-yellow-300">
              {score}
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center font-bold text-sm transition-colors shadow-lg"
            title="Keluar Misi"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Center Countdown Overlay on Start */}
      {gameState === 'countdown' && (
        <div className="self-center my-auto bg-slate-950/90 backdrop-blur-xl border border-lime-400/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-pulse">
          <p className="text-xs font-bold text-lime-400 uppercase tracking-widest mb-1">
            Persiapan Lari Rintangan
          </p>
          <div className="text-6xl sm:text-7xl font-black text-white font-mono my-2">
            {countdown > 0 ? countdown : 'LARI!'}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
            Tekan <span className="text-amber-300 font-bold">[SPASI]</span> atau tombol{' '}
            <span className="text-lime-300 font-bold">LOMPAT</span> saat mendekati rintangan!
          </p>
        </div>
      )}

      {/* Floating Action Feedback (Perfect / Good / Stumble) */}
      {floatingFeedback && (
        <div className="self-center my-auto transition-all transform animate-bounce">
          <div
            className={`px-5 py-2.5 rounded-2xl font-black text-sm sm:text-base shadow-2xl border ${
              floatingFeedback.type === 'perfect'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                : floatingFeedback.type === 'good'
                ? 'bg-sky-500 text-slate-950 border-sky-300'
                : 'bg-red-600 text-white border-red-400'
            }`}
          >
            {floatingFeedback.text}
          </div>
        </div>
      )}

      {/* Bottom Area: Track Progress, Obstacle Warning, Coach Commentary & Touch Controls */}
      <div className="w-full max-w-4xl mx-auto space-y-2 pointer-events-auto">
        {/* Next Obstacle Jump Alert Banner */}
        {gameState === 'running' && nextObstacle && (
          <div
            className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border shadow-xl transition-all ${
              isInJumpZone
                ? 'bg-lime-500 text-slate-950 border-lime-300 animate-pulse scale-[1.02]'
                : isNearObstacle
                ? 'bg-amber-500/90 text-slate-950 border-amber-300'
                : 'bg-slate-950/85 backdrop-blur-md text-white border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {nextObstacle.type === 'hurdle'
                  ? '🚧'
                  : nextObstacle.type === 'cones'
                  ? '⚠️'
                  : nextObstacle.type === 'tires'
                  ? '🛞'
                  : '📦'}
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                  Rintangan #{nextObstacle.id + 1}
                </span>
                <span className="font-extrabold text-xs sm:text-sm">
                  {nextObstacle.label}
                </span>
              </div>
            </div>

            <div className="text-right">
              {isInJumpZone ? (
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase px-2 py-0.5 rounded bg-black/20">
                  LOMPAT SEKARANG! 🦘
                </span>
              ) : (
                <span className="text-xs sm:text-sm font-bold font-mono">
                  {distToNext !== null ? `${distToNext.toFixed(1)}m` : '0m'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Lap Progress Bar */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-2 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>Lintasan Lari Lapangan (1 Putaran)</span>
            <span className="text-lime-400 font-bold">
              {Math.round(distance)}m / {Math.round(TOTAL_TRACK_DISTANCE)}m ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-lime-500 via-emerald-400 to-amber-400 transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Obstacle Checkpoints on Bar */}
            {OBSTACLES_LIST.map((obs) => {
              const posPercent = (obs.trackDist / TOTAL_TRACK_DISTANCE) * 100;
              const isPast = distance >= obs.trackDist;
              return (
                <div
                  key={obs.id}
                  className={`absolute top-0 bottom-0 w-1.5 -ml-0.5 ${
                    isPast ? 'bg-white/90' : 'bg-amber-400/70'
                  }`}
                  style={{ left: `${posPercent}%` }}
                  title={obs.label}
                />
              );
            })}
          </div>
        </div>

        {/* Coach Commentary Bar */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
              👨‍🏫
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-amber-300 block">
                Pak Budi (Guru PJOK)
              </span>
              <p className="text-xs text-slate-100 italic truncate">
                &ldquo;{coachComment}&rdquo;
              </p>
            </div>
          </div>

          {combo > 1 && (
            <div className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shrink-0 animate-pulse">
              🔥 {combo}x COMBO
            </div>
          )}
        </div>

        {/* Touch & Clickable Action Buttons (Large Jump + Sprint) */}
        {gameState === 'running' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onMouseDown={() => {
                isSprintingRef.current = true;
                setIsSprinting(true);
              }}
              onMouseUp={() => {
                isSprintingRef.current = false;
                setIsSprinting(false);
              }}
              onTouchStart={() => {
                isSprintingRef.current = true;
                setIsSprinting(true);
              }}
              onTouchEnd={() => {
                isSprintingRef.current = false;
                setIsSprinting(false);
              }}
              className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 border ${
                isSprinting
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/20'
                  : 'bg-slate-900/90 text-amber-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span>⚡</span>
              <span>{isSprinting ? 'SPRINT AKTIF!' : 'TAHAN SPRINT [SHIFT]'}</span>
            </button>

            <button
              type="button"
              onClick={triggerJump}
              className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 border ${
                isInJumpZone
                  ? 'bg-lime-400 text-slate-950 border-white shadow-lime-400/40 animate-pulse'
                  : 'bg-lime-500 hover:bg-lime-400 text-slate-950 border-lime-300 shadow-lime-500/20'
              }`}
            >
              <span className="text-base">🦘</span>
              <span>LOMPAT RINTANGAN [SPASI]</span>
            </button>
          </div>
        )}
      </div>

      {/* Finished Modal: Rapor Praktik Lari Rintangan PJOK */}
      {gameState === 'finished' && finalReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-lime-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-lime-400 uppercase tracking-widest">
                SDN SUSUKAN 03 • PENILAIAN PJOK
              </span>
              <h3 className="text-xl font-black text-white">
                Rapor Ujian Lari Rintangan
              </h3>
              <p className="text-xs text-slate-300">
                Siswa: <span className="font-bold text-white">{studentName}</span>
              </p>
            </div>

            {/* Big Grade Badge */}
            <div className="flex items-center justify-center gap-4 py-2 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="text-5xl font-black text-amber-400 font-mono">
                {finalReport.letterGrade}
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-400 font-semibold block">Predikat</span>
                <span className="text-sm font-extrabold text-lime-300">
                  {finalReport.predicate}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Total Skor: <strong className="text-white">{finalReport.score} Poin</strong>
                </span>
              </div>
            </div>

            {/* Performance Metrics Table */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Waktu Tempuh</span>
                <span className="text-sm font-bold text-white font-mono">
                  ⏱️ {finalReport.timeSeconds} detik
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Rintangan Bersih</span>
                <span className="text-sm font-bold text-lime-400 font-mono">
                  ✅ {finalReport.clearedObstacles} / {finalReport.totalObstacles}
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Lompatan Sempurna</span>
                <span className="text-sm font-bold text-yellow-300 font-mono">
                  ⭐ {finalReport.perfectJumps} kali
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tersandung</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  💥 {finalReport.stumbles} kali
                </span>
              </div>
            </div>

            {/* Teacher Note */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 flex items-start gap-2.5">
              <span className="text-lg">👨‍🏫</span>
              <div>
                <span className="text-[11px] font-bold text-emerald-300 block">
                  Catatan Guru PJOK (Pak Budi, S.Pd.):
                </span>
                <p className="text-xs text-slate-200 mt-0.5 leading-snug">
                  &ldquo;{finalReport.teacherNote}&rdquo;
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop(soundEnabled);
                  // Reset game state and 3D obstacles for another lap
                  processedObstaclesRef.current.clear();
                  processedStarsRef.current.clear();
                  distanceRef.current = 0;
                  elapsedTimeRef.current = 0;
                  scoreRef.current = 0;
                  clearedCountRef.current = 0;
                  stumbleCountRef.current = 0;
                  comboRef.current = 0;
                  maxComboRef.current = 0;
                  isJumpingRef.current = false;
                  isSprintingRef.current = false;
                  jumpYRef.current = 0;
                  stumbleTimerRef.current = 0;
                  setIsJumping(false);
                  setIsSprinting(false);
                  setDistance(0);
                  setScore(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setClearedCount(0);
                  setStumbleCount(0);
                  setElapsedTime(0);
                  setFinalReport(null);
                  onResetObstaclesRef.current?.();
                  onSyncProgressRef.current(0, 0, false);
                  setCountdown(3);
                  setGameState('countdown');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                🔄 Lari Lagi
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playPop(soundEnabled);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-extrabold text-xs transition-colors shadow-lg shadow-lime-500/20"
              >
                ✓ Selesai & Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
