/**
 * IndexedDB Storage Engine cho LyricPhonics.
 * 
 * Cho phép lưu trữ không giới hạn:
 * 1. File âm thanh/video nguyên bản (dưới dạng nhị phân Blob/File)
 * 2. Cấu trúc lời bài hát 3 tầng (originalText, phoneticText, translationText kèm timestamp)
 * 3. Tự động phục hồi trạng thái khi tải lại trang web hoặc mở lại trình duyệt.
 */

import type { TranscriptionResult } from '@/types/lyrics';

export interface SavedProject {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  audioBlob: Blob;
  transcription: TranscriptionResult;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  title: string;
  fileName: string;
  linesCount: number;
  language?: string;
  updatedAt: number;
}

const DB_NAME = 'LyricPhonics_Storage_v1';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ trên môi trường này.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lưu hoặc cập nhật một dự án bài hát vào IndexedDB
 */
export async function saveProject(project: SavedProject): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Lỗi khi lưu dự án vào IndexedDB:', error);
  }
}

/**
 * Lấy dự án được cập nhật gần đây nhất để tự động phục hồi khi mở app
 */
export async function getLatestProject(): Promise<SavedProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev'); // Lấy bản ghi mới nhất

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value as SavedProject);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Không thể đọc dự án gần nhất từ IndexedDB:', error);
    return null;
  }
}

/**
 * Lấy một dự án cụ thể theo ID
 */
export async function getProjectById(id: string): Promise<SavedProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as SavedProject) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Lỗi khi lấy dự án ID ${id}:`, error);
    return null;
  }
}

/**
 * Lấy danh sách tóm tắt tất cả các bài hát đã lưu (không kèm binary audio để load cực nhanh)
 */
export async function getAllProjectSummaries(): Promise<ProjectSummary[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');
      const summaries: ProjectSummary[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const item = cursor.value as SavedProject;
          summaries.push({
            id: item.id,
            title: item.title || item.fileName || 'Bài hát không tên',
            fileName: item.fileName,
            linesCount: item.transcription?.lines?.length || 0,
            language: item.transcription?.metadata?.detectedLanguage,
            updatedAt: item.updatedAt,
          });
          cursor.continue();
        } else {
          resolve(summaries);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tóm tắt dự án:', error);
    return [];
  }
}

/**
 * Xóa một dự án khỏi IndexedDB
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Lỗi khi xóa dự án ID ${id}:`, error);
  }
}
