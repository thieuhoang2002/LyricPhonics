'use client';

import React from 'react';
import type { LyricLine } from '@/types/lyrics';
import { formatDisplayTime } from '@/lib/utils/time';
import { Play } from 'lucide-react';

export interface LyricLineItemProps {
  readonly line: LyricLine;
  readonly index: number;
  readonly isActive: boolean;
  readonly isPast: boolean;
  readonly onSeek: (seconds: number) => void;
  readonly onSelectForEdit?: (line: LyricLine) => void;
}

export function LyricLineItem({
  line,
  isActive,
  isPast,
  onSeek,
  onSelectForEdit,
}: LyricLineItemProps): React.JSX.Element {
  return (
    <div
      onClick={() => onSeek(line.startTime)}
      onDoubleClick={() => onSelectForEdit?.(line)}
      className={`group relative flex flex-col p-4 md:p-5 rounded-2xl transition-all duration-300 cursor-pointer border select-none ${
        isActive
          ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/50 scale-[1.01]'
          : isPast
          ? 'bg-slate-950/40 border-slate-900/60 opacity-60 hover:opacity-100 hover:border-slate-800'
          : 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-colors ${
            isActive
              ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
              : 'bg-slate-800/80 text-slate-400'
          }`}
        >
          {formatDisplayTime(line.startTime)} - {formatDisplayTime(line.endTime)}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(line.startTime);
          }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded-full transition-opacity ${
            isActive ? 'opacity-100 text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Nhảy đến đoạn này"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>

      {/* Layer 1: Original Language Lyrics */}
      <div
        className={`text-lg md:text-xl font-medium tracking-wide mb-1 transition-colors ${
          isActive ? 'text-white font-bold' : 'text-slate-200'
        }`}
      >
        {line.originalText}
      </div>

      {/* Layer 2: Vietnamese Phonetic Cover Pronunciation */}
      <div
        className={`text-base md:text-lg font-semibold tracking-wide mb-1.5 transition-colors ${
          isActive
            ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]'
            : 'text-sky-400/90'
        }`}
      >
        {line.phoneticText}
      </div>

      {/* Layer 3: Vietnamese Meaning / Translation */}
      {line.translationText && (
        <div
          className={`text-xs md:text-sm italic transition-colors ${
            isActive ? 'text-slate-300' : 'text-slate-500'
          }`}
        >
          {line.translationText}
        </div>
      )}
    </div>
  );
}
