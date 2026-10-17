# TESTING PLAN — CHIẾN LƯỢC KIỂM THỬ TOÀN DIỆN (MONOREPO)

> **Dự án:** LyricPhonics (C# .NET 8 LTS Backend & Next.js Frontend)  
> **Cập nhật:** 2026-10-17  

---

## 🧪 1. MA TRẬN KIỂM THỬ BACKEND (.NET 8 LTS - XUNIT)

Kiểm thử tự động trên Backend được xây dựng bằng bộ 3: **xUnit + FluentAssertions + Moq**.

| Phạm vi kiểm thử | File Test | Kỹ thuật / Mục tiêu kiểm thử |
| :--- | :--- | :--- |
| **Thuật toán Binary Search** | `BinarySearchTests.cs` | • Kiểm thử tra cứu $O(\log N)$ tại các mốc thời gian biên (`0.0s`, giữa câu, sau câu cuối).<br>• Đo đạc thời gian thực thi với danh sách $10.000$ câu hát. |
| **Xử lý File Karaoke LRC** | `LrcServiceTests.cs` | • Format từ `LyricLine` sang chuỗi chuẩn `[mm:ss.xx]`.<br>• Parse ngược từ file LRC về danh sách đối tượng, kiểm tra sai số làm tròn mili-giây. |
| **Validation & Bảo mật File** | `AudioValidationTests.cs` | • Kiểm tra định dạng MIME hợp lệ (audio/mpeg, audio/wav, video/mp4).<br>• Kiểm tra từ chối các file vượt quá 25MB hoặc file giả mạo extension. |
| **Gemini Client & Polly Resilience** | `GeminiClientTests.cs` | • Mock `HttpMessageHandler` mô phỏng lỗi HTTP 503 và 429.<br>• Xác minh Polly kích hoạt cơ chế retry thành công và không gây crash ứng dụng. |

---

## 🧪 2. MA TRẬN KIỂM THỬ FRONTEND (NEXT.JS - VITEST)

| Phạm vi kiểm thử | File Test | Mục tiêu kiểm thử |
| :--- | :--- | :--- |
| **Tiện ích Thời Gian** | `time.test.ts` | Chuyển đổi giây $\leftrightarrow$ mm:ss và định dạng hiển thị. |
| **Binary Search Client** | `binary-search.test.ts` | Tra cứu $O(\log N)$ câu hát đang phát trên trình duyệt. |
| **Bảo mật Content Security** | `security.test.ts` | Sanitize XSS, kiểm tra an toàn localStorage quota (<2MB). |
| **Bộ Xuất File** | `export.test.ts`, `lrc.test.ts` | Xuất TXT, LRC, SRT, Clipboard sạch sẽ không lỗi font. |
| **Phát Âm Ngôn Ngữ Gốc** | `speech.test.ts` | Ánh xạ chính xác locale (`zh-CN`, `ja-JP`, `ko-KR`, `en-US`). |

---

## 🚀 3. LỆNH CHẠY KIỂM THỬ TOÀN BỘ HỆ THỐNG

1. **Kiểm thử Backend .NET 8:**
   ```powershell
   dotnet test backend/LyricPhonics.sln
   ```
2. **Kiểm thử Frontend Next.js:**
   ```powershell
   cd frontend
   npm run test
   ```
