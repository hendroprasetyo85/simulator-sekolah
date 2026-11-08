// Spatial 3D Human Speech Audio Engine + Procedural Sound Effects
// Plays real recorded/synthesized Indonesian human speech (via /api/tts AudioBuffer)
// routed through a real-time 3D distance-attenuated Web Audio GainNode + StereoPannerNode.

export type VoiceProfileType =
  | 'siswa_putra'
  | 'siswa_putri'
  | 'guru_pria'
  | 'guru_wanita'
  | 'kepsek'
  | 'satpam'
  | 'pedagang'
  | 'player_putra'
  | 'player_putri';

interface VoiceTimbreProfile {
  /** Playback rate multiplier when using neural fallback so each age/gender sounds distinct */
  neuralPlaybackRate: number;
  /** Subtle playback rate adjustment when using Gemini role-specific voice */
  geminiPlaybackRate: number;
  /** Formant/EQ shelf boost frequency (Hz) for vocal clarity */
  eqFreq: number;
  /** EQ gain (dB) */
  eqGainDb: number;
  /** Browser SpeechSynthesis fallback pitch */
  fallbackPitch: number;
  /** Browser SpeechSynthesis fallback rate */
  fallbackRate: number;
}

const VOICE_TIMBRE_PROFILES: Record<VoiceProfileType, VoiceTimbreProfile> = {
  siswa_putra: {
    neuralPlaybackRate: 1.15,
    geminiPlaybackRate: 1.06,
    eqFreq: 1850,
    eqGainDb: 3.0,
    fallbackPitch: 1.28,
    fallbackRate: 1.06,
  },
  siswa_putri: {
    neuralPlaybackRate: 1.22,
    geminiPlaybackRate: 1.08,
    eqFreq: 2200,
    eqGainDb: 3.5,
    fallbackPitch: 1.45,
    fallbackRate: 1.08,
  },
  guru_wanita: {
    neuralPlaybackRate: 1.03,
    geminiPlaybackRate: 1.0,
    eqFreq: 1650,
    eqGainDb: 2.5,
    fallbackPitch: 1.12,
    fallbackRate: 1.0,
  },
  guru_pria: {
    neuralPlaybackRate: 0.91,
    geminiPlaybackRate: 0.98,
    eqFreq: 320,
    eqGainDb: 3.5,
    fallbackPitch: 0.88,
    fallbackRate: 0.98,
  },
  kepsek: {
    neuralPlaybackRate: 0.87,
    geminiPlaybackRate: 0.96,
    eqFreq: 260,
    eqGainDb: 4.5,
    fallbackPitch: 0.82,
    fallbackRate: 0.95,
  },
  satpam: {
    neuralPlaybackRate: 0.85,
    geminiPlaybackRate: 0.96,
    eqFreq: 240,
    eqGainDb: 5.0,
    fallbackPitch: 0.78,
    fallbackRate: 0.96,
  },
  pedagang: {
    neuralPlaybackRate: 0.95,
    geminiPlaybackRate: 1.02,
    eqFreq: 1200,
    eqGainDb: 3.0,
    fallbackPitch: 0.96,
    fallbackRate: 1.04,
  },
  player_putra: {
    neuralPlaybackRate: 1.17,
    geminiPlaybackRate: 1.07,
    eqFreq: 1950,
    eqGainDb: 3.2,
    fallbackPitch: 1.32,
    fallbackRate: 1.06,
  },
  player_putri: {
    neuralPlaybackRate: 1.24,
    geminiPlaybackRate: 1.09,
    eqFreq: 2300,
    eqGainDb: 3.6,
    fallbackPitch: 1.48,
    fallbackRate: 1.08,
  },
};

interface DecodedVoiceClip {
  buffer: AudioBuffer;
  sourceType: 'gemini' | 'neural';
}

class SoundFX {
  private ctx: AudioContext | null = null;
  private npcMasterGain: GainNode | null = null;
  private npcStereoPanner: StereoPannerNode | null = null;
  private playerVoiceGain: GainNode | null = null;

