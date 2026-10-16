'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { LyricLine, TranscriptionResult } from '@/types/lyrics';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useLyricSync } from '@/hooks/useLyricSync';
import { AudioDropzone } from '@/components/upload/AudioDropzone';
import { LyricView } from '@/components/lyrics/LyricView';
import { AudioPlayerBar } from '@/components/player/AudioPlayerBar';
import { LyricEditorControls } from '@/components/lyrics/LyricEditorControls';
import { ExportToolbar } from '@/components/export/ExportToolbar';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/lib/security';
import {
  Mic,
  Music,
  Sparkles,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

const STORAGE_KEY = 'lyricphonics_session_v1';

export default function Home(): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<LyricLine | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const player = useAudioPlayer(audioUrl);
  const { activeLineIndex } = useLyricSync(transcription?.lines || [], player.currentTime);

  // Restore saved transcription session from localStorage on initial load
  useEffect(() => {
    const saved = safeLocalStorageGet<TranscriptionResult | null>(STORAGE_KEY, null);
    if (saved && saved.lines && saved.lines.length > 0) {
      setTranscription(saved);
    }
  }, []);

  // Save transcription to localStorage whenever it changes
  useEffect(() => {
    if (transcription && transcription.lines.length > 0) {
      safeLocalStorageSet(STORAGE_KEY, transcription);
    }
  }, [transcription]);

  // Handle uploaded audio/video file and trigger transcription API
  const handleFileSelected = useCallback(
    async (selectedFile: File, objectUrl: string): Promise<void> => {
      setFile(selectedFile);
      setAudioUrl(objectUrl);
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Quá trình bóc tách lời bài hát gặp lỗi.');
        }

        const result: TranscriptionResult = {
          metadata: {
            title: data.metadata?.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
            artist: data.metadata?.artist || 'Unknown Artist',
            detectedLanguage: data.metadata?.detectedLanguage || 'auto',
          },
          lines: data.lines || [],
        };

        setTranscription(result);
      } catch (err) {
        console.error('Transcription error:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến AI Engine. Vui lòng kiểm tra lại GEMINI_API_KEY hoặc thử lại sau.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Load a synthetic demo track for instant interactive preview
  const handleLoadDemo = useCallback((): void => {
    const demoResult: TranscriptionResult = {
      metadata: {
        title: 'Mẫu Demo Hát Cover (Song Ngữ)',
        artist: 'LyricPhonics Sample',
        detectedLanguage: 'zh',
      },
      lines: [
        {
          id: 'demo-1',
          startTime: 1.0,
          endTime: 4.5,
          originalText: '我爱你，中国，亲爱的母亲',
          phoneticText: 'Ủa ai nỉ, trung của, chin ai tơ mủ chin',
          translationText: 'Tôi yêu bạn, đất nước thân yêu',
        },
        {
          id: 'demo-2',
          startTime: 5.0,
          endTime: 8.5,
          originalText: '我要把美好的青春献给你',
          phoneticText: 'Ủa dao bả mẩy hảo tơ chinh thuân xiên cẩy nỉ',
          translationText: 'Tôi muốn dành trọn tuổi thanh xuân cho người',
        },
        {
          id: 'demo-3',
          startTime: 9.0,
          endTime: 13.0,
          originalText: '我的母亲，我的祖国',
          phoneticText: 'Ủa tơ mủ chin, ủa tơ chủ của',
          translationText: 'Người mẹ yêu dấu, quê hương tôi',
        },
        {
          id: 'demo-4',
          startTime: 14.0,
          endTime: 18.0,
          originalText: 'Saranghae neoreul bogo shipeo',
          phoneticText: 'Sa-rang-hê no-rưn bô-gô si-pơ',
          translationText: 'Anh yêu em, anh rất nhớ em',
        },
        {
          id: 'demo-5',
          startTime: 19.0,
          endTime: 23.5,
          originalText: 'Aishiteru to iitai kara',
          phoneticText: 'Ai-xi-tê-rư tô ii-tai ca-ra',
          translationText: 'Bởi vì anh muốn nói lời yêu em',
        },
      ],
    };

    setTranscription(demoResult);
  }, []);

  const handleUpdateLine = useCallback((updatedLine: LyricLine): void => {
    setTranscription((prev) => {
      if (!prev) return null;
      const nextLines = prev.lines
        .map((l) => (l.id === updatedLine.id ? updatedLine : l))
        .sort((a, b) => a.startTime - b.startTime);

      return {
        ...prev,
        lines: nextLines,
      };
    });
  }, []);

  const handleResetSession = useCallback((): void => {
    player.reset();
    setFile(null);
    setAudioUrl(null);
    setTranscription(null);
    setErrorMessage(null);
    setEditingLine(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [player]);

  const hasLyrics = Boolean(transcription && transcription.lines.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 md:px-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <Mic className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">LyricPhonics</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                AI Phonics Cover
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Phiên âm lời bài hát quốc tế sang tiếng Việt chuẩn nhịp điệu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasLyrics && (
            <>
              <button
                type="button"
                onClick={() => setAutoScroll((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  autoScroll
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Tự động cuộn theo câu đang hát"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-scroll</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                title="Tải bài hát khác"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Tải bài khác</span>
              </button>
            </>
          )}

          {!hasLyrics && (
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Thử bài mẫu</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-28 flex flex-col justify-center">
        {!hasLyrics ? (
          /* Upload & Empty View */
          <div className="flex flex-col items-center justify-center my-auto py-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini Multimodal Audio 2.5 Flash Engine
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4 text-center max-w-2xl">
              Hát mọi bài hát quốc tế với{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                phiên âm tiếng Việt chuẩn nhịp
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-400 text-center max-w-xl mb-8 leading-relaxed">
              Tải lên bài hát tiếng Trung, Hàn, Nhật, Anh, Thái... AI tự động ngắt theo nhịp thở ca sĩ,
              phiên âm bồi chuẩn khẩu hình để bạn hát cover tự tin ngay lần đầu tiên.
            </p>

            <AudioDropzone
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
              error={errorMessage}
            />

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-800/60">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chưa có file? Bấm nút <strong>&quot;Thử bài mẫu&quot;</strong> ở góc phải để trải nghiệm ngay.</span>
            </div>
          </div>
        ) : (
          /* Lyrics Workspace View */
          <div className="flex flex-col gap-4">
            {/* Header info & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">
                    {transcription?.metadata.title || file?.name || 'Bài hát đang phát'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {transcription?.lines.length} câu hát • Nhấp câu bất kỳ để tua nhạc • Nhấp đúp để sửa lời & căn chỉnh thời gian
                </p>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                {transcription?.metadata.detectedLanguage && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Ngôn ngữ: {transcription.metadata.detectedLanguage.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* 1-Click Export Toolbar */}
            <ExportToolbar
              lines={transcription?.lines || []}
              metadata={transcription?.metadata}
            />

            {/* Synchronized Realtime Lyric List */}
            <div className="mt-2">
              <LyricView
                lines={transcription?.lines || []}
                activeLineIndex={activeLineIndex}
                onSeek={(time) => player.seek(time)}
                onSelectForEdit={(line) => setEditingLine(line)}
                autoScrollEnabled={autoScroll}
              />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Audio Player Bar */}
      {audioUrl && (
        <AudioPlayerBar
          player={player}
          songTitle={transcription?.metadata.title || file?.name || 'Đang phát'}
        />
      )}

      {/* Inline Lyric Editor Modal */}
      {editingLine && (
        <LyricEditorControls
          line={editingLine}
          currentPlaybackTime={player.currentTime}
          onSave={handleUpdateLine}
          onClose={() => setEditingLine(null)}
        />
      )}
    </div>
  );
}
