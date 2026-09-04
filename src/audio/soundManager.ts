/**
 * Procedural Web Audio Synthesizer for 3D Cricket Gameplay.
 * Pure Web Audio API: Zero external audio file dependencies, instant playback, zero latency.
 * Strictly NO in-menu sound effects. Audio only plays for on-field gameplay.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private runupTimers: number[] = [];
  private customBatHitBuffer: AudioBuffer | null = null;
  private pitchBounceBuffer: AudioBuffer | null = null;
  private isAudioLoading: boolean = false;

  constructor() {
    try {
      const savedVol = localStorage.getItem('cricket_sfx_volume');
      if (savedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
      const savedMuted = localStorage.getItem('cricket_sfx_muted');
      if (savedMuted !== null) {
        this.isMuted = savedMuted === 'true';
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      // Eagerly preload custom audio immediately on startup
      this.loadCustomAudio().catch(() => {});
      window.addEventListener('click', () => this.loadCustomAudio(), { once: true });
      window.addEventListener('keydown', () => this.loadCustomAudio(), { once: true });
    }
  }

  public async loadCustomAudio(): Promise<boolean> {
    if (this.customBatHitBuffer && this.pitchBounceBuffer) return true;
    if (this.isAudioLoading) return false;
    this.isAudioLoading = true;

    // 1. Preload pitch bounce WAV
    if (!this.pitchBounceBuffer) {
      try {
        const res = await fetch(`/sounds/ball_bounce.wav?t=${Date.now()}`);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const ctx = this.initAudio();
          if (ctx) {
            this.pitchBounceBuffer = await ctx.decodeAudioData(arrayBuffer);
            console.log('[SoundManager] Loaded pitch bounce WAV from: /sounds/ball_bounce.wav');
          }
        }
      } catch (_) {}
    }

    const candidatePaths = [
      '/sounds/bathitsound1.wav',
      '/sounds/bathitsound1.mp3',
      '/sounds/bathitsound.wav',
      '/sounds/bat_hit.wav',
      '/sounds/bathit.wav',
      '/sounds/hit.wav',
      '/sounds/bat.wav',
      '/audio/bat_hit.wav',
      '/bat_hit.wav',
    ];

    for (const p of candidatePaths) {
      try {
        const res = await fetch(`${p}?t=${Date.now()}`);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const ctx = this.initAudio();
          if (ctx) {
            this.customBatHitBuffer = await ctx.decodeAudioData(arrayBuffer);
            console.log(`[SoundManager] Loaded custom bat hit WAV from: ${p}`);
            this.isAudioLoading = false;
            return true;
          }
        }
      } catch (_) {}
    }
    this.isAudioLoading = false;
    return false;
  }

  private initAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.volume > 0) this.isMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    try {
      localStorage.setItem('cricket_sfx_volume', this.volume.toString());
      localStorage.setItem('cricket_sfx_muted', this.isMuted.toString());
    } catch (_) {}
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    try {
      localStorage.setItem('cricket_sfx_muted', this.isMuted.toString());
    } catch (_) {}
    return this.isMuted;
  }

  public setSoundEnabled(_enabled: boolean) {
    // Compatibility stub
  }

  public isSoundEnabled(): boolean {
    return !this.isMuted && this.volume > 0;
  }

  // ─── 1. Bowler Running Sound Effect (Turf Footsteps) ─────────────────────────
  public playBowlerRunup(durationMs: number = 950) {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain || this.isMuted || this.volume === 0) return;

    this.stopBowlerRunup();

    // 4-5 rhythmic accelerating turf impacts
    const stepDelays = [0, 240, 460, 660, 840];
    stepDelays.forEach((delay, idx) => {
      if (delay < durationMs) {
        const timer = window.setTimeout(() => {
          this.triggerTurfStep(ctx, idx);
        }, delay);
        this.runupTimers.push(timer);
      }
    });
  }

  public stopBowlerRunup() {
    this.runupTimers.forEach((t) => clearTimeout(t));
    this.runupTimers = [];
  }

  private triggerTurfStep(ctx: AudioContext, stepIndex: number) {
    if (!this.masterGain || this.isMuted) return;
    const now = ctx.currentTime;

    // A. Low-frequency ground thud (spikes sinking into turf)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const baseFreq = 95 + stepIndex * 8; // slight pitch rise with acceleration
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);

    // B. Grass/turf compression noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.06);
  }

  // ─── 2. Bowler Ball Release Sound Effect ─────────────────────────────────────
  public playBallRelease() {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain || this.isMuted || this.volume === 0) return;
    const now = ctx.currentTime;

    // A. Arm whoosh whip (bandpass noise sweep)
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, now);
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.14);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.40, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.16);

    // B. Finger seam flick snap
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1650, now + 0.02);
    clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    clickGain.gain.setValueAtTime(0.001, now);
    clickGain.gain.setValueAtTime(0.28, now + 0.02);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickOsc.start(now + 0.02);
    clickOsc.stop(now + 0.08);
  }

  // ─── 2B. Authentic Cricket Leather Ball Pitch Bounce Sound ────────────────────
  public playPitchBounce() {
    if (this.isMuted || this.volume === 0) return;
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain) return;

    if (this.pitchBounceBuffer) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = this.pitchBounceBuffer;
        const gain = ctx.createGain();
        gain.gain.value = Math.min(1.0, this.volume * 1.15);
        src.connect(gain);
        gain.connect(this.masterGain);
        src.start(0);
        return;
      } catch (e) {
        console.warn('[SoundManager] Pitch bounce playback error:', e);
      }
    }

    // Procedural synthesized fallback for zero latency
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);

      oscGain.gain.setValueAtTime(0.75, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.09);

      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(3200, now);
      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);
      clickOsc.start(now);
      clickOsc.stop(now + 0.02);
    } catch (_) {}
  }

  // ─── 3. Realistic Wood Cricket Bat Hit Sound (Custom WAV or Procedural Willow) ──
  public playBatCrack(power: 'soft' | 'medium' | 'huge' = 'medium') {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain || this.isMuted || this.volume === 0) return;
    const now = ctx.currentTime;

    const intensity = power === 'huge' ? 1.0 : power === 'medium' ? 0.8 : 0.55;

    // 1. If custom .wav file was provided, play it through Web Audio with volume & power scaling!
    if (this.customBatHitBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.customBatHitBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(intensity, now);
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      source.start(now);
      return;
    } else {
      // Trigger background load if file was added after initial load
      this.loadCustomAudio().catch(() => {});
    }

    // 2. Procedural English willow synthesis fallback
    // A. Hard leather seam impact snap (transient click)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(2100, now);
    snapOsc.frequency.exponentialRampToValueAtTime(450, now + 0.025);

    snapGain.gain.setValueAtTime(0.65 * intensity, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    snapOsc.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapOsc.start(now);
    snapOsc.stop(now + 0.03);

    // B. Resonant Willow Body "Tonk" (Fundamental blade ping)
    const willowOsc = ctx.createOscillator();
    const willowGain = ctx.createGain();
    willowOsc.type = 'triangle';
    willowOsc.frequency.setValueAtTime(440, now); // 440 Hz standard sweet-spot frequency
    willowOsc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    willowGain.gain.setValueAtTime(0.70 * intensity, now);
    willowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    willowOsc.connect(willowGain);
    willowGain.connect(this.masterGain);
    willowOsc.start(now);
    willowOsc.stop(now + 0.15);

    // C. Second Harmonic Wood Ringing
    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(880, now);
    harmonicOsc.frequency.exponentialRampToValueAtTime(620, now + 0.09);

    harmonicGain.gain.setValueAtTime(0.40 * intensity, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this.masterGain);
    harmonicOsc.start(now);
    harmonicOsc.stop(now + 0.11);

    // D. Low wood cavity inertia thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(140, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    thumpGain.gain.setValueAtTime(0.50 * intensity, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.10);

    // E. High-frequency willow splinter noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, now);
    filter.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  // ─── 4. Crowd Cheering on Boundaries (4s and 6s) ─────────────────────────────
  public playCheer(isBigBoundary: boolean = false) {
    this.playCrowdCheer(isBigBoundary);
  }

  public playCrowdCheer(isSix: boolean = false) {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain || this.isMuted || this.volume === 0) return;
    const now = ctx.currentTime;

    const duration = isSix ? 3.6 : 2.5;
    const peakVol = isSix ? 0.75 : 0.55;

    // Generate brown/pink noise buffer for organic stadium crowd wash
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = noiseBuffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.03 * white) / 1.03;
        channelData[i] = lastOut * 3.5;
      }
    }

    const crowdNoise = ctx.createBufferSource();
    crowdNoise.buffer = noiseBuffer;

    // Formant filters mimicking thousands of cheering voices
    const formant1 = ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(500, now);
    formant1.Q.setValueAtTime(1.8, now);

    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1100, now);
    formant2.Q.setValueAtTime(2.2, now);

    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.001, now);
    // Dynamic swell attack
    crowdGain.gain.linearRampToValueAtTime(peakVol, now + 0.35);
    // Sustained roar
    crowdGain.gain.setValueAtTime(peakVol * 0.9, now + duration * 0.45);
    // Natural decay
    crowdGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    crowdNoise.connect(formant1);
    crowdNoise.connect(formant2);
    formant1.connect(crowdGain);
    formant2.connect(crowdGain);
    crowdGain.connect(this.masterGain);

    crowdNoise.start(now);
    crowdNoise.stop(now + duration + 0.1);

    // If it's a huge 6, add celebratory whistle accent!
    if (isSix) {
      const whistleOsc = ctx.createOscillator();
      const whistleGain = ctx.createGain();
      whistleOsc.type = 'sine';
      whistleOsc.frequency.setValueAtTime(1200, now + 0.2);
      whistleOsc.frequency.linearRampToValueAtTime(1850, now + 0.7);
      whistleOsc.frequency.exponentialRampToValueAtTime(900, now + 1.6);

      whistleGain.gain.setValueAtTime(0.001, now);
      whistleGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);

      whistleOsc.connect(whistleGain);
      whistleGain.connect(this.masterGain);
      whistleOsc.start(now + 0.2);
      whistleOsc.stop(now + 1.8);
    }
  }

  public playWicketSound() {
    const ctx = this.initAudio();
    if (!ctx || !this.masterGain || this.isMuted || this.volume === 0) return;
    const now = ctx.currentTime;

    // 1. Primary hard leather-on-timber crack (high-energy wood impact)
    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(1600, now);
    crackOsc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    crackGain.gain.setValueAtTime(0.85 * this.volume, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.06);

    // 2. Heavy hollow stump body thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(240, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
    thumpGain.gain.setValueAtTime(0.70 * this.volume, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.18);

    // 3. Secondary wood clatter & bail rattle (tumbling wooden harmonics)
    const taps = [
      { t: 0.035, f: 920, dur: 0.04, vol: 0.45 },
      { t: 0.080, f: 1350, dur: 0.03, vol: 0.35 },
      { t: 0.140, f: 780, dur: 0.05, vol: 0.30 },
      { t: 0.210, f: 1100, dur: 0.03, vol: 0.22 },
    ];

    taps.forEach((tap) => {
      const tapOsc = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tapOsc.type = 'sine';
      tapOsc.frequency.setValueAtTime(tap.f, now + tap.t);
      tapOsc.frequency.exponentialRampToValueAtTime(tap.f * 0.4, now + tap.t + tap.dur);
      tapGain.gain.setValueAtTime(0.001, now);
      tapGain.gain.setValueAtTime(tap.vol * this.volume, now + tap.t);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + tap.t + tap.dur);
      tapOsc.connect(tapGain);
      tapGain.connect(this.masterGain!);
      tapOsc.start(now + tap.t);
      tapOsc.stop(now + tap.t + tap.dur + 0.01);
    });
  }

  // ─── 5. Menu sounds — Strictly SILENT per user instruction ───────────────────
  public playUiChime(_type: 'click' | 'success' | 'timing' = 'click') {
    // NO in-menu sound effects per explicit instruction
  }

  public playHeartbeat() {
    // Silent
  }
}

export const soundManager = new SoundManager();
