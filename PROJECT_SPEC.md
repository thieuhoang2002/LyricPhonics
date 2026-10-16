# PROJECT SPECIFICATION: LYRICPHONICS (PHONETIK)

> **Document Version:** 1.0.0  
> **Status:** Approved / Active Baseline  
> **Author:** Principal Software Architect  
> **Target Audience:** Engineering Team, AI Agents, Product Stakeholders  

---

## 1. Executive Summary & Vision

**LyricPhonics** là nền tảng web ứng dụng trí tuệ nhân tạo đa phương thức (Multimodal Audio AI) giúp người yêu âm nhạc, ca sĩ cover, TikTokers và Content Creators có thể hát bất kỳ bài hát tiếng nước ngoài nào (Trung Quốc, Hàn Quốc, Nhật Bản, Anh, Thái Lan...) bằng cách tự động bóc tách và tạo lời phiên âm bồi sang tiếng Việt chuẩn khẩu hình và nhịp phách bài hát.

Ứng dụng giải quyết triệt để rào cản ngôn ngữ khi hát nhạc quốc tế, biến quá trình tìm kiếm và chép lời bồi thủ công (mất 30–60 phút/bài với độ chính xác kém) thành trải nghiệm tự động hóa 1-click trong vòng chưa đầy 15 giây.

---

## 2. Market Problem & Value Proposition

### 2.1. Nỗi đau thị trường (Market Pain Points)
1. **Rào cản chữ viết & phát âm:** Người nghe nhạc mê mẩn các giai điệu Kpop, Jpop/Anime, nhạc Douyin/TikTok Trung Quốc nhưng không biết Hán tự, Pinyin, Romaji, hay Hangul.
2. **Lời bồi thủ công rời rạc & sai nhịp:** Các bản phiên âm "lời bồi" trên mạng thường do cá nhân tự gõ, không ngắt theo đúng nhịp thở/phách của ca sĩ, và hầu hết các bài hát mới ra mắt đều chưa có lời bồi.
3. **Chưa có công cụ tự động hóa:** Thị trường chưa có giải pháp chuyên biệt cho phép nạp trực tiếp file âm thanh/video để sinh ra lời phiên âm song ngữ đồng bộ kèm timestamp chuẩn Karaoke.

### 2.2. Định vị giá trị cốt lõi (Core Value Proposition)
- **Tốc độ:** Xử lý bài hát 3–5 phút chỉ trong 5–15 giây nhờ kiến trúc Gemini Flash Audio Engine.
- **Chuẩn nhịp (Time-synchronized):** Mỗi câu hát đều gắn mốc thời gian `[startTime, endTime]`, đồng bộ realtime với trình phát nhạc.
- **Ngữ âm tự nhiên (Natural Vietnamese Phonetics):** Phiên âm bồi theo thanh điệu tiếng Việt (ví dụ: *"Wo ai ni"* $\to$ *"Ủa ai nỉ"*), giúp người dùng hát đúng cao độ và khẩu hình ngay lần đầu tiên.
- **Tiện ích sáng tạo nội dung:** Xuất 1-click ra file `.lrc` / `.srt` để nạp ngay vào CapCut, Premiere làm video karaoke/cover TikTok triệu view.

---

## 3. User Personas & User Flow

### 3.1. Chân dung người dùng mục tiêu
- **TikTok Creator / Cover Singer:** Cần học nhanh một bài nhạc trend tiếng Trung/Hàn trong 5 phút để quay video ngắn.
- **Karaoke Enthusiast:** Thích giao lưu hát karaoke cùng bạn bè nhưng không thuộc tiếng nước ngoài.
- **Language & Music Learner:** Vừa muốn nghe nhạc vừa muốn hiểu đại ý lời bài hát qua bản dịch tóm tắt.

### 3.2. Luồng trải nghiệm người dùng (End-to-End User Flow)

```
[1. Truy cập Web]
       │
       ▼
[2. Kéo thả File Âm thanh/Video] (MP3, WAV, M4A, MP4 <= 20MB)
       │
       ▼
[3. AI Processing Pipeline] (Xử lý âm thanh đa phương thức qua Server Route)
       │
       ▼
[4. Không gian làm việc Karaoke Workspace]
       ├── [Audio Player] (Play/Pause, Seek, Tốc độ 0.75x - 1.25x)
       ├── [Realtime Karaoke View] (Highlight câu đang hát 60fps, Auto-scroll)
       └── [Inline Editor] (Click sửa chữ, Tinh chỉnh timeline +/- 0.5s)
       │
       ▼
[5. Xuất bản 1-Click] (Copy Clipboard, Tải .TXT, Tải Karaoke .LRC, Tải Phụ đề .SRT)
```

---

## 4. Functional Requirements (Core MVP Scope)

### FR-01: Bộ tải tệp đa định dạng (Media Ingestion)
- Chấp nhận các định dạng media: `.mp3`, `.wav`, `.m4a`, `.mp4`.
- Dung lượng tối đa: 20MB.
- Client-side validation: Kiểm tra MIME type và dung lượng trước khi gửi lên server.
- Trích xuất luồng âm thanh nguyên bản, tạo local Object URL cho audio player mà không lưu trữ file thừa trên máy chủ.

