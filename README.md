<div align="center">

# 🎵 LyricPhonics
### AI Multimodal Audio Phonics Cover Engine & Synchronized Lyric Workspace

[![.NET 8 LTS](https://img.shields.io/badge/.NET-8.0_LTS-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![C# 12](https://img.shields.io/badge/C%23-12-239120?logo=csharp&logoColor=white)](https://learn.microsoft.com/en-us/dotnet/csharp/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Polly v8](https://img.shields.io/badge/Resilience-Polly_v8-blue)](https://github.com/App-vNext/Polly)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean_Architecture-orange)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Bóc tách lời bài hát quốc tế (Trung, Hàn, Nhật, Anh, Thái...) sang phiên âm tiếng Việt bồi chuẩn khẩu hình và thanh điệu để người dùng tự tin hát cover ngay lần đầu tiên.*

</div>

---

## 🌟 GIỚI THIỆU BÀI TOÁN & GIẢI PHÁP

Nhiều người yêu âm nhạc rất muốn cover các ca khúc quốc tế thịnh hành trên TikTok/YouTube nhưng gặp rào cản:
1. **Không biết đọc chữ tượng hình** (chữ Hán, Hanja, Kana...).
2. **Pinyin / Romaja truyền thống** không có thanh điệu tự nhiên của tiếng Việt, dẫn đến hát gượng gạo, lệch phách.
3. **Các bản dịch trên mạng không có mốc thời gian (timestamp)**, không biết điểm vào nhạc và ngắt nghỉ hơi.

**LyricPhonics** giải quyết trọn vẹn bài toán này bằng công nghệ **AI Multimodal Audio** kết hợp hệ thống **Backend ASP.NET Core .NET 8 LTS** chuẩn **Clean Architecture** và **Frontend Next.js** đồng bộ 60fps.

---

## 🏛️ KIẾN TRÚC HỆ THỐNG (CLEAN ARCHITECTURE MONOREPO)

```mermaid
graph TD
    User["👤 Người dùng / TikTok Creator"] -->|Trình duyệt| FE["💻 Frontend (Next.js 14 App Router)"]
    FE -->|Karaoke 60fps| Player["🎵 useAudioPlayer (HTML5 Audio + rAF)"]
    FE -->|Tìm kiếm O(log N)| Sync["⚡ useLyricSync (Binary Search)"]
    FE -->|Multipart Stream| API["🚀 LyricPhonics.Api (.NET 8 Minimal API)"]
    
    subgraph "Backend (.NET 8 LTS Clean Architecture)"
        API -->|Dependency Injection| App["📦 LyricPhonics.Application"]
        App -->|Interfaces| Domain["💎 LyricPhonics.Domain (Records & Enums)"]
        Infra["⚙️ LyricPhonics.Infrastructure"] -->|Implements| App
        Infra -->|Uses| Domain
        Infra -->|Polly v8 Resilience| HTTPClient["🌐 Typed HttpClient"]
    end

    HTTPClient -->|Base64 Audio Stream| Gemini["🤖 Google Gemini 3.5 Flash Audio API"]
```

---

## ⚡ CÁC TÍNH NĂNG NỔI BẬT

### 1. Bóc Tách 3 Tầng Chuẩn Xác (3-Tier Output)
- **Tầng 1 (Original Text):** Lời bài hát bằng chữ viết gốc.
- **Tầng 2 (Phonetic Cover Text):** Phiên âm tiếng Việt bồi **chuẩn khẩu hình và dấu thanh** theo từng phách ngắt nghỉ của ca sĩ (Ví dụ: `徒余明月忆往昔` $\to$ `Thú xuy mính uế i oảng xí`).
- **Tầng 3 (Translation Text):** Nghĩa tiếng Việt vắn tắt, giàu chất thơ.

### 2. Trình Phát Karaoke Đồng Bộ 60fps & Micro-Adjustment
- Đồng bộ câu hát với nhạc qua vòng lặp `requestAnimationFrame` 60fps mượt mà, không giật lag.
- **Thuật toán Binary Search $O(\log N)$:** Định vị câu hát theo mili-giây, xử lý danh sách $10.000$ câu trong chưa đầy $1\text{ms}$.
- Công cụ **tinh chỉnh timeline $\pm 0.5s$** và sửa chữ trực tiếp trên giao diện.

### 3. Phát Âm Bản Xứ Chuẩn (Native Speech Synthesis)
- Tích hợp Web Speech API giúp người dùng bấm nút **[🔊 Phát âm]** để nghe giọng đọc bản xứ chuẩn (Bắc Kinh, Tokyo, Seoul...) phục vụ luyện phát âm từng từ.

### 4. Xuất Tệp 1-Click Đa Định Dạng
- **`.LRC`:** File Karaoke tiêu chuẩn nạp vào các app nghe nhạc.
- **`.SRT`:** File phụ đề video khớp mốc thời gian import thẳng vào **CapCut** hoặc **Adobe Premiere** để dựng video cover.
- **`.TXT`:** File lời song ngữ in ra hoặc đọc trên điện thoại.
- **`Clipboard`:** Sao chép nhanh kèm emoji trực quan.

---

## 🛠️ CẤU TRÚC MÃ NGUỒN (DIRECTORY MAP)

```text
LyricPhonics/
├── AGENTS.md                  # Quy tắc bắt buộc về Big-O, Memory, Clean Architecture
├── PROJECT_SPEC.md            # Đặc tả bài toán & Yêu cầu phi chức năng
├── TECHSTACK.md               # Danh mục công nghệ chuẩn
├── TODO.md                    # Roadmap & Tiến độ các Sprint
├── CHANGELOG.md               # Nhật ký phiên bản chuẩn Keep a Changelog
├── TESTING_PLAN.md            # Ma trận kiểm thử tự động
│
├── frontend/                  # GIAO DIỆN CLIENT (NEXT.JS 14)
│   ├── src/
│   │   ├── app/               # App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/        # AudioDropzone, LyricView, AudioPlayerBar, ExportToolbar
│   │   ├── hooks/             # useAudioPlayer (60fps rAF), useLyricSync (O(log N))
│   │   ├── lib/               # Export utilities, Security (XSS sanitize), Speech
│   │   └── types/             # TypeScript interfaces
│   └── package.json
│
└── backend/                   # MÁY CHỦ XỬ LÝ (.NET 8 LTS)
    ├── LyricPhonics.sln       # Visual Studio Solution
    ├── src/
    │   ├── LyricPhonics.Domain/          # Models (LyricLine, TranscriptionResult)
    │   ├── LyricPhonics.Application/     # ITranscriptionService, LrcService, BinarySearchService
    │   ├── LyricPhonics.Infrastructure/  # GeminiTranscriptionService (Polly Resilience v8)
    │   └── LyricPhonics.Api/             # Minimal API Endpoints, Middleware, Swagger UI
    └── tests/
        └── LyricPhonics.Tests/           # xUnit Unit Tests (100% Pass)
```

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY (QUICKSTART)

### Yêu Cầu Môi Trường
- **.NET 8 SDK** (hoặc .NET 10 SDK có bật RollForward)
- **Node.js 18+** & **npm**
- **Google Gemini API Key** (Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey))

---

### Bước 1: Khởi Chạy Backend (.NET 8 Web API)

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend/src/LyricPhonics.Api
   ```
2. Cấu hình API Key trong file `appsettings.Development.json` (hoặc set biến môi trường):
   ```json
   {
     "Gemini": {
       "ApiKey": "YOUR_GEMINI_API_KEY_HERE"
     }
   }
   ```
3. Khởi chạy máy chủ:
   ```bash
   dotnet run
   ```
   👉 Máy chủ Backend sẽ lắng nghe tại: **`http://localhost:5000`**  
   👉 Tài liệu Swagger UI: **`http://localhost:5000/swagger`**

---

### Bước 2: Khởi Chạy Frontend (Next.js)

1. Mở một terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt dependencies (nếu chưa có):
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng Next.js:
   ```bash
   npm run dev
   ```
   👉 Mở trình duyệt tại: **`http://localhost:3000`**

---

## 🧪 CHẠY KIỂM THỬ TỰ ĐỘNG (AUTOMATED TESTS)

Hệ thống sở hữu ma trận kiểm thử tự động toàn diện:

1. **Kiểm thử Backend (xUnit + FluentAssertions + Moq):**
   ```bash
   dotnet test backend/LyricPhonics.sln
   ```
   *Kết quả: 19/19 tests passed (Binary Search $O(\log N)$, LRC parsing, Mock HttpClient Polly).*

2. **Kiểm thử Frontend (Vitest):**
   ```bash
   cd frontend && npm run test
   ```
   *Kết quả: 43/43 tests passed (Time utils, Client Binary Search, Content Security, Export).*

---

## 👤 TÁC GIẢ & BẢN QUYỀN

- **Tác giả:** [Thiều Việt Hoàng](https://github.com/thieuhoang2002)
- **Repository:** [https://github.com/thieuhoang2002/LyricPhonics](https://github.com/thieuhoang2002/LyricPhonics)
- **Giấy phép:** [MIT License](LICENSE)
