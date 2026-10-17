'use client';

import React, { useState } from 'react';
import type { LyricLine } from '@/types/lyrics';
import { formatDisplayTime } from '@/lib/utils/time';
import { X, Check, Clock, Plus, Minus, Pin } from 'lucide-react';

export interface LyricEditorControlsProps {
  readonly line: LyricLine | null;
  readonly currentPlaybackTime: number;
  readonly onSave: (updatedLine: LyricLine) => void;
  readonly onClose: () => void;
}

export function LyricEditorControls({
  line,
  currentPlaybackTime,
  onSave,
  onClose,
}: LyricEditorControlsProps): React.JSX.Element | null {
  if (!line) return null;

  const [originalText, setOriginalText] = useState<string>(line.originalText);
  const [phoneticText, setPhoneticText] = useState<string>(line.phoneticText);
  const [translationText, setTranslationText] = useState<string>(line.translationText || '');
  const [startTime, setStartTime] = useState<number>(line.startTime);
  const [endTime, setEndTime] = useState<number>(line.endTime);

  const handleAdjustStart = (delta: number): void => {
    setStartTime((prev) => Number(Math.max(0, prev + delta).toFixed(2)));
  };

  const handleAdjustEnd = (delta: number): void => {
    setEndTime((prev) => Number(Math.max(startTime, prev + delta).toFixed(2)));
  };

  const handleSetStartToCurrent = (): void => {
    setStartTime(Number(Math.max(0, currentPlaybackTime).toFixed(2)));
  };

  const handleSetEndToCurrent = (): void => {
    setEndTime(Number(Math.max(startTime, currentPlaybackTime).toFixed(2)));
  };

  const handleSave = (): void => {
    onSave({
      ...line,
      originalText: originalText.trim(),
      phoneticText: phoneticText.trim(),
      translationText: translationText.trim(),
      startTime,
      endTime: Math.max(startTime, endTime),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Chỉnh sửa Lời & Mốc Thời Gian</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Lời gốc (Tiếng nước ngoài):
            </label>
            <input
              type="text"
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-white text-sm"
              placeholder="Lời bài hát gốc..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cyan-300 mb-1.5">
              Phiên âm tiếng Việt chuẩn nhịp (Để hát cover):
            </label>
            <input
              type="text"
              value={phoneticText}
              onChange={(e) => setPhoneticText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 focus:outline-none text-cyan-300 text-sm font-medium"
              placeholder="Phiên âm bồi tiếng Việt..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Dịch nghĩa tiếng Việt (Tùy chọn):
            </label>
            <input
              type="text"
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-300 text-sm"
              placeholder="Tóm tắt nghĩa..."
            />
          </div>

          {/* Micro-adjustments for Timeline */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Mốc bắt đầu: <strong className="text-cyan-400 font-mono text-sm ml-1">{formatDisplayTime(startTime)}</strong> ({startTime}s)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustStart(-0.5)}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-0.5 text-slate-300"
                  title="Lùi 0.5 giây"
                >
                  <Minus className="w-3 h-3" /> 0.5s
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustStart(0.5)}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-0.5 text-slate-300"
                  title="Tiến 0.5 giây"
                >
                  <Plus className="w-3 h-3" /> 0.5s
                </button>
                <button
                  type="button"
                  onClick={handleSetStartToCurrent}
                  className="px-2 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1 border border-cyan-500/30"
                  title="Gán thời gian đang phát hiện tại"
                >
                  <Pin className="w-3 h-3" /> Hiện tại ({formatDisplayTime(currentPlaybackTime)})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Mốc kết thúc: <strong className="text-cyan-400 font-mono text-sm ml-1">{formatDisplayTime(endTime)}</strong> ({endTime}s)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustEnd(-0.5)}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-0.5 text-slate-300"
                  title="Lùi 0.5 giây"
                >
                  <Minus className="w-3 h-3" /> 0.5s
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustEnd(0.5)}
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-0.5 text-slate-300"
                  title="Tiến 0.5 giây"
                >
                  <Plus className="w-3 h-3" /> 0.5s
                </button>
                <button
                  type="button"
                  onClick={handleSetEndToCurrent}
                  className="px-2 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1 border border-cyan-500/30"
                  title="Gán thời gian đang phát hiện tại"
                >
                  <Pin className="w-3 h-3" /> Hiện tại ({formatDisplayTime(currentPlaybackTime)})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/25"
          >
            <Check className="w-4 h-4" /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
