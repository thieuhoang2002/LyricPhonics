'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Music, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export interface PianoDropzoneProps {
  readonly onFileSelected: (file: File) => void;
  readonly isProcessing?: boolean;
  readonly error?: string | null;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

export function PianoDropzone({
  onFileSelected,
  isProcessing = false,
  error = null,
}: PianoDropzoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndProcessFile = useCallback(
    (file: File): void => {
      setValidationError(null);

      // 1. Kiểm tra dung lượng file (Tối đa 25MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError('Dung lượng tệp vượt quá giới hạn 25MB. Vui lòng nén hoặc chọn tệp nhỏ hơn.');
        return;
      }

      // 2. Kiểm tra định dạng: CHỈ CHẤP NHẬN .mp3, .wav, .m4a
      const fileNameLower = file.name.toLowerCase();
      const isValidExtension = ACCEPTED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

      if (!isValidExtension) {
        setValidationError('Piano Studio chỉ hỗ trợ tệp âm thanh định dạng .MP3, .WAV hoặc .M4A.');
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isProcessing) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        validateAndProcessFile(files[0]);
      }
    },
    [isProcessing, validateAndProcessFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const files = e.target.files;
      if (files && files.length > 0) {
        validateAndProcessFile(files[0]);
      }
      // Reset input value để cho phép chọn lại cùng một file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [validateAndProcessFile]
  );

  const handleClick = useCallback((): void => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isProcessing]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 select-none outline-none ${
          isDragOver
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-zinc-700/80 hover:border-amber-500/50 bg-zinc-900/60 hover:bg-zinc-900/80 backdrop-blur-sm'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
            <div className="text-center">
              <p className="text-base font-medium text-zinc-200">
                AI đang lắng nghe và bóc tách giai điệu Piano...
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Tự động trích xuất nốt 2 tay (melody + hòa âm), hợp âm và cấu trúc bài hát
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <Music className="w-10 h-10" />
              <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-zinc-100">
                Kéo thả file nhạc hoặc <span className="text-amber-400 underline underline-offset-4 hover:text-amber-300">chọn từ thiết bị</span>
              </p>
              <p className="text-xs text-zinc-400">
                Hỗ trợ <strong className="text-zinc-300">MP3, WAV, M4A</strong> dung lượng tối đa <strong className="text-amber-400/90 font-mono">25MB</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                Hòa âm 2 tay (Lead & Bass)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Xuất file MIDI & Audio
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thông báo lỗi validation hoặc lỗi backend */}
      {(validationError || error) && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{validationError || error}</span>
        </div>
      )}
    </div>
  );
}
