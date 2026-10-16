# Phase 1: Project Scaffolding & Audio-to-Phonetics Engine

**Plan:** [README.md](./README.md)  
**Type:** sequential

## Progress

| Status  | Task |
| :--- | :--- |
| ✅ DONE | Task 1: Khởi tạo Next.js App Router, Tailwind CSS & Dependencies |
| ✅ DONE | Task 2: Định nghĩa Schema & Type Definitions cho Lyrics & Phonics |
| ✅ DONE | Task 3: Xây dựng Gemini Audio Engine Service & API Route Handler |
| ✅ DONE | Task 4: Xây dựng bộ công cụ xử lý Timestamp & LRC Parsing |

## Tasks

1. **Khởi tạo Next.js App Router, Tailwind CSS & Dependencies**
   - Khởi tạo cấu trúc dự án Next.js (App Router, TypeScript, Tailwind CSS, Lucide icons), cài đặt SDK `@google/genai`, `zod` và `vitest`. Cấu hình script `"test": "vitest run"` trong `package.json`, cấu hình `.env.example` và xử lý stream `request.formData()` cho upload file media lên đến 20MB.
   - **Files:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `.env.example`, `vitest.config.ts`
   - **Verify:** Chạy lệnh `npm run build` và `npm run test` không có lỗi.

2. **Định nghĩa Schema & Type Definitions cho Lyrics & Phonics**
   - Định nghĩa interfaces TypeScript chuẩn (`LyricLine`, `TranscriptionResult`, `ExportFormat`) và JSON Schema cho Gemini Structured Outputs nhằm đảm bảo kết quả trả về luôn có `startTime`, `endTime`, `originalText`, `phoneticText` và `translationText`.
   - **Files:** `src/types/lyrics.ts`, `src/lib/gemini/schema.ts`
   - **Verify:** Chạy `npx tsc --noEmit` đạt 0 lỗi type.

3. **Xây dựng Gemini Audio Engine Service & API Route Handler**
   - Cấu hình client Gemini từ biến môi trường `GEMINI_API_KEY`. Xây dựng system prompt chuyên biệt tối ưu độ chính xác phiên âm tiếng Việt bồi chuẩn nhịp bài hát theo ngữ âm học. Xây dựng Route Handler `POST /api/transcribe` nhận FormData chứa file audio/video, sử dụng Google AI File API (`ai.files.upload`) cho file lớn hoặc inline buffer cho file nhỏ, gọi Gemini model `gemini-2.5-flash` / `gemini-2.0-flash` với Structured Schema. Bổ sung `export const maxDuration = 60;` để ngăn chặn lỗi 504 Gateway Timeout.
   - **Files:** `src/lib/gemini/client.ts`, `src/lib/gemini/prompts.ts`, `src/app/api/transcribe/route.ts`
   - **Verify:** Chạy script test gửi file audio ngắn, API trả về mã 200 với danh sách dòng lời có timestamp chính xác.

4. **Xây dựng bộ công cụ xử lý Timestamp & LRC Parsing**
   - Viết các tiện ích chuyển đổi thời gian: format giây số thực (`75.32`) thành chuỗi timestamp chuẩn Karaoke `[01:15.32]`, parse chuỗi LRC ngược lại thành đối tượng, và format thời gian hiển thị cho audio player (`01:15 / 03:40`).
   - **Files:** `src/lib/utils/time.ts`, `src/lib/export/lrc.ts`
   - **Verify:** Chạy test kiểm tra roundtrip parse và format timestamp với các mốc thời gian đặc biệt (0s, > 60s, > 1h).
