'use client';

import React from 'react';
import type { LyricLine } from '@/types/lyrics';
import { formatDisplayTime } from '@/lib/utils/time';
import { Play, Volume2 } from 'lucide-react';

export interface LyricLineItemProps {
  readonly line: LyricLine;
  readonly index: number;
  readonly isActive: boolean;
  readonly isPast: boolean;
  readonly isSpeaking?: boolean;
  readonly onSeek: (seconds: number) => void;
  readonly onSpeak?: (line: LyricLine) => void;
  readonly onSelectForEdit?: (line: LyricLine) => void;
}

export function LyricLineItem({
  line,
  isActive,
  isPast,
  isSpeaking = false,
  onSeek,
  onSpeak,
  onSelectForEdit,
}: LyricLineItemProps): React.JSX.Element {
  return (
    <div
      onClick={() => onSeek(line.startTime)}
      onDoubleClick={() => onSelectForEdit?.(line)}
      className={`group relative flex flex-col p-4 md:p-5 rounded-2xl transition-all duration-300 cursor-pointer border select-none ${
        isActive
          ? 'bg-[#1a1a1c] border-[#2836f7] shadow-lg shadow-[#2836f7]/20 scale-[1.01]'
          : isPast
          ? 'bg-[#111112]/50 border-[#222224]/40 opacity-60 hover:opacity-100 hover:border-[#2a2a2e]'
          : 'bg-[#171718]/70 border-[#222224] hover:border-[#2836f7]/50 hover:bg-[#1a1a1c]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-colors ${
            isActive
              ? 'bg-[#2836f7]/20 text-[#424ef5] font-semibold border border-[#2836f7]/40'
              : 'bg-[#222224] text-zinc-400'
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
            isActive ? 'opacity-100 text-[#424ef5]' : 'text-zinc-400 hover:text-white'
          }`}
          title="Nhảy đến đoạn này"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      </div>

      {/* Layer 1: Original Language Lyrics & Native Pronunciation */}
      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
        <span
          className={`text-lg md:text-xl font-medium tracking-wide transition-colors ${
            isActive ? 'text-white font-bold' : 'text-slate-200'
          }`}
        >
          {line.originalText}
        </span>

        {onSpeak && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak(line);
            }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all duration-200 border ${
              isSpeaking
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm shadow-cyan-500/30 animate-pulse'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-800'
            }`}
            title="Nhấp để nghe phát âm giọng bản xứ chuẩn"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-cyan-300' : 'text-slate-400'}`} />
            <span className="text-[11px] font-sans">
              {isSpeaking ? 'Đang đọc...' : 'Phát âm'}
            </span>
          </button>
        )}
      </div>

      {/* Layer 2: International Standard Phonetic (Pinyin, Romaji, IPA) */}
      {line.standardPhonetic && (
        <div
          className={`text-xs md:text-sm font-mono tracking-wider mb-1 transition-colors ${
            isActive ? 'text-amber-300/90 font-medium' : 'text-amber-400/60'
          }`}
        >
          {line.standardPhonetic}
        </div>
      )}

      {/* Layer 3: Vietnamese Phonetic Cover Pronunciation */}
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
