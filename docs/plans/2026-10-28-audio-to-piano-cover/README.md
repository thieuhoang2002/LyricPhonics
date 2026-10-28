# Kế Hoạch Triển Khai: Tính Năng Chuyển Nhạc Sang Piano Cover & Tải MIDI (Audio-to-Piano Studio)

> **Mục tiêu:** Cho phép người dùng tải lên tệp âm thanh (`.mp3`, `.wav`, `.m4a` $\le$ 25MB), hệ thống AI tự động phân tích và chuyển đổi thành bản hòa âm Piano trực quan (Falling Notes / Piano Roll Visualizer tương tự Synthesia) kèm vòng hợp âm, cho phép nghe thử với âm thanh đàn Grand Piano chân thực (SoundFont) và **tải về tệp MIDI (`.mid`) hoặc tệp âm thanh Piano (`.wav`/`.mp3`)** để đưa vào các phần mềm làm nhạc (DAW: FL Studio, Ableton, Logic Pro...).  
> **Credit Policy:** Dùng chung hạn mức `SongCredits` của tài khoản, tích hợp luồng xác nhận chống trừ nhầm lượt.

---

## 1. Phân Tích Công Nghệ & Kiến Trúc (Architecture & Tech Stack)

### 1.1. Backend (.NET 8 Clean Architecture)
- **Công nghệ chính:** ASP.NET Core .NET 8 Minimal API, Google Gemini Multimodal Audio API (hoặc Audio Transcription DSP), System.Text.Json, EF Core PostgreSQL (Neon DB).
- **Core Engine:**
  - `IPianoTranscriptionService`: Interface trong `LyricPhonics.Application`.
  - `GeminiPianoTranscriptionService`: Triển khai trong `LyricPhonics.Infrastructure`, gửi audio stream trực tiếp lên Gemini File API (zero-buffering, chống tràn LOH).
  - Prompt AI chuyên biệt phân tích:
    1. **BPM & Key Signature** (ví dụ: 120 BPM, C Major / A Minor).
    2. **Cấu trúc bài hát (Song Sections):** `Intro`, `Verse`, `Chorus`, `Interlude`, `Outro` kèm mốc thời gian millisecond.
    3. **Vòng hợp âm thời gian thực (Chord Progression):** Danh sách hợp âm theo từng ô nhịp (ví dụ `[00:00 - 00:04]: A#m7`, `[00:04 - 00:08]: F#maj7`).
    4. **Sự kiện nốt nhạc (Note Events):** Danh sách các nốt cho tay phải (Melody) và tay trái (Bass/Chords): `{ pitch (MIDI 21-108), startTime, duration, velocity }`.
- **Thư viện tạo file MIDI chuẩn phía Backend/Frontend:**
  - Backend hoặc Frontend sử dụng bộ chuyển đổi Note Events sang binary Standard MIDI File format (SMF Type 0/1) với các track riêng biệt (Melody Track, Chords Track, Marker/Tempo Track).

### 1.2. Frontend (Next.js 14 App Router, Web Audio API, Canvas)
- **Mô phỏng đàn & nốt rơi (Falling Notes Piano Roll):**
  - **HTML5 Canvas 60fps:** Sử dụng `requestAnimationFrame` render các thanh nốt nhạc rơi từ trên xuống theo trục thời gian, đổi màu theo tay trái (Gold) và tay phải (Coral/Red), hiển thị tên nốt (`C#`, `Eb`, `B`) và số ngón tay (`1-5`).
  - **Interactive Keyboard (88/61 phím):** Bàn phím ảo mô phỏng phím ngà và phím mun, phát sáng gradient khi nốt nhạc chạm vào vạch gõ (Strike Line).
- **Phát âm thanh Piano chân thực (Realistic SoundFont Engine):**
  - Sử dụng **`midi-js-soundfonts`** (`acoustic_grand_piano-mp3.js`) kết hợp Web Audio API.
  - Tải trước các mẫu âm thanh đàn Concert Grand Piano chất lượng cao, trigger nốt mượt mà theo velocity và thời gian thực, không gây trễ (zero-latency).
- **Bộ công cụ điều khiển luyện tập:**
  - Chọn tốc độ: `0.5x`, `0.75x`, `1.0x`, `1.25x` (hỗ trợ tập đàn).
  - Nhảy nhanh đến các đoạn: `Intro`, `Verse`, `Chorus`, `Outro`.
  - Chế độ lặp lại một đoạn (Loop section).
