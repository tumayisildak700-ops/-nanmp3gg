/**
 * İnanmp3gg Audio Synthesis Engine (Premium Smart Sound Effects)
 * Generates futuristic, high-fidelity sound effects using the Web Audio API.
 * No external audio files needed! All waves are synthesized programmatically.
 */

class AudioSynthEngine {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5; // default volume level (0 to 1)

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Resume context if suspended (browser security)
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(level: number) {
    this.volume = Math.max(0, Math.min(1, level));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Play a subtle, high-quality digital click sound for micro-interactions
   */
  public playClick() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      // Audio failed to play (e.g. browser context not active)
    }
  }

  /**
   * Play a sweeping, digital whoosh/swoosh signifying start of conversion
   */
  public playStart() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Sweep Oscillator 1 (Warm Triangle)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.exponentialRampToValueAtTime(680, now + 0.4);
      
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(this.volume * 0.18, now + 0.15);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      // Cyber High-pass transient click
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(900, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(this.volume * 0.08, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.start(now);
      osc1.stop(now + 0.45);
      
      osc2.start(now);
      osc2.stop(now + 0.3);
    } catch (e) {}
  }

  /**
   * Play a beautiful success sound indicating completion based on selected style
   */
  public playSuccess(style: string = "crystalline") {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      if (style === "retro") {
        // --- RETRO CHIPTUNE FANFARE (8-bit style) ---
        // Quick 4-note positive arpeggio: C5 -> E5 -> G5 -> C6 -> E6
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        const step = 0.06; // very fast rhythm

        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = "square"; // 8-bit sound
          osc.frequency.setValueAtTime(freq, now + idx * step);

          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          const noteStart = now + idx * step;
          const noteDuration = 0.12;

          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(this.volume * 0.08, noteStart + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

          osc.start(noteStart);
          osc.stop(noteStart + noteDuration + 0.02);
        });
      } 
      else if (style === "cyber_rise") {
        // --- CYBER RISE (Futuristic High-tech sweep & drop) ---
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Laser rise
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

        // Sub bass drop
        subOsc.type = "sine";
        subOsc.frequency.setValueAtTime(180, now);
        subOsc.frequency.exponentialRampToValueAtTime(60, now + 0.45);

        // Low-pass filter to make it warmer/cyberpunk
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + 0.35);

        osc.connect(filter);
        subOsc.connect(gain);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
        subOsc.start(now);
        subOsc.stop(now + 0.5);

        // Bright spark chime at the peak
        const chime = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chime.type = "sine";
        chime.frequency.setValueAtTime(1500, now + 0.3);
        chime.frequency.exponentialRampToValueAtTime(3000, now + 0.4);

        chime.connect(chimeGain);
        chimeGain.connect(this.ctx.destination);

        chimeGain.gain.setValueAtTime(0, now);
        chimeGain.gain.setValueAtTime(0, now + 0.3);
        chimeGain.gain.linearRampToValueAtTime(this.volume * 0.1, now + 0.33);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        chime.start(now + 0.3);
        chime.stop(now + 0.6);
      } 
      else if (style === "cosmic") {
        // --- COSMIC WAVE (Ambient deep space spatial chord) ---
        // A suspended 4th chord: G4 (392.00 Hz), C5 (523.25 Hz), D5 (587.33 Hz), G5 (783.99 Hz)
        const notes = [392.00, 523.25, 587.33, 783.99];
        
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);

          // Rich sweeping bandpass filter
          filter.type = "bandpass";
          filter.Q.setValueAtTime(2.0, now);
          filter.frequency.setValueAtTime(100, now);
          filter.frequency.exponentialRampToValueAtTime(2200 - (idx * 300), now + 0.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx!.destination);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(this.volume * 0.08, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

          osc.start(now);
          osc.stop(now + 1.5);
        });
      } 
      else {
        // --- CRYSTALLINE ARPEGGIO (Default / Classic) ---
        // Notes of a beautiful Major 9th chord: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz), B5 (987.77 Hz), D6 (1174.66 Hz)
        const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
        const delayBetweenNotes = 0.07; // speed of arpeggio

        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          // Crystalline sound profile using sine waves
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * delayBetweenNotes);
          
          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          const noteStart = now + idx * delayBetweenNotes;
          const noteDuration = 0.8;
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(this.volume * 0.12, noteStart + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

          osc.start(noteStart);
          osc.stop(noteStart + noteDuration + 0.05);
        });

        // Ambient low pad accent for warmth
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = "triangle";
        subOsc.frequency.setValueAtTime(261.63, now); // C4
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        
        subOsc.start(now);
        subOsc.stop(now + 1.3);
      }
    } catch (e) {}
  }

  /**
   * Play a warning error sound (low digital double-oscillator alarm chord)
   */
  public playError() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Two detuned square/saw oscillators to produce a digital warning buzzer
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.linearRampToValueAtTime(120, now + 0.25);

      osc2.type = "square";
      osc2.frequency.setValueAtTime(143, now); // slightly detuned
      osc2.frequency.linearRampToValueAtTime(123, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      // Rapid volume envelope for double beep feel
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      gain.gain.setValueAtTime(0.01, now + 0.14);
      gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.start(now);
      osc1.stop(now + 0.4);
      osc2.start(now);
      osc2.stop(now + 0.4);
    } catch (e) {}
  }
}

export const audioSynth = new AudioSynthEngine();
