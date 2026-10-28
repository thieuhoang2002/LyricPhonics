'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Music,
  Gauge,
  Layers,
  Sparkles,
  Volume2,
  FileDown,
  Sliders,
} from 'lucide-react';
import type {
  PianoTranscriptionResult,
  PianoNoteEvent,
  PianoSectionSegment,
  PianoArrangerStyle,
  PianoArrangerHands,
} from '@/types/piano';
import { pianoPlayer, midiToNoteName } from '@/lib/audio/soundfontPlayer';
import { downloadMidiFile } from '@/lib/export/midiExporter';
import { downloadPianoAudioWav } from '@/lib/export/pianoAudioExporter';
import { generatePianoArrangement } from '@/lib/piano/pianoArranger';

export interface PianoRollVisualizerProps {
  result: PianoTranscriptionResult;
  onReset?: () => void;
}

// 61-key range: C2 (MIDI 36) to C7 (MIDI 96)
const START_MIDI = 36;
const END_MIDI = 96;
const TOTAL_KEYS = END_MIDI - START_MIDI + 1;

// Black key pitch classes in an octave (0 = C, 1 = C#, 2 = D, 3 = D#, 4 = E, 5 = F, 6 = F#, 7 = G, 8 = G#, 9 = A, 10 = A#, 11 = B)
const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

function isBlackKey(midi: number): boolean {
  return BLACK_KEY_INDICES.has(midi % 12);
}

