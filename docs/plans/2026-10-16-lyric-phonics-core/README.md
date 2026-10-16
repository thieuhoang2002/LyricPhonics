---
slug: 2026-10-16-lyric-phonics-core
auto: false
commitPerTask: false
status: done
---

# Plan: LyricPhonics Core MVP (Web Phiên âm Lời bài hát Quốc tế sang Tiếng Việt để Cover)

**Mode:** normal  
**Created:** 2026-10-16  
**Status:** ✅ DONE

## Overview

Xây dựng ứng dụng web LyricPhonics Core MVP hỗ trợ người dùng upload file audio/video (bài hát Trung, Hàn, Nhật, Anh, Thái...), sử dụng AI Multimodal Audio (Gemini 2.5 Flash / Flash Lite) để bóc tách lời bài hát song ngữ kèm phiên âm tiếng Việt chuẩn nhịp điệu và timestamp [start, end]. Ứng dụng tích hợp trình phát nhạc Karaoke đồng bộ realtime 2 chiều, cho phép chỉnh sửa trực tiếp và xuất file 1-click (TXT, LRC, Clipboard).

Ưu tiên hàng đầu: **Độ chính xác cao nhất (Chuẩn nhất)** về ngữ âm tiếng Việt và độ khớp nhịp với nhạc.

## Not Building (Phase 1)

- Hệ thống tài khoản người dùng, xác thực (Supabase Auth).
- Cơ sở dữ liệu đám mây (Supabase Database).
- Cổng thanh toán quét mã VietQR tự động (SePay/Casso).
- Trích xuất tự động từ link video TikTok / YouTube Shorts.

## Progress

| Status  | Phase | File | Tasks |
| :--- | :--- | :--- | :--- |
| ✅ DONE | Phase 1: Project Scaffolding & Audio-to-Phonetics Engine | [phase-1-scaffolding-audio-pipeline.md](./phase-1-scaffolding-audio-pipeline.md) | 4 tasks |
| ✅ DONE | Phase 2: Audio Player & Realtime Synchronized Lyric Editor | [phase-2-player-sync-lyric-editor.md](./phase-2-player-sync-lyric-editor.md) | 4 tasks |
| ✅ DONE | Phase 3: Export Tooling, Content Security & E2E Validation | [phase-3-export-polishing-verification.md](./phase-3-export-polishing-verification.md) | 4 tasks |

## Assumptions

- **Greenfield setup** — Khởi tạo Next.js 14/15 App Router với TypeScript, Tailwind CSS, Lucide React và SDK `@google/genai`. — basis: Bắt đầu từ thư mục trống với ý tưởng tại `4_Phonetic_Lyrics_Cover_App.txt`.
- **Gemini Audio Multimodal** — Sử dụng model Gemini 2.5 Flash / Flash Lite có khả năng nghe trực tiếp file audio/video và trả về JSON Schema nghiêm ngặt có timestamp. — basis: Đảm bảo độ chính xác ngữ âm và nhịp bài hát chuẩn nhất.
- **Client State & In-memory Storage** — Lưu trữ toàn bộ kết quả phân tích và audio blob trong React state và `localStorage` của trình duyệt trong Phase 1. — basis: Triển khai nhanh 0đ, không cần DB.
- **Độ chính xác tuyệt đối nhờ Micro-adjustment** — Cung cấp công cụ tinh chỉnh timeline (+/- 0.5s) và sửa text trực tiếp trên giao diện để người dùng có thể điều chỉnh 100% theo ý muốn. — basis: Đáp ứng yêu cầu ưu tiên kết quả chuẩn nhất của người dùng.

## Risks & Mitigations

- **Rủi ro 1: Ca sĩ hát lướt/beat to làm lệch nhịp timestamp ở một vài đoạn**  
  *Giải pháp:* Dùng model Gemini 2.5 Flash với prompt bóc tách theo nhịp phách, kèm theo nút chỉnh nhanh timeline (`+/- 0.5s` hoặc `Set current time`) trên từng dòng lyric.
- **Rủi ro 2: Dung lượng file upload vượt giới hạn Route Handler**  
  *Giải pháp:* Cấu hình tăng body limit trong Next.js route handler (15MB - 20MB) và client-side validation cảnh báo trước khi upload.
- **Rủi ro 3: An toàn thông tin và bảo mật API Key**  
  *Giải pháp:* Toàn bộ lệnh gọi Gemini API được thực thi trong server-side route `/api/transcribe`, sanitize text đầu ra để phòng chống XSS.

## Rollback Strategy

- **Git Checkpoint:** Tạo commit rõ ràng sau mỗi Phase (`phase 1 done`, `phase 2 done`). Khi gặp xung đột package hoặc lỗi kiến trúc không giải quyết được, thực hiện `git checkout` hoặc `git revert` về commit của Phase liền kề trước đó.
- **Fallback Cơ chế AI:** Nếu Gemini API hết quota hoặc file audio quá phức tạp gây lỗi parse, Route Handler hỗ trợ fallback trả về mock transcription mẫu để lập trình viên và người dùng tiếp tục kiểm thử được UI/Player mà không bị gián đoạn.

## Next Steps

Sau khi hoàn tất kế hoạch: tiến hành thực thi lần lượt từng Phase bằng `/cf-plan-resume 2026-10-16-lyric-phonics-core` hoặc xác nhận bắt đầu triển khai Phase 1.
Sau mỗi phase thực hiện: `/cf-review` → `/cf-commit`.
