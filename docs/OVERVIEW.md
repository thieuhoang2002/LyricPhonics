# LyricPhonics: Architecture & Technical Overview

Welcome to the comprehensive technical documentation for **LyricPhonics** — an open-source, full-stack AI-powered multimodal audio cover transcription and real-time karaoke synchronization system.

---

## 🚀 Vision & Problem Statement

Singers and content creators wanting to cover international songs (Chinese, Korean, Japanese, English, Thai) often face three fundamental challenges:
1. **Unreadable Source Scripts:** Inability to read original logographic or unfamiliar alphabets (Hanzi, Hangul, Kanji).
2. **Unsingable Standard Romanization:** Standard Pinyin or Romaja lacks Vietnamese tonal inflection and syllable cadence, making singing sound robotic and off-beat.
3. **Missing Timing:** General online translations lack timestamps, leaving singers uncertain about entry cues and rhythmic rests.

**LyricPhonics** overcomes these limitations by combining **Google Gemini Multimodal Audio AI** with a **Clean Architecture .NET 8 LTS Backend** and a **60fps synchronized Next.js 14 Frontend**.

---

## 🏛️ System Architecture

```mermaid
graph TD
    Client["Client Browser / Mobile"] -->|HTML5 Audio / 60fps rAF| UI["Next.js 14 App Router (Tailwind CSS)"]
    UI -->|Binary Search O(log N)| Player["Karaoke Sync & Micro-Adjustments"]
    UI -->|Multipart Audio Stream| API["LyricPhonics.Api (.NET 8 Minimal API)"]

    subgraph "ASP.NET Core .NET 8 LTS (Clean Architecture)"
        API -->|Dependency Injection| App["LyricPhonics.Application"]
        App -->|Domain Models| Domain["LyricPhonics.Domain (Records)"]
        Infra["LyricPhonics.Infrastructure"] -->|Implements Interfaces| App
        Infra -->|Polly v8 Resilience| HTTPClient["Resilient HttpClient"]
    end

    HTTPClient -->|Audio Stream + System Prompt| Gemini["Google Gemini 3.5 Flash Audio API"]
```

---

## 💎 3-Tier Layered Lyric Output

Every recognized line is partitioned into three distinct layers:

| Layer | Attribute | Purpose | Example (Chinese Track) |
| :--- | :--- | :--- | :--- |
| **Layer 1** | `OriginalText` | Original native script for authenticity. | `徒余明月忆往昔` |
| **Layer 2** | `PhoneticText` | Rhythm-matched phonetic transcription with natural tone marks for cover singing. | **`Thú xuy mính uế i oảng xí`** |
| **Layer 3** | `TranslationText` | Poetic and emotional meaning in Vietnamese. | *Chỉ còn vầng trăng soi bóng, lặng lẽ nhớ về chuyện xưa* |

---

## ⚡ Core Technical Highlights

### 1. High-Performance $O(\log N)$ Binary Search
Line lookups during 60fps playback run in $O(\log N)$ time using binary search over sorted `StartTime` timestamps, querying 10,000 lines in $<1\text{ms}$.

### 2. Zero-Allocation Memory & Streaming
Audio ingestion utilizes native `StreamContent` and `IFormFile.OpenReadStream()` to forward data directly to Google Gemini, avoiding in-memory byte array allocation (`byte[]`) that causes garbage collector churn.

### 3. Fault-Tolerant Polly v8 Resilience
Using `Microsoft.Extensions.Http.Resilience`, outgoing API calls automatically handle temporary HTTP 503 and 429 rate limits via Exponential Backoff with Jitter and model fallback strategies.

### 4. 1-Click Multi-Format Export
- **`.LRC`:** Standard karaoke format `[mm:ss.xx]` for media players.
- **`.SRT`:** Time-synced subtitle tracks for CapCut and Adobe Premiere video creators.
- **`.TXT`:** Clean bilingual sheets for phone reading.
- **`Clipboard`:** Instant formatted copy with emoji indicators.

### 5. Native Speech Synthesis
Integrated browser-based Web Speech API allows users to listen to standard native pronunciation (Mandarin, Japanese, Korean, English) at a comfortable 0.85x tempo.

---

## 🔗 Quick Links & Resources

- **GitHub Repository:** [https://github.com/thieuhoang2002/LyricPhonics](https://github.com/thieuhoang2002/LyricPhonics)
- **Author Portfolio:** [https://thhoang.io.vn](https://thhoang.io.vn)
- **LinkedIn:** [https://www.linkedin.com/in/thhoang0903](https://www.linkedin.com/in/thhoang0903)
- **Support & Sponsor:** [Ko-fi](https://ko-fi.com/thhoang0903) | [Buy Me a Coffee](https://buymeacoffee.com/thhoang0903) | [PayPal](https://paypal.me/thieuhoang2209)
