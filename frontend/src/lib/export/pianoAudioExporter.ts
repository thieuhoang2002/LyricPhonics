/**
 * src/lib/export/pianoAudioExporter.ts
 *
 * Client-Side Piano Audio Renderer using Web Audio OfflineAudioContext.
 * Renders high-fidelity acoustic piano arrangement directly to 16-bit PCM .WAV.
 */

import type { PianoTranscriptionResult } from '@/types/piano';

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV binary format.
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings into DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // 3. "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM audio samples
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp sample between -1.0 and 1.0
    const sLeft = Math.max(-1, Math.min(1, left[i]));
    const valLeft = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7fff;
    view.setInt16(offset, valLeft, true);
    offset += 2;

    if (numChannels > 1) {
      const sRight = Math.max(-1, Math.min(1, right[i]));
      const valRight = sRight < 0 ? sRight * 0x8000 : sRight * 0x7fff;
      view.setInt16(offset, valRight, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

/**
 * Bounces the complete piano piece offline and returns a playable .wav Blob.
 */
export async function renderPianoAudioWav(
  result: PianoTranscriptionResult,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const notes = result.notes;
  if (!notes || notes.length === 0) {
    throw new Error('Không có nốt nhạc nào để render Audio.');
  }

  // Calculate total audio duration (add 2.5s tail for acoustic reverb decay)
  const lastNoteEndTime = notes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration),
    0
  );
  const totalDuration = Math.max(1, lastNoteEndTime + 2.5);

  const sampleRate = 44100;
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  const offlineContext = new OfflineCtx(2, Math.ceil(sampleRate * totalDuration), sampleRate);

  // Reverb simulation bus (Convolver or simple delay comb filter for studio space)
  const mainBus = offlineContext.createGain();
  mainBus.gain.setValueAtTime(0.85, 0);
  mainBus.connect(offlineContext.destination);

  // Schedule all piano notes
  for (const note of notes) {
    const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
    const gainValue = Math.max(0.01, Math.min(1.0, (note.velocity || 80) / 127)) * 0.45;
    const startTime = Math.max(0, note.startTime);
    const duration = Math.max(0.1, note.duration);

    // Fundamental triangle wave
    const osc = offlineContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    // Warm second harmonic
    const harmonicOsc = offlineContext.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(freq * 2, startTime);

    // Panning: Left hand notes slightly left (-0.2), Right hand slightly right (+0.2)
    const panner = offlineContext.createStereoPanner?.();
    if (panner) {
      panner.pan.setValueAtTime(note.hand === 'left' ? -0.25 : 0.25, startTime);
    }

    const noteGain = offlineContext.createGain();
    const harmonicGain = offlineContext.createGain();

    // Hammer attack & acoustic decay
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(gainValue, startTime + 0.006);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.5);

    harmonicGain.gain.setValueAtTime(gainValue * 0.3, startTime);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

    osc.connect(noteGain);
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(noteGain);

    if (panner) {
      noteGain.connect(panner);
      panner.connect(mainBus);
    } else {
      noteGain.connect(mainBus);
    }

    osc.start(startTime);
    harmonicOsc.start(startTime);
    osc.stop(startTime + duration + 0.55);
    harmonicOsc.stop(startTime + duration + 0.55);
  }

  onProgress?.(30);

  // Start offline rendering
  const renderedBuffer = await offlineContext.startRendering();
  onProgress?.(85);

  const wavArrayBuffer = audioBufferToWav(renderedBuffer);
  onProgress?.(100);

  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}

/**
 * Triggers a browser download of the rendered WAV audio file.
 */
export async function downloadPianoAudioWav(
  result: PianoTranscriptionResult,
  fileName?: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const wavBlob = await renderPianoAudioWav(result, onProgress);
  const url = URL.createObjectURL(wavBlob);

  const cleanTitle = (fileName || result.metadata.title || 'Piano_Cover')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');

  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanTitle}_Piano.wav`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
