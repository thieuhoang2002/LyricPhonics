import { describe, it, expect } from 'vitest';
import { generateMidiFile } from './midiExporter';
import type { PianoTranscriptionResult } from '@/types/piano';

describe('midiExporter', () => {
  const sampleResult: PianoTranscriptionResult = {
    metadata: {
      title: 'Unit Test Sonata',
      bpm: 120,
      keySignature: 'C Major',
    },
    sections: [
      { name: 'Intro', startTime: 0.0, endTime: 4.0 },
    ],
    chords: [
      { chord: 'C', startTime: 0.0, endTime: 2.0, root: 'C', quality: 'Major' },
    ],
    notes: [
      { pitch: 60, noteName: 'C4', startTime: 0.0, duration: 1.0, velocity: 80, hand: 'right' },
      { pitch: 36, noteName: 'C2', startTime: 0.0, duration: 2.0, velocity: 70, hand: 'left' },
    ],
  };

  it('generates a valid binary MIDI header starting with MThd', () => {
    const bytes = generateMidiFile(sampleResult);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(30);

    // MThd ASCII header bytes: 0x4D, 0x54, 0x68, 0x64
    expect(bytes[0]).toBe(0x4d);
    expect(bytes[1]).toBe(0x54);
    expect(bytes[2]).toBe(0x68);
    expect(bytes[3]).toBe(0x64);
  });

  it('contains 2 tracks (Conductor + Piano notes)', () => {
    const bytes = generateMidiFile(sampleResult);
    // Header format = 1 (byte 8 = 0, byte 9 = 1)
    expect(bytes[8]).toBe(0x00);
    expect(bytes[9]).toBe(0x01);

    // Number of tracks = 2 (byte 10 = 0, byte 11 = 2)
    expect(bytes[10]).toBe(0x00);
    expect(bytes[11]).toBe(0x02);
  });
});
