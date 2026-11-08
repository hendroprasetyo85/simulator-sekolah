/**
 * Authentic Official "Indonesia Raya" (W.R. Supratman / Jos Cleber Symphonic Arrangement)
 * Instrumental Audio & Synchronization Engine for the School Flag Ceremony
 * (Upacara Bendera Merah Putih SDN SUSUKAN 03).
 *
 * Plays the real, full-length (109.06s) official orchestral/Korsik Instrumental recording
 * of Indonesia Raya without any vocal track and without bundling heavy audio files in git.
 */

export type CeremonyAudioTrackType = 'instrumental';

export interface CeremonySongState {
  isPlaying: boolean;
  isAudioUnlocked: boolean;
  progress: number; // 0.0 to 1.0
  elapsedSec: number;
  totalSec: number;
  currentLyric: string;
  currentSection: string;
  trackType: CeremonyAudioTrackType;
  trackTitle: string;
}

export interface InstrumentalCueSec {
  startSec: number;
  endSec: number;
  section: string;
  caption: string;
}

const OFFICIAL_INSTRUMENTAL_DURATION = 109.06;

const INSTRUMENTAL_SOURCES = [
  'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1e/Indonesia_Raya_instrumental.ogg/Indonesia_Raya_instrumental.ogg.mp3',
  'https://upload.wikimedia.org/wikipedia/commons/1/1e/Indonesia_Raya_instrumental.ogg',
  '/api/ceremony-instrumental',
];

export const INSTRUMENTAL_CUES: InstrumentalCueSec[] = [
  {
    startSec: 0.0,
    endSec: 8.5,
    section: 'Intro Fanfare Simfoni (Instrumental Asli)',
    caption: '🎺 Kepada Sang Bendera Merah Putih... HORMAT GRAK!',
  },
  {
    startSec: 8.5,
    endSec: 26.5,
    section: 'Bait 1A · Korsik Instrumental Indonesia Raya',
    caption: '🎺 Melodi Instrumental: "Indonesia tanah airku, Tanah tumpah darahku..."',
  },
  {
    startSec: 26.5,
    endSec: 44.5,
    section: 'Bait 1B · Korsik Instrumental Indonesia Raya',
    caption: '🎺 Melodi Instrumental: "Indonesia kebangsaanku, Bangsa dan tanah airku..."',
  },
  {
    startSec: 44.5,
    endSec: 64.0,
    section: 'Bagian Tengah · Korsik Instrumental Indonesia Raya',
    caption: '🎺 Melodi Instrumental: "Hiduplah tanahku, Hiduplah negriku, Bangsaku, Rakyatku, semuanya..."',
  },
  {
    startSec: 64.0,
    endSec: 86.0,
    section: 'Reffrein I · Korsik Instrumental Indonesia Raya',
    caption: '🎺 Melodi Instrumental: "Indonesia Raya, Merdeka, merdeka! Tanahku, negriku yang kucinta!"',
  },
  {
    startSec: 86.0,
    endSec: 106.5,
    section: 'Reffrein II (Puncak Pengibaran) · Instrumental Asli',
    caption: '🎺 Melodi Instrumental: "Indonesia Raya, Merdeka, merdeka! Hiduplah Indonesia Raya!" 🇮🇩',
  },
  {
    startSec: 106.5,
    endSec: 112.0,
    section: 'Akor Penutup Simfoni Instrumental',
    caption: '✨ Sang Merah Putih Berkibar di Puncak Tiang! Upacara Selesai.',
  },
];

export class IndonesiaRayaCeremonyAudio {
  private audioElement: HTMLAudioElement | null = null;
  private sourceIndex = 0;
  private isPlaying = false;
  private isAudioUnlockedState = false;
  private fallbackElapsedSec = 0;
  private lastKnownDuration = OFFICIAL_INSTRUMENTAL_DURATION;
  private soundEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private initAudioElement() {
    if (typeof window === 'undefined') return;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch {
        // ignore
      }
    }

    this.sourceIndex = 0;
    this.lastKnownDuration = OFFICIAL_INSTRUMENTAL_DURATION;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.95;
    audio.src = INSTRUMENTAL_SOURCES[this.sourceIndex];

    audio.addEventListener('error', () => {
      if (this.sourceIndex + 1 < INSTRUMENTAL_SOURCES.length) {
        this.sourceIndex += 1;
        // Remove crossOrigin if falling back to local proxy or retry without CORS restriction
        if (INSTRUMENTAL_SOURCES[this.sourceIndex].startsWith('/')) {
          audio.removeAttribute('crossorigin');
        }
        audio.src = INSTRUMENTAL_SOURCES[this.sourceIndex];
        audio.load();
        if (this.isPlaying && this.soundEnabled) {
          audio.play().catch(() => {});
        }
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 30) {
        this.lastKnownDuration = audio.duration;
      }
    });

