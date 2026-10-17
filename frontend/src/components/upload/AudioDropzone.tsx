'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Music, FileVideo, AlertCircle, Loader2 } from 'lucide-react';

export interface AudioDropzoneProps {
  readonly onFileSelected: (file: File, objectUrl: string) => void;
  readonly isProcessing?: boolean;
  readonly error?: string | null;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.m4v', '.ogg', '.aac', '.flac', '.webm'];

export function AudioDropzone({
  onFileSelected,
  isProcessing = false,
  error = null,
}: AudioDropzoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndProcessFile = useCallback(
    (file: File): void => {
      setValidationError(null);

      // Validate File Size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(
          `Dung lượng file (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa 25MB.`
        );
        return;
      }

      // Validate File Extension / Type
      const fileNameLower = file.name.toLowerCase();
      const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
      const hasValidMime = file.type.startsWith('audio/') || file.type.startsWith('video/');

      if (!hasValidExt && !hasValidMime) {
        setValidationError(
          'Định dạng không được hỗ trợ. Vui lòng chọn file âm thanh hoặc video (.mp3, .wav, .m4a, .mp4, .ogg).'
        );
        return;
      }

      // Create Object URL for RAM-only playback
      const objectUrl = URL.createObjectURL(file);
      onFileSelected(file, objectUrl);
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
    },
    [validateAndProcessFile]
  );

  const handleClick = useCallback((): void => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isProcessing]);

  const displayError = validationError || error;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,.m4a,.mp3,.wav,.ogg"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isProcessing}
      />

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
        className={`relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-3xl transition-all duration-200 cursor-pointer text-center select-none ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center py-4">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Gemini AI đang lắng nghe và bóc tách bài hát...
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Hệ thống đang trích xuất nhịp phách, phiên âm tiếng Việt chuẩn nhịp và dịch nghĩa từng câu.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">
              Kéo thả file âm thanh hoặc video vào đây
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              hoặc <span className="text-cyan-400 underline font-medium">duyệt tìm file</span> từ thiết bị của bạn
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60">
                <Music className="w-3.5 h-3.5 text-cyan-400" /> MP3, WAV, M4A
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/60">
                <FileVideo className="w-3.5 h-3.5 text-amber-400" /> MP4 Video TikTok
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/60">
                Tối đa 25MB
              </span>
            </div>
          </div>
        )}
      </div>

      {displayError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
