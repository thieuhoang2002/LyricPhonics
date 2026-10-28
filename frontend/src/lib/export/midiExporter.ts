/**
 * src/lib/export/midiExporter.ts
 *
 * Standard MIDI File (SMF Format 1) Binary Exporter.
 * Generates valid .mid files for import into DAWs (FL Studio, Ableton, Logic, Cubase)
 * and score notation software (MuseScore, Sibelius).
 */

import type { PianoNoteEvent, PianoTranscriptionResult } from '@/types/piano';

/**
 * Encodes a number as a MIDI Variable Length Quantity (VLQ).
 */
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let v = Math.max(0, Math.round(value));
  bytes.push(v & 0x7f);

  while (v > 0x7f) {
    v >>= 7;
    bytes.unshift((v & 0x7f) | 0x80);
  }

  return bytes;
}

/**
 * Converts a 32-bit integer to 4 big-endian bytes.
 */
function uint32ToBytes(val: number): number[] {
  return [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

/**
 * Converts a 16-bit integer to 2 big-endian bytes.
 */
function uint16ToBytes(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

/**
 * Converts an ASCII string into an array of byte codes.
 */
function stringToBytes(str: string): number[] {
  return Array.from(str).map((char) => char.charCodeAt(0) & 0xff);
}

/**
 * Generates a Standard MIDI File (Type 1) with 2 tracks:
 * - Track 1: Conductor track (Tempo BPM, Key, Time Signature, Title)
 * - Track 2: Piano track (Right hand melody + Left hand bass/accompaniment)
 */
export function generateMidiFile(result: PianoTranscriptionResult): Uint8Array {
  const ppq = 480; // Standard ticks per quarter note
  const bpm = result.metadata.bpm || 120;
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  const secondsPerTick = 60 / (bpm * ppq);

  // ====================================================================
  // 1. TRACK 1: CONDUCTOR / METADATA TRACK
  // ====================================================================
  const track1Events: number[] = [];

  // Track name event
  const trackName = stringToBytes(result.metadata.title || 'Piano Arrangement');
  track1Events.push(0x00, 0xff, 0x03, trackName.length, ...trackName);

  // Set Tempo Meta Event (FF 51 03 tt tt tt)
  const tempoBytes = [
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
  ];
  track1Events.push(0x00, 0xff, 0x51, 0x03, ...tempoBytes);

  // Time Signature: 4/4 default (FF 58 04 04 02 18 08)
  track1Events.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Section markers as Marker Meta Events (FF 06 len text)
  if (result.sections && result.sections.length > 0) {
    let lastSectionTick = 0;
    for (const section of result.sections) {
      const sectionTick = Math.max(0, Math.round(section.startTime / secondsPerTick));
      const delta = sectionTick - lastSectionTick;
      lastSectionTick = sectionTick;

      const markerBytes = stringToBytes(section.name);
      track1Events.push(...encodeVLQ(delta), 0xff, 0x06, markerBytes.length, ...markerBytes);
    }
  }

  // End of Track Meta Event (00 FF 2F 00)
  track1Events.push(0x00, 0xff, 0x2f, 0x00);

  // ====================================================================
  // 2. TRACK 2: PIANO NOTES TRACK
  // ====================================================================
  interface MidiRawEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
    channel: number; // Channel 0: Right hand, Channel 1: Left hand
  }

  const rawEvents: MidiRawEvent[] = [];

  for (const note of result.notes) {
    const startTick = Math.max(0, Math.round(note.startTime / secondsPerTick));
    const durationTick = Math.max(1, Math.round(note.duration / secondsPerTick));
    const endTick = startTick + durationTick;
    const channel = note.hand === 'left' ? 1 : 0;
    const velocity = Math.max(1, Math.min(127, note.velocity || 80));

    rawEvents.push({
      tick: startTick,
      type: 'on',
      pitch: note.pitch,
      velocity,
      channel,
    });

    rawEvents.push({
      tick: endTick,
      type: 'off',
      pitch: note.pitch,
      velocity: 0,
      channel,
    });
  }

  // Sort events chronologically (Note-Offs first if timestamps match to prevent stuck notes)
  rawEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  const track2Events: number[] = [];

  // Track name: Piano Grand
  const pianoTrackName = stringToBytes('Acoustic Grand Piano');
  track2Events.push(0x00, 0xff, 0x03, pianoTrackName.length, ...pianoTrackName);

  // Program change to Acoustic Grand Piano (0x00) on both channels
  track2Events.push(0x00, 0xc0, 0x00); // Channel 0
  track2Events.push(0x00, 0xc1, 0x00); // Channel 1

  let lastTick = 0;
  for (const ev of rawEvents) {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;

    track2Events.push(...encodeVLQ(delta));

    if (ev.type === 'on') {
      track2Events.push(0x90 | (ev.channel & 0x0f), ev.pitch & 0x7f, ev.velocity & 0x7f);
    } else {
      track2Events.push(0x80 | (ev.channel & 0x0f), ev.pitch & 0x7f, 0x00);
    }
  }

  // End of Track Meta Event
  track2Events.push(0x00, 0xff, 0x2f, 0x00);

  // ====================================================================
  // 3. ASSEMBLE FULL MIDI FILE CHUNKS (MThd + MTrk 1 + MTrk 2)
  // ====================================================================
  const headerChunk = [
    ...stringToBytes('MThd'),
    ...uint32ToBytes(6), // Header length = 6
    ...uint16ToBytes(1), // Format = 1
    ...uint16ToBytes(2), // 2 tracks
    ...uint16ToBytes(ppq), // PPQ = 480
  ];

  const track1Chunk = [
    ...stringToBytes('MTrk'),
    ...uint32ToBytes(track1Events.length),
    ...track1Events,
  ];

  const track2Chunk = [
    ...stringToBytes('MTrk'),
    ...uint32ToBytes(track2Events.length),
    ...track2Events,
  ];

  const fullMidi = new Uint8Array([...headerChunk, ...track1Chunk, ...track2Chunk]);
  return fullMidi;
}

/**
 * Triggers a browser download of the generated MIDI file.
 */
export function downloadMidiFile(result: PianoTranscriptionResult, fileName?: string): void {
  const midiData = generateMidiFile(result);
  const blob = new Blob([midiData.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  const cleanTitle = (fileName || result.metadata.title || 'Piano_Cover')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanTitle}_Piano.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
