/**
 * src/lib/audio/soundfontPlayer.ts
 *
 * Web Audio API Acoustic Grand Piano Synthesizer & SoundFont Loader.
 * Uses Gleitz midi-js-soundfonts (FluidR3_GM) with fallback polyphonic physical modeling.
 */

// Mapping of MIDI Pitch (21 = A0 to 108 = C8) to Note Names
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!match) return 60; // Middle C default
  let [, note, octStr] = match;
  const octave = parseInt(octStr, 10);

  // Normalize sharp to flat
  const sharpToFlat: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  if (sharpToFlat[note]) {
    note = sharpToFlat[note];
  }

  const noteIndex = NOTE_NAMES.indexOf(note as typeof NOTE_NAMES[number]);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

export class PianoSoundfontPlayer {
  private audioContext: AudioContext | null = null;
  private soundfontBuffers: Map<number, AudioBuffer> = new Map();
  private activeVoices: Map<number, { source: AudioNode; gain: GainNode }> = new Map();
  private isLoading: boolean = false;
  private isLoaded: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Asynchronously loads the acoustic grand piano SoundFont from GitHub Pages.
   */
  public async loadSoundFont(): Promise<boolean> {
    if (this.isLoaded || this.isLoading) return this.isLoaded;
    this.isLoading = true;

    try {
      const soundfontUrl =
        'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js';

      const response = await fetch(soundfontUrl);
      if (!response.ok) {
        throw new Error(`Failed to load soundfont: ${response.statusText}`);
      }

      const scriptContent = await response.text();

      // Extract the JSON object from the JS file: MIDI.Soundfont.acoustic_grand_piano = {...};
      const jsonStart = scriptContent.indexOf('{');
      const jsonEnd = scriptContent.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Invalid soundfont file structure');
      }

      const jsonStr = scriptContent.slice(jsonStart, jsonEnd + 1);
      const noteMap: Record<string, string> = JSON.parse(jsonStr);

      const ctx = this.getContext();

      // Pre-decode common octave samples (octaves 2 to 6 for fastest boot)
      const decodePromises = Object.entries(noteMap).map(async ([noteName, dataUri]) => {
        try {
          const midi = noteNameToMidi(noteName);
          const base64Data = dataUri.split(',')[1];
          if (!base64Data) return;

          const binaryStr = window.atob(base64Data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
          this.soundfontBuffers.set(midi, audioBuffer);
        } catch {
          // Skip corrupt or unparseable single samples
        }
      });

      await Promise.all(decodePromises);
      this.isLoaded = true;
      return true;
    } catch {
      // Fallback synthesizer will be used automatically
      this.isLoaded = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Plays a piano note by MIDI pitch (21 to 108).
   *
   * @param midi MIDI note number (e.g. 60 = Middle C)
   * @param velocity Note velocity 1-127
   * @param duration Optional duration in seconds; if provided, stops note after duration
   */
  public playNote(midi: number, velocity: number = 80, duration?: number): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const gainValue = Math.max(0.01, Math.min(1.0, velocity / 127));

    // Stop currently ringing voice on this pitch to avoid harsh overlaps
    this.stopNote(midi);

    const soundfontBuffer = this.soundfontBuffers.get(midi);

    if (soundfontBuffer) {
      // 1. Play realistic sampled acoustic piano
      const source = ctx.createBufferSource();
      source.buffer = soundfontBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gainValue * 0.9, now);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(now);
      this.activeVoices.set(midi, { source, gain: gainNode });

      if (duration && duration > 0) {
        gainNode.gain.setValueAtTime(gainValue * 0.9, now + duration);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);
        source.stop(now + duration + 0.35);
        setTimeout(() => this.activeVoices.delete(midi), (duration + 0.35) * 1000);
      }
    } else {
      // 2. High-fidelity acoustic piano physical simulation fallback
      this.playSyntheticPianoNote(ctx, midi, gainValue, now, duration);
    }
  }

  /**
   * High-quality acoustic piano oscillator fallback with hammer attack and acoustic decay.
   */
  private playSyntheticPianoNote(
    ctx: AudioContext,
    midi: number,
    gainValue: number,
    now: number,
    duration?: number
  ): void {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    // Fundamental oscillator (triangle wave for warmth)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Harmonic overtone for acoustic richness
    const harmonicOsc = ctx.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(freq * 2, now);

    // Main envelope gain
    const masterGain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(gainValue * 0.7, now + 0.005); // Rapid hammer strike

    overtoneGain.gain.setValueAtTime(gainValue * 0.25, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); // Quick harmonic decay

    const noteDuration = duration && duration > 0 ? duration : 1.5;
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration + 0.4);

    osc.connect(masterGain);
    harmonicOsc.connect(overtoneGain);
    overtoneGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(now);
    harmonicOsc.start(now);

    osc.stop(now + noteDuration + 0.45);
    harmonicOsc.stop(now + noteDuration + 0.45);

    this.activeVoices.set(midi, { source: osc, gain: masterGain });
  }

  /**
   * Smoothly releases and silences a playing note.
   */
  public stopNote(midi: number): void {
    const voice = this.activeVoices.get(midi);
    if (!voice || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08); // 80ms damper release

      if ('stop' in voice.source) {
        (voice.source as AudioBufferSourceNode).stop(now + 0.09);
      }
    } catch {
      // Ignore if already stopped
    } finally {
      this.activeVoices.delete(midi);
    }
  }

  /**
   * Silences all ringing notes instantly.
   */
  public stopAll(): void {
    for (const midi of Array.from(this.activeVoices.keys())) {
      this.stopNote(midi);
    }
    this.activeVoices.clear();
  }
}

// Global Singleton for seamless studio playback
export const pianoPlayer = new PianoSoundfontPlayer();
