# AGENTS.md — MANDATORY AI CODING RULES & ARCHITECTURAL GUARDRAILS

> **Target Audience:** All AI Coding Assistants (Gemini, Claude, GPT, Cursor, Copilot, Antigravity)  
> **Authority:** Principal Software Architect  
> **Enforcement:** ABSOLUTE & NON-NEGOTIABLE. READ BEFORE EXECUTING ANY TASK.  

---

## 🚨 MISSION CRITICAL GROUND RULES

Mọi AI Agent khi làm việc trên kho mã nguồn **LyricPhonics** BẮT BUỘC phải đọc và tuân thủ các quy tắc dưới đây. Bất kỳ đoạn mã nào vi phạm một trong các điều sau sẽ bị từ chối và yêu cầu viết lại hoàn toàn.

### 1. TypeScript Nghiêm ngặt (Strict Typing — Zero `any`)
- **CẤM TUYỆT ĐỐI:** Không bao giờ sử dụng kiểu `any` (`any`, `any[]`, `Record<string, any>`).
- Khi kiểu dữ liệu chưa xác định rõ (ví dụ: dữ liệu từ API hoặc file tải lên), BẮT BUỘC dùng `unknown` kết hợp với Zod Schema hoặc TypeScript Type Guards.
- Mọi hàm, component props, hook return values phải có khai báo kiểu dữ liệu tường minh (explicit return types).
- Bật `strict: true` trong `tsconfig.json`. Lệnh `npx tsc --noEmit` phải luôn luôn đạt 0 lỗi.

### 2. Tối ưu Hiệu năng & Big-O ngay từ đầu (Performance First)
- **CẤM THUẬT TOÁN $O(N^2)$ LỒNG NHAU:** Tuyệt đối không dùng vòng lặp lồng nhau (`array.find` hoặc `array.filter` bên trong `array.map`/vòng lặp khác) khi xử lý danh sách dòng lời bài hát.
- **Tra cứu thời gian $O(\log N)$ hoặc $O(1)$:**
  - Danh sách câu hát theo thời gian BẮT BUỘC phải được sắp xếp theo `startTime`.
  - Tìm kiếm câu hát tương ứng với `currentTime` phải dùng thuật toán **Binary Search $O(\log N)$** (xem `src/lib/utils/binary-search.ts`).
  - Sử dụng `Map` hoặc `Set` để tra cứu theo ID với độ phức tạp $O(1)$.
- **Karaoke Sync ở 60fps:** Đồng bộ vị trí thời gian phát nhạc phải dùng `requestAnimationFrame`, không ép toàn bộ React Component Tree re-render liên tục ở mỗi mili-giây.

### 3. Cách ly 100% API Secrets & Biến Môi trường (Zero Leakage)
- **`GEMINI_API_KEY` chỉ tồn tại ở Server-side:**
  - Tuyệt đối KHÔNG ĐƯỢC đặt tên biến là `NEXT_PUBLIC_GEMINI_API_KEY`.
  - Tuyệt đối KHÔNG ĐƯỢC gọi SDK Google Gemini trực tiếp từ Client Component (`'use client'`).
  - Toàn bộ các thao tác AI phải thông qua Next.js Server Route Handler: `POST /api/transcribe`.
- Kiểm tra dữ liệu đầu vào (Content Isolation) và khử độc (Sanitize) 100% văn bản do AI trả về trước khi hiển thị trên giao diện người dùng để ngăn ngừa XSS và Prompt Injection.

### 4. Kiến trúc & Ngăn chặn Code Cũ (No Deprecated / Outdated Patterns)
- **Chỉ sử dụng Next.js App Router (`src/app/`):** Không bao giờ tạo hoặc đề xuất code thuộc Pages Router cũ (`pages/`, `getStaticProps`, `getServerSideProps`).
- **Không dùng thư viện cồng kềnh:** Không cài đặt `wavesurfer.js`, `howler.js` hay các thư viện canvas âm thanh gây lỗi SSR hydration mismatch. Sử dụng native HTML5 Audio qua custom hook `useAudioPlayer`.
- **SDK Gemini Hiện đại:** Sử dụng SDK chính thức mới `@google/genai` với cú pháp hiện đại và `responseSchema` ép kiểu JSON có cấu trúc.
- **Không viết code ẩu / Placeholder:** Cấm viết `TODO`, `TBD`, `// implement later`, `// code goes here`. Mỗi task khi hoàn thành phải là mã nguồn hoàn chỉnh, chạy được và có kiểm thử xác thực.

### 5. Bộ nhớ Trình duyệt & Giới hạn `localStorage`
- `localStorage` chỉ có giới hạn ~5MB: Chỉ được phép lưu trữ JSON metadata bài hát và mảng `lines` (lời + timestamp).
- **TUYỆT ĐỐI KHÔNG** lưu audio binary, audio base64 hay audio blob vào `localStorage`. File âm thanh chỉ tồn tại trong RAM qua Object URL (`URL.createObjectURL(file)`) trong phiên làm việc.

---

## 📁 REFERENCE DOCUMENTS MAP

Trước khi tạo mới component hay module, hãy tham khảo các file đặc tả đã được phê duyệt:
- [`PROJECT_SPEC.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/PROJECT_SPEC.md): Đặc tả bài toán, user flow, tính năng chi tiết.
- [`TECHSTACK.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TECHSTACK.md): Danh mục thư viện được phép dùng và cấu trúc thư mục chuẩn.
- [`TODO.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TODO.md): Danh sách công việc theo Sprint / Milestone.
- [`TESTING_PLAN.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/TESTING_PLAN.md): Chiến lược viết unit test và integration test.
- [`CHANGELOG.md`](file:///c:/Users/thhoang/Desktop/LyricPhonics/CHANGELOG.md): Tiêu chuẩn ghi nhận thay đổi mã nguồn.
- [`docs/plans/2026-10-16-lyric-phonics-core/`](file:///c:/Users/thhoang/Desktop/LyricPhonics/docs/plans/2026-10-16-lyric-phonics-core/): Kế hoạch triển khai 3 Phase chi tiết.

---

## 🛡️ CODING PROTOCOL FOR AI IMPLEMENTATION

Mỗi khi nhận nhiệm vụ code chức năng:
1. **Kiểm tra Type:** Khai báo kiểu trước, viết logic sau.
2. **Kiểm tra Big-O:** Tự hỏi hàm này có bị lặp lồng $O(N^2)$ không? Nếu có $\to$ chuyển thành Map/Set hoặc Binary Search.
3. **Kiểm tra Client/Server Boundary:** Code này chạy ở đâu? Có dính secret key không?
4. **Kiểm tra Test:** Viết unit test đi kèm để chứng minh code chạy đúng và không bị regression.
