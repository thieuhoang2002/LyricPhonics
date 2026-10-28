/**
 * src/lib/piano/samplePianoData.ts
 *
 * Demo arrangement of "River Flows in You" (Yiruma) for instant visualizer testing.
 */

import type { PianoTranscriptionResult } from '@/types/piano';

export const SAMPLE_PIANO_RESULT: PianoTranscriptionResult = {
  metadata: {
    title: 'River Flows in You (Piano Arrangement)',
    artist: 'Yiruma',
    bpm: 130,
    keySignature: 'A Major',
    timeSignature: '4/4',
    duration: 32.0,
  },
  sections: [
    { name: 'Intro', startTime: 0.0, endTime: 7.4 },
    { name: 'Main Theme', startTime: 7.4, endTime: 22.0 },
    { name: 'Bridge', startTime: 22.0, endTime: 32.0 },
  ],
  chords: [
    { chord: 'F#m', startTime: 0.0, endTime: 3.7, root: 'F#', quality: 'Minor' },
    { chord: 'D', startTime: 3.7, endTime: 7.4, root: 'D', quality: 'Major' },
    { chord: 'A', startTime: 7.4, endTime: 11.1, root: 'A', quality: 'Major' },
    { chord: 'E', startTime: 11.1, endTime: 14.8, root: 'E', quality: 'Major' },
    { chord: 'F#m', startTime: 14.8, endTime: 18.5, root: 'F#', quality: 'Minor' },
    { chord: 'D', startTime: 18.5, endTime: 22.2, root: 'D', quality: 'Major' },
    { chord: 'A', startTime: 22.2, endTime: 25.9, root: 'A', quality: 'Major' },
    { chord: 'E', startTime: 25.9, endTime: 32.0, root: 'E', quality: 'Major' },
  ],
  notes: [
    // Intro Left Hand Arpeggio (F# minor)
    { pitch: 42, noteName: 'F#2', startTime: 0.0, duration: 1.8, velocity: 75, hand: 'left', finger: 5 },
    { pitch: 49, noteName: 'C#3', startTime: 0.46, duration: 1.2, velocity: 70, hand: 'left', finger: 3 },
    { pitch: 54, noteName: 'F#3', startTime: 0.92, duration: 1.0, velocity: 72, hand: 'left', finger: 1 },
    { pitch: 57, noteName: 'A3', startTime: 1.38, duration: 1.5, velocity: 68, hand: 'left', finger: 2 },

    // Intro Right Hand Motif
    { pitch: 73, noteName: 'C#5', startTime: 0.92, duration: 0.4, velocity: 85, hand: 'right', finger: 2 },
    { pitch: 74, noteName: 'D5', startTime: 1.38, duration: 0.4, velocity: 88, hand: 'right', finger: 3 },
    { pitch: 73, noteName: 'C#5', startTime: 1.84, duration: 0.7, velocity: 86, hand: 'right', finger: 2 },
    { pitch: 71, noteName: 'B4', startTime: 2.76, duration: 0.8, velocity: 82, hand: 'right', finger: 1 },

    // Left Hand D Major
    { pitch: 38, noteName: 'D2', startTime: 3.7, duration: 1.8, velocity: 76, hand: 'left', finger: 5 },
    { pitch: 45, noteName: 'A2', startTime: 4.16, duration: 1.2, velocity: 72, hand: 'left', finger: 3 },
    { pitch: 50, noteName: 'D3', startTime: 4.62, duration: 1.0, velocity: 70, hand: 'left', finger: 1 },
    { pitch: 57, noteName: 'A3', startTime: 5.08, duration: 1.5, velocity: 68, hand: 'left', finger: 2 },

    // Right Hand Flow
    { pitch: 73, noteName: 'C#5', startTime: 4.62, duration: 0.4, velocity: 85, hand: 'right', finger: 2 },
    { pitch: 74, noteName: 'D5', startTime: 5.08, duration: 0.4, velocity: 88, hand: 'right', finger: 3 },
    { pitch: 73, noteName: 'C#5', startTime: 5.54, duration: 0.6, velocity: 84, hand: 'right', finger: 2 },
    { pitch: 69, noteName: 'A4', startTime: 6.46, duration: 0.9, velocity: 80, hand: 'right', finger: 1 },

    // Main Theme (A Major)
    { pitch: 45, noteName: 'A2', startTime: 7.4, duration: 1.8, velocity: 78, hand: 'left', finger: 5 },
    { pitch: 52, noteName: 'E3', startTime: 7.86, duration: 1.2, velocity: 72, hand: 'left', finger: 3 },
    { pitch: 57, noteName: 'A3', startTime: 8.32, duration: 1.0, velocity: 70, hand: 'left', finger: 1 },
    { pitch: 61, noteName: 'C#4', startTime: 8.78, duration: 1.5, velocity: 68, hand: 'left', finger: 2 },

    { pitch: 76, noteName: 'E5', startTime: 7.4, duration: 0.45, velocity: 90, hand: 'right', finger: 5 },
    { pitch: 73, noteName: 'C#5', startTime: 8.0, duration: 0.45, velocity: 88, hand: 'right', finger: 3 },
    { pitch: 74, noteName: 'D5', startTime: 8.6, duration: 0.45, velocity: 87, hand: 'right', finger: 4 },
    { pitch: 76, noteName: 'E5', startTime: 9.2, duration: 0.6, velocity: 92, hand: 'right', finger: 5 },
    { pitch: 73, noteName: 'C#5', startTime: 10.0, duration: 0.8, velocity: 86, hand: 'right', finger: 3 },

    // E Major Measure
    { pitch: 40, noteName: 'E2', startTime: 11.1, duration: 1.8, velocity: 76, hand: 'left', finger: 5 },
    { pitch: 47, noteName: 'B2', startTime: 11.56, duration: 1.2, velocity: 70, hand: 'left', finger: 3 },
    { pitch: 52, noteName: 'E3', startTime: 12.02, duration: 1.0, velocity: 72, hand: 'left', finger: 1 },
    { pitch: 56, noteName: 'G#3', startTime: 12.48, duration: 1.5, velocity: 68, hand: 'left', finger: 2 },

    { pitch: 71, noteName: 'B4', startTime: 11.1, duration: 0.6, velocity: 88, hand: 'right', finger: 2 },
    { pitch: 69, noteName: 'A4', startTime: 12.0, duration: 0.5, velocity: 84, hand: 'right', finger: 1 },
    { pitch: 71, noteName: 'B4', startTime: 12.8, duration: 0.8, velocity: 88, hand: 'right', finger: 2 },
    { pitch: 73, noteName: 'C#5', startTime: 13.8, duration: 0.9, velocity: 90, hand: 'right', finger: 3 },

    // Measure 5: F#m
    { pitch: 42, noteName: 'F#2', startTime: 14.8, duration: 1.8, velocity: 76, hand: 'left', finger: 5 },
    { pitch: 49, noteName: 'C#3', startTime: 15.26, duration: 1.2, velocity: 72, hand: 'left', finger: 3 },
    { pitch: 54, noteName: 'F#3', startTime: 15.72, duration: 1.0, velocity: 70, hand: 'left', finger: 1 },

    { pitch: 74, noteName: 'D5', startTime: 14.8, duration: 0.45, velocity: 88, hand: 'right', finger: 4 },
    { pitch: 73, noteName: 'C#5', startTime: 15.4, duration: 0.45, velocity: 86, hand: 'right', finger: 3 },
    { pitch: 71, noteName: 'B4', startTime: 16.0, duration: 0.5, velocity: 85, hand: 'right', finger: 2 },
    { pitch: 69, noteName: 'A4', startTime: 16.8, duration: 1.2, velocity: 88, hand: 'right', finger: 1 },

    // Measure 6: D Major
    { pitch: 38, noteName: 'D2', startTime: 18.5, duration: 1.8, velocity: 78, hand: 'left', finger: 5 },
    { pitch: 45, noteName: 'A2', startTime: 18.96, duration: 1.2, velocity: 72, hand: 'left', finger: 3 },
    { pitch: 50, noteName: 'D3', startTime: 19.42, duration: 1.0, velocity: 70, hand: 'left', finger: 1 },

    { pitch: 73, noteName: 'C#5', startTime: 18.5, duration: 0.5, velocity: 86, hand: 'right', finger: 3 },
    { pitch: 71, noteName: 'B4', startTime: 19.2, duration: 0.5, velocity: 84, hand: 'right', finger: 2 },
    { pitch: 69, noteName: 'A4', startTime: 20.0, duration: 1.8, velocity: 90, hand: 'right', finger: 1 },

    // Measure 7: A Major Ending of phrase
    { pitch: 45, noteName: 'A2', startTime: 22.2, duration: 2.5, velocity: 80, hand: 'left', finger: 5 },
    { pitch: 52, noteName: 'E3', startTime: 22.8, duration: 2.0, velocity: 74, hand: 'left', finger: 3 },
    { pitch: 57, noteName: 'A3', startTime: 23.4, duration: 2.0, velocity: 72, hand: 'left', finger: 1 },

    { pitch: 69, noteName: 'A4', startTime: 22.2, duration: 1.0, velocity: 85, hand: 'right', finger: 1 },
    { pitch: 73, noteName: 'C#5', startTime: 23.5, duration: 1.2, velocity: 88, hand: 'right', finger: 3 },
    { pitch: 76, noteName: 'E5', startTime: 25.0, duration: 1.5, velocity: 90, hand: 'right', finger: 5 },

    // Final Chord Resolution (E to A)
    { pitch: 40, noteName: 'E2', startTime: 26.5, duration: 2.5, velocity: 75, hand: 'left', finger: 5 },
    { pitch: 47, noteName: 'B2', startTime: 27.0, duration: 2.0, velocity: 70, hand: 'left', finger: 3 },
    { pitch: 64, noteName: 'E4', startTime: 27.5, duration: 3.5, velocity: 80, hand: 'right', finger: 1 },
    { pitch: 68, noteName: 'G#4', startTime: 28.0, duration: 3.5, velocity: 82, hand: 'right', finger: 2 },
    { pitch: 71, noteName: 'B4', startTime: 28.5, duration: 3.5, velocity: 85, hand: 'right', finger: 3 },
    { pitch: 76, noteName: 'E5', startTime: 29.0, duration: 3.0, velocity: 88, hand: 'right', finger: 5 },
  ],
};