### FR-02: AI Multimodal Audio Engine (Phonetics Extraction)
- Sử dụng Google Gemini 2.5 Flash / Flash Lite thông qua `@google/genai` SDK.
- Toàn bộ lời gọi API được bảo vệ nghiêm ngặt ở Server-side Route Handler (`/api/transcribe`).
- System prompt chuyên dụng về ngữ âm học:
  1. Tách dòng theo đúng nhịp ngắt nghỉ của câu hát (phách nhạc).
  2. Xuất dữ liệu song ngữ 3 tầng:
     - Tầng 1: Lời gốc (Hán tự, Hangul, Kanji, English, Thai...).
     - Tầng 2: Phiên âm tiếng Việt bồi chuẩn dấu thanh và khẩu hình.
     - Tầng 3: Nghĩa tiếng Việt vắn tắt của câu.
  3. Gán mốc thời gian bắt đầu (`startTime`) và kết thúc (`endTime`) tính bằng giây cho từng câu.
- Ép kiểu đầu ra bằng Gemini Structured Outputs (`responseSchema`).

### FR-03: Trình phát nhạc & Hiển thị Karaoke 60fps (Synchronized Audio Player)
- Trình phát nhạc HTML5 Audio tích hợp điều khiển: Play/Pause, thanh tua (seek slider), hiển thị thời gian thực, điều chỉnh tốc độ phát lại (0.75x, 1.0x, 1.25x).
- Tích hợp `requestAnimationFrame` đồng bộ vị trí audio với danh sách câu hát ở tần số 60fps.
- Highlight câu đang phát sáng rõ, tự động cuộn (auto-scroll) câu đang hát vào trọng tâm màn hình.
- Click-to-seek: Nhấp vào bất kỳ câu nào trong danh sách, trình phát lập tức nhảy đến `startTime` của câu đó.

### FR-04: Trình biên tập trực tiếp & Tinh chỉnh chính xác (Inline Editor & Micro-adjustment)
- Người dùng có thể nhấp đúp/click trực tiếp vào từng câu để sửa lại chữ gốc, phiên âm tiếng Việt hoặc nghĩa nếu AI nhận diện chưa chuẩn.
- Cung cấp nút tinh chỉnh mốc thời gian câu hát:
  - Nút `-0.5s` và `+0.5s` để dịch chuyển mốc bắt đầu.
  - Nút `Set to Current Time`: Gán ngay thời điểm bài hát đang phát làm mốc bắt đầu của câu.

### FR-05: Xuất dữ liệu 1-Click (Multi-format Export Engine)
- **Copy Clipboard:** Sao chép định dạng text phân tách rõ ràng kèm emoji tiện lợi.
- **Tải file `.txt`:** Bản in/đọc sạch đẹp cho thiết bị di động.
- **Tải file `.lrc`:** Định dạng Karaoke tiêu chuẩn `[mm:ss.xx]` tương thích với mọi app nghe nhạc và plugin karaoke.
- **Tải file `.srt`:** Định dạng phụ đề chuẩn cho CapCut / Premiere.

---

## 5. Non-Functional Requirements (NFR)

| Tiêu chí | Đặc tả kỹ thuật |
| :--- | :--- |
| **Hiệu năng & Thuật toán** | Mọi thuật toán tìm kiếm dòng lời theo thời gian phải đạt $O(\log n)$ (Binary Search) hoặc $O(1)$ thay vì duyệt tuần tự $O(n)$ ở mỗi frame render. Tuyệt đối không lồng vòng lặp $O(n^2)$. |
| **Bảo mật (Security)** | Zero API Key leakage: `GEMINI_API_KEY` chỉ đọc qua `process.env` ở phía server. Sanitize 100% dữ liệu text trả về từ AI để ngăn ngừa XSS và Prompt Injection. |
| **Bộ nhớ & Lưu trữ** | Giới hạn `localStorage` chỉ lưu JSON metadata & lyrics. Tuyệt đối không lưu audio blob/base64 vào storage trình duyệt để tránh `QuotaExceededError`. |
| **Độ trễ phản hồi (Latency)** | Next.js Route Handler cấu hình `maxDuration = 60s`. Sử dụng Google AI File API (`ai.files.upload`) cho file lớn để tránh lỗi 413 Payload Too Large. |
| **Khả năng đáp ứng (Responsive)** | Tương thích hoàn hảo từ màn hình điện thoại (Mobile viewport 375px) đến máy tính để bàn (Desktop 1920px). |

---

## 6. Out of Scope for Phase 1 (Core MVP)
- Hệ thống đăng ký / đăng nhập (Auth).
- Cơ sở dữ liệu người dùng đám mây (Database / Supabase).
- Cổng thanh toán chuyển khoản tự động VietQR (SePay / Casso).
- Trích xuất tự động qua link TikTok / YouTube URL.
