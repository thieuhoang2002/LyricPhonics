# Kế Hoạch Triển Khai: Studio-Grade Audio-to-Piano Transcription & MIDI Suite

> **Mục tiêu:** Chuyển đổi tệp âm thanh (`.mp3`, `.wav`, `.m4a` $\le$ 25MB) thành bản hòa âm Piano chuẩn phòng thu (Studio Grade) với độ chính xác cao nhất thế giới (High-Resolution CRNN), ghi nhận đầy đủ lực gõ phím (Velocity 0-127) và Bàn đạp giữ âm (Sustain Pedal).  
> **Bộ phát âm thanh:** Đại dương cầm Yamaha C5 Concert Grand Piano (Salamander multi-sample acoustic recordings) kết hợp Concert Hall Convolution Reverb Matrix và 3D Stereo Stage Panning.  
> **Chiến lược nhánh:** Tính năng phát triển và vận hành cục bộ trên nhánh **`dev`** trước để người dùng kiểm thử trực tiếp trên máy; nhánh **`main`** giữ nguyên bản ổn định phục vụ tính năng Lyric & Phonics trên Render.

---

## 1. Kiến Trúc Hệ Thống (Architecture & Tech Stack)

### 1.1. Python AI Microservice (`services/piano-transcription-service/`)
- **Mô hình cốt lõi:** **ByteDance High-Resolution Piano Transcription with Pedals** (`piano-transcription-inference`).
  - Mạng tích chập sâu CRNN được huấn luyện trên dataset MAESTRO.
  - Phân giải onset/offset theo mili-giây, bắt trọn vẹn cả nốt đơn, hợp âm 10 ngón, arpeggio tốc độ cao và pedal đạp/nhả.
  - Thời gian xử lý: ~1-2 giây (GPU) hoặc ~4-6 giây (CPU đa luồng).
- **Giao diện API:** FastAPI (port 8000) với endpoints:
  - `GET /health`: Kiểm tra trạng thái GPU/CPU và model.
  - `POST /transcribe`: Nhận stream tệp âm thanh, trả về JSON cấu trúc `PianoTranscriptionResult`.

### 1.2. Backend (.NET 8 Clean Architecture)
- **Interface:** `IPianoTranscriptionService` trong `LyricPhonics.Application`.
- **Implementation:** `ByteDancePianoTranscriptionService` trong `LyricPhonics.Infrastructure`.
  - Kết nối HttpClient trực tiếp tới Python AI Microservice (Zero-LOH, truyền phát Stream).
  - Tự động bắt lỗi kết nối khi chưa bật Python service và đưa ra hướng dẫn chạy `run.bat`.
- **API Endpoint:** `POST /api/piano/transcribe` trong `LyricPhonics.Api` với kiểm tra credit an toàn (`DeductCreditAsync` chỉ khi thành công).

### 1.3. Frontend (Next.js 14 App Router, Web Audio API, Canvas 60fps)
- **Acoustic Audio Engine:** Yamaha C5 Grand Piano với 30 mẫu âm thanh studio trong `public/audio/salamander/`, Reverb thính phòng (`ConvolverNode`), Dynamic Velocity Filter (1.8kHz - 18kHz) và mô phỏng ngân pedal tự nhiên.
- **Visualizer:** Canvas 60fps mô phỏng Synthesia (nốt rơi đổi màu theo tay trái/phải, bàn phím 88/61 phím phát sáng khi chạm phím).
- **Export Suite:** Xuất file Standard MIDI (`.mid`) đa bè và xuất file Lossless Audio Piano (`.wav`).

---

## 2. Hướng Dẫn Khởi Động Local

1. **Khởi chạy Python AI Service:**
   ```bash
   cd services/piano-transcription-service
   run.bat
   ```
2. **Khởi chạy .NET 8 Backend:**
   ```bash
   dotnet run --project backend/src/LyricPhonics.Api
   ```
3. **Khởi chạy Next.js Frontend:**
   ```bash
   npm --prefix frontend run dev
   ```
