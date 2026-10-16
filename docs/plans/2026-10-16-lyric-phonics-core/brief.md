---
slug: 2026-10-16-lyric-phonics-core
created: 2026-10-16
mode: normal
---

# Brief: LyricPhonics Core MVP

## Request

dùng cf, lên kế hoạch cho dự án này, idea trong file txt.

Flags: none

## Discovery Q&A

### Round 1 — Scope Phase 1

**Bạn muốn phạm vi kế hoạch (Phase 1) tập trung vào đâu trước?**

(Recommended) Tập trung Core MVP trước: Upload Audio/Video -> Gemini Audio Engine (dịch phiên âm chuẩn nhịp) -> Player/Editor đồng bộ -> Xuất file TXT/Clipboard (chưa cần Auth/DB/Thanh toán).

### Round 2 — Format AI Audio Output & Độ chính xác

**Về AI Audio Engine: Bạn muốn Gemini trả về lời kèm Timestamp từng dòng (để đồng bộ trình phát realtime và xuất LRC) hay chỉ Text từng dòng?**

(Recommended) Structured JSON kèm Timestamp [start, end] từng câu: Gemini trả về mảng JSON có timestamp -> Player có thể highlight câu đang hát realtime và xuất file .lrc/.srt chuẩn xác.

**Tiêu chí ưu tiên cốt lõi của người dùng:**

Ưu tiên cách làm nào cho ra được kết quả chuẩn nhất (độ chính xác cao nhất về phiên âm tiếng Việt và độ khớp nhịp timestamp).

## Confirmed Assumptions

- Greenfield project — kho lưu trữ mới hoàn toàn, khởi tạo Next.js 14/15 App Router, Tailwind CSS, Lucide React, và `@google/genai`. — basis: Bắt đầu từ file ý tưởng `4_Phonetic_Lyrics_Cover_App.txt`.
- Core MVP không phụ thuộc Database (Supabase) hay Cổng thanh toán (VietQR) trong Phase 1 — basis: Tối ưu thời gian ra mắt nhanh trong 2-3 ngày, giữ state client in-memory & localStorage.
- AI Multimodal Audio Engine với model Gemini Flash (Gemini 2.5 Flash / Flash Lite) sử dụng `responseSchema` nghiêm ngặt — basis: Cho ra kết quả phiên âm và timestamp chuẩn xác nhất.
- Trình biên tập Lyrics có tính năng bù trừ thời gian (Micro-adjustment `+/- 0.5s`) — basis: Đảm bảo độ chính xác 100% khi người dùng muốn tinh chỉnh cho khớp beat bài hát.

## Rejected Alternatives

- Decoupled FastAPI + FFmpeg server — phức tạp hóa hạ tầng, tăng chi phí và thời gian triển khai trong khi Next.js Route Handler đủ sức gánh.
- Direct Client-side calling Gemini API — rủi ro lộ API Key, không an toàn cho production.
- Plain Text Transcription (không timestamp) — không thể đồng bộ realtime trên player và không xuất được file Karaoke `.lrc`.

## Success Criteria

- Upload file audio/video (MP3, WAV, M4A, MP4) dưới 20MB mượt mà.
- Gemini bóc tách chính xác 3 tầng thông tin: Lời gốc (Trung/Hàn/Nhật/Anh...), Phiên âm tiếng Việt chuẩn nhịp hát ("Ủa ai nỉ"), Tóm tắt nghĩa tiếng Việt.
- Có timestamp `startTime` và `endTime` cho từng câu.
- Trình phát Karaoke highlight câu đang hát realtime theo nhạc; click vào câu nào thì audio seek đến đó.
- Cho phép sửa trực tiếp lời/phiên âm và chỉnh timeline câu hát.
- Xuất kết quả 1-click: Copy Clipboard, Tải file `.txt` và file `.lrc` chuẩn karaoke mở được trên các phần mềm nghe nhạc / video editor.

## Constraints

- Bảo vệ bí mật `GEMINI_API_KEY` ở server-side Next.js Route Handler.
- Content Isolation & Sanitize dữ liệu trả về từ AI để tránh XSS.
- Hỗ trợ tốt trên cả màn hình Desktop và Mobile cho người sáng tạo nội dung TikTok.

## Out of Scope (Phase 1)

- Đăng ký / Đăng nhập tài khoản người dùng (Supabase Auth).
- Cổng thanh toán chuyển khoản tự động VietQR (SePay / Casso).
- Bóc tách tự động link TikTok / YouTube Shorts (yêu cầu proxy/scraper chuyên biệt).
