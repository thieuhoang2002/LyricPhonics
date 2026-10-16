# PROJECT ROADMAP & SPRINT BACKLOG: LYRICPHONICS

> **Status:** Active Execution  
> **Methodology:** Agile / Sprint-based Task Tracking  
> **Progress Status Indicators:**  
> - ⬜ `TODO` — Chưa thực hiện  
> - 🔄 `IN PROGRESS` — Đang triển khai  
> - ✅ `DONE` — Đã hoàn thành và được kiểm thử  

---

## Milestone 0: Architectural Foundation & Specs (Sprint 0)
*Mục tiêu: Thiết lập tiêu chuẩn kiến trúc, tài liệu dự án và quy tắc làm việc cho AI/Engineers.*

- [x] ✅ Tạo tài liệu đặc tả nghiệp vụ dự án ([`PROJECT_SPEC.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/PROJECT_SPEC.md))
- [x] ✅ Tạo tài liệu quy chuẩn công nghệ & cấu trúc thư mục ([`TECHSTACK.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TECHSTACK.md))
- [x] ✅ Tạo quy tắc vận hành bắt buộc cho AI Agents ([`AGENTS.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/AGENTS.md))
- [x] ✅ Tạo kế hoạch kiểm thử tự động toàn diện ([`TESTING_PLAN.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TESTING_PLAN.md))
- [x] ✅ Khởi tạo nhật ký thay đổi dự án ([`CHANGELOG.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/CHANGELOG.md))
- [x] ✅ Tạo lộ trình công việc tổng thể ([`TODO.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TODO.md))

---

## Milestone 1: Core Scaffolding & Audio-to-Phonetics Engine (Sprint 1)
*Mục tiêu: Dựng khung dự án Next.js, cấu hình kiểu dữ liệu nghiêm ngặt, kết nối thành công Gemini Audio API trả về JSON Structured Outputs.*

### Epic 1.1: Project Setup & Tooling
- [x] ✅ Khởi tạo Next.js 14/15 App Router với TypeScript Strict Mode
- [x] ✅ Cài đặt các dependencies chính thức: `@google/genai`, `zod`, `tailwind-merge`, `clsx`, `lucide-react`
- [x] ✅ Cài đặt và cấu hình môi trường test tự động `vitest`
- [x] ✅ Tạo file `.env.example` và cấu hình bảo mật `process.env.GEMINI_API_KEY`

### Epic 1.2: Type Definitions & Data Schemas
- [x] ✅ Định nghĩa strict interfaces: `LyricLine`, `TranscriptionResult`, `ExportFormat` trong `src/types/lyrics.ts`
- [x] ✅ Định nghĩa schema Zod & Gemini Response Schema có trường `startTime`, `endTime`, `originalText`, `phoneticText`, `translationText` trong `src/lib/gemini/schema.ts`

### Epic 1.3: Gemini Multimodal Audio Route
- [x] ✅ Viết system prompt chuyên biệt phiên âm bồi tiếng Việt chuẩn nhịp tại `src/lib/gemini/prompts.ts`
- [x] ✅ Xây dựng client kết nối an toàn với Gemini SDK tại `src/lib/gemini/client.ts`
- [x] ✅ Xây dựng Route Handler `POST /api/transcribe` với `export const maxDuration = 60;`, hỗ trợ Google AI File API (`ai.files.upload`) cho file lớn và stream `request.formData()`
- [x] ✅ Viết integration test cho API route với mock response

### Epic 1.4: Timestamp & LRC Utilities
- [x] ✅ Viết hàm format giây `time` $\to$ karaoke timestamp `[mm:ss.xx]` và ngược lại trong `src/lib/utils/time.ts`
- [x] ✅ Viết thuật toán Binary Search $O(\log N)$ tìm câu hát theo `currentTime` trong `src/lib/utils/binary-search.ts`
- [x] ✅ Viết unit tests cho toàn bộ hàm tiện ích thời gian với `vitest`

---

## Milestone 2: Audio Player & Realtime Synchronized Lyric Editor (Sprint 2)
*Mục tiêu: Xây dựng trình phát nhạc HTML5 Audio 60fps mượt mà, đồng bộ dòng hát và bộ biên tập trực tiếp.*

