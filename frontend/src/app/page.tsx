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
  getAllProjectSummaries,
  getProjectById,
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
  LogIn,
  LogOut,
  Zap,
  User,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { PricingModal } from '@/components/pricing/PricingModal';
import { PianoDropzone } from '@/components/piano/PianoDropzone';
import { PianoRollVisualizer } from '@/components/piano/PianoRollVisualizer';
import { PianoConfirmModal } from '@/components/piano/PianoConfirmModal';
import { transcribeAudioToPiano } from '@/lib/api/piano';
import type { PianoTranscriptionResult } from '@/types/piano';
import { SAMPLE_PIANO_RESULT } from '@/lib/piano/samplePianoData';
import {
  fetchCurrentUser,
  getAuthToken,
  clearAuthToken,
  type UserProfile,
} from '@/lib/auth/authStore';
import { getApiBaseUrl } from '@/lib/api/config';

export default function Home(): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<LyricLine | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // User Auth & Credits state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);

  // Global Target Language state
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('vi');

  // Mode switcher: 'lyrics' | 'piano'
  const [activeTab, setActiveTab] = useState<'lyrics' | 'piano'>('lyrics');

  // Piano Studio state
  const [selectedPianoFile, setSelectedPianoFile] = useState<File | null>(null);
  const [isPianoConfirmModalOpen, setIsPianoConfirmModalOpen] = useState<boolean>(false);
  const [isProcessingPiano, setIsProcessingPiano] = useState<boolean>(false);
  const [pianoError, setPianoError] = useState<string | null>(null);
  const [pianoResult, setPianoResult] = useState<PianoTranscriptionResult | null>(null);

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

  // Tải thông tin người dùng từ token nếu đã đăng nhập
  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) setCurrentUser(u);
    });
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
      // 1. Yêu cầu đăng nhập trước khi tạo bài hát
      const token = getAuthToken();
      if (!token || !currentUser) {
        setIsAuthModalOpen(true);
        setErrorMessage('Vui lòng đăng nhập hoặc đăng ký tài khoản (tặng ngay 2 bài miễn phí) để bắt đầu.');
        return;
      }

      // 2. Chặn đứng nếu số lượt về 0 và mở modal mua gói
      if (currentUser.songCredits <= 0) {
        setIsPricingModalOpen(true);
        setErrorMessage('Bạn đã sử dụng hết lượt tạo bài hát. Vui lòng nạp thêm gói để tiếp tục sáng tạo!');
        return;
      }

      setFile(selectedFile);
      setAudioUrl(objectUrl);
      currentBlobRef.current = selectedFile;
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('targetLang', targetLanguage);

        const apiUrl = `${getApiBaseUrl()}/api/transcribe`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.status === 401) {
          clearAuthToken();
          setCurrentUser(null);
          setIsAuthModalOpen(true);
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }

        if (response.status === 403 || data.error === 'OUT_OF_CREDITS') {
          setIsPricingModalOpen(true);
          throw new Error(data.message || 'Bạn đã sử dụng hết lượt tạo bài hát (còn 0 lượt). Vui lòng mua thêm gói.');
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Quá trình bóc tách lời bài hát gặp lỗi.');
        }

        // Cập nhật số lượt bài hát còn lại
        if (data.songCredits != null) {
          setCurrentUser((prev) => prev ? { ...prev, songCredits: data.songCredits } : prev);
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
    [targetLanguage, currentUser]
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

  // Chọn mở một bài hát từ Đám mây tài khoản (Cloud Database)
  const handleSelectCloudTrack = useCallback(
    async (cloudTrack: { id?: string; metadata: any; lines: any[]; audioUrl?: string }): Promise<void> => {
      player.reset();
      setFile(null);

      // 1. Nếu bài hát đã có audioUrl trên Cloudflare R2, phát trực tiếp
      if (cloudTrack.audioUrl) {
        setAudioUrl(cloudTrack.audioUrl);
      } else {
        // 2. Nếu Cloud chưa có file (chưa cấu hình R2), tự động tìm audio tương ứng trong bộ nhớ máy
        try {
          const offlineList = await getAllProjectSummaries();
          const targetTitle = (cloudTrack.metadata?.title || '').toLowerCase().trim();
          const match = offlineList.find((p) => (p.title || '').toLowerCase().trim() === targetTitle);
          if (match) {
            const localProj = await getProjectById(match.id);
            if (localProj?.audioBlob) {
              const url = URL.createObjectURL(localProj.audioBlob);
              setAudioUrl(url);
              currentBlobRef.current = localProj.audioBlob;
            } else {
              setAudioUrl(null);
            }
          } else {
            setAudioUrl(null);
          }
        } catch {
          setAudioUrl(null);
        }
      }

      setCurrentProjectId(cloudTrack.id || null);
      setTranscription({
        metadata: cloudTrack.metadata,
        lines: cloudTrack.lines,
      });

      setSaveStatus(targetLanguage === 'vi' ? 'Đã mở bài hát từ Đám mây' : 'Loaded from Cloud');
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

  // Xử lý khi chọn file âm thanh cho Piano Studio
  const handlePianoFileSelected = useCallback(
    (selectedFile: File) => {
      setPianoError(null);
      if (!currentUser) {
        setIsAuthModalOpen(true);
        setPianoError('Vui lòng đăng nhập để sử dụng tính năng tạo bản phối Piano.');
        return;
      }
      if (currentUser.songCredits <= 0) {
        setIsPricingModalOpen(true);
        setPianoError('Bạn đã sử dụng hết lượt tạo bài hát. Vui lòng nạp thêm gói để tiếp tục!');
        return;
      }
      setSelectedPianoFile(selectedFile);
      setIsPianoConfirmModalOpen(true);
    },
    [currentUser]
  );

  // Xác nhận chuyển đổi và gọi API Piano với cơ chế bảo toàn credit
  const handleConfirmPiano = useCallback(async () => {
    if (!selectedPianoFile) return;
    const token = getAuthToken();
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsProcessingPiano(true);
    setPianoError(null);

    try {
      const response = await transcribeAudioToPiano(selectedPianoFile, token);

      if (!response.success || !response.result) {
        if (response.error === 'OUT_OF_CREDITS') {
          setIsPricingModalOpen(true);
        }
        throw new Error(response.message || response.error || 'Quá trình hòa âm Piano thất bại.');
      }

      // Cập nhật số credit mới sau khi thành công
      if (typeof response.songCredits === 'number') {
        const updatedCredits = response.songCredits;
        setCurrentUser((prev) => (prev ? { ...prev, songCredits: updatedCredits } : prev));
      }

      setPianoResult(response.result);
      setIsPianoConfirmModalOpen(false);
      setSelectedPianoFile(null);
    } catch (err) {
      setPianoError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo bản phối Piano.');
    } finally {
      setIsProcessingPiano(false);
    }
  }, [selectedPianoFile]);

  // Mở bản phối Piano mẫu (River Flows in You)
  const handleLoadPianoDemo = useCallback(() => {
    setPianoResult(SAMPLE_PIANO_RESULT);
    setPianoError(null);
  }, []);

  // Đổi bài Piano khác
  const handleResetPiano = useCallback(() => {
    setPianoResult(null);
    setSelectedPianoFile(null);
    setPianoError(null);
  }, []);

  const hasLyrics = Boolean(transcription && transcription.lines.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#111112] text-zinc-100 selection:bg-[#2836f7]/30 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#222224] bg-[#111112]/90 px-4 py-3 md:px-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] flex items-center justify-center text-white shadow-md shadow-[#2836f7]/25 transition-colors">
            <Mic className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">LyricPhonics</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2836f7]/15 text-[#424ef5] border border-[#2836f7]/30 font-semibold">
                Global Phonics Cover
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
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

          {/* Hiển thị số lượt bài hát (Credits) & Nâng cấp gói */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                currentUser.songCredits > 0
                  ? 'bg-[#2836f7]/20 text-[#424ef5] border border-[#2836f7]/40 hover:bg-[#2836f7]/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 animate-pulse'
              }`}
              title="Nhấn để xem bảng giá và nạp thêm lượt"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {currentUser.songCredits > 0
                  ? `${currentUser.songCredits} lượt còn lại`
                  : '0 lượt - Mua gói'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2836f7] hover:bg-[#424ef5] text-white flex items-center gap-1.5 transition-colors shadow-md shadow-[#2836f7]/25"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}

          {/* Menu tài khoản / Đăng xuất */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-xs text-zinc-400 font-medium hidden md:inline max-w-[120px] truncate" title={currentUser.email}>
                {currentUser.email.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearAuthToken();
                  setCurrentUser(null);
                }}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-[#222224] transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Nút mở thư viện bài hát đã lưu */}
          <button
            type="button"
            onClick={() => setIsProjectsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#161618] border border-[#262629] text-zinc-300 hover:text-white hover:border-zinc-500 flex items-center gap-1.5 transition-colors shadow-sm"
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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center pt-4 pb-2 bg-[#111112]">
        <div className="flex items-center p-1 bg-[#18181b] rounded-2xl border border-zinc-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'lyrics'
                ? 'bg-[#2836f7] text-white shadow-md shadow-[#2836f7]/25'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Lời & Phiên Âm Cover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('piano')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'piano'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/25'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Piano Studio & MIDI</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-48 flex flex-col justify-center">
        {activeTab === 'piano' ? (
          /* ================================================================ */
          /* PIANO STUDIO WORKSPACE                                           */
          /* ================================================================ */
          !pianoResult ? (
            <div className="flex flex-col items-center justify-center my-auto py-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                AI Concert Pianist & Synthesia Arranger
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3 text-center max-w-2xl">
                Chuyển Bài Hát Thành{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
                  Bản Phối Piano Nghệ Thuật
                </span>
              </h1>

              <p className="text-sm md:text-base text-zinc-400 text-center max-w-xl mb-7 leading-relaxed">
                Tự động bóc tách nốt 2 tay độc lập (Lead & Bass), trực quan hóa nốt rơi 60fps, nhận diện hợp âm, và tải file <strong className="text-amber-400">MIDI (.mid)</strong> & <strong className="text-amber-400">Audio (.wav)</strong> miễn phí.
              </p>

              <PianoDropzone
                onFileSelected={handlePianoFileSelected}
                isProcessing={isProcessingPiano}
                error={pianoError}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadPianoDemo}
                  className="px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trải nghiệm ngay bản phối mẫu (River Flows in You)</span>
                </button>
              </div>
            </div>
          ) : (
            <PianoRollVisualizer
              result={pianoResult}
              onReset={handleResetPiano}
            />
          )
        ) : (
          /* ================================================================ */
          /* LYRICS & PHONETICS WORKSPACE                                     */
          /* ================================================================ */
          !hasLyrics ? (
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
          )
        )}
      </main>

      {/* Persistent Audio Player Bar */}
      {audioUrl && activeTab === 'lyrics' && (
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

      {/* Modal Đăng nhập / Đăng ký */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setErrorMessage(null);
        }}
      />

      {/* Modal Mua thêm lượt bài hát & Donate */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        userEmail={currentUser?.email}
      />

      {/* Modal Xác nhận trừ lượt & Bảo toàn Credit khi tạo bản phối Piano */}
      <PianoConfirmModal
        isOpen={isPianoConfirmModalOpen}
        file={selectedPianoFile}
        remainingCredits={currentUser?.songCredits ?? 0}
        onConfirm={handleConfirmPiano}
        onCancel={() => {
          if (!isProcessingPiano) {
            setIsPianoConfirmModalOpen(false);
            setSelectedPianoFile(null);
          }
        }}
        isProcessing={isProcessingPiano}
      />
    </div>
  );
}
