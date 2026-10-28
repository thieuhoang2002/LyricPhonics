import { describe, it, expect } from 'vitest';
import { parseChordTones, generatePianoArrangement } from './pianoArranger';
import type { PianoTranscriptionResult } from '@/types/piano';

describe('pianoArranger', () => {
  describe('parseChordTones', () => {
    it('parses C Major chord correctly', () => {
      const tones = parseChordTones('C');
      expect(tones.rootPitch).toBe(36); // C2
      expect(tones.thirdPitch).toBe(40); // E2
      expect(tones.fifthPitch).toBe(43); // G2
      expect(tones.octavePitch).toBe(48); // C3
      expect(tones.ninthPitch).toBe(50); // D3
      expect(tones.tenthPitch).toBe(52); // E3
      expect(tones.isMinor).toBe(false);
    });

    it('parses Am Minor chord correctly', () => {
      const tones = parseChordTones('Am');
      expect(tones.rootPitch).toBe(45); // A2
      expect(tones.thirdPitch).toBe(48); // C3 (minor third: +3)
      expect(tones.fifthPitch).toBe(52); // E3
      expect(tones.isMinor).toBe(true);
    });
  });

  describe('generatePianoArrangement', () => {
    const dummyResult: PianoTranscriptionResult = {
      metadata: {
        title: 'Test Song',
        duration: 47.0,
        bpm: 120,
      },
      notes: [],
      chords: [
        { chord: 'C', startTime: 0, endTime: 4.0, root: 'C', quality: 'Major' },
        { chord: 'Am', startTime: 4.0, endTime: 8.0, root: 'A', quality: 'Minor' },
      ],
      sections: [
        { name: 'Intro', startTime: 0, endTime: 8.0 },
      ],
    };

    it('generates Ballad accompaniment notes with exact duration', () => {
      const arranged = generatePianoArrangement(dummyResult, 'ballad', 'both');
      expect(arranged.metadata.duration).toBe(47.0);
      expect(arranged.notes.length).toBeGreaterThan(0);

      // Verify left hand notes exist
      const leftNotes = arranged.notes.filter((n) => n.hand === 'left');
      expect(leftNotes.length).toBeGreaterThan(0);
      expect(leftNotes[0].pitch).toBe(36); // C2 Root
    });

    it('generates Backing mode with only left hand accompaniment', () => {
      const arranged = generatePianoArrangement(dummyResult, 'ballad', 'backing');
      expect(arranged.notes.length).toBeGreaterThan(0);
      expect(arranged.notes.every((n) => n.hand === 'left')).toBe(true);
    });

    it('generates Tune mode with only right hand melody', () => {
      const arranged = generatePianoArrangement(dummyResult, 'ballad', 'tune');
      expect(arranged.notes.length).toBeGreaterThan(0);
      expect(arranged.notes.every((n) => n.hand === 'right')).toBe(true);
    });

    it('switches to Waltz 3/4 style seamlessly', () => {
      const arranged = generatePianoArrangement(dummyResult, 'waltz', 'both');
      expect(arranged.notes.length).toBeGreaterThan(0);
      const leftNotes = arranged.notes.filter((n) => n.hand === 'left');
      expect(leftNotes.length).toBeGreaterThan(0);
    });

    it('switches to Pop groove style seamlessly', () => {
      const arranged = generatePianoArrangement(dummyResult, 'pop', 'both');
      expect(arranged.notes.length).toBeGreaterThan(0);
    });
  });
});
