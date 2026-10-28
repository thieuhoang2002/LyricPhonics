/**
 * src/lib/export/pianoAudioExporter.ts
 *
 * Client-Side Piano Audio Renderer using Web Audio OfflineAudioContext.
 * Renders high-fidelity acoustic piano arrangement with Concert Hall Convolution Reverb
 * directly to 16-bit PCM .WAV.
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
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // 3. "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
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
 * Creates a Concert Hall impulse response inside an OfflineAudioContext.
 */
function createOfflineConcertHallImpulse(ctx: OfflineAudioContext, duration = 2.4, decay = 2.2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * decay);
    left[i] = (Math.random() * 2 - 1) * envelope;
    right[i] = (Math.random() * 2 - 1) * envelope;
  }

  return impulse;
}

/**
 * Bounces the complete piano piece offline and returns a playable .wav Blob with concert hall reverb.
 */
export async function renderPianoAudioWav(
  result: PianoTranscriptionResult,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const notes = result.notes;
  if (!notes || notes.length === 0) {
    throw new Error('Không có nốt nhạc nào để render Audio.');
  }

  // Calculate total audio duration (add 3.5s tail for acoustic reverb decay)
  const lastNoteEndTime = notes.reduce(
    (max, n) => Math.max(max, n.startTime + n.duration),
    0
  );
  const totalDuration = Math.max(1, lastNoteEndTime + 3.5);

  const sampleRate = 44100;
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  const offlineContext = new OfflineCtx(2, Math.ceil(sampleRate * totalDuration), sampleRate);

  // Studio Mastering Chain:
  // Voice -> [Dry Bus (0.85) + Convolver Reverb Bus (0.38)] -> Studio Dynamics Compressor -> Destination
  const masterCompressor = offlineContext.createDynamicsCompressor();
  masterCompressor.threshold.setValueAtTime(-14, 0);
  masterCompressor.knee.setValueAtTime(12, 0);
  masterCompressor.ratio.setValueAtTime(3.5, 0);
  masterCompressor.attack.setValueAtTime(0.003, 0);
  masterCompressor.release.setValueAtTime(0.25, 0);
  masterCompressor.connect(offlineContext.destination);

  const dryBus = offlineContext.createGain();
  dryBus.gain.setValueAtTime(0.85, 0);
  dryBus.connect(masterCompressor);

  const reverbConvolver = offlineContext.createConvolver();
  reverbConvolver.buffer = createOfflineConcertHallImpulse(offlineContext, 2.5, 2.1);

  const wetBus = offlineContext.createGain();
  wetBus.gain.setValueAtTime(0.38, 0);
  wetBus.connect(reverbConvolver);
  reverbConvolver.connect(masterCompressor);

  // Schedule all piano notes
  for (const note of notes) {
    const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
    const clampedVelocity = Math.max(1, Math.min(127, note.velocity || 80));
    const normalizedGain = (clampedVelocity / 127) * 0.45;
    const startTime = Math.max(0, note.startTime);
    // Sustain pedal simulation: let notes ring out over 2.5s
    const sustainedDuration = Math.max(note.duration, 2.5);

    // 1. Dynamic Hammer Filter
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    const filterFreq = Math.min(18000, 1800 + clampedVelocity * 125);
    filter.frequency.setValueAtTime(filterFreq, startTime);

    // 2. 3D Stereo Panning
    const panRatio = (note.pitch - 21) / (108 - 21);
    const stereoPan = (panRatio - 0.5) * 0.7;
    const panner = offlineContext.createStereoPanner?.();
    if (panner) {
      panner.pan.setValueAtTime(stereoPan, startTime);
    }

    // 3. Multi-Harmonic Oscillators
    const osc1 = offlineContext.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = offlineContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const osc3 = offlineContext.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime);

    const noteGain = offlineContext.createGain();
    const harmonicGain2 = offlineContext.createGain();
    const harmonicGain3 = offlineContext.createGain();

    // Hammer attack (5ms) & natural sustained decay
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(normalizedGain, startTime + 0.005);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + sustainedDuration + 0.5);

    harmonicGain2.gain.setValueAtTime(normalizedGain * 0.3, startTime);
    harmonicGain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

    harmonicGain3.gain.setValueAtTime(normalizedGain * 0.12, startTime);
    harmonicGain3.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

    osc1.connect(filter);
    osc2.connect(harmonicGain2);
    harmonicGain2.connect(filter);
    osc3.connect(harmonicGain3);
    harmonicGain3.connect(filter);

    filter.connect(noteGain);

    if (panner) {
      noteGain.connect(panner);
      panner.connect(dryBus);
      panner.connect(wetBus);
    } else {
      noteGain.connect(dryBus);
      noteGain.connect(wetBus);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + sustainedDuration + 0.55);
    osc2.stop(startTime + sustainedDuration + 0.55);
    osc3.stop(startTime + sustainedDuration + 0.55);
  }

  onProgress?.(30);

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
