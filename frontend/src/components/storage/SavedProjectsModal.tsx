'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  FolderArchive,
  Music2,
  Trash2,
  Play,
  X,
  Clock,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import {
  getAllProjectSummaries,
  deleteProject,
  getProjectById,
  type ProjectSummary,
  type SavedProject,
} from '@/lib/storage/projectStore';

interface SavedProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: SavedProject) => void;
  currentProjectId?: string | null;
}

export function SavedProjectsModal({
  isOpen,
  onClose,
  onSelectProject,
  currentProjectId,
}: SavedProjectsModalProps): React.JSX.Element | null {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    const list = await getAllProjectSummaries();
    setProjects(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, loadList]);

  if (!isOpen) return null;

  const handleSelect = async (id: string) => {
    const fullProject = await getProjectById(id);
    if (fullProject) {
      onSelectProject(fullProject);
      onClose();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi danh sách đã lưu?')) {
      await deleteProject(id);
      await loadList();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
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
              <h2 className="text-base font-bold text-white">Thư Viện Bài Hát Đã Lưu</h2>
              <p className="text-xs text-slate-400">
                Tự động lưu trên trình duyệt (Offline Storage) — Mở lại ngay kèm nhạc & lời
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

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Đang tải danh sách bài hát...
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Music2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">Chưa có bài hát nào được lưu</p>
              <p className="text-xs text-slate-500 mt-1">
                Khi bạn tải file nhạc/video lên và phân tích, hệ thống sẽ tự động lưu lại ở đây.
              </p>
            </div>
          ) : (
            projects.map((item) => {
              const isCurrent = item.id === currentProjectId;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
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
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Xóa bài này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>{projects.length} bài hát trong bộ nhớ offline</span>
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
