/**
 * src/types/piano.ts
 *
 * Domain types and data models for LyricPhonics Piano Studio.
 * Strict typing enforcement: ZERO 'any' allowed as per AGENTS.md.
 */

/**
 * Hand playing the piano note.
 */
export type PianoHand = 'left' | 'right';

/**
 * Individual piano note event arranged for 2 hands with finger hints.
 */
export interface PianoNoteEvent {
  /** MIDI pitch number (21 for A0 to 108 for C8) */
  readonly pitch: number;
  /** Human-readable scientific pitch notation (e.g. "C4", "F#5") */
  readonly noteName: string;
  /** Start time in seconds with millisecond precision */
  readonly startTime: number;
  /** Duration in seconds with millisecond precision */
  readonly duration: number;
  /** MIDI velocity (1-127) determining dynamic volume/expression */
  readonly velocity: number;
  /** Hand assignment: 'left' (accompaniment/bass) or 'right' (melody) */
  readonly hand: PianoHand;
  /** Suggested fingering (1: Thumb to 5: Pinky), optional */
  readonly finger?: number;
}

/**
 * Harmonized chord segment over a specific time range.
 */
export interface PianoChordSegment {
  /** Standard chord symbol (e.g. "Am", "F#m7", "Cadd9") */
  readonly chord: string;
  /** Start time of this chord in seconds */
  readonly startTime: number;
  /** End time of this chord in seconds */
  readonly endTime: number;
  /** Root musical note (e.g. "A", "C#") */
  readonly root: string;
  /** Chord quality (e.g. "Major", "Minor", "Dominant 7th") */
  readonly quality: string;
}

/**
 * Structural section of the musical piece (Intro, Verse, Chorus, Outro, etc.)
 */
export interface PianoSectionSegment {
  /** Section identifier/name (e.g. "Intro", "Verse 1", "Chorus", "Solo", "Outro") */
  readonly name: string;
  /** Start time of the section in seconds */
  readonly startTime: number;
  /** End time of the section in seconds */
  readonly endTime: number;
}

/**
 * Metadata for the piano arrangement.
 */
export interface PianoMetadata {
  readonly title?: string;
  readonly artist?: string;
  readonly bpm?: number;
  readonly keySignature?: string;
  readonly timeSignature?: string;
  readonly duration?: number;
}

/**
 * Complete AI Piano Transcription and Arrangement payload.
 */
export interface PianoTranscriptionResult {
  readonly metadata: PianoMetadata;
  readonly notes: readonly PianoNoteEvent[];
  readonly chords: readonly PianoChordSegment[];
  readonly sections: readonly PianoSectionSegment[];
}

/**
 * Piano keyboard display configuration.
 */
export type PianoKeyCount = 61 | 88;

/**
 * Runtime playback state for the interactive visualizer.
 */
export interface PianoPlaybackState {
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly playbackSpeed: number;
  readonly activeNotes: readonly number[]; // MIDI pitch numbers currently pressed
  readonly activeChord?: PianoChordSegment;
  readonly activeSection?: PianoSectionSegment;
}
