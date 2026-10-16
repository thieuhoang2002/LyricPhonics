# Phase 3: Export Tooling, Content Security & E2E Validation

**Plan:** [README.md](./README.md)  
**Type:** sequential

## Progress

| Status  | Task |
| :--- | :--- |
| ✅ DONE | Task 1: Xây dựng Bộ Tiện ích Xuất tệp Đa định dạng (TXT, LRC, SRT, Clipboard) |
| ✅ DONE | Task 2: Xây dựng Thanh Công cụ Xuất tệp 1-Click (`ExportToolbar`) |
| ✅ DONE | Task 3: Triển khai Content Security, Input Validation & Xử lý Ngoại lệ |
| ✅ DONE | Task 4: Tích hợp Toàn diện Ứng dụng, Tối ưu Giao diện & Kiểm thử E2E |

## Tasks

1. **Xây dựng Bộ Tiện ích Xuất tệp Đa định dạng (TXT, LRC, SRT, Clipboard)**
   - Viết các hàm xuất dữ liệu thuần client:
     - `exportToTxt`: Xuất định dạng song ngữ sạch sẽ, ngắt dòng rõ ràng để in hoặc đọc hát trên điện thoại.
     - `exportToLrc`: Xuất file định dạng Karaoke tiêu chuẩn `[mm:ss.xx]` để nạp vào các app nghe nhạc hoặc trình phát karaoke.
     - `exportToSrt`: Xuất file phụ đề có mốc thời gian chuẩn để import vào CapCut / Adobe Premiere làm video cover TikTok.
     - `copyToClipboard`: Định dạng văn bản nhanh kèm emoji để paste vào ghi chú hoặc mạng xã hội.
   - **Files:** `src/lib/export/txt.ts`, `src/lib/export/srt.ts`, `src/lib/export/clipboard.ts`
   - **Verify:** Kiểm thử unit test xuất file từ dữ liệu mẫu, kiểm tra file sinh ra không bị lỗi ký tự hay lệch timestamp.

2. **Xây dựng Thanh Công cụ Xuất tệp 1-Click (`ExportToolbar`)**
   - Tạo giao diện thanh công cụ xuất kết quả với các nút thao tác nhanh: "Sao chép toàn bộ lời", "Tải file .TXT", "Tải file .LRC", "Tải file .SRT". Tích hợp thông báo Toast feedback nhẹ nhàng ("Đã sao chép vào bộ nhớ tạm!").
   - **Files:** `src/components/export/ExportToolbar.tsx`
   - **Verify:** Thao tác nhấp chuột kích hoạt tải file về máy tính và copy đúng nội dung vào clipboard.

3. **Triển khai Content Security, Input Validation & Xử lý Ngoại lệ**
   - Áp dụng nguyên tắc Content Isolation: kiểm tra MIME type và phần mở rộng file upload, giới hạn dung lượng tải lên. Làm sạch dữ liệu văn bản từ AI trước khi render (phòng chống XSS). Bổ sung cơ chế bắt lỗi chi tiết (API rate limit, timeout, file hỏng) kèm hướng dẫn khắc phục cho người dùng.
   - **Files:** `src/lib/security.ts`, cập nhật `src/app/api/transcribe/route.ts`
   - **Verify:** Kiểm tra upload file giả mạo đuôi file, hệ thống từ chối và báo lỗi an toàn; test mô phỏng lỗi API Gemini hiển thị UI thông báo thân thiện.

4. **Tích hợp Toàn diện Ứng dụng, Tối ưu Giao diện & Kiểm thử E2E**
   - Ghép nối toàn bộ luồng hoạt động tại `src/app/page.tsx`: Màn hình Upload -> Màn hình Đang xử lý AI -> Không gian làm việc Karaoke & Editor -> Thanh công cụ Xuất file. Tối ưu giao diện đáp ứng (responsive) trên cả màn hình di động (cho người dùng TikTok/Reels) và máy tính để bàn. Lưu trữ tạm trạng thái metadata và mảng JSON lyrics vào `localStorage` (tránh lưu audio blob vào localStorage để không vượt ngưỡng 5MB quota; file audio chỉ giữ trong RAM qua Blob URL phiên làm việc).
   - **Files:** `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
   - **Verify:** Thực hiện kiểm thử toàn bộ luồng E2E với 1 file bài hát mẫu (Hoa ngữ/Hàn ngữ/Anh ngữ): Upload -> Bóc tách -> Phát nhạc và kiểm tra đồng bộ highlight -> Sửa 1 câu -> Xuất file LRC -> Mở kiểm tra file LRC.
