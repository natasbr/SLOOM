import { AudioSettings } from '../types';

class AudioSystem {
  private audioCtx: AudioContext | null = null;
  private settings: AudioSettings = {
    bgmEnabled: true,
    bgmVolume: 0.3,
    sfxEnabled: true,
    sfxVolume: 0.5,
  };
  private bgmInterval: number | null = null;
  private isBgmPlaying = false;

  constructor() {
    // Lazy audio context initialization on user interaction
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public updateSettings(newSettings: AudioSettings) {
    this.settings = newSettings;
    if (!this.settings.bgmEnabled && this.isBgmPlaying) {
      this.stopBgm();
    } else if (this.settings.bgmEnabled && !this.isBgmPlaying) {
      this.startBgm('overworld');
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  // Sound Effects
  public playSfx(type: 'click' | 'capture' | 'spawn' | 'eat' | 'happy' | 'trade' | 'event' | 'error') {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const vol = this.settings.sfxVolume * 0.4;

      switch (type) {
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'spawn':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;

        case 'capture':
          // Arpeggio chime
          [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            if (!this.audioCtx) return;
            const t = now + idx * 0.08;
            const o = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol * 0.8, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g);
            g.connect(this.audioCtx.destination);
            o.start(t);
            o.stop(t + 0.15);
          });
          break;

        case 'eat':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(350, now);
          osc.frequency.setValueAtTime(450, now + 0.08);
          osc.frequency.setValueAtTime(550, now + 0.16);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;

        case 'happy':
          [440, 554.37, 659.25].forEach((freq, idx) => {
            if (!this.audioCtx) return;
            const t = now + idx * 0.07;
            const o = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g);
            g.connect(this.audioCtx.destination);
            o.start(t);
            o.stop(t + 0.15);
          });
          break;

        case 'trade':
          [587.33, 880].forEach((freq, idx) => {
            if (!this.audioCtx) return;
            const t = now + idx * 0.12;
            const o = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            o.connect(g);
            g.connect(this.audioCtx.destination);
            o.start(t);
            o.stop(t + 0.25);
          });
          break;

        case 'event':
          [392, 523.25, 659.25, 783.99].forEach((freq, idx) => {
            if (!this.audioCtx) return;
            const t = now + idx * 0.1;
            const o = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.connect(g);
            g.connect(this.audioCtx.destination);
            o.start(t);
            o.stop(t + 0.2);
          });
          break;

        case 'error':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.setValueAtTime(140, now + 0.1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
      }
    } catch {
      // Audio context error handling
    }
  }

  // Background Music loop
  public startBgm(_theme: 'overworld' | 'farm' | 'trade' = 'overworld') {
    if (!this.settings.bgmEnabled || this.isBgmPlaying) return;
    this.initContext();
    if (!this.audioCtx) return;

    this.isBgmPlaying = true;
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    let noteIdx = 0;

    if (this.bgmInterval) window.clearInterval(this.bgmInterval);

    this.bgmInterval = window.setInterval(() => {
      if (!this.settings.bgmEnabled || !this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[noteIdx], now);
        
        const vol = this.settings.bgmVolume * 0.12;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.8);

        noteIdx = (noteIdx + 1) % notes.length;
      } catch {
        // bgm interval error
      }
    }, 1200);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      window.clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const audioSystem = new AudioSystem();