### Epic 2.1: Custom Audio Hook (`useAudioPlayer`)
- [x] ✅ Xây dựng hook `useAudioPlayer` quản lý native `Audio`: play, pause, seek, playbackRate
- [x] ✅ Tích hợp vòng lặp `requestAnimationFrame` để đồng bộ thời gian phát ở tần số 60fps mượt mà
- [x] ✅ Xây dựng hook `useLyricSync` ứng dụng Binary Search $O(\log N)$ để xác định `activeLineIndex`

### Epic 2.2: Media Ingestion UI
- [x] ✅ Xây dựng component kéo thả file `AudioDropzone.tsx` (hỗ trợ MP3, WAV, M4A, MP4)
- [x] ✅ Kiểm tra validation định dạng MIME và dung lượng (giới hạn <= 20MB) kèm thông báo lỗi
- [x] ✅ Tạo Object URL cục bộ để phát audio tức thì và hiển thị trạng thái loading/skeleton trong khi AI bóc tách

### Epic 2.3: Realtime Karaoke & Lyric View
- [x] ✅ Xây dựng `LyricView.tsx` hiển thị danh sách dòng câu hát 3 tầng (Gốc, Phiên âm Việt, Nghĩa)
- [x] ✅ Tự động highlight câu đang phát và auto-scroll đưa câu hát vào giữa khung hình mượt mà
- [x] ✅ Xử lý sự kiện click vào bất kỳ câu hát nào để audio seek ngay tới mốc thời gian đó

### Epic 2.4: Inline Editor & Micro-adjustment Controls
- [x] ✅ Cho phép người dùng click sửa trực tiếp chữ gốc, phiên âm tiếng Việt và nghĩa câu hát
- [x] ✅ Xây dựng thanh công cụ `AudioPlayerBar.tsx` (Seekbar, volume, tốc độ 0.75x - 1.25x)
- [x] ✅ Bổ sung các nút micro-adjustment: `+0.5s`, `-0.5s` và `Gán mốc thời gian đang phát` cho từng câu

---

## Milestone 3: 1-Click Export, Security & Release Readiness (Sprint 3)
*Mục tiêu: Đóng gói tính năng xuất file đa định dạng, áp dụng bảo mật phòng vệ và kiểm thử toàn diện.*

### Epic 3.1: Multi-format Export Engine
- [x] ✅ Xây dựng module xuất định dạng sạch đẹp `src/lib/export/txt.ts`
- [x] ✅ Xây dựng module xuất file Karaoke tiêu chuẩn `src/lib/export/lrc.ts`
- [x] ✅ Xây dựng module xuất phụ đề video CapCut/Premiere `src/lib/export/srt.ts`
- [x] ✅ Xây dựng thanh công cụ `ExportToolbar.tsx` với Toast thông báo trạng thái

### Epic 3.2: Security & Content Isolation
- [x] ✅ Xây dựng module sanitize text chống XSS tại `src/lib/security.ts`
- [x] ✅ Cơ chế bảo vệ `localStorage` (chỉ lưu JSON metadata & lyrics, không lưu audio blob, kiểm tra giới hạn quota an toàn)
- [x] ✅ Xử lý lỗi toàn diện (API quota limit, network failure, timeout) với UI thông báo thân thiện

### Epic 3.3: UI Polish & End-to-End Verification
- [x] ✅ Ghép nối toàn bộ luồng tại `src/app/page.tsx`
- [x] ✅ Tối ưu hóa trải nghiệm giao diện trên Mobile (cho TikTok Creators) và Desktop
- [x] ✅ Chạy kiểm thử End-to-End với các bài hát mẫu (Hoa, Hàn, Nhật, Anh) và 100% unit tests pass

---

## Milestone 4: Commercialization & Post-MVP (Future Roadmap)
*Mục tiêu: Tích hợp cơ sở dữ liệu, tài khoản người dùng và cổng thanh toán tự động.*

- [ ] ⬜ Tích hợp Supabase Auth (Google Login, Email Login)
- [ ] ⬜ Tích hợp Supabase Database lưu trữ lịch sử chuyển đổi bài hát của người dùng
- [ ] ⬜ Tích hợp cổng thanh toán quét mã VietQR tự động (SePay / Casso)
- [ ] ⬜ Xây dựng scraper bóc tách audio tự động từ liên kết TikTok / YouTube Shorts
