'use client';

import React, { useState } from 'react';
import type { LyricLine, TranscriptionMetadata } from '@/types/lyrics';
import { exportToTxt } from '@/lib/export/txt';
import { exportToSrt } from '@/lib/export/srt';
import { generateLrcContent } from '@/lib/export/lrc';
import { formatForClipboard, copyTextToClipboard, downloadFile } from '@/lib/export/clipboard';
import { Copy, FileText, Music, Video, Check } from 'lucide-react';

export interface ExportToolbarProps {
  readonly lines: readonly LyricLine[];
  readonly metadata?: TranscriptionMetadata;
}

export function ExportToolbar({ lines, metadata }: ExportToolbarProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  const baseFileName = (metadata?.title || 'lyric-phonics')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  const handleCopyClipboard = async (): Promise<void> => {
    const text = formatForClipboard(lines, metadata);
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadTxt = (): void => {
    const content = exportToTxt(lines, metadata);
    downloadFile(content, `${baseFileName}_lyrics.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadLrc = (): void => {
    const content = generateLrcContent(lines, metadata);
    downloadFile(content, `${baseFileName}_karaoke.lrc`, 'text/plain;charset=utf-8');
  };

  const handleDownloadSrt = (): void => {
    const content = exportToSrt(lines);
    downloadFile(content, `${baseFileName}_subtitles.srt`, 'text/plain;charset=utf-8');
  };

  const isDisabled = lines.length === 0;

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 md:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Xuất tệp 1-Click:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Copy to Clipboard */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleCopyClipboard}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Sao chép toàn bộ lời vào bộ nhớ tạm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
        </button>

        {/* Download TXT */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleDownloadTxt}
          className={`px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Tải file .TXT song ngữ sạch sẽ"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tải file .TXT</span>
        </button>

        {/* Download LRC */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleDownloadLrc}
          className={`px-3 py-2 rounded-xl text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-colors ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Tải file Karaoke .LRC đồng bộ mốc thời gian"
        >
          <Music className="w-3.5 h-3.5 text-cyan-400" />
          <span>Karaoke .LRC</span>
        </button>

        {/* Download SRT */}
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleDownloadSrt}
          className={`px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Tải file phụ đề .SRT cho CapCut / Premiere"
        >
          <Video className="w-3.5 h-3.5 text-amber-400" />
          <span>Phụ đề .SRT</span>
        </button>
      </div>
    </div>
  );
}
