<div align="center">

# 🎵 LyricPhonics
### Full-Stack AI Multimodal Audio Phonics Cover Engine & Synchronized Lyric Workspace

[![.NET 8 LTS](https://img.shields.io/badge/.NET-8.0_LTS-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![C# 12](https://img.shields.io/badge/C%23-12-239120?logo=csharp&logoColor=white)](https://learn.microsoft.com/en-us/dotnet/csharp/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Polly v8](https://img.shields.io/badge/Resilience-Polly_v8-blue)](https://github.com/App-vNext/Polly)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean_Architecture-orange)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributing](https://img.shields.io/badge/Contributing-Welcome-brightgreen.svg)](CONTRIBUTING.md)

*Transcribe, phoneticize, and synchronize international songs (Chinese, Korean, Japanese, English, Thai) into natural phonetic lyrics with millisecond timestamps for instant cover singing and video editing.*

[Technical Overview](docs/OVERVIEW.md) • [Contributing Guide](CONTRIBUTING.md) • [Report Bug](https://github.com/thieuhoang2002/LyricPhonics/issues)

</div>

---

## 🌟 The Problem & The Solution

Singers and TikTok/Reels content creators wanting to cover trending international songs face three major obstacles:
1. **Unreadable Source Scripts:** Inability to read original logographic alphabets (Hanzi, Hanja, Kana...).
2. **Unsingable Standard Romanization:** Standard Pinyin or Romaja lacks tonal cadence and Vietnamese natural articulation, making covers sound rigid and off-tempo.
3. **Missing Timing:** General lyrics on the web lack timestamps, leaving singers uncertain about entry cues and rhythmic rests.

**LyricPhonics** solves this by pairing **Google Gemini Multimodal Audio AI** with an enterprise-grade **ASP.NET Core .NET 8 LTS Backend** (Clean Architecture) and an interactive **Next.js 14 Frontend** featuring a 60fps real-time synchronized karaoke engine.

---

## 🏛️ System Architecture

```mermaid
graph TD
    User["👤 User / Content Creator"] -->|Web Browser| FE["💻 Frontend (Next.js 14 App Router)"]
    FE -->|Karaoke 60fps| Player["🎵 useAudioPlayer (HTML5 Audio + rAF)"]
    FE -->|Real-time O(log N) Lookup| Sync["⚡ useLyricSync (Binary Search)"]
    FE -->|Multipart Audio Stream| API["🚀 LyricPhonics.Api (.NET 8 Minimal API)"]
    
    subgraph "Backend (.NET 8 LTS Clean Architecture)"
        API -->|Dependency Injection| App["📦 LyricPhonics.Application"]
        App -->|Interfaces| Domain["💎 LyricPhonics.Domain (Records & Enums)"]
        Infra["⚙️ LyricPhonics.Infrastructure"] -->|Implements| App
        Infra -->|Uses| Domain
        Infra -->|Polly v8 Resilience| HTTPClient["🌐 Typed HttpClient"]
    end

    HTTPClient -->|Base64 Audio Stream| Gemini["🤖 Google Gemini 3.5 Flash Audio API"]
```

---

## ✨ Key Features

### 1. 3-Tier Layered Lyric Output
Every recognized line is partitioned into three synchronized layers:
- **Layer 1 (Original Text):** Original logographic or native script (e.g. `徒余明月忆往昔`).
- **Layer 2 (Phonetic Cover Text):** Tone-accurate phonetic lyrics matching the singer's musical cadence (e.g. `Thú xuy mính uế i oảng xí`).
- **Layer 3 (Translation Text):** Poetic Vietnamese translation conveying song emotion.

### 2. 60fps Synchronized Karaoke Player & Fine-Tuning
- High-precision playback tracking via `requestAnimationFrame` at 60fps without UI stutter.
- **$O(\log N)$ Binary Search Engine:** Instantaneous line lookup across 10,000 lines in $<1\text{ms}$.
- Micro-adjustment toolbar: nudge timing by $\pm 0.5s$ or bind current playback timestamp.

### 3. Native Speech Pronunciation
- Integrated browser-native Web Speech Synthesis API allows users to click **`[🔊 Pronounce]`** to hear standard native pronunciation (Mandarin, Japanese, Korean, English) at 0.85x speed for practice.

### 4. 1-Click Multi-Format Export
- **`.LRC`:** Standard karaoke file with `[mm:ss.xx]` tags for media players.
- **`.SRT`:** Synchronized subtitle track ready to import into **CapCut** or **Adobe Premiere**.
- **`.TXT`:** Clean lyric sheet for reading or printing.
- **`Clipboard`:** Instant formatted copy with emojis.

---

## 📁 Repository Structure

```text
LyricPhonics/
├── CONTRIBUTING.md            # Guidelines for open-source contributors
├── LICENSE                    # MIT License
├── README.md                  # Main documentation
├── PROJECT_SPEC.md            # System requirements & user flows
├── TECHSTACK.md               # Technology choices & architectural boundaries
├── TODO.md                    # Roadmap & Sprint tracker
├── CHANGELOG.md               # Keep a Changelog releases
├── TESTING_PLAN.md            # Automated testing strategy
│
├── frontend/                  # CLIENT INTERFACE (NEXT.JS 14 APP ROUTER)
│   ├── src/app/               # Main application pages & layout
│   ├── src/components/        # AudioDropzone, LyricView, AudioPlayerBar, ExportToolbar
│   ├── src/hooks/             # useAudioPlayer (60fps), useLyricSync (O(log N))
│   ├── src/lib/               # Export utilities (TXT, LRC, SRT), Security, Speech
│   └── package.json
│
└── backend/                   # SERVER ENGINE (ASP.NET CORE .NET 8 LTS)
    ├── LyricPhonics.sln       # Visual Studio Solution
    ├── src/
    │   ├── LyricPhonics.Domain/          # Models (LyricLine, TranscriptionResult), Enums
    │   ├── LyricPhonics.Application/     # ITranscriptionService, LrcService, BinarySearchService
    │   ├── LyricPhonics.Infrastructure/  # GeminiTranscriptionService (Polly v8 Resilience)
    │   └── LyricPhonics.Api/             # Minimal API Endpoints, Middleware, Swagger UI
    └── tests/
        └── LyricPhonics.Tests/           # xUnit Unit & Integration Tests (100% Pass)
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **.NET 8 SDK** (or .NET 10 SDK with RollForward enabled)
- **Node.js 18+** & **npm**
- Free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### Step 1: Start Backend (.NET 8 Web API)

1. Navigate to the API directory:
   ```bash
   cd backend/src/LyricPhonics.Api
   ```
2. Configure your Gemini API Key in `appsettings.Development.json` (or set environment variable `GEMINI_API_KEY`):
   ```json
   {
     "Gemini": {
       "ApiKey": "YOUR_GEMINI_API_KEY_HERE"
     }
   }
   ```
3. Run the API:
   ```bash
   dotnet run
   ```
   - API runs at: **`http://localhost:5000`**
   - Interactive Swagger UI: **`http://localhost:5000/swagger`**

---

### Step 2: Start Frontend (Next.js)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch development server:
   ```bash
   npm run dev
   ```
   - Frontend runs at: **`http://localhost:3000`**

---

## 🧪 Automated Testing

Both Backend and Frontend maintain comprehensive test suites:

1. **Backend Tests (xUnit + FluentAssertions + Moq):**
   ```bash
   dotnet test backend/LyricPhonics.sln
   ```
   *Result: 19/19 tests passed (Binary Search $O(\log N)$, LRC parsing, Mock HttpClient Polly).*

2. **Frontend Tests (Vitest):**
   ```bash
   cd frontend && npm run test
   ```
   *Result: 43/43 tests passed (Time utilities, Client Binary Search, Content Security, Export).*

---

## 💖 Support & Sponsor

If you find this project helpful or inspiring, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/thieuhoang2002)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/thhoang0903)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/thhoang0903)
[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/thieuhoang2209)

---

## 👤 Author & Connect

- **Author:** **Thieu Viet Hoang**
- **Portfolio:** [https://thhoang.io.vn](https://thhoang.io.vn)
- **LinkedIn:** [https://www.linkedin.com/in/thhoang0903](https://www.linkedin.com/in/thhoang0903)
- **GitHub:** [@thieuhoang2002](https://github.com/thieuhoang2002)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