export function PianoRollVisualizer({
  result,
  onReset,
}: PianoRollVisualizerProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);
  const [wavProgress, setWavProgress] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<PianoSectionSegment | null>(null);

  // Virtual Arranger Mode States (Mockin.app-style)
  const [currentStyle, setCurrentStyle] = useState<PianoArrangerStyle>('ballad');
  const [currentHands, setCurrentHands] = useState<PianoArrangerHands>('both');

  // Playback reference trackers
  const isPlayingRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const activeNotesRef = useRef<Set<number>>(new Set());
  const triggeredNotesRef = useRef<Set<string>>(new Set());

  // Dynamically re-arrange notes whenever Style or Hands changes (instant <1ms response)
  const arrangedResult = useMemo(() => {
    return generatePianoArrangement(result, currentStyle, currentHands);
  }, [result, currentStyle, currentHands]);

  const arrangedResultRef = useRef<PianoTranscriptionResult>(arrangedResult);
  useEffect(() => {
    arrangedResultRef.current = arrangedResult;
  }, [arrangedResult]);

  // Duration calculation
  const totalDuration = useMemo(() => {
    if (arrangedResult.metadata?.duration && arrangedResult.metadata.duration > 0) return arrangedResult.metadata.duration;
    const maxEnd = arrangedResult.notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    return Math.max(10, maxEnd + 2);
  }, [arrangedResult]);

  // Keep ref synchronized with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Detect currently active chord
  const currentChord = useMemo(() => {
    if (!result.chords || result.chords.length === 0) return null;
    return (
      result.chords.find(
        (c) => currentTime >= c.startTime && currentTime <= c.endTime
      ) || null
    );
  }, [currentTime, result.chords]);

  // Detect currently active section
  useEffect(() => {
    if (!result.sections || result.sections.length === 0) return;
    const current = result.sections.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
    setActiveSection(current || null);
  }, [currentTime, result.sections]);

  // Pre-load SoundFont on component mount
  useEffect(() => {
    pianoPlayer.loadSoundFont();
  }, []);

  // Main 60fps Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = (timestamp: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      if (isPlayingRef.current) {
        currentTimeRef.current += deltaTime * playbackSpeed;
        if (currentTimeRef.current >= totalDuration) {
          currentTimeRef.current = 0;
          setIsPlaying(false);
          pianoPlayer.stopAll();
          triggeredNotesRef.current.clear();
        }
        setCurrentTime(currentTimeRef.current);
      }

      // Draw canvas
      drawCanvas(currentTimeRef.current);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playbackSpeed, totalDuration, result]);

  // Canvas drawing routine
  const drawCanvas = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Piano keyboard height at bottom
      const keyboardHeight = Math.min(130, height * 0.22);
      const waterfallHeight = height - keyboardHeight;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(1, '#18181b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Strike line indicator
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, waterfallHeight);
      ctx.lineTo(width, waterfallHeight);
      ctx.stroke();

      // Keyboard key width calculation (61 keys)
      // Count white keys in range
      let whiteKeyCount = 0;
      for (let m = START_MIDI; m <= END_MIDI; m++) {
        if (!isBlackKey(m)) whiteKeyCount++;
      }
      const whiteKeyWidth = width / whiteKeyCount;

      // Map MIDI note to X position on canvas
      const getNoteX = (midi: number): { x: number; w: number; isBlack: boolean } => {
        let whiteIndex = 0;
        for (let m = START_MIDI; m < midi; m++) {
          if (!isBlackKey(m)) whiteIndex++;
        }

        if (!isBlackKey(midi)) {
          return {
            x: whiteIndex * whiteKeyWidth,
            w: whiteKeyWidth,
            isBlack: false,
          };
        } else {
          // Black key is positioned between white keys
          const x = whiteIndex * whiteKeyWidth - whiteKeyWidth * 0.32;
          return {
            x,
            w: whiteKeyWidth * 0.64,
            isBlack: true,
          };
        }
      };

      // Draw subtle vertical grid lines for white keys
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= whiteKeyCount; i++) {
        const x = i * whiteKeyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, waterfallHeight);
        ctx.stroke();
      }

      // Waterfall falling speed: 3.5 seconds visible horizon
      const visibleSeconds = 3.5;
      const pixelsPerSecond = waterfallHeight / visibleSeconds;

      const currentlyActivePitches = new Set<number>();
      const activeNotesWithHand = new Map<number, 'left' | 'right'>();

      // Render Falling Note Blocks (Mockin.app-style Rounded Pills with Finger Badges)
      for (const note of arrangedResultRef.current.notes) {
        if (note.pitch < START_MIDI || note.pitch > END_MIDI) continue;

        // Position along Y axis
        // Top of note block
        const noteEndOffset = (note.startTime + note.duration - time) * pixelsPerSecond;
        // Bottom of note block (hits strike line at note.startTime == time)
        const noteStartOffset = (note.startTime - time) * pixelsPerSecond;

        const yBottom = waterfallHeight - noteStartOffset;
        const yTop = waterfallHeight - noteEndOffset;
        const blockHeight = Math.max(12, yBottom - yTop);

        // Check if note is visible on screen
        if (yBottom < -20 || yTop > waterfallHeight + 20) continue;

        const { x, w } = getNoteX(note.pitch);

        // Sound trigger check when note crosses strike line
        const noteUniqueId = `${note.pitch}_${note.startTime.toFixed(2)}`;
        const isCurrentlyStriking = time >= note.startTime && time <= note.startTime + note.duration;

        if (isCurrentlyStriking) {
          currentlyActivePitches.add(note.pitch);
          activeNotesWithHand.set(note.pitch, note.hand);
          if (isPlayingRef.current && !triggeredNotesRef.current.has(noteUniqueId)) {
            triggeredNotesRef.current.add(noteUniqueId);
            pianoPlayer.playNote(note.pitch, note.velocity, note.duration);
          }
        }

        const isRight = note.hand === 'right';
        ctx.save();

        // 1. Color Gradient & Shadows
        // Right hand: Vivid Coral Orange / Red (#fb923c -> #ea580c)
        // Left hand: Warm Golden Amber (#fbbf24 -> #d97706)
        const noteGrad = ctx.createLinearGradient(x, yTop, x, yBottom);
        if (isRight) {
          noteGrad.addColorStop(0, '#fb923c');
          noteGrad.addColorStop(1, '#ea580c');
          ctx.strokeStyle = 'rgba(255, 237, 213, 0.45)';
          ctx.shadowColor = 'rgba(234, 88, 12, 0.55)';
        } else {
          noteGrad.addColorStop(0, '#fbbf24');
          noteGrad.addColorStop(1, '#d97706');
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
          ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        }

        ctx.fillStyle = noteGrad;
        ctx.lineWidth = 1;
        ctx.shadowBlur = isCurrentlyStriking ? 16 : 5;

        // 2. Rounded Pill Shape (radius up to 8px)
        const pillRadius = Math.min(8, Math.max(4, (w - 2) / 2));
        ctx.beginPath();
        ctx.roundRect(x + 1, yTop, w - 2, blockHeight, pillRadius);
        ctx.fill();
        ctx.stroke();

        // 3. Crisp Pitch Class Name (e.g. "Bb", "F#", "C", "Ab") at Top Half
        const pitchClass = (note.noteName || midiToNoteName(note.pitch)).replace(/[0-9\-]/g, '');
        const centerX = x + w / 2;

        if (blockHeight >= 16 && w >= 10) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 3;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${w < 16 ? '9px' : '11px'} system-ui, -apple-system, sans-serif`;

          const textY = blockHeight >= 34 ? yTop + 12 : yTop + blockHeight / 2;
          ctx.fillText(pitchClass, centerX, textY);
          ctx.restore();
        }

        // 4. White Circular Finger Badge (1 - 5) at Bottom Half (Mockin.app signature)
        if (blockHeight >= 32 && w >= 12 && note.finger) {
          const badgeRadius = Math.min(6.5, Math.max(5, (w - 4) / 2));
          const badgeCenterY = yBottom - badgeRadius - 4;

          ctx.save();
          // White circular badge background
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 3;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(centerX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
          ctx.fill();

          // Dark finger number inside
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.fillText(String(note.finger), centerX, badgeCenterY);
          ctx.restore();
        }

        ctx.restore();
      }

      activeNotesRef.current = currentlyActivePitches;

      // ================================================================
      // DRAW HAND RANGE BRACKETS ALONG STRIKE LINE (L / R INDICATORS)
      // ================================================================
      const bracketY = waterfallHeight - 3;
      const leftEndKey = Math.floor(whiteKeyCount * 0.48);
      const leftEndX = leftEndKey * whiteKeyWidth;

      ctx.save();
      // Left Hand Bracket (Golden Amber)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, bracketY + 4);
      ctx.lineTo(4, bracketY);
      ctx.lineTo(leftEndX - 4, bracketY);
      ctx.lineTo(leftEndX - 4, bracketY + 4);
      ctx.stroke();

      // Right Hand Bracket (Coral Orange)
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.7)';
      ctx.beginPath();
      ctx.moveTo(leftEndX + 4, bracketY + 4);
      ctx.lineTo(leftEndX + 4, bracketY);
      ctx.lineTo(width - 4, bracketY);
      ctx.lineTo(width - 4, bracketY + 4);
      ctx.stroke();
      ctx.restore();

      // ================================================================
      // DRAW BOTTOM PIANO KEYBOARD (61 KEYS)
      // ================================================================
      const keyboardY = waterfallHeight;

      // 1. Draw White Keys
      let whiteIdx = 0;
      for (let m = START_MIDI; m <= END_MIDI; m++) {
        if (isBlackKey(m)) continue;

        const kx = whiteIdx * whiteKeyWidth;
        const hand = activeNotesWithHand.get(m);
        const isPressed = currentlyActivePitches.has(m);

        if (isPressed) {
          ctx.fillStyle = hand === 'right' ? '#fed7aa' : '#fef08a';
        } else {
          ctx.fillStyle = '#f8fafc';
        }
        ctx.fillRect(kx, keyboardY, whiteKeyWidth, keyboardHeight);

        // Key border
        ctx.strokeStyle = isPressed ? (hand === 'right' ? '#ea580c' : '#d97706') : '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(kx, keyboardY, whiteKeyWidth, keyboardHeight);

        // Glow indicator bar at bottom if active
        if (isPressed) {
          ctx.fillStyle = hand === 'right' ? 'rgba(234, 88, 12, 0.9)' : 'rgba(245, 158, 11, 0.9)';
          ctx.fillRect(kx, keyboardY + keyboardHeight - 12, whiteKeyWidth, 12);
        }

        // Label Middle C (C4 = 60)
        if (m === 60) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('C4', kx + whiteKeyWidth / 2, keyboardY + keyboardHeight - 16);
        }

        whiteIdx++;
      }

      // 2. Draw Black Keys (overlay on top)
      whiteIdx = 0;
      const blackKeyHeight = keyboardHeight * 0.62;

      for (let m = START_MIDI; m <= END_MIDI; m++) {
        if (!isBlackKey(m)) {
          whiteIdx++;
          continue;
        }

        const kx = whiteIdx * whiteKeyWidth - whiteKeyWidth * 0.32;
        const kw = whiteKeyWidth * 0.64;
        const hand = activeNotesWithHand.get(m);
        const isPressed = currentlyActivePitches.has(m);

        if (isPressed) {
          ctx.fillStyle = hand === 'right' ? '#ea580c' : '#f59e0b';
        } else {
          ctx.fillStyle = '#1e293b';
        }
        ctx.fillRect(kx, keyboardY, kw, blackKeyHeight);

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1;
        ctx.strokeRect(kx, keyboardY, kw, blackKeyHeight);

        if (isPressed) {
          ctx.fillStyle = hand === 'right' ? 'rgba(251, 146, 60, 0.9)' : 'rgba(251, 191, 36, 0.9)';
          ctx.fillRect(kx, keyboardY + blackKeyHeight - 8, kw, 8);
        }
      }
    },
    []
  );

  // Resize canvas when container dimensions change
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard spacebar shortcut for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Play / Pause Toggle
  const togglePlay = () => {
    pianoPlayer.getContext(); // Ensure AudioContext is activated
    setIsPlaying((prev) => !prev);
  };

  // Seek handler
  const handleSeek = (newTime: number) => {
    pianoPlayer.stopAll();
    triggeredNotesRef.current.clear();
    setCurrentTime(newTime);
    currentTimeRef.current = newTime;
    drawCanvas(newTime);
  };

  // Handle Hands change with immediate canvas redraw (<1ms response)
  const handleHandsChange = useCallback(
    (newHands: PianoArrangerHands) => {
      setCurrentHands(newHands);
      pianoPlayer.stopAll();
      triggeredNotesRef.current.clear();
      const freshArrangement = generatePianoArrangement(result, currentStyle, newHands);
      arrangedResultRef.current = freshArrangement;
      drawCanvas(currentTimeRef.current);
    },
    [result, currentStyle, drawCanvas]
  );

  // Handle Style change with immediate canvas redraw (<1ms response)
  const handleStyleChange = useCallback(
    (newStyle: PianoArrangerStyle) => {
      setCurrentStyle(newStyle);
      pianoPlayer.stopAll();
      triggeredNotesRef.current.clear();
      const freshArrangement = generatePianoArrangement(result, newStyle, currentHands);
      arrangedResultRef.current = freshArrangement;
      drawCanvas(currentTimeRef.current);
    },
    [result, currentHands, drawCanvas]
  );

  // Rewind
  const handleRestart = () => {
    handleSeek(0);
  };

  // Download MIDI file
  const handleDownloadMidi = () => {
    downloadMidiFile(arrangedResultRef.current);
  };

  // Download Audio WAV
  const handleDownloadWav = async () => {
    try {
      setIsExportingWav(true);
      setWavProgress(10);
      await downloadPianoAudioWav(arrangedResultRef.current, undefined, (progress) => {
        setWavProgress(progress);
      });
    } catch (err) {
      console.error('Lỗi khi render Audio WAV:', err);
    } finally {
      setIsExportingWav(false);
      setWavProgress(0);
    }
  };

  const formatSeconds = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Header & Floating Real-time Chord Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl backdrop-blur-md">
        {/* Song info */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-amber-400" />
            {arrangedResult.metadata.title || 'Bản Phối Piano'}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Điệu tính: <span className="text-amber-400 font-semibold">{arrangedResult.metadata.keySignature || 'C Major'}</span> • Nhịp: <span className="text-zinc-200 font-mono">{arrangedResult.metadata.bpm || 120} BPM</span> • {arrangedResult.notes.length} nốt
          </p>
        </div>

        {/* Floating Chord Display */}
        {currentChord ? (
          <div className="flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl shadow-lg animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Hợp âm:</span>
            <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
              {currentChord.chord}
            </span>
          </div>
        ) : (
          <div className="px-4 py-2 bg-zinc-800/60 border border-zinc-750 rounded-xl text-xs text-zinc-400">
            Đang chơi Intro...
          </div>
        )}

        {/* 1-Click Export Suite */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMidi}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer shadow-sm hover:text-white"
            title="Tải tệp Standard MIDI (.mid) để import vào FL Studio, Ableton, Cubase, Logic..."
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Tải MIDI (.mid)</span>
          </button>

          <button
            onClick={handleDownloadWav}
            disabled={isExportingWav}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
            title="Render trực tiếp bản hòa âm Piano sang tệp âm thanh lossless .WAV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExportingWav ? `Render ${wavProgress}%` : 'Tải Audio (.wav)'}</span>
          </button>
        </div>
      </div>

      {/* Virtual Arranger Controls (Hands & Styles - Mockin.app style) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl backdrop-blur-sm">
        {/* Hands Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Hands:
          </span>
          {(
            [
              { id: 'both', label: 'Both (Cả 2 tay)' },
              { id: 'backing', label: 'Backing (Chỉ đệm)' },
              { id: 'tune', label: 'Tune (Giai điệu)' },
            ] as const
          ).map((h) => {
            const isActive = currentHands === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => handleHandsChange(h.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/20'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-750 hover:text-white border border-zinc-700/60'
                }`}
              >
                {h.label}
              </button>
            );
          })}
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none py-0.5">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Style:
          </span>
          {[
            { id: 'ballad', label: 'Ballad' },
            { id: 'canon', label: 'Canon' },
            { id: 'pop', label: 'Pop' },
            { id: 'slow_12_8', label: '12/8 Slow' },
            { id: 'waltz', label: 'Waltz 3/4' },
            { id: 'bolero', label: 'Bolero' },
          ].map((s) => {
            const isActive = currentStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStyleChange(s.id as PianoArrangerStyle)}
                className={`px-3 py-1 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-750 hover:text-white border border-zinc-700/60'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Chips */}
      {result.sections && result.sections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Đoạn:</span>
          </div>
          {result.sections.map((section, idx) => {
            const isActive = activeSection?.name === section.name;
            return (
              <button
                key={`${section.name}-${idx}`}
                onClick={() => handleSeek(section.startTime)}
                className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
                }`}
              >
                {section.name} ({formatSeconds(section.startTime)})
              </button>
            );
          })}
        </div>
      )}

      {/* Canvas Waterfall & Virtual Keyboard Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-[460px] md:h-[540px] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* Legend overlays (Mockin.app style) */}
        <div className="absolute top-3 left-3 flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400/50" />
            Tay Trái (Backing / Hợp âm)
          </div>
          <div className="flex items-center gap-1.5 text-orange-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-sm shadow-orange-500/50" />
            Tay Phải (Tune / Giai điệu)
          </div>
        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl">
        {/* Left: Play/Pause/Rewind */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát bản nhạc'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleRestart}
            className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Tua về đầu bài"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Time display */}
          <span className="text-xs font-mono text-zinc-400 min-w-[70px]">
            {formatSeconds(currentTime)} / {formatSeconds(totalDuration)}
          </span>
        </div>

        {/* Center: Progress Slider */}
        <div className="w-full flex-1 max-w-xl mx-2">
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Right: Speed Controls & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
            <Gauge className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
            {[0.5, 0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-amber-400 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {onReset && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-rose-400 bg-zinc-800/40 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Chọn bài khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