- **Bộ xuất dữ liệu 1-Click (Export Suite):**
  - **Tải file MIDI (`.mid`):** Dùng trực tiếp cho DAW (FL Studio, Ableton, Logic, Cubase) hoặc phần mềm chép nhạc (MuseScore, Sibelius).
  - **Tải file Audio Piano (`.wav` / `.mp3`):** Render âm thanh từ SoundFont qua `OfflineAudioContext` để tải về nghe hoặc lồng vào video CapCut/Premiere.
  - **Bản phổ hợp âm (`.txt`):** Lời bài hát kèm ký hiệu hợp âm.

---

## 2. Thiết Kế Flow Tránh Nhầm Lẫn & Tránh Mất Credit Oan

```mermaid
flowchart TD
    A["👤 Người dùng tải file (.mp3, .wav, .m4a <= 25MB)"] --> B["🔍 Client kiểm tra định dạng & thời lượng"]
    B --> C["📋 Hiện Modal: 'Xác Nhận Chuyển Đổi Sang Piano Cover'"]
    C -->|Bấm Hủy| D["❌ Hủy bỏ - 0 Credit bị trừ - File giữ nguyên"]
    C -->|Bấm Xác Nhận (1 Lượt)| E["🚀 Gọi API: POST /api/piano/transcribe"]
    E --> F{"Kiểm tra Credit (> 0)?"}
    F -->|Hết lượt| G["⚠️ Báo hết lượt, mở Modal Nạp Credit"]
    F -->|Còn lượt| H["🤖 AI bóc tách nốt MIDI, Hợp âm & Đoạn bài hát"]
    H --> I{"Xử lý thành công?"}
    I -->|Thất bại/Lỗi mạng| J["❌ Báo lỗi - HOÀN TOÀN KHÔNG TRỪ CREDIT"]
    I -->|Thành công| K["💳 Trừ 1 Credit - Lưu Project vào Database & Local"]
    K --> L["🎹 Mở Giao diện Piano Roll 60fps & Cho phép tải .MID / .WAV"]
```

---

## 3. Lộ Trình Triển Khai (Implementation Phases)

### Phase 1: Backend Domain, Entities & Gemini Piano Endpoint
- Bổ sung `PianoTrackEntity` (hoặc mở rộng `TrackEntity`) trong `LyricPhonics.Domain` để lưu `NotesJson`, `ChordsJson`, `SectionsJson`, `Bpm`, `KeySignature`.
- Tạo Interface `IPianoService` trong `LyricPhonics.Application`.
- Triển khai `GeminiPianoService` trong `LyricPhonics.Infrastructure` dùng Gemini File API phân tích nốt và hòa âm.
- Tạo Endpoint `POST /api/piano/transcribe` trong `LyricPhonics.Api` với kiểm tra credit an toàn (`DeductCreditAsync` chỉ khi thành công).

### Phase 2: Frontend Audio-to-Piano Dropzone & Flow Xác Nhận
- Thêm Tab chuyển đổi giữa **"Lời & Phiên Âm Cover"** và **"Piano Cover & MIDI"** trên giao diện chính.
- Dropzone validation: chỉ nhận `.mp3`, `.wav`, `.m4a` và $\le$ 25MB.
- Modal xác nhận trước khi trừ lượt với thông tin chi tiết: Tên bài, thời lượng, số credit hiện có và cam kết bảo toàn credit nếu có lỗi.

### Phase 3: SoundFont Player & Canvas Piano Roll Visualizer
- Tích hợp SoundFont Acoustic Grand Piano (`midi-js-soundfonts`) qua Web Audio API.
- Xây dựng component `PianoRollVisualizer.tsx`:
  - Canvas 60fps nốt rơi có tên nốt và ngón tay.
  - Bàn phím đàn 61/88 phím với hiệu ứng phát sáng khi nốt chạm phím.
  - Floating Badge hiển thị hợp âm hiện tại (ví dụ: `A#m7`).
  - Thanh chọn phân đoạn bài hát (`Intro`, `Verse`, `Chorus`, `Outro`).
  - Nút Play/Pause, tua thời gian, thanh chỉnh tốc độ (0.5x - 1.5x) và loop.

### Phase 4: Bộ Xuất Dữ Liệu (MIDI `.mid` & Audio `.wav`) & Lưu Trữ
- Xây dựng tiện ích tạo file MIDI nhị phân chuẩn Type 1 (`@tonejs/midi` hoặc `midi-writer-js`).
- Render âm thanh Piano offline sang `.wav` bằng `OfflineAudioContext`.
- Bổ sung nút **`[Tải MIDI (.mid)]`** và **`[Tải Audio Piano (.wav)]`**.
- Lưu trữ bản ghi Piano vào IndexedDB trên máy và Cloud Database để xem lại bất cứ lúc nào.
