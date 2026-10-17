'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LyricLine } from '@/types/lyrics';
import { LyricLineItem } from './LyricLineItem';
import { Music2 } from 'lucide-react';
import { speakOriginalText, stopSpeaking } from '@/lib/utils/speech';

export interface LyricViewProps {
  readonly lines: readonly LyricLine[];
  readonly activeLineIndex: number;
  readonly language?: string;
  readonly onSeek: (seconds: number) => void;
  readonly onSelectForEdit?: (line: LyricLine) => void;
  readonly autoScrollEnabled?: boolean;
}

export function LyricView({
  lines,
  activeLineIndex,
  language,
  onSeek,
  onSelectForEdit,
  autoScrollEnabled = true,
}: LyricViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [speakingLineId, setSpeakingLineId] = useState<string | null>(null);

  // Stop speech when unmounting or changing songs
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSpeakLine = (line: LyricLine): void => {
    if (speakingLineId === line.id) {
      stopSpeaking();
      setSpeakingLineId(null);
      return;
    }

    speakOriginalText(
      line.originalText,
      language,
      () => setSpeakingLineId(line.id),
      () => setSpeakingLineId(null),
      (err) => {
        console.warn('Speech playback notice:', err);
        setSpeakingLineId(null);
      }
    );
  };

  // Auto-scroll the active line into the vertical center of the container
  useEffect(() => {
    if (!autoScrollEnabled || activeLineIndex < 0) return;

    const activeElement = lineRefs.current.get(activeLineIndex);
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, autoScrollEnabled]);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
        <Music2 className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Chưa có dữ liệu lời bài hát</p>
        <p className="text-xs text-slate-500 mt-1">
          Tải lên một bài hát để Gemini AI bóc tách phiên âm và lời bài hát.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-h-[600px] overflow-y-auto space-y-3 p-2 md:p-4 rounded-2xl scroll-smooth"
    >
      {lines.map((line, index) => {
        const isActive = index === activeLineIndex;
        const isPast = activeLineIndex >= 0 && index < activeLineIndex;

        return (
          <div
            key={line.id}
            ref={(el) => {
              if (el) {
                lineRefs.current.set(index, el);
              } else {
                lineRefs.current.delete(index);
              }
            }}
          >
            <LyricLineItem
              line={line}
              index={index}
              isActive={isActive}
              isPast={isPast}
              isSpeaking={speakingLineId === line.id}
              onSeek={onSeek}
              onSpeak={handleSpeakLine}
              onSelectForEdit={onSelectForEdit}
            />
          </div>
        );
      })}
    </div>
  );
}
