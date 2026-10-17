# CHANGELOG

Tất cả những thay đổi đáng chú ý của dự án **LyricPhonics** sẽ được ghi lại trong tài liệu này.

Định dạng của tài liệu này dựa trên tiêu chuẩn [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/), và dự án tuân thủ theo [Semantic Versioning (Phiên bản ngữ nghĩa)](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned (Post-MVP - Milestone 4)
- Tích hợp Supabase Auth (Google, Email) và Supabase Database lưu lịch sử bài hát.
- Tích hợp cổng thanh toán VietQR tự động (SePay/Casso).
- Trích xuất tự động qua link TikTok / YouTube Shorts.

---

## [0.3.0] - 2026-10-17

### Added
- **Chuyển Đổi Sang Monorepo Full-Stack (.NET 8 LTS Backend + Next.js Frontend):**
  - **Backend Clean Architecture (.NET 8):** Phân tách 4 project hoàn chỉnh `Domain`, `Application`, `Infrastructure`, `Api`.
  - **C# 12 Records & High Performance:** Sử dụng `record` immutable, thuật toán Binary Search $O(\log N)$ định vị câu hát thời gian thực, stream nhị phân trực tiếp không buffer RAM.
  - **Polly v8 Resilience:** Tích hợp `Microsoft.Extensions.Http.Resilience` với Exponential Backoff tự động retry khi gặp lỗi 503/429 từ Google Gemini API.
  - **Minimal API & OpenAPI:** Triển khai endpoint `POST /api/transcribe` cực nhanh bằng ASP.NET Core Minimal API, sinh tài liệu Swagger UI tự động tại `/swagger`.
  - **Tách Thư Mục Frontend:** Di chuyển Next.js App Router vào thư mục `frontend/`, kết nối liền mạch với máy chủ C# .NET qua biến môi trường `NEXT_PUBLIC_API_URL`.
  - **Native Speech Synthesis:** Thêm tính năng nghe phát âm giọng bản xứ chuẩn bằng Web Speech API.
  - **Kiểm Thử Toàn Diện (62 Tests Passing):** 19/19 xUnit tests backend (.NET 8) và 43/43 Vitest tests frontend (Next.js).

---

## [0.2.0] - 2026-10-16

### Added
- **Core MVP Engine & Architecture (Milestone 1, 2 & 3):**
  - **Framework & Config:** Next.js 14 App Router, TypeScript strict (`strict: true`, zero `any`), Tailwind CSS, Lucide icons, Vitest.
  - **Domain Model & Schemas:** Kiểu dữ liệu chặt chẽ `LyricLine`, `TranscriptionResult`, `TranscriptionMetadata`, kèm Zod schema và Gemini Structured Output JSON Schema.
  - **Server-side Audio Transcription:** Next.js Route Handler `POST /api/transcribe` (`maxDuration = 60s`), tích hợp `@google/genai` (Gemini 2.5 Flash), bảo mật 100% server secrets, chống rò rỉ API key ra client bundle.
  - **High Performance Sync & Big-O:** Thuật toán Binary Search $O(\log N)$ (`findLyricIndexByTime`) định vị câu hát theo mili-giây, hook `useAudioPlayer` với `requestAnimationFrame` 60fps mượt mà, hook `useLyricSync`.
  - **Interactive Workspace UI:**
    - `AudioDropzone`: Tải lên audio/video hỗ trợ MP3, WAV, M4A, MP4 (giới hạn 25MB, RAM-only Object URL, guard localStorage 2MB).
    - `LyricView` & `LyricLineItem`: Hiển thị 3 tầng (Lời gốc, Phiên âm tiếng Việt chuẩn nhịp, Nghĩa tiếng Việt), karaoke highlight mượt mà, click-to-seek, auto-scroll.
    - `LyricEditorControls`: Bộ công cụ inline editing và micro-adjustments $\pm 0.5s$, gán mốc thời gian hiện tại.
    - `AudioPlayerBar`: Thanh điều khiển đầy đủ chức năng scrub bar, tốc độ phát (0.75x - 1.5x), âm lượng, phím tắt Space.
  - **1-Click Export Tooling:**
    - Xuất file `.TXT` song ngữ gọn gàng.
    - Xuất file `.LRC` chuẩn định dạng Karaoke `[mm:ss.xx]` tương thích các ứng dụng nghe nhạc.
    - Xuất file `.SRT` chuẩn phụ đề video CapCut / Premiere cho người làm nội dung cover TikTok/Reels.
    - Sao chép nhanh vào bộ nhớ tạm (Clipboard) kèm định dạng trực quan.
  - **Content Security & Isolation:** Module `src/lib/security.ts` chống XSS, kiểm tra an toàn MIME/Magic bytes, xử lý hạn mức localStorage.
  - **Test Coverage & Verification:** Đạt 100% test passing (42/42 tests) trên 6 test suites, build thành công 0 lỗi.

---

## [0.1.0] - 2026-10-16

### Added
- **Khởi tạo Nền tảng Kiến trúc Dự án (Architectural Foundation):**
  - Tạo tài liệu đặc tả nghiệp vụ bài toán, user flow, tính năng cốt lõi tại [`PROJECT_SPEC.md`](./PROJECT_SPEC.md).
  - Thiết lập quy chuẩn công nghệ, các thư viện được phép sử dụng và kiến trúc thư mục chuẩn tại [`TECHSTACK.md`](./TECHSTACK.md).
  - Thiết lập danh mục công việc theo từng Milestone/Sprint tại [`TODO.md`](./TODO.md).
  - Thiết lập chiến lược kiểm thử tự động toàn diện tại [`TESTING_PLAN.md`](./TESTING_PLAN.md).
  - Thiết lập bộ quy tắc bắt buộc cho AI IDE Agents tại [`AGENTS.md`](./AGENTS.md) nhằm ngăn chặn code cũ, vi phạm kiểu TypeScript và rò rỉ API Key.
- **Kế hoạch triển khai chi tiết:**
  - Kế hoạch 3 Phase triển khai Core MVP lưu tại [`docs/plans/2026-10-16-lyric-phonics-core/`](./docs/plans/2026-10-16-lyric-phonics-core/).
  - Báo cáo thẩm định kế hoạch độc lập tại [`docs/plans/2026-10-16-lyric-phonics-core/review.md`](./docs/plans/2026-10-16-lyric-phonics-core/review.md).
