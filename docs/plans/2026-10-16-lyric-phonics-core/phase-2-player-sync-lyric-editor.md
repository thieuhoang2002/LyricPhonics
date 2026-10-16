# Phase 2: Audio Player & Realtime Synchronized Lyric Editor

**Plan:** [README.md](./README.md)  
**Type:** sequential

## Progress

| Status  | Task |
| :--- | :--- |
| ✅ DONE | Task 1: Xây dựng Custom Hook `useAudioPlayer` quản lý Audio HTML5 |
| ✅ DONE | Task 2: Xây dựng Component Tải tệp Âm thanh Kéo thả (`AudioDropzone`) |
| ✅ DONE | Task 3: Xây dựng Trình phát Karaoke Đồng bộ Realtime & Auto-scroll |
| ✅ DONE | Task 4: Xây dựng Bộ Chỉnh sửa Trực tiếp (Inline Editor) & Tinh chỉnh Timeline |

## Tasks

1. **Xây dựng Custom Hook `useAudioPlayer` quản lý Audio HTML5**
   - Xây dựng React hook bọc native `Audio` element: quản lý `currentTime`, `duration`, trạng thái `isPlaying`, `playbackRate` (0.75x, 1x, 1.25x), hàm `seek(seconds)`, `play()`, `pause()`. Kết hợp event `timeupdate` với `requestAnimationFrame` khi `isPlaying = true` để nội suy `currentTime` với tần số 60fps mượt mà, giúp highlight karaoke chuyển câu chính xác không giật lag.
   - **Files:** `src/hooks/useAudioPlayer.ts`
   - **Verify:** Hook load audio blob URL thành công, cập nhật `currentTime` chính xác 60fps khi phát nhạc.

2. **Xây dựng Component Tải tệp Âm thanh Kéo thả (`AudioDropzone`)**
   - Tạo component drag & drop hỗ trợ định dạng MP3, WAV, M4A, MP4 (dưới 20MB). Hiển thị tên bài hát, kích cỡ, thời lượng ước tính. Tích hợp nút bấm kích hoạt bóc tách AI kèm hiệu ứng loading/skeleton trạng thái phân tích.
   - **Files:** `src/components/upload/AudioDropzone.tsx`
   - **Verify:** Thao tác chọn file hoặc kéo thả file hợp lệ tạo được blob URL và gọi hàm xử lý, từ chối file quá dung lượng với thông báo thân thiện.

3. **Xây dựng Trình phát Karaoke Đồng bộ Realtime & Auto-scroll**
   - Hiển thị danh sách các câu hát theo 3 tầng trực quan: Lời gốc (Chữ Hán/Hàn/Nhật/Anh...), Phiên âm tiếng Việt chuẩn nhịp ("Ủa ai nỉ"), Tóm tắt nghĩa. Tự động highlight câu đang phát khi `currentTime` nằm trong khoảng `[startTime, endTime]` và tự động cuộn (auto-scroll) mượt mà vào giữa khung nhìn. Hỗ trợ click vào bất kỳ câu nào để audio seek ngay tới mốc thời gian đó.
   - **Files:** `src/components/lyrics/LyricView.tsx`, `src/components/lyrics/LyricLineItem.tsx`
   - **Verify:** Phát bài hát mẫu, dòng highlight chuyển động đồng bộ theo đúng giây bài hát; click câu thứ 3 audio nhảy chính xác tới `startTime` của câu thứ 3.

4. **Xây dựng Bộ Chỉnh sửa Trực tiếp (Inline Editor) & Tinh chỉnh Timeline**
   - Cho phép người dùng click sửa trực tiếp nội dung chữ gốc, phiên âm tiếng Việt và nghĩa khi phát hiện AI nhận diện chưa tối ưu. Bổ sung các nút micro-adjustment: `+0.5s`, `-0.5s`, hoặc `Đồng bộ với thời điểm đang phát` để đảm bảo độ chính xác tuyệt đối 100% theo beat bài hát.
   - **Files:** `src/components/lyrics/LyricEditorControls.tsx`, `src/components/player/AudioPlayerBar.tsx`
   - **Verify:** Thử sửa một từ phiên âm và bấm nút `+0.5s`, dữ liệu trong state cập nhật ngay lập tức và phản ánh lên timeline phát nhạc.
