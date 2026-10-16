# AUTOMATED TESTING STRATEGY & QUALITY ASSURANCE PLAN

> **Document Version:** 1.0.0  
> **Status:** Active Standard  
> **Author:** Principal Software Architect  
> **Tooling Engine:** Vitest  

---

## 1. Testing Philosophy & Quality Gate

Dự án **LyricPhonics** áp dụng chiến lược kiểm thử đa tầng nghiêm ngặt nhằm đảm bảo:
1. **Độ chính xác tuyệt đối của thời gian (Temporal Precision):** Mọi chuyển đổi giữa giây số thực và định dạng karaoke `[mm:ss.xx]` phải chuẩn xác đến từng mili-giây.
2. **Hiệu năng thuật toán (Big-O Guarantee):** Thao tác tìm dòng câu hát đồng bộ với audio phải đạt $O(\log N)$ (Binary Search) hoặc $O(1)$, không làm tụt FPS khi phát nhạc.
3. **An toàn bảo mật (Defense-in-Depth):** Không bao giờ rò rỉ `GEMINI_API_KEY` ra client bundle và triệt tiêu nguy cơ XSS từ dữ liệu do AI sinh ra.

Mọi Pull Request hoặc commit trước khi release đều phải vượt qua 100% các bộ test tự động (`npm run test`).

---

## 2. Test Architecture & Pyramids

```
         ▲
        / \         Level 3: End-to-End Tests (E2E Verification)
       /   \        - Toàn bộ luồng: Upload -> AI Parse -> Sync Playback -> Export
      /─────\
     /       \      Level 2: Integration Tests (API Route & Schema Validation)
    /         \     - POST /api/transcribe với mock Gemini SDK & Zod validation
   /───────────\
  /             \   Level 1: Unit Tests (Pure Functions & Big-O Verification)
 /               \  - Time conversion, LRC parser, Binary search, Sanitizer
───────────────────
```

---

## 3. Detailed Test Suites

### 3.1. Level 1: Unit Testing (Vitest)

Tập trung kiểm thử các hàm thuần túy (pure functions) tại `src/lib/`:

#### Suite 1.1: Chuyển đổi Thời gian & Định dạng LRC (`src/lib/utils/time.test.ts`)
- **Test cases:**
  - Chuyển đổi `0` giây $\to$ `[00:00.00]`
  - Chuyển đổi `75.32` giây $\to$ `[01:15.32]`
  - Chuyển đổi mốc thời gian lớn hơn 1 giờ `3665.42` giây $\to$ định dạng hợp lệ.
  - Parse chuỗi LRC `[01:15.32]` ngược lại thành `75.32` giây với độ sai số cho phép $\le 0.001$.
  - Xử lý các đầu vào dị thường: số âm, `NaN`, chuỗi timestamp khuyết phần thập phân.

#### Suite 1.2: Thuật toán Tìm kiếm Câu hát Binary Search (`src/lib/utils/binary-search.test.ts`)
- **Mục tiêu:** Đảm bảo độ phức tạp $O(\log N)$ và tìm đúng dòng câu hát đang phát.
- **Test cases:**
  - `currentTime` nằm chính giữa khoảng `[startTime, endTime]` của một câu.
  - `currentTime` trùng chính xác với mốc biên `startTime` hoặc `endTime`.
  - `currentTime` nằm trong khoảng nhạc dạo/ngắt nghỉ giữa 2 câu hát (giữ câu trước đó hoặc trả về trạng thái chờ).
  - Kiểm thử hiệu năng: Mảng gồm $10.000$ dòng lời, thời gian tìm kiếm phải $\le 1\text{ms}$.

#### Suite 1.3: Xuất tệp Đa định dạng (`src/lib/export/*.test.ts`)
- **Test cases:**
  - `exportToTxt`: Xuất đủ 3 tầng thông tin (gốc, phiên âm, nghĩa), không bị dính dòng.
  - `exportToLrc`: Đạt chuẩn format LRC mở được trên các phần mềm Karaoke.
  - `exportToSrt`: Thứ tự index tăng dần (1, 2, 3...), định dạng thời gian `00:01:15,320` chuẩn SRT.

---

### 3.2. Level 2: Integration Testing (API Routes)

Tập trung kiểm thử các API Route Handlers tại `src/app/api/`:

#### Suite 2.1: Route Handler `/api/transcribe` (`src/app/api/transcribe/route.test.ts`)
- **Test cases:**
  - **Happy Path:** Gửi FormData chứa file audio hợp lệ, mock Gemini client trả về JSON thô $\to$ Route handler parse qua Zod và trả về HTTP 200 với đầy đủ mảng `lines`.
  - **Payload Validation:** Gửi file không phải audio/video (ví dụ: `.exe`, `.pdf`) $\to$ Trả về HTTP 400 kèm thông báo lỗi rõ ràng.
  - **File Size Guard:** Gửi file vượt quá 20MB $\to$ Trả về HTTP 413 Payload Too Large trước khi gọi Gemini API.
  - **API Rate Limit / Quota Failure:** Mock Gemini SDK ném lỗi 429 Resource Exhausted $\to$ Route handler bắt lỗi an toàn, trả về HTTP 503 với thông báo hướng dẫn người dùng thử lại sau.

---

### 3.3. Level 3: Security & Content Isolation Testing

#### Suite 3.1: Kiểm tra Cách ly Bí mật & Biến Môi trường (Zero Secrets Leakage)
- **Cơ chế kiểm thử:**
  - Quét toàn bộ mã nguồn phía client bundle (kiểm tra `npm run build` output).
  - Tuyệt đối không xuất hiện chuỗi `AIzaSy...` (Gemini API key pattern) hoặc từ khóa `GEMINI_API_KEY` trong các tệp `.js` sinh ra trong thư mục `.next/static/`.

#### Suite 3.2: Khử độc Nội dung & Chống XSS (`src/lib/security/sanitize.test.ts`)
- **Test cases:**
  - Dữ liệu do AI trả về chứa thẻ độc hại `<script>alert('xss')</script>` hoặc `<img src=x onerror=...>` $\to$ Bộ khử độc phải loại bỏ hoặc mã hóa an toàn thành HTML entities trước khi render.
  - Kiểm tra các chuỗi phiên âm chứa ký tự đặc biệt tiếng Trung, Hàn, Nhật, Thái không bị biến dạng sau khi sanitize.

---

## 4. Test Execution & CI Automation Commands

Các lệnh kiểm thử chuẩn được khai báo trong `package.json`:

```bash
# Chạy toàn bộ test suites một lần duy nhất
npm run test

# Chạy test ở chế độ watch (trong quá trình lập trình)
npm run test:watch

# Chạy kiểm thử độ bao phủ mã nguồn (Coverage Report >= 85%)
npm run test:coverage
```

### Tiêu chí Hoàn thành Kiểm thử (Pass Criteria):
- **100% tests Passed** (0 failures, 0 errors).
- **Code Coverage:** Đạt tối thiểu $\ge 85\%$ đối với toàn bộ các module trong `src/lib/` và `src/hooks/`.
- **Zero Typecheck Errors:** `npx tsc --noEmit` đạt 0 lỗi.
