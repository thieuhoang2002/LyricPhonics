# TECHNICAL STACK & ARCHITECTURAL GUIDELINES: LYRICPHONICS

> **Status:** Mandatory Enforcement  
> **Author:** Principal Software Architect  
> **Strictness Level:** Strict Mode (No exemptions without Architectural Review)  

---

## 1. Approved Technology Stack

Mọi thư viện được sử dụng trong dự án phải tuân thủ danh sách được phê duyệt dưới đây. **Nghiêm cấm tự ý cài đặt thêm các thư viện bên thứ ba** ngoài danh sách này.

### 1.1. Core Framework & Runtime
| Công nghệ | Phiên bản | Mục đích & Quy định sử dụng |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x LTS` | Runtime môi trường server. |
| **Next.js** | `^14.2` hoặc `^15.x` | **App Router duy nhất.** Cấm dùng Pages Router (`pages/`). |
| **React** | `^18.x` hoặc `^19.x` | UI Library. Tận dụng React Server Components & Client Components (`'use client'`). |
| **TypeScript** | `^5.x` | Strict Mode (`strict: true`). **Tuyệt đối cấm sử dụng kiểu `any`**. |

### 1.2. AI Engine & SDK
| Thư viện | Phiên bản | Mục đích & Quy định |
| :--- | :--- | :--- |
| **`@google/genai`** | Latest official | SDK chính thức của Google cho Gemini 2.0 / 2.5. Chỉ được import và thực thi bên trong Route Handlers (`src/app/api/`). |
| **`zod`** | `^3.x` | Runtime schema validation cho dữ liệu AI và API payloads. |

### 1.3. UI, Styling & Icons
| Thư viện | Phiên bản | Mục đích & Quy định |
| :--- | :--- | :--- |
| **Tailwind CSS** | `^3.4` | Utility-first CSS. Không viết CSS inline tùy tiện. |
| **`lucide-react`** | Latest | Bộ icon vector chính thức. Không dùng icon ngoài. |
| **`clsx` + `tailwind-merge`** | Latest | Tiện ích chuẩn hóa `cn(...)` cho dynamic className. |

### 1.4. Audio Engine & State
| Công nghệ | Cơ chế | Quy định kiến trúc |
| :--- | :--- | :--- |
| **Native HTML5 Audio** | Web Audio API | Dùng native `HTMLAudioElement` bọc trong custom hook `useAudioPlayer`. Không cài đặt thư viện ngoài cồng kềnh (như Howler hay Wavesurfer) để tránh hydration mismatch và bloat bundle. |
| **Animation Loop** | `requestAnimationFrame` | Dùng để nội suy thời gian phát lại ở 60fps mượt mà, không phụ thuộc duy nhất vào `timeupdate`. |

### 1.5. Testing & Quality
| Thư viện | Phiên bản | Mục đích |
| :--- | :--- | :--- |
| **`vitest`** | `^1.x` / `^2.x` | Test runner siêu tốc cho Unit & Integration tests. |

---

## 2. Prohibited Libraries & Anti-Patterns (Danh sách cấm)

1. **CẤM `pages/` (Pages Router):** Chỉ sử dụng Next.js App Router (`src/app/`).
2. **CẤM Canvas Waveform Bloatware:** Không dùng `wavesurfer.js` trong MVP do xung đột SSR Next.js, lỗi canvas resize trên mobile và tốn RAM vô ích.
3. **CẤM `any` trong TypeScript:** Mọi biến, hàm, tham số, interface đều phải có kiểu dữ liệu tường minh. Bắt buộc dùng `unknown` kết hợp type guard hoặc `zod` schema khi parse JSON không xác định.
4. **CẤM `NEXT_PUBLIC_GEMINI_API_KEY`:** Biến môi trường chứa API secret **bắt buộc** phải là `GEMINI_API_KEY` (không có tiền tố `NEXT_PUBLIC_`), chỉ được truy cập ở Server-side.
5. **CẤM Thuật toán $O(N^2)$ lồng nhau:** Mọi thao tác tìm kiếm, lọc câu hát, định dạng thời gian trong animation loop phải tối ưu $O(1)$ hoặc $O(\log N)$.

---

## 3. Directory Structure Standards (Cấu trúc thư mục chuẩn)

Dự án bắt buộc phải tuân theo cấu trúc tổ chức mã nguồn dưới đây:

```
LyricPhonics/
├── docs/                                 # Tài liệu kế hoạch, context, memory của Coding Friend
├── public/                               # Static assets (favicon, mẫu audio test)
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── api/                          # Server-side API Route Handlers
│   │   │   └── transcribe/
│   │   │       └── route.ts              # Route bóc tách audio qua Gemini SDK
│   │   ├── globals.css                   # Global styles + Tailwind directives + Karaoke animations
│   │   ├── layout.tsx                    # Root Layout (Fonts, Metadata)
│   │   └── page.tsx                      # Main Workspace Page (Single Page App)
│   ├── components/                       # UI Components (Phân tách rõ ràng)
│   │   ├── upload/                       # Drag & drop upload components
│   │   │   └── AudioDropzone.tsx
│   │   ├── player/                       # Audio playback controls
│   │   │   └── AudioPlayerBar.tsx
│   │   ├── lyrics/                       # Lyrics presentation & editor
│   │   │   ├── LyricView.tsx             # Danh sách câu hát auto-scroll
│   │   │   ├── LyricLineItem.tsx         # Từng dòng 3 tầng: Gốc, Phiên âm, Nghĩa
│   │   │   └── LyricEditorControls.tsx   # Nút chỉnh thời gian +/- 0.5s
│   │   ├── export/                       # Export actions
│   │   │   └── ExportToolbar.tsx         # Nút xuất TXT, LRC, SRT, Clipboard
│   │   └── ui/                           # Primitives tái sử dụng (Button, Modal, Toast)
│   ├── hooks/                            # Custom React Hooks
│   │   ├── useAudioPlayer.ts             # Quản lý phát nhạc HTML5 Audio + rAF 60fps
│   │   └── useLyricSync.ts               # Thuật toán tìm câu đang hát (Binary Search)
│   ├── lib/                              # Core Business Logic & Pure Utilities
│   │   ├── gemini/
│   │   │   ├── client.ts                 # Khởi tạo Gemini client an toàn
│   │   │   ├── prompts.ts                # System prompt phiên âm tiếng Việt
│   │   │   └── schema.ts                 # Zod & Gemini Response JSON Schema
│   │   ├── export/
│   │   │   ├── txt.ts                    # Formatter file TXT
│   │   │   ├── lrc.ts                    # Formatter file Karaoke LRC [mm:ss.xx]
│   │   │   ├── srt.ts                    # Formatter phụ đề video SRT
│   │   │   └── clipboard.ts              # Clipboard helper
│   │   ├── security/
│   │   │   └── sanitize.ts               # Input validation & XSS sanitization
│   │   └── utils/
│   │       ├── time.ts                   # Chuyển đổi giây <-> [mm:ss.xx]
│   │       └── binary-search.ts          # Thuật toán tìm kiếm O(log N) cho lyric lines
│   └── types/                            # Strict TypeScript Definitions
│       ├── lyrics.ts                     # LyricLine, TranscriptionResult interfaces
│       └── player.ts                     # AudioPlayerState, PlaybackRate types
├── .env.example                          # Mẫu cấu hình môi trường chuẩn
├── next.config.mjs                       # Cấu hình Next.js (max payload, stream)
├── package.json                          # Khai báo dependency chính thức
├── tailwind.config.ts                    # Cấu hình giao diện Tailwind
├── tsconfig.json                         # TypeScript Strict Mode configuration
└── vitest.config.ts                      # Cấu hình kiểm thử tự động
```

---

## 4. Architectural Patterns & Data Flow

### 4.1. Server-Side Secrets Isolation Pattern
```
[Client Browser]
       │
       │ (1) Gửi FormData (audio file) qua HTTP POST
       ▼
[Next.js Server: /api/transcribe] ─── Chứa GEMINI_API_KEY trong process.env
       │
       │ (2) Gọi @google/genai SDK (Google AI File API hoặc inline buffer)
       ▼
[Google Gemini Multimodal Audio API]
       │
       │ (3) Trả về JSON Schema tuân thủ nghiêm ngặt
       ▼
[Next.js Server: Sanitize & Validate Zod]
       │
       │ (4) Trả về JSON sạch an toàn cho Client
       ▼
[Client Browser: React In-Memory State]
```

### 4.2. Time-Synchronized Karaoke Engine (60fps rAF)
Để đạt độ mượt tuyệt đối và không giật lag UI:
- Không kích hoạt re-render toàn bộ danh sách khi `currentTime` thay đổi nhỏ.
- Hook `useLyricSync` sử dụng thuật toán **Binary Search $O(\log N)$** trên mảng `lines` đã sắp xếp theo `startTime` để tìm kiếm `activeLineIndex`.
- Chỉ cập nhật `activeLineIndex` khi có sự chuyển đổi giữa các câu hát.
- Dùng `requestAnimationFrame` đồng bộ thanh trượt tiến độ (scrub bar) độc lập qua direct DOM ref để tránh React re-render nghẽn luồng UI.
