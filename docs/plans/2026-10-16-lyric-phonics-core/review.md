---
slug: 2026-10-16-lyric-phonics-core
date: 2026-10-16
type: plan-review
reviewed_by: Antigravity In-Session Reviewer
---

# Plan Review: LyricPhonics Core MVP

## 🚨 Critical Issues

*Không có vấn đề nghiêm trọng nào đe dọa trực tiếp đến tính khả thi hoặc xung đột kiến trúc cốt lõi.*

## ⚠️ Important Issues (Đã áp dụng vào kế hoạch ✅)

- [phase-1-scaffolding-audio-pipeline.md:27] `src/app/api/transcribe/route.ts` xử lý file audio/video lên tới 20MB trong Next.js App Router có thể bị chặn bởi cấu hình mặc định của body parser hoặc thời gian timeout (serverless function timeout). — **Đã áp dụng:** Bổ sung `export const maxDuration = 60;` và cấu hình route segment config / multipart streaming.
- [phase-2-player-sync-lyric-editor.md:21] `src/hooks/useAudioPlayer.ts` chỉ dựa vào event `timeupdate` của HTML5 Audio. Event `timeupdate` thường chỉ phát ra 3–4 lần/giây (khoảng cách 250ms), điều này có thể khiến hiệu ứng highlight karaoke bị giật nhẹ hoặc không khớp mượt mà với những câu hát nhanh. — **Đã áp dụng:** Kết hợp thêm `requestAnimationFrame` khi `isPlaying = true` để nội suy `currentTime` với tần số 60fps mượt mà hơn.
- [phase-3-export-polishing-verification.md:33] `localStorage` có giới hạn dung lượng ~5MB. Nếu lưu trữ cả audio base64/blob vào `localStorage`, trình duyệt sẽ ném lỗi `QuotaExceededError`. — **Đã áp dụng:** Làm rõ chỉ lưu metadata và danh sách `lines` (JSON lyrics) vào `localStorage`, còn file audio/blob chỉ giữ trong bộ nhớ phiên làm việc (RAM/Blob URL).

## 💡 Suggestions

- [phase-1-scaffolding-audio-pipeline.md:21] Nên cân nhắc bổ sung thư viện `zod` vào `package.json` ở Task 1 để validate chặt chẽ cấu trúc JSON mà Gemini trả về trước khi truyền xuống client.
- [phase-2-player-sync-lyric-editor.md:35] Cung cấp phím tắt tiện lợi (như phím Space để Play/Pause, phím [ / ] để lùi/tiến 5s) để người dùng vừa nghe vừa chỉnh sửa lời thuận tiện hơn.

## 📋 Summary

Kế hoạch `2026-10-16-lyric-phonics-core` được thiết kế chặt chẽ, mạch lạc và tuân thủ đầy đủ các nguyên tắc của Coding Friend:
1. **Phạm vi & Brief:** Khớp 100% với yêu cầu Core MVP và Success Criteria trong `brief.md`. Không vi phạm danh sách Not Building.
2. **Cấu trúc Phase:** Cả 3 phase đều tuân thủ ngân sách tệp (mỗi phase từ 4 đến 6 files, không vượt ngưỡng 15 files).
3. **Tính cụ thể:** Các task đều có danh sách file cụ thể và tiêu chí verify rõ ràng, không có `TODO`/`TBD`.
4. **Độ an toàn:** Đã có bước Content Isolation và bảo mật server-side route cho API Key.
5. **Khuyến nghị tiếp theo:** Áp dụng 3 lưu ý ở mục ⚠️ Important Issues vào kế hoạch để quá trình triển khai code thực tế không gặp sự cố kỹ thuật về payload size, độ mượt karaoke và bộ nhớ trình duyệt.
