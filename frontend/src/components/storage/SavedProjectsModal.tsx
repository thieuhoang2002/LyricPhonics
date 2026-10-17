'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  FolderArchive,
  Music2,
  Trash2,
  Play,
  X,
  Clock,
  Database,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import {
  getAllProjectSummaries,
  deleteProject,
  getProjectById,
  type ProjectSummary,
  type SavedProject,
} from '@/lib/storage/projectStore';
import type { TranscriptionResult } from '@/types/lyrics';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: SavedProject) => void;
  onSelectCloudTrack?: (track: { metadata: any; lines: any[] }) => void;
  currentProjectId?: string | null;
}

interface CloudTrackSummary {
  id: string;
  title: string;
  artist: string;
  fileName: string;
  detectedLanguage: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export function SavedProjectsModal({
  isOpen,
  onClose,
  onSelectProject,
  onSelectCloudTrack,
  currentProjectId,
}: SavedProjectsModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'offline' | 'cloud'>('offline');
  const [offlineProjects, setOfflineProjects] = useState<ProjectSummary[]>([]);
  const [cloudProjects, setCloudProjects] = useState<CloudTrackSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadOfflineList = useCallback(async () => {
    setIsLoading(true);
    const list = await getAllProjectSummaries();
    setOfflineProjects(list);
    setIsLoading(false);
  }, []);

  const loadCloudList = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tracks`
        : 'http://localhost:5000/api/tracks';

      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCloudProjects(json.data);
      }
    } catch (err) {
      console.warn('Không thể tải danh sách từ Cloud DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'offline') {
        loadOfflineList();
      } else {
        loadCloudList();
      }
    }
  }, [isOpen, activeTab, loadOfflineList, loadCloudList]);

  if (!isOpen) return null;

  const handleSelectOffline = async (id: string) => {
    const fullProject = await getProjectById(id);
    if (fullProject) {
      onSelectProject(fullProject);
      onClose();
    }
  };

  const handleSelectCloud = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tracks/${id}`
        : `http://localhost:5000/api/tracks/${id}`;

      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.success && json.data) {
        if (onSelectCloudTrack) {
          onSelectCloudTrack(json.data);
          onClose();
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải bài hát từ Cloud DB:', err);
    }
  };

  const handleDeleteOffline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi danh sách đã lưu?')) {
      await deleteProject(id);
      await loadOfflineList();
    }
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thư Viện Bài Hát</h2>
              <p className="text-xs text-slate-400">
                Đồng bộ Offline Trình duyệt & Cloud Database (PostgreSQL Neon)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800/80 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'offline'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Bộ nhớ Offline ({offlineProjects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'cloud'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Neon PostgreSQL ({cloudProjects.length})</span>
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Đang tải danh sách bài hát...
            </div>
          ) : activeTab === 'offline' ? (
            offlineProjects.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Music2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">Chưa có bài hát nào lưu trên máy</p>
                <p className="text-xs text-slate-500 mt-1">
                  Khi bạn tải file nhạc/video lên, hệ thống sẽ tự động lưu lại vào bộ nhớ offline kèm audio.
                </p>
              </div>
            ) : (
              offlineProjects.map((item) => {
                const isCurrent = item.id === currentProjectId;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectOffline(item.id)}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isCurrent
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0 font-medium">
                              Đang mở
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>{item.linesCount} câu hát</span>
                          <span>•</span>
                          {item.language && (
                            <>
                              <span className="uppercase text-slate-300 font-mono">
                                {item.language}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOffline(e, item.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa bài này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : cloudProjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Database className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">Chưa có bài hát nào trên PostgreSQL Neon DB</p>
              <p className="text-xs text-slate-500 mt-1">
                Các bài hát bóc tách sẽ tự động đồng bộ vào Cloud Database.
              </p>
            </div>
          ) : (
            cloudProjects.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectCloud(item.id)}
                className="group relative p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/50 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-sky-300 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Ca sĩ: {item.artist}</span>
                      <span>•</span>
                      <span className="uppercase text-slate-300 font-mono">
                        {item.detectedLanguage}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            {activeTab === 'offline'
              ? `${offlineProjects.length} bài hát trong bộ nhớ offline`
              : `${cloudProjects.length} bài hát trên Neon PostgreSQL`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