  // Cache of decoded human speech AudioBuffers keyed by `${profile}::${text}`
  private clipCache = new Map<string, DecodedVoiceClip>();
  private inFlightRequests = new Map<string, Promise<DecodedVoiceClip | null>>();

  // Active Spatial NPC Speech Playback State
  private activeDialogueKey = '';
  private activeProfile: VoiceProfileType = 'siswa_putra';
  private activeDialogueText = '';
  private activeNpcSource: AudioBufferSourceNode | null = null;
  private isNpcSourcePlaying = false;
  private repeatPauseTimer = 0;
  private isLoadingActiveClip = false;
  private currentProximityVolume = 0;

  // Active Player Character Speech Playback State
  private activePlayerSource: AudioBufferSourceNode | null = null;

  // Ambient Rainfall Audio Loop State
  private rainNoiseBuffer: AudioBuffer | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private isRainLoopActive = false;

  // Comforting School Courtyard Breeze + Street Traffic Hum Loop State
  private breezeSource: AudioBufferSourceNode | null = null;
  private breezeFilter: BiquadFilterNode | null = null;
  private breezeGain: GainNode | null = null;
  private trafficHumOsc: OscillatorNode | null = null;
  private trafficNoiseSource: AudioBufferSourceNode | null = null;
  private trafficFilter: BiquadFilterNode | null = null;
  private trafficGain: GainNode | null = null;
  private isSchoolAmbienceActive = false;
  private birdChirpTimer = 1.4;
  private vehiclePassTimer = 0.8;
  private audioUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.audioUnlocked = true;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.audioUnlocked) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureVoiceRouting(ctx: AudioContext) {
    if (!this.npcMasterGain) {
      this.npcMasterGain = ctx.createGain();
      this.npcMasterGain.gain.value = 0;

      if (typeof ctx.createStereoPanner === 'function') {
        this.npcStereoPanner = ctx.createStereoPanner();
        this.npcMasterGain.connect(this.npcStereoPanner);
        this.npcStereoPanner.connect(ctx.destination);
      } else {
        this.npcMasterGain.connect(ctx.destination);
      }
    }

    if (!this.playerVoiceGain) {
      this.playerVoiceGain = ctx.createGain();
      this.playerVoiceGain.gain.value = 0.95;
      this.playerVoiceGain.connect(ctx.destination);
    }
  }

  public resolveNPCVoiceProfile(npcName: string, role: string): VoiceProfileType {
    if (role === 'siswa_putri') return 'siswa_putri';
    if (role === 'siswa_putra') return 'siswa_putra';
    if (role === 'kepsek') return 'kepsek';
    if (role === 'satpam') return 'satpam';
    if (role === 'pedagang') return 'pedagang';
    if (role === 'guru') {
      const isFemale = /\b(bu|ibu|dewi|ratna|rini|sari|indah|lestari|fitri|ayu|maya|nisa|siti)\b/i.test(
        npcName
      );
      return isFemale ? 'guru_wanita' : 'guru_pria';
    }
    return 'siswa_putra';
  }

  /**
   * Fetches and decodes human speech audio from `/api/tts` into a Web Audio `AudioBuffer`.
   * Cached in memory so subsequent plays are instant (0ms network latency).
   */
  private async fetchAndDecodeSpeechClip(
    text: string,
    profile: VoiceProfileType
  ): Promise<DecodedVoiceClip | null> {
    const cleanText = text.trim();
    if (!cleanText) return null;

    const cacheKey = `${profile}::${cleanText}`;
    const cached = this.clipCache.get(cacheKey);
    if (cached) return cached;

    const existingPromise = this.inFlightRequests.get(cacheKey);
    if (existingPromise) return existingPromise;

    const promise = (async (): Promise<DecodedVoiceClip | null> => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, role: profile }),
        });
        if (!res.ok) return null;

        const sourceHeader = res.headers.get('X-Voice-Source');
        const sourceType: 'gemini' | 'neural' =
          sourceHeader === 'gemini' ? 'gemini' : 'neural';

        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength < 64) return null;

        const ctx = this.getContext();
        if (!ctx) return null;

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const clip: DecodedVoiceClip = { buffer: audioBuffer, sourceType };
        this.clipCache.set(cacheKey, clip);
        return clip;
      } catch {
        return null;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  /**
   * Preloads a list of NPC dialogues in the background so their voice recordings
   * are ready before the player even reaches them.
   */
  public preloadDialogues(items: { text: string; npcName: string; role: string }[]) {
    const payload = items.slice(0, 10).map((it) => ({
      text: it.text,
      role: this.resolveNPCVoiceProfile(it.npcName, it.role),
    }));

    // Trigger server-side disk/memory cache warmup
    fetch('/api/tts/preload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    }).catch(() => {});

    // Also decode the closest 4 into client AudioBuffer cache
    payload.slice(0, 4).forEach((item) => {
      this.fetchAndDecodeSpeechClip(item.text, item.role).catch(() => {});
    });
  }

  private stopActiveNpcSource() {
    if (this.activeNpcSource) {
      try {
        this.activeNpcSource.onended = null;
        this.activeNpcSource.stop();
        this.activeNpcSource.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      this.activeNpcSource = null;
    }
    this.isNpcSourcePlaying = false;
  }

  private startNpcClipPlayback(clip: DecodedVoiceClip, profile: VoiceProfileType) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.ensureVoiceRouting(ctx);
    if (!this.npcMasterGain) return;

    this.stopActiveNpcSource();

    const timbre = VOICE_TIMBRE_PROFILES[profile];
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    source.playbackRate.value =
      clip.sourceType === 'gemini' ? timbre.geminiPlaybackRate : timbre.neuralPlaybackRate;

    // Subtle vocal presence / body EQ filter tailored to character age & gender
    const eqFilter = ctx.createBiquadFilter();
    eqFilter.type = timbre.eqFreq < 500 ? 'lowshelf' : 'peaking';
    eqFilter.frequency.value = timbre.eqFreq;
    eqFilter.gain.value = timbre.eqGainDb;

    source.connect(eqFilter);
    eqFilter.connect(this.npcMasterGain);

    this.activeNpcSource = source;
    this.isNpcSourcePlaying = true;

    source.onended = () => {
      if (this.activeNpcSource === source) {
        this.activeNpcSource = null;
        this.isNpcSourcePlaying = false;
        // Wait 1.8 seconds of natural breathing room before repeating if player remains nearby
        this.repeatPauseTimer = 1.8;
      }
    };

    source.start(0);
  }

  /**
   * Called every animation frame (60fps) to update spatial NPC dialogue voice:
   * - Continuously modulates `this.npcMasterGain.gain` by `proximityVolume` (0.0 .. 1.0)
   *   so the human voice recording gets louder as the player approaches and gradually
   *   fades out ("perlahan menghilang ketika menjauh") as the player walks away.
   */
  public updateSpatialDialogueVoice(
    npcName: string,
    role: string,
    dialogueText: string,
    proximityVolume: number,
    stereoPan: number,
    delta: number,
    enabled = true
  ) {
    if (!enabled) {
      this.stopAllVoices();
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;
    this.ensureVoiceRouting(ctx);

    const clampedVol = Math.max(0, Math.min(1, proximityVolume));
    this.currentProximityVolume = clampedVol;

    // 1. Real-time 3D distance volume attenuation & stereo panning on the active human speech stream!
    if (this.npcMasterGain) {
      this.npcMasterGain.gain.setTargetAtTime(clampedVol * 1.15, ctx.currentTime, 0.045);
    }
    if (this.npcStereoPanner) {
      this.npcStereoPanner.pan.setTargetAtTime(
        Math.max(-0.9, Math.min(0.9, stereoPan)),
        ctx.currentTime,
        0.05
      );
    }

    // 2. If player walked out of hearing range, let gain smoothly hit 0 and stop source
    if (clampedVol <= 0.015 || !dialogueText) {
      if (this.activeDialogueKey !== '') {
        this.activeDialogueKey = '';
        this.activeDialogueText = '';
        this.stopActiveNpcSource();
      }
      return;
    }

    // 3. Check if the NPC or their dialogue text changed
    const resolvedProfile = this.resolveNPCVoiceProfile(npcName, role);
    const newKey = `${resolvedProfile}::${dialogueText}`;

    if (newKey !== this.activeDialogueKey) {
      this.activeDialogueKey = newKey;
      this.activeProfile = resolvedProfile;
      this.activeDialogueText = dialogueText;
      this.repeatPauseTimer = 0;
      this.stopActiveNpcSource();

      const cachedClip = this.clipCache.get(newKey);
      if (cachedClip) {
        this.startNpcClipPlayback(cachedClip, resolvedProfile);
      } else {
        this.isLoadingActiveClip = true;
        const targetKey = newKey;
        this.fetchAndDecodeSpeechClip(dialogueText, resolvedProfile).then((clip) => {
          this.isLoadingActiveClip = false;
          if (clip && this.activeDialogueKey === targetKey && this.currentProximityVolume > 0.02) {
            this.startNpcClipPlayback(clip, resolvedProfile);
          }
        });
      }
      return;
    }

    // 4. If the clip finished speaking and the player is still standing near the NPC,
    // replay the recorded dialogue after a natural pause
    if (!this.isNpcSourcePlaying && !this.isLoadingActiveClip) {
      this.repeatPauseTimer -= delta;
      if (this.repeatPauseTimer <= 0) {
        const cachedClip = this.clipCache.get(this.activeDialogueKey);
        if (cachedClip) {
          this.startNpcClipPlayback(cachedClip, this.activeProfile);
        } else {
          this.repeatPauseTimer = 1.5;
        }
      }
    }
  }

  /**
   * Plays the Player Character's own spoken dialogue using real human speech recording.
   */
  public playPlayerCharacterVoice(
    replyText: string,
    genderStyle: 'putra' | 'putri',
    enabled = true
  ) {
    if (!enabled || !replyText) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.ensureVoiceRouting(ctx);

    const profile: VoiceProfileType =
      genderStyle === 'putri' ? 'player_putri' : 'player_putra';

    if (this.activePlayerSource) {
      try {
        this.activePlayerSource.stop();
        this.activePlayerSource.disconnect();
      } catch {
        // Ignore
      }
      this.activePlayerSource = null;
    }

    this.fetchAndDecodeSpeechClip(replyText, profile).then((clip) => {
      if (!clip || !this.ctx || !this.playerVoiceGain) return;

      const timbre = VOICE_TIMBRE_PROFILES[profile];
      const source = this.ctx.createBufferSource();
      source.buffer = clip.buffer;
      source.playbackRate.value =
        clip.sourceType === 'gemini' ? timbre.geminiPlaybackRate : timbre.neuralPlaybackRate;

      const eqFilter = this.ctx.createBiquadFilter();
      eqFilter.type = 'peaking';
      eqFilter.frequency.value = timbre.eqFreq;
      eqFilter.gain.value = timbre.eqGainDb;

      source.connect(eqFilter);
      eqFilter.connect(this.playerVoiceGain);

      this.activePlayerSource = source;
      source.onended = () => {
        if (this.activePlayerSource === source) {
          this.activePlayerSource = null;
        }
      };
      source.start(0);
    });
  }

  public stopAllVoices() {
    this.activeDialogueKey = '';
    this.activeDialogueText = '';
    this.stopActiveNpcSource();
    if (this.activePlayerSource) {
      try {
        this.activePlayerSource.stop();
        this.activePlayerSource.disconnect();
      } catch {
        // Ignore
      }
      this.activePlayerSource = null;
    }
    if (this.npcMasterGain && this.ctx) {
      this.npcMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
    this.stopRainAmbience();
    this.stopSchoolAmbience();
  }

  private stopRainAmbience() {
    if (this.rainSource) {
      try {
        this.rainSource.stop();
        this.rainSource.disconnect();
      } catch {
        // Ignore
      }
      this.rainSource = null;
    }
    this.isRainLoopActive = false;
  }

  private stopSchoolAmbience() {
    if (this.breezeSource) {
      try {
        this.breezeSource.stop();
        this.breezeSource.disconnect();
      } catch {
        // Ignore
      }
      this.breezeSource = null;
    }
    if (this.trafficNoiseSource) {
      try {
        this.trafficNoiseSource.stop();
        this.trafficNoiseSource.disconnect();
      } catch {
        // Ignore
      }
      this.trafficNoiseSource = null;
    }
    if (this.trafficHumOsc) {
      try {
        this.trafficHumOsc.stop();
        this.trafficHumOsc.disconnect();
      } catch {
        // Ignore
      }
      this.trafficHumOsc = null;
    }
    this.isSchoolAmbienceActive = false;
  }

  private ensurePinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.rainNoiseBuffer) {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 3.0;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.08 * white) / 1.08;
        data[i] = lastOut * 2.4;
      }
      this.rainNoiseBuffer = buffer;
    }
    return this.rainNoiseBuffer;
  }

  /**
   * Controls continuous ambient rain sound when weather === 'hujan'.
   * Automatically softens & muffles when the player steps inside a classroom or office.
   */
  public updateRainAmbience(isRaining: boolean, isIndoor: boolean, enabled = true) {
    if (!enabled || !isRaining) {
      if (this.isRainLoopActive && this.rainGain && this.ctx) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
        this.stopRainAmbience();
      }
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const noiseBuffer = this.ensurePinkNoiseBuffer(ctx);

    if (!this.rainGain || !this.rainFilter) {
      this.rainFilter = ctx.createBiquadFilter();
      this.rainFilter.type = 'bandpass';
      this.rainFilter.frequency.value = 1150;
      this.rainFilter.Q.value = 0.65;

      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0.001;

      this.rainFilter.connect(this.rainGain);
      this.rainGain.connect(ctx.destination);
    }

    if (!this.isRainLoopActive) {
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      source.connect(this.rainFilter);
      source.start(0);
      this.rainSource = source;
      this.isRainLoopActive = true;
    }

    const targetGain = isIndoor ? 0.025 : 0.075;
    const targetCutoff = isIndoor ? 580 : 1250;
    this.rainGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.2);
    this.rainFilter.frequency.setTargetAtTime(targetCutoff, ctx.currentTime, 0.2);
  }

  /**
   * Updates the comforting School Courtyard Ambience (gentle rustling tree breeze + melodic songbirds)
   * and Spatial Main Street Traffic Audio (cars & motorcycles driving along z = 77.0).
   */
  public updateSchoolAndTrafficAmbience(
    elapsed: number,
    delta: number,
    playerX: number,
    playerZ: number,
    isIndoor: boolean,
    isRaining: boolean,
    enabled = true
  ) {
    if (!enabled) {
      if (this.isSchoolAmbienceActive) {
        this.stopSchoolAmbience();
      }
      return;
    }

    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    const noiseBuffer = this.ensurePinkNoiseBuffer(ctx);

    if (!this.breezeGain || !this.breezeFilter) {
      this.breezeFilter = ctx.createBiquadFilter();
      this.breezeFilter.type = 'bandpass';
      this.breezeFilter.frequency.value = 420;
      this.breezeFilter.Q.value = 0.9;

      this.breezeGain = ctx.createGain();
      this.breezeGain.gain.value = 0.001;

      this.breezeFilter.connect(this.breezeGain);
      this.breezeGain.connect(ctx.destination);
    }

    if (!this.trafficGain || !this.trafficFilter) {
      this.trafficFilter = ctx.createBiquadFilter();
      this.trafficFilter.type = 'lowpass';
      this.trafficFilter.frequency.value = 240;

      this.trafficGain = ctx.createGain();
      this.trafficGain.gain.value = 0.001;

      this.trafficFilter.connect(this.trafficGain);
      this.trafficGain.connect(ctx.destination);
    }

    if (!this.isSchoolAmbienceActive) {
      const breezeSrc = ctx.createBufferSource();
      breezeSrc.buffer = noiseBuffer;
      breezeSrc.loop = true;
      breezeSrc.playbackRate.value = 0.65;
      breezeSrc.connect(this.breezeFilter);
      breezeSrc.start(0);
      this.breezeSource = breezeSrc;

      const trafficNoiseSrc = ctx.createBufferSource();
      trafficNoiseSrc.buffer = noiseBuffer;
      trafficNoiseSrc.loop = true;
      trafficNoiseSrc.playbackRate.value = 0.42;
      trafficNoiseSrc.connect(this.trafficFilter);
      trafficNoiseSrc.start(0);
      this.trafficNoiseSource = trafficNoiseSrc;

      const humOsc = ctx.createOscillator();
      humOsc.type = 'triangle';
      humOsc.frequency.value = 68;
      const humSubGain = ctx.createGain();
      humSubGain.gain.value = 0.35;
      humOsc.connect(humSubGain);
      humSubGain.connect(this.trafficFilter);
      humOsc.start(0);
      this.trafficHumOsc = humOsc;

      this.isSchoolAmbienceActive = true;
    }

    // 1. Comforting School Courtyard Breeze (gentle swaying filter + soft volume)
    const breezeWave = 0.5 + 0.5 * Math.sin(elapsed * 0.55);
    const targetBreezeGain = isIndoor ? 0.005 : isRaining ? 0.012 : 0.018 + breezeWave * 0.008;
    const targetBreezeFreq = isIndoor ? 280 : 350 + breezeWave * 210;
    this.breezeGain.gain.setTargetAtTime(targetBreezeGain, ctx.currentTime, 0.25);
    this.breezeFilter.frequency.setTargetAtTime(targetBreezeFreq, ctx.currentTime, 0.25);

    // 2. Spatial Distance to Street Roadway (z = 77.0) for Continuous Traffic Hum
    const distToRoadZ = Math.abs(playerZ - 77.0);
    const roadProximity = Math.max(0, 1 - distToRoadZ / 58.0);
    const indoorFactor = isIndoor ? 0.25 : 1.0;
    const targetTrafficGain = (0.006 + roadProximity * roadProximity * 0.052) * indoorFactor;
    const targetTrafficCutoff = 140 + roadProximity * 260;
    this.trafficGain.gain.setTargetAtTime(targetTrafficGain, ctx.currentTime, 0.18);
    this.trafficFilter.frequency.setTargetAtTime(targetTrafficCutoff, ctx.currentTime, 0.18);
    if (this.trafficHumOsc) {
      this.trafficHumOsc.frequency.setTargetAtTime(
        64 + Math.sin(elapsed * 1.7) * 6 + roadProximity * 12,
        ctx.currentTime,
        0.18
      );
    }

    // 3. Melodic Tropical Schoolyard Bird Chirps (Kutilang & Burung Gereja) when not raining
    if (!isRaining) {
      this.birdChirpTimer -= delta;
      if (this.birdChirpTimer <= 0) {
        this.birdChirpTimer = 2.4 + Math.random() * 3.4;
        const birdVol = isIndoor ? 0.022 : 0.058;
        const randomPan = (Math.random() * 2 - 1) * 0.75;
        this.playBirdSong(ctx, birdVol, randomPan);
      }
    }

    // 4. Spatial Passing Car & Motorcycle Engine / Horn Sounds near the street
    this.vehiclePassTimer -= delta;
    if (this.vehiclePassTimer <= 0) {
      // Trigger more frequently when near the gate/street, occasionally when in the courtyard
      this.vehiclePassTimer = roadProximity > 0.35 ? 1.35 + Math.random() * 1.6 : 2.8 + Math.random() * 2.5;
      const passVol = Math.max(0.012, roadProximity * 0.11) * indoorFactor;
      if (passVol > 0.014) {
        const isMoto = Math.random() > 0.45;
        const pan = (Math.random() * 2 - 1) * 0.8;
        const withHorn = roadProximity > 0.42 && Math.random() < 0.28;
        this.playVehiclePassBy(ctx, isMoto ? 'moto' : 'car', passVol, pan, withHorn);
      }
    }
  }

  /**
   * Synthesizes a multi-note melodic tropical bird song (Burung Kutilang / Gereja)
   * with natural pitch glides and stereo panning across the school trees.
   */
  private playBirdSong(ctx: AudioContext, volume: number, pan: number) {
    const now = ctx.currentTime;
    const noteCount = 2 + Math.floor(Math.random() * 3); // 2 to 4 notes per phrase
    const baseFreq = 2350 + Math.random() * 750;

    let destNode: AudioNode = ctx.destination;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
      panner.connect(ctx.destination);
      destNode = panner;
    }

    for (let i = 0; i < noteCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const t0 = now + i * (0.11 + Math.random() * 0.05);
      const dur = 0.075 + Math.random() * 0.045;
      const fStart = baseFreq * (1 + (i % 2 === 0 ? 0 : 0.14));
      const fPeak = fStart * (1.18 + Math.random() * 0.12);
      const fEnd = fStart * (0.94 + Math.random() * 0.08);

      osc.frequency.setValueAtTime(fStart, t0);
      osc.frequency.exponentialRampToValueAtTime(fPeak, t0 + dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + dur * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(gain);
      gain.connect(destNode);
      osc.start(t0);
      osc.stop(t0 + dur + 0.01);
    }
  }

  /**
   * Public trigger called when an actual 3D car or motorcycle passes near the player on the main road.
   */
  public triggerVehiclePassBySound(
    type: 'moto' | 'car',
    distance: number,
    dir: 1 | -1,
    withHorn: boolean,
    enabled = true
  ) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    const proximity = Math.max(0, 1 - distance / 52.0);
    if (proximity <= 0.05) return;
    const vol = Math.min(0.12, 0.015 + proximity * proximity * 0.095);
    const panStart = dir === 1 ? -0.75 : 0.75;
    this.vehiclePassTimer = Math.max(this.vehiclePassTimer, 1.1);
    this.playVehiclePassBy(ctx, type, vol, panStart, withHorn);
  }

  /**
   * Synthesizes a spatial motorcycle ('moto') or car ('car') Doppler pass-by sound
   * with distinct engine timbre and optional polite horn ('tiin-tiin' or 'tooot').
   */
  private playVehiclePassBy(
    ctx: AudioContext,
    type: 'moto' | 'car',
    volume: number,
    panStart: number,
    withHorn: boolean
  ) {
    const now = ctx.currentTime;
    const dur = type === 'moto' ? 1.15 : 1.45;

    let destNode: AudioNode = ctx.destination;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panStart, now);
      panner.pan.linearRampToValueAtTime(-panStart, now + dur);
      panner.connect(ctx.destination);
      destNode = panner;
    }

    // Engine Oscillator + Warm Lowpass Filter with Doppler Pitch Shift
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (type === 'moto') {
      // Indonesian 4-stroke scooter / motor matic thrum
      osc.type = 'sawtooth';
      const baseF = 118 + Math.random() * 28;
      osc.frequency.setValueAtTime(baseF * 0.92, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.28, now + dur * 0.46);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.78, now + dur);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(460, now);
    } else {
      // Smooth car / SUV engine purr
      osc.type = 'triangle';
      const baseF = 68 + Math.random() * 18;
      osc.frequency.setValueAtTime(baseF * 0.95, now);
      osc.frequency.exponentialRampToValueAtTime(baseF * 1.2, now + dur * 0.48);
      osc.frequency.exponentialRampToValueAtTime(baseF * 0.82, now + dur);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(290, now);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + dur * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destNode);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    // Optional friendly scooter double-beep ("tiin-tiin") or car horn ("toot")
    if (withHorn) {
      const hornTime = now + dur * 0.35;
      const hornOsc = ctx.createOscillator();
      const hornGain = ctx.createGain();
      if (type === 'moto') {
        hornOsc.type = 'triangle';
        hornOsc.frequency.setValueAtTime(920, hornTime);
        hornGain.gain.setValueAtTime(0.0001, hornTime);
        hornGain.gain.linearRampToValueAtTime(volume * 0.65, hornTime + 0.015);
        hornGain.gain.setValueAtTime(0.0001, hornTime + 0.085);
        hornGain.gain.linearRampToValueAtTime(volume * 0.65, hornTime + 0.12);
        hornGain.gain.exponentialRampToValueAtTime(0.0001, hornTime + 0.22);
        hornOsc.connect(hornGain);
        hornGain.connect(destNode);
        hornOsc.start(hornTime);
        hornOsc.stop(hornTime + 0.24);
      } else {
        hornOsc.type = 'sawtooth';
        const hornFilter = ctx.createBiquadFilter();
        hornFilter.type = 'lowpass';
        hornFilter.frequency.value = 680;
        hornOsc.frequency.setValueAtTime(415, hornTime);
        hornGain.gain.setValueAtTime(0.0001, hornTime);
        hornGain.gain.linearRampToValueAtTime(volume * 0.55, hornTime + 0.02);
        hornGain.gain.exponentialRampToValueAtTime(0.0001, hornTime + 0.19);
        hornOsc.connect(hornFilter);
        hornFilter.connect(hornGain);
        hornGain.connect(destNode);
        hornOsc.start(hornTime);
        hornOsc.stop(hornTime + 0.21);
      }
    }
  }

  public playPop(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.065);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playJump(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playStep(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(110 + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.045);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playSchoolBell(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  }

  public playWhistle(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';

    osc.frequency.setValueAtTime(2650, now);
    osc.frequency.setValueAtTime(2780, now + 0.06);
    osc.frequency.setValueAtTime(2650, now + 0.18);
    osc.frequency.setValueAtTime(2820, now + 0.25);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.setValueAtTime(0.001, now + 0.11);
    gain.gain.setValueAtTime(0.07, now + 0.17);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playChatBubble(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playDoor(isOpening: boolean, enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    if (isOpening) {
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.11);
    } else {
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.09);
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playSoccerKick(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playGoalCheer(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.16, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.44);
    });
  }

  public playKeeperSave(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.22);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Plays a swirling wind gust followed by tumbling plastic bottle-brick clatters
   * when the Ecobrick "I LOVE SUGA" monument is blown apart by the wind.
   */
  public playEcobrickWindScatter(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noiseBuffer = this.ensurePinkNoiseBuffer(ctx);

    // 1. Swirling Wind Gust Whoosh
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.setValueAtTime(1.8, now);
    windFilter.frequency.setValueAtTime(220, now);
    windFilter.frequency.exponentialRampToValueAtTime(980, now + 0.55);
    windFilter.frequency.exponentialRampToValueAtTime(260, now + 1.45);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.001, now);
    windGain.gain.linearRampToValueAtTime(0.22, now + 0.45);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSrc.start(now);
    windSrc.stop(now + 1.55);

    // 2. Tumbling Plastic Bottle Ecobrick Clatters
    for (let i = 0; i < 7; i++) {
      const t0 = now + 0.32 + i * 0.13 + Math.random() * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const startFreq = 260 + (i % 3) * 75 + Math.random() * 40;
      osc.frequency.setValueAtTime(startFreq, t0);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.48, t0 + 0.09);

      gain.gain.setValueAtTime(0.11, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.11);
    }
  }

  /**
   * Plays a crisp plastic-bottle twist sound when rotating an Ecobrick puzzle piece.
   */
  public playPuzzleRotate(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.065);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Plays a satisfying lock-in chime when an Ecobrick puzzle piece snaps back onto the monument.
   */
  public playPuzzleSnap(isPerfect: boolean, enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isPerfect ? [523.25, 659.25, 880.0] : [440.0, 587.33];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.14, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  /**
   * Plays a cheerful crystal coin/cash chime when paying for snacks or receiving correct change.
   */
  public playCoin(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [987.77, 1318.51, 1567.98]; // B5 -> E6 -> G6 bright ascending chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
  }

  /**
   * Plays a gentle buzz tone when snack budget is insufficient or calculation needs re-checking.
   */
  public playBuzzer(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165.0, now); // E3 gentle buzz
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Plays a brief stumble thud when bumping into a hurdle/obstacle during the obstacle run.
   */
  public playStumble(enabled = true) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Plays cheerful audience cheer sound.
   */
  public playCheer(enabled = true) {
    this.playGoalCheer(enabled);
  }
}

export const soundFX = new SoundFX();

