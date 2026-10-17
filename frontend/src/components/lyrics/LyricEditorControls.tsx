'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { LyricLine } from '@/types/lyrics';
import { formatDisplayTime } from '@/lib/utils/time';
import { X, Check, Clock, Plus, Minus, Pin, Sparkles, Loader2 } from 'lucide-react';

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
  const [standardPhonetic, setStandardPhonetic] = useState<string>(line.standardPhonetic || '');
  const [phoneticText, setPhoneticText] = useState<string>(line.phoneticText);
  const [translationText, setTranslationText] = useState<string>(line.translationText || '');
  const [startTime, setStartTime] = useState<number>(line.startTime);
  const [endTime, setEndTime] = useState<number>(line.endTime);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Tham chiếu để tránh trigger auto-regenerate lúc mới mở modal
  const initialOriginalTextRef = useRef<string>(line.originalText);

  const handleRegenerate = async (text: string): Promise<void> => {
    if (!text.trim()) return;
    setIsRegenerating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/phonics/regenerate`
        : 'http://localhost:5000/api/phonics/regenerate';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalText: text }),
      });

      const res = await response.json();
      if (res.success && res.data) {
        if (res.data.standardPhonetic) setStandardPhonetic(res.data.standardPhonetic);
        if (res.data.phoneticText) setPhoneticText(res.data.phoneticText);
        if (res.data.translationText) setTranslationText(res.data.translationText);
      }
    } catch (err) {
      console.warn('Lỗi khi tự động tái tạo phiên âm:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Tự động thay đổi 3 tầng dưới khi người dùng sửa lời gốc (Debounce 800ms)
  useEffect(() => {
    if (originalText === initialOriginalTextRef.current || !originalText.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      handleRegenerate(originalText);
    }, 800);

    return () => clearTimeout(timer);
  }, [originalText]);

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
      standardPhonetic: standardPhonetic.trim() || undefined,
      phoneticText: phoneticText.trim(),
      translationText: translationText.trim(),
      startTime,
      endTime: Math.max(startTime, endTime),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Chỉnh sửa Lời & Mốc Thời Gian</h3>
              <p className="text-[11px] text-slate-400">
                Sửa lời gốc AI sẽ tự động tạo lại phiên âm chuẩn, bồi tiếng Việt và dịch nghĩa
              </p>
            </div>
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
        <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
          {/* Tầng 1: Lời gốc */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Lời gốc (Tiếng nước ngoài):
              </label>
              <button
                type="button"
                onClick={() => handleRegenerate(originalText)}
                disabled={isRegenerating || !originalText.trim()}
                className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
                title="Bấm để AI tạo lại phiên âm ngay"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>AI đang tạo lại...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Tạo lại bằng AI</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-white text-sm"
              placeholder="Lời bài hát gốc (Chữ Hán, Kana, Hangul, Tiếng Anh...)"
            />
          </div>

          {/* Tầng 2: Phiên âm chuẩn quốc tế */}
          <div>
            <label className="block text-xs font-medium text-amber-300/90 mb-1.5">
              Phiên âm chuẩn quốc tế (Pinyin / Romaji / Romaja / IPA):
            </label>
            <input
              type="text"
              value={standardPhonetic}
              onChange={(e) => setStandardPhonetic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/30 focus:border-amber-400 focus:outline-none text-amber-300 text-sm font-mono"
              placeholder="Ví dụ: tú yú liú míng yuè / 'nôrm(ə)l..."
            />
          </div>

          {/* Tầng 3: Phiên âm tiếng Việt chuẩn nhịp */}
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

          {/* Tầng 4: Dịch nghĩa tiếng Việt */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Dịch nghĩa tiếng Việt:
            </label>
            <input
              type="text"
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-slate-300 text-sm"
              placeholder="Tóm tắt nghĩa..."
            />
          </div>

          {/* Căn chỉnh mốc thời gian */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 mt-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Mốc bắt đầu: <strong className="text-cyan-300 font-mono">{formatDisplayTime(startTime)}</strong> ({startTime}s)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustStart(-0.5)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  - 0.5s
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustStart(0.5)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  + 0.5s
                </button>
                <button
                  type="button"
                  onClick={handleSetStartToCurrent}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[11px] font-medium flex items-center gap-1"
                  title="Đặt mốc bắt đầu bằng vị trí audio đang phát"
                >
                  <Pin className="w-3 h-3" />
                  Hiện tại ({formatDisplayTime(currentPlaybackTime)})
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Mốc kết thúc: <strong className="text-cyan-300 font-mono">{formatDisplayTime(endTime)}</strong> ({endTime}s)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustEnd(-0.5)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  - 0.5s
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustEnd(0.5)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  + 0.5s
                </button>
                <button
                  type="button"
                  onClick={handleSetEndToCurrent}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[11px] font-medium flex items-center gap-1"
                  title="Đặt mốc kết thúc bằng vị trí audio đang phát"
                >
                  <Pin className="w-3 h-3" />
                  Hiện tại ({formatDisplayTime(currentPlaybackTime)})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4 shrink-0">
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
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 hover:from-cyan-400 hover:to-sky-300 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
          >
            <Check className="w-4 h-4 font-bold" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
