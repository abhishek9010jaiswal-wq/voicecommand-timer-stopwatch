/**
 * Web Audio API Synthesizer, Multiple Alarm Sounds, Background Keepalive & Notifications
 * Fully client-side, zero external MP3 dependencies, works 100% offline.
 */

export type AlarmSoundType = 'siren' | 'digital_beep' | 'zen_chime' | 'stadium_buzzer' | 'pulse' | 'fanfare';

export interface SoundOption {
  id: AlarmSoundType;
  name: string;
  nameHindi: string;
  description: string;
}

export const AVAILABLE_ALARM_SOUNDS: SoundOption[] = [
  { id: 'digital_beep', name: 'Digital Beep', nameHindi: 'डिजिटल बीप', description: 'Classic digital watch multi-beep' },
  { id: 'siren', name: 'Emergency Siren', nameHindi: 'इमरजेंसी सायरन', description: 'Loud alternating dual-tone siren' },
  { id: 'stadium_buzzer', name: 'Stadium Buzzer', nameHindi: 'स्टेडियम बजर', description: 'Deep athletic horn buzzer' },
  { id: 'zen_chime', name: 'Zen Bell Chime', nameHindi: 'ज़ेन घंटी (Zen Bell)', description: 'Harmonic relaxing resonant chime' },
  { id: 'pulse', name: 'Futuristic Pulse', nameHindi: 'पल्स सिंथ', description: 'Rhythmic electronic arpeggio pulse' },
  { id: 'fanfare', name: 'Victory Fanfare', nameHindi: 'विक्ट्री फैनफेयर', description: 'Upbeat brass triumph fanfare' },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeSoundLoopTimer: ReturnType<typeof setInterval> | null = null;
  private keepAliveOscillator: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarmSound();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  enableBackgroundKeepAlive() {
    try {
      const ctx = this.getContext();
      if (!ctx || this.keepAliveOscillator) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.keepAliveOscillator = osc;
      this.keepAliveGain = gain;
    } catch {}
  }

  disableBackgroundKeepAlive() {
    if (this.keepAliveOscillator) {
      try { this.keepAliveOscillator.stop(); } catch {}
      try { this.keepAliveOscillator.disconnect(); } catch {}
      this.keepAliveOscillator = null;
    }
    if (this.keepAliveGain) {
      try { this.keepAliveGain.disconnect(); } catch {}
      this.keepAliveGain = null;
    }
  }

  // Quick crisp click for stopwatch start
  playStartChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08); // A6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  // Deeper click for stopwatch stop
  playStopChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {}
  }

  // Crisp high ping for lap recording
  playLapChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // Countdown tick
  playTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // ==========================================
  // Selectable Alarm Sounds Synthesizers
  // ==========================================

  playSingleBurst(soundType: AlarmSoundType) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (soundType) {
      case 'digital_beep': {
        // Quad rapid beeps
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(2048, now + i * 0.1);
          gain.gain.setValueAtTime(0.25, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.06);
        }
        break;
      }
      case 'siren': {
        // High-low emergency siren
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        osc.frequency.linearRampToValueAtTime(600, now + 0.6);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }
      case 'stadium_buzzer': {
        // Heavy low saw buzzer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'zen_chime': {
        // Bell harmonics: 528Hz (Love freq) + 1056Hz
        [528, 1056, 1584].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          const initialVol = 0.3 / (idx + 1);
          gain.gain.setValueAtTime(initialVol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.25);
        });
        break;
      }
      case 'pulse': {
        // Arpeggiated high-tech synth pulse
        const freqs = [440, 554, 659, 880];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          gain.gain.setValueAtTime(0.25, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.16);
        });
        break;
      }
      case 'fanfare': {
        // Brass fanfare melody
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.1);
          gain.gain.setValueAtTime(0.3, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + (idx === 3 ? 0.4 : 0.18));
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + (idx === 3 ? 0.42 : 0.19));
        });
        break;
      }
    }
  }

  // Play preview once
  previewSound(soundType: AlarmSoundType) {
    this.playSingleBurst(soundType);
  }

  // Start continuous loop of chosen sound
  startAlarmSound(soundType: AlarmSoundType = 'digital_beep') {
    this.stopAlarmSound();
    if (this.isMuted) return;

    this.playSingleBurst(soundType);
    const loopInterval = soundType === 'zen_chime' ? 1400 : soundType === 'siren' ? 800 : soundType === 'fanfare' ? 1000 : 700;
    this.activeSoundLoopTimer = setInterval(() => {
      this.playSingleBurst(soundType);
    }, loopInterval);
  }

  stopAlarmSound() {
    if (this.activeSoundLoopTimer) {
      clearInterval(this.activeSoundLoopTimer);
      this.activeSoundLoopTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();

// Text to Speech
export function speakText(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
  }
}

// Mobile Vibration
export function triggerHaptic(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

// System Notification API for Background Alerting
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  } catch (e) {
    console.warn('Notification permission query rejected:', e);
  }
  return false;
}

export function showSystemNotification(title: string, body: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
        });
      } catch {
        // Service worker fallback
        navigator.serviceWorker?.ready
          .then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              requireInteraction: true,
            }).catch(() => {});
          })
          .catch(() => {});
      }
    }
  } catch {}
}

// Screen Wake Lock API
export class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;

  async request() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      } catch {}
    }
  }

  release() {
    if (this.sentinel) {
      try { this.sentinel.release()?.catch?.(() => {}); } catch {}
      this.sentinel = null;
    }
  }
}

export const wakeLockManager = new WakeLockManager();
