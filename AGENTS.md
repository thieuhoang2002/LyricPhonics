# AGENTS.md — MANDATORY CODING RULES & ARCHITECTURAL GUARDRAILS (.NET 8 & NEXT.JS)

> **Mục tiêu:** Tài liệu quy chuẩn kỹ thuật bắt buộc cho toàn bộ AI Coding Assistants và Nhà phát triển.  
> **Cương vị:** Principal Software Architect  
> **Hiệu lực:** BẮT BUỘC & TUÂN THỦ 100%. Áp dụng cho cả C# .NET 8 LTS (Backend) và Next.js (Frontend).  

---

## 🚨 MISSION CRITICAL GROUND RULES (.NET 8 BACKEND)

Mọi đoạn mã C# viết cho hệ thống **LyricPhonics Backend** phải tuân thủ nghiêm ngặt các quy tắc kiến trúc và hiệu năng dưới đây:

### 1. Kiến Trúc Chuẩn Clean Architecture (Tách bạch 4 tầng)
- **`LyricPhonics.Domain`:** Chứa Entities, Value Objects, Enums, DTOs cơ bản. **CẤM** phụ thuộc vào bất kỳ thư viện bên ngoài hay tầng nào khác.
- **`LyricPhonics.Application`:** Chứa Interfaces (`ITranscriptionService`, `ILrcService`), Use Cases và Business Logic. Chỉ phụ thuộc vào `Domain`.
- **`LyricPhonics.Infrastructure`:** Chứa triển khai dịch vụ ngoài: `GeminiTranscriptionService`, `HttpClient`, Polly Resilience Handler, Logging. Chỉ phụ thuộc vào `Application` và `Domain`.
- **`LyricPhonics.Api`:** Chứa ASP.NET Core Minimal API Endpoints, Middleware (CORS, Rate Limiting, Exception Handling), Swagger. Phụ thuộc vào `Infrastructure`, `Application`, `Domain`.
- **`LyricPhonics.Tests`:** Chứa toàn bộ xUnit Unit Tests, kiểm thử tự động với `FluentAssertions` và `Moq`.

### 2. Tối Ưu Hiệu Năng & Bộ Nhớ Trong C# (Performance & Memory First)
- **CẤM BUFFER TOÀN BỘ FILE VÀO MẢNG BYTE (`byte[]`):**
  - Không bao giờ dùng `BinaryReader.ReadBytes()` hoặc `File.ReadAllBytes()` cho file âm thanh lớn.
  - BẮT BUỘC dùng **`Stream`** (`IFormFile.OpenReadStream()`, `StreamContent`) để truyền trực tiếp dữ liệu âm thanh dạng stream sang Google Gemini API.
- **TỐI ƯU CẤP PHÁT BỘ NHỚ (ZERO/LOW-ALLOCATION):**
  - Sử dụng `ReadOnlySpan<char>` khi parse chuỗi thời gian hoặc cắt chuỗi LRC `[mm:ss.xx]`, tránh gọi `string.Split()` tạo rác cho Garbage Collector (GC).
  - Sử dụng C# 12 `record` (immutable data structures) cho các DTOs.
  - Sử dụng `System.Text.Json` thuần (không dùng `Newtonsoft.Json`), cấu hình serialize/deserialize strongly typed. Tuyệt đối **CẤM DÙNG KIỂU `dynamic` HOẶC `object`**.
- **TRA CỨU DÒNG LỜI THỜI GIAN THỰC $O(\log N)$:**
  - Danh sách `LyricLine` luôn được sắp xếp theo `StartTime`.
  - Tìm kiếm câu hát theo `currentTime` phải dùng thuật toán **Binary Search $O(\log N)$**, không dùng vòng lặp tuyến tính $O(N)$ lặp liên tục.

### 3. Kháng Lỗi & Phục Hồi Tự Động (Resilience & Fault Tolerance với Polly)
- Mọi kết nối HTTP ra bên ngoài (Gemini API) BẮT BUỘC phải đăng ký qua `IHttpClientFactory` kết hợp `Microsoft.Extensions.Http.Resilience` (Polly).
- Tự động bắt mã lỗi `503 Service Unavailable` và `429 Too Many Requests` để Retry theo thuật toán **Exponential Backoff with Jitter** trước khi trả lỗi về Client.

### 4. Cách Ly 100% Bí Mật & API Key (Zero Secret Leakage)
- `GEMINI_API_KEY` chỉ được đọc từ:
  1. Biến môi trường hệ thống (`Environment.GetEnvironmentVariable("GEMINI_API_KEY")`).
  2. `IConfiguration["GEMINI_API_KEY"]` từ file `appsettings.Development.json` (đã gitignore).
- **TUYỆT ĐỐI CẤM:** Không hardcode API key vào code C#, không commit file có chứa key thật lên Git repository. File `appsettings.json` chỉ chứa placeholder rỗng.

### 5. Tiêu Chuẩn Chú Thích Mã Nguồn Cho Mục Tiêu Học Tập & Phỏng Vấn
- Mọi class, interface, method cốt lõi phải có **XML Documentation Comments (`/// <summary>`)** và chú thích tiếng Việt có dấu chi tiết, giải thích rõ:
  - Mục đích thiết kế (Design Pattern: DI, Strategy, Decorator...).
  - Tại sao dùng cú pháp này (Ví dụ: `IFormFile`, `async/await`, `CancellationToken`, `Stream`, `Polly`).
  - Điểm nổi bật để tự tin trả lời phỏng vấn kỹ thuật.

---

## 🎨 FRONTEND GUARDRAILS (NEXT.JS)

- Mã nguồn nằm độc lập trong thư mục `frontend/`.
- Sử dụng Next.js App Router, TypeScript Strict Mode (`strict: true`, zero `any`), Tailwind CSS.
- Đồng bộ Karaoke bằng `requestAnimationFrame` 60fps qua `useAudioPlayer` và `useLyricSync`.
- Gọi API Backend C# qua biến môi trường `NEXT_PUBLIC_API_URL` (mặc định: `http://localhost:5000`).
