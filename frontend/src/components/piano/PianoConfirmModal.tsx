'use client';

import React from 'react';
import { Sparkles, ShieldCheck, Music2, AlertCircle, ArrowRight, X } from 'lucide-react';

export interface PianoConfirmModalProps {
  isOpen: boolean;
  file: File | null;
  remainingCredits: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function PianoConfirmModal({
  isOpen,
  file,
  remainingCredits,
  onConfirm,
  onCancel,
  isProcessing,
}: PianoConfirmModalProps): React.JSX.Element | null {
  if (!isOpen || !file) return null;

  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const isOutOfCredits = remainingCredits <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-100">
              Xác Nhận Tạo Bản Phối Piano
            </h3>
            <p className="text-xs text-zinc-400">
              Chuyển đổi bài hát sang nốt Piano 2 tay & trực quan hóa Synthesia
            </p>
          </div>
        </div>

        {/* File Information Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg text-amber-400 mt-0.5">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate">
                {file.name}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kích thước: <span className="text-zinc-300 font-mono">{fileSizeMb} MB</span> • Định dạng: <span className="uppercase text-amber-400/90 font-mono">{file.name.split('.').pop()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Credit Breakdown & Reassurance */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm py-2 px-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <span className="text-zinc-400">Lượt tạo bài hiện có:</span>
            <span className="font-bold text-emerald-400 font-mono text-base">
              {remainingCredits} lượt
            </span>
          </div>

          <div className="flex items-center justify-between text-sm py-2 px-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <span className="text-amber-200/90">Chi phí xử lý:</span>
            <span className="font-bold text-amber-400 font-mono text-base">
              1 lượt
            </span>
          </div>

          {/* Anti-loss Credit Guarantee */}
          <div className="flex items-start gap-2.5 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cam kết không mất lượt oan:</strong> Hệ thống chỉ trừ 1 lượt khi bản phối Piano đã tạo thành công 100%. Nếu có sự cố mạng hoặc lỗi xử lý, số lượt của bạn được bảo toàn trọn vẹn.
            </span>
          </div>

          {isOutOfCredits && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Bạn đã hết lượt tạo bài hát. Vui lòng nạp thêm gói để tiếp tục.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || isOutOfCredits}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý hòa âm...</span>
              </>
            ) : (
              <>
                <span>Tiến Hành Phối Piano</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
