'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LyricLine, TranscriptionResult } from '@/types/lyrics';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useLyricSync } from '@/hooks/useLyricSync';
import { AudioDropzone } from '@/components/upload/AudioDropzone';
import { LyricView } from '@/components/lyrics/LyricView';
import { AudioPlayerBar } from '@/components/player/AudioPlayerBar';
import { LyricEditorControls } from '@/components/lyrics/LyricEditorControls';
import { ExportToolbar } from '@/components/export/ExportToolbar';
import { SavedProjectsModal } from '@/components/storage/SavedProjectsModal';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import {
  translations,
  type SupportedLanguage,
} from '@/lib/i18n/translations';
import {
  saveProject,
  getLatestProject,
  type SavedProject,
} from '@/lib/storage/projectStore';
import {
  Mic,
  Music,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Info,
  FolderHeart,
  CheckCircle2,
} from 'lucide-react';

export default function Home(): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<LyricLine | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Global Target Language state
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('vi');

  // Storage states
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Giữ tham chiếu audio blob hiện tại để lưu khi edit lời
  const currentBlobRef = useRef<Blob | null>(null);

  const t = translations[targetLanguage] || translations.vi;

  const player = useAudioPlayer(audioUrl);
  const { activeLineIndex } = useLyricSync(transcription?.lines || [], player.currentTime);

  // Phát hiện ngôn ngữ trình duyệt hoặc lấy từ localStorage lúc khởi động
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = window.localStorage.getItem('lyricphonics_target_lang') as SupportedLanguage | null;
      if (savedLang && translations[savedLang]) {
        setTargetLanguage(savedLang);
      } else {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('ja')) setTargetLanguage('ja');
        else if (browserLang.startsWith('ko')) setTargetLanguage('ko');
        else if (browserLang.startsWith('es')) setTargetLanguage('es');
        else if (browserLang.startsWith('en')) setTargetLanguage('en');
        else setTargetLanguage('vi');
      }
    }
  }, []);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setTargetLanguage(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lyricphonics_target_lang', lang);
    }
  };

  // Tự động khôi phục bài hát & lời gần nhất từ IndexedDB khi mở trang web
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const latest = await getLatestProject();
        if (!isMounted || !latest || !latest.transcription) return;

        setCurrentProjectId(latest.id);
        setTranscription(latest.transcription);

        if (latest.audioBlob) {
          currentBlobRef.current = latest.audioBlob;
          const url = URL.createObjectURL(latest.audioBlob);
          setAudioUrl(url);
        }

        setSaveStatus(targetLanguage === 'vi' ? 'Đã khôi phục từ bộ nhớ' : 'Restored from offline storage');
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (err) {
        console.warn('Lỗi khi khôi phục dự án gần nhất:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [targetLanguage]);

  // Xử lý khi người dùng tải file lên và gọi API phân tích AI
  const handleFileSelected = useCallback(
    async (selectedFile: File, objectUrl: string): Promise<void> => {
      setFile(selectedFile);
      setAudioUrl(objectUrl);
      currentBlobRef.current = selectedFile;
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('targetLang', targetLanguage);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/transcribe`
          : 'http://localhost:5000/api/transcribe';

        const response = await fetch(apiUrl, {
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

        // Lưu vĩnh viễn cả Audio File và Lyrics vào IndexedDB
        const projectId = `track_${Date.now()}`;
        setCurrentProjectId(projectId);
        await saveProject({
          id: projectId,
          title: result.metadata.title || selectedFile.name,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          audioBlob: selectedFile,
          transcription: result,
          updatedAt: Date.now(),
        });

        setSaveStatus(targetLanguage === 'vi' ? 'Đã tự động lưu vào máy' : 'Auto-saved locally');
        setTimeout(() => setSaveStatus(null), 3500);
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
    [targetLanguage]
  );

  // Mở bài hát mẫu demo
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
          standardPhonetic: 'wǒ ài nǐ, zhōng guó, qīn ài de mǔ qīn',
          phoneticText: 'Ủa ai nỉ, trung của, chin ai tơ mủ chin',
          translationText: 'Tôi yêu bạn, đất nước thân yêu',
        },
        {
          id: 'demo-2',
          startTime: 5.0,
          endTime: 8.5,
          originalText: '我要把美好的青春献给你',
          standardPhonetic: 'wǒ yào bǎ měi hǎo de qīng chūn xiàn gěi nǐ',
          phoneticText: 'Ủa dao bả mẩy hảo tơ chinh thuân xiên cẩy nỉ',
          translationText: 'Tôi muốn dành trọn tuổi thanh xuân cho người',
        },
        {
          id: 'demo-3',
          startTime: 9.0,
          endTime: 13.0,
          originalText: '我的母亲，我的祖国',
          standardPhonetic: 'wǒ de mǔ qīn, wǒ de zǔ guó',
          phoneticText: 'Ủa tơ mủ chin, ủa tơ chủ của',
          translationText: 'Người mẹ yêu dấu, quê hương tôi',
        },
        {
          id: 'demo-4',
          startTime: 14.0,
          endTime: 18.0,
          originalText: 'Saranghae neoreul bogo shipeo',
          standardPhonetic: 'saranghae neoreul bogo sipeo',
          phoneticText: 'Sa-rang-hê no-rưn bô-gô si-pơ',
          translationText: 'Anh yêu em, anh rất nhớ em',
        },
        {
          id: 'demo-5',
          startTime: 19.0,
          endTime: 23.5,
          originalText: 'Aishiteru to iitai kara',
          standardPhonetic: 'aishiteru to iitai kara',
          phoneticText: 'Ai-xi-tê-rư tô ii-tai ca-ra',
          translationText: 'Bởi vì anh muốn nói lời yêu em',
        },
      ],
    };

    setTranscription(demoResult);
  }, []);

  // Cập nhật câu hát khi người dùng chỉnh sửa lời hoặc timestamp
  const handleUpdateLine = useCallback(
    (updatedLine: LyricLine): void => {
      setTranscription((prev) => {
        if (!prev) return null;
        const nextLines = prev.lines
          .map((l) => (l.id === updatedLine.id ? updatedLine : l))
          .sort((a, b) => a.startTime - b.startTime);

        const updatedResult = {
          ...prev,
          lines: nextLines,
        };

        // Đồng bộ cập nhật vào IndexedDB nếu đang có project
        if (currentProjectId && currentBlobRef.current) {
          saveProject({
            id: currentProjectId,
            title: updatedResult.metadata.title || 'Bài hát đã lưu',
            fileName: file?.name || 'audio.mp4',
            mimeType: currentBlobRef.current.type || 'audio/mp4',
            audioBlob: currentBlobRef.current,
            transcription: updatedResult,
            updatedAt: Date.now(),
          }).catch((err) => console.warn('Lỗi auto-save khi edit lời:', err));
        }

        return updatedResult;
      });
    },
    [currentProjectId, file]
  );

  // Chọn mở một bài hát từ modal Thư viện bài hát đã lưu (Offline)
  const handleSelectSavedProject = useCallback(
    (project: SavedProject): void => {
      player.reset();
      setCurrentProjectId(project.id);
      setTranscription(project.transcription);
      currentBlobRef.current = project.audioBlob;

      if (project.audioBlob) {
        const url = URL.createObjectURL(project.audioBlob);
        setAudioUrl(url);
      }

      setSaveStatus(targetLanguage === 'vi' ? 'Đã mở bài hát từ thư viện' : 'Loaded from library');
      setTimeout(() => setSaveStatus(null), 3000);
    },
    [player, targetLanguage]
  );

  // Chọn mở một bài hát từ Cloud Database (Neon PostgreSQL)
  const handleSelectCloudTrack = useCallback(
    (cloudTrack: { metadata: any; lines: any[] }): void => {
      player.reset();
      setFile(null);
      setAudioUrl(null);
      currentBlobRef.current = null;
      setCurrentProjectId(null);
      setTranscription({
        metadata: cloudTrack.metadata,
        lines: cloudTrack.lines,
      });

      setSaveStatus(targetLanguage === 'vi' ? 'Đã tải bài hát từ Neon PostgreSQL' : 'Loaded from Neon PostgreSQL');
      setTimeout(() => setSaveStatus(null), 3000);
    },
    [player, targetLanguage]
  );

  // Reset sang chế độ tải bài mới (không xóa dữ liệu đã lưu trong IndexedDB)
  const handleResetSession = useCallback((): void => {
    player.reset();
    setFile(null);
    setAudioUrl(null);
    currentBlobRef.current = null;
    setTranscription(null);
    setErrorMessage(null);
    setEditingLine(null);
    setCurrentProjectId(null);
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
                Global Phonics Cover
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bộ chọn ngôn ngữ người hát (Language Selector) */}
          <LanguageSelector
            currentLanguage={targetLanguage}
            onLanguageChange={handleLanguageChange}
          />

          {/* Nút mở thư viện bài hát đã lưu */}
          <button
            type="button"
            onClick={() => setIsProjectsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title={t.libraryButton}
          >
            <FolderHeart className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">{t.libraryButton}</span>
          </button>

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
                title="Auto-scroll"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.autoScroll}</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                title={t.changeSong}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.changeSong}</span>
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
              <span>{t.sampleButton}</span>
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
              {t.heroBadge}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4 text-center max-w-2xl">
              {t.heroTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                {t.heroTitleHighlight}
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-400 text-center max-w-xl mb-8 leading-relaxed">
              {t.heroDesc}
            </p>

            <AudioDropzone
              onFileSelected={handleFileSelected}
              isProcessing={isProcessing}
              error={errorMessage}
            />

            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500 bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-800/60">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.emptyNotice}</span>
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
                    {transcription?.metadata.title || file?.name || 'Now Playing'}
                  </h2>
                  {saveStatus && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {saveStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {transcription?.lines.length} lines • Click any line to seek • Double click to edit lyrics & timing
                </p>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                {transcription?.metadata.detectedLanguage && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Language: {transcription.metadata.detectedLanguage.toUpperCase()}
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
                language={transcription?.metadata.detectedLanguage}
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
          songTitle={transcription?.metadata.title || file?.name || 'Playing'}
        />
      )}

      {/* Inline Lyric Editor Modal */}
      {editingLine && (
        <LyricEditorControls
          line={editingLine}
          currentPlaybackTime={player.currentTime}
          targetLanguage={targetLanguage}
          onSave={handleUpdateLine}
          onClose={() => setEditingLine(null)}
        />
      )}

      {/* Thư viện bài hát đã lưu Modal */}
      <SavedProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        onSelectProject={handleSelectSavedProject}
        onSelectCloudTrack={handleSelectCloudTrack}
        currentProjectId={currentProjectId}
      />
    </div>
  );
}