    audio.addEventListener('ended', () => {
      this.isPlaying = false;
    });

    this.audioElement = audio;
  }

  public unlockAudio(): boolean {
    if (this.audioElement) {
      this.audioElement.muted = !this.soundEnabled;
      if (this.isPlaying && this.audioElement.paused) {
        this.audioElement
          .play()
          .then(() => {
            this.isAudioUnlockedState = true;
          })
          .catch(() => {
            this.isAudioUnlockedState = false;
          });
      }
    }
    return this.isAudioUnlockedState;
  }

  public isAudioUnlocked(): boolean {
    return this.isAudioUnlockedState;
  }

  public startCeremonyAnthem(
    soundEnabled = true,
    _trackType: CeremonyAudioTrackType = 'instrumental'
  ) {
    this.soundEnabled = soundEnabled;
    this.isPlaying = true;
    this.fallbackElapsedSec = 0;

    this.initAudioElement();

    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.muted = !soundEnabled;

      if (soundEnabled) {
        this.audioElement
          .play()
          .then(() => {
            this.isAudioUnlockedState = true;
          })
          .catch(() => {
            // Browser autoplay policy: will unlock on first user click/key
            this.isAudioUnlockedState = false;
          });
      }
    }
  }

  public stopCeremonyAnthem() {
    this.isPlaying = false;
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }

  public switchTrack(_trackType: CeremonyAudioTrackType, soundEnabled = true) {
    this.soundEnabled = soundEnabled;
    if (this.audioElement) {
      this.audioElement.muted = !soundEnabled;
    }
  }

  public getCurrentTrack(): CeremonyAudioTrackType {
    return 'instrumental';
  }

  public update(deltaSec: number, soundEnabled = true): CeremonySongState {
    this.soundEnabled = soundEnabled;
    const totalSec =
      this.audioElement &&
      Number.isFinite(this.audioElement.duration) &&
      this.audioElement.duration > 30
        ? this.audioElement.duration
        : this.lastKnownDuration;

    if (!this.isPlaying) {
      return {
        isPlaying: false,
        isAudioUnlocked: this.isAudioUnlockedState,
        progress: 1.0,
        elapsedSec: totalSec,
        totalSec,
        currentLyric: 'Upacara Bendera Selesai — Seluruh siswa & guru kembali ke kegiatan.',
        currentSection: 'Upacara Selesai',
        trackType: 'instrumental',
        trackTitle: 'Instrumental Asli Indonesia Raya (Orkes Simfoni / Korsik)',
      };
    }

    let elapsedSec = 0;
    if (this.audioElement) {
      this.audioElement.muted = !soundEnabled;

      if (!this.audioElement.paused && Number.isFinite(this.audioElement.currentTime)) {
        this.isAudioUnlockedState = true;
        elapsedSec = this.audioElement.currentTime;
        this.fallbackElapsedSec = elapsedSec;
      } else {
        if (this.isAudioUnlockedState) {
          this.fallbackElapsedSec += deltaSec;
        } else {
          // Advance gently until user clicks to unlock audio
          this.fallbackElapsedSec += deltaSec * 0.25;
        }
        elapsedSec = this.fallbackElapsedSec;
      }
    } else {
      this.fallbackElapsedSec += deltaSec;
      elapsedSec = this.fallbackElapsedSec;
    }

    const progress = Math.min(1.0, Math.max(0.0, elapsedSec / totalSec));

    if (progress >= 0.999 || (this.audioElement && this.audioElement.ended)) {
      this.isPlaying = false;
    }

    const activeCue =
      INSTRUMENTAL_CUES.find(
        (c) => elapsedSec >= c.startSec && elapsedSec < c.endSec
      ) || INSTRUMENTAL_CUES[INSTRUMENTAL_CUES.length - 1];

    return {
      isPlaying: this.isPlaying,
      isAudioUnlocked: this.isAudioUnlockedState,
      progress,
      elapsedSec: Math.min(totalSec, elapsedSec),
      totalSec,
      currentLyric: activeCue.caption,
      currentSection: activeCue.section,
      trackType: 'instrumental',
      trackTitle: 'Instrumental Asli Indonesia Raya (Orkes Simfoni / Korsik)',
    };
  }
}

export const indonesiaRayaAudio = new IndonesiaRayaCeremonyAudio();

