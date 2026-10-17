'use client';

import React, { useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
} from 'lucide-react';
import { formatDisplayTime } from '@/lib/utils/time';
import type { UseAudioPlayerReturn, PlaybackRate } from '@/hooks/useAudioPlayer';

export interface AudioPlayerBarProps {
  readonly player: UseAudioPlayerReturn;
  readonly songTitle?: string;
}

const PLAYBACK_RATES: readonly PlaybackRate[] = [0.75, 1.0, 1.25, 1.5];

export function AudioPlayerBar({
  player,
  songTitle = 'Đang phát bài hát',
}: AudioPlayerBarProps): React.JSX.Element {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    togglePlay,
    seek,
    setPlaybackRate,
    setVolume,
    toggleMute,
  } = player;

  // Global hotkeys for comfortable editing and listening
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      // Don't trigger hotkeys if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '[') {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.key === ']') {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
      }
    },
    [togglePlay, seek, currentTime, duration]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const nextTime = Number.parseFloat(e.target.value);
    seek(nextTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-3 md:px-8 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col gap-2">
        {/* Progress Slider (Scrub Bar) */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {formatDisplayTime(currentTime)}
          </span>

          <div className="relative flex-1 group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-cyan-400 rounded-lg pointer-events-none transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-slate-500 w-10">
            {formatDisplayTime(duration)}
          </span>
        </div>

        {/* Controls and Actions */}
        <div className="flex items-center justify-between">
          {/* Song info / title */}
          <div className="hidden sm:flex items-center gap-2 max-w-[200px] truncate">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-200 truncate">{songTitle}</span>
          </div>

          {/* Core Player Controls */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            <button
              type="button"
              onClick={() => seek(Math.max(0, currentTime - 5))}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Lùi 5 giây (phím [ )"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md shadow-cyan-400/20"
              title="Phát / Tạm dừng (phím Space)"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seek(Math.min(duration, currentTime + 5))}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Tiến 5 giây (phím ] )"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary Controls: Speed & Volume */}
          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-1.5 py-0.5 rounded-md transition-colors ${
                    playbackRate === rate
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
