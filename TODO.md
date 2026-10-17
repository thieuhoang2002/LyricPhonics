# TODO.md — LYRICPHONICS ROADMAP & SPRINTS (.NET 8 + NEXT.JS)

> **Dự án:** LyricPhonics Monorepo  
> **Kiến trúc:** Clean Architecture (C# .NET 8 LTS + Next.js App Router)  
> **Trạng thái:** Sprint 2 (.NET 8 Backend Migration & Full-Stack Integration)  

---

## 🏁 Milestone 1: Frontend Audio Engine & Synchronized UI (Sprint 1)
*Mục tiêu: Xây dựng giao diện Web Next.js hiện đại, 60fps rAF Karaoke Player và bộ xuất file 1-click.*

- [x] ✅ Khởi tạo Next.js App Router, Tailwind CSS, Lucide React
- [x] ✅ Thuật toán Binary Search $O(\log N)$ định vị câu hát theo thời gian
- [x] ✅ Trình phát nhạc Karaoke đồng bộ 60fps qua `useAudioPlayer` & `useLyricSync`
- [x] ✅ Bộ công cụ tinh chỉnh timeline $\pm 0.5s$ và inline editing
- [x] ✅ Tính năng phát âm giọng bản xứ chuẩn (Web Speech Synthesis API)
- [x] ✅ Bộ xuất file 1-click: TXT, Karaoke LRC, Phụ đề SRT, Clipboard

---

## 🏛️ Milestone 2: C# .NET 8 LTS Backend Clean Architecture (Sprint 2)
*Mục tiêu: Xây dựng máy chủ ASP.NET Core .NET 8 LTS hiệu năng cao chuẩn Clean Architecture phục vụ học tập và phỏng vấn.*

- [x] ✅ Khởi tạo Solution `LyricPhonics.sln` và phân tách 4 project Clean Architecture
- [x] ✅ Tầng Domain (`LyricPhonics.Domain`): Khai báo `LyricLine`, `TranscriptionResult`, `TranscriptionMetadata` bằng C# 12 `record`
- [x] ✅ Tầng Application (`LyricPhonics.Application`): Giao diện `ITranscriptionService`, `ILrcService`, thuật toán Binary Search $O(\log N)$ trong C#
- [x] ✅ Tầng Infrastructure (`LyricPhonics.Infrastructure`): Gọi Google Gemini 3.5 Flash Audio REST API qua `HttpClientFactory` kết hợp `Microsoft.Extensions.Http.Resilience` (Polly)
- [x] ✅ Tầng API (`LyricPhonics.Api`): ASP.NET Core .NET 8 Minimal API (`POST /api/transcribe`), Swagger OpenAPI, CORS Middleware, Rate Limiting
- [x] ✅ Chú thích chi tiết bằng tiếng Việt có dấu về các nguyên lý OOP, SOLID và kỹ thuật C# phục vụ phỏng vấn

---

## 🧪 Milestone 3: Kiểm Thử Tự Động xUnit & Tích Hợp Đầu Cuối (Sprint 3)
*Mục tiêu: Đạt 100% test coverage cho logic cốt lõi và tích hợp Frontend - Backend mượt mà.*

- [x] ✅ Viết unit test xUnit cho Binary Search $O(\log N)$ trong C#
- [x] ✅ Viết unit test xUnit cho LRC parser & generator
- [x] ✅ Viết unit test xUnit cho file validation & security checks
- [x] ✅ Chạy kiểm thử tự động toàn diện: xUnit pass 100% & Vitest pass 100%

---

## 🚀 Milestone 4: Open Source Release & GitHub Portfolio (Sprint 4)
*Mục tiêu: Hoàn thiện tài liệu, GitHub Actions CI/CD và đẩy mã nguồn lên GitHub.*

- [ ] ⬜ Cấu hình Git Remote `origin https://github.com/thieuhoang2002/LyricPhonics.git`
- [ ] ⬜ Chạy review mã nguồn độc lập qua `cf-review`
- [ ] ⬜ Push toàn bộ mã nguồn lên GitHub repository
