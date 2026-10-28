# Technology Stack & Architecture Specification

> **Project:** LyricPhonics (Full-Stack Clean Architecture Monorepo)  
> **Version:** v0.5.0-dev (Branch: `dev`)  
> **Backend:** ASP.NET Core .NET 8 LTS (C# 12)  
> **AI Engine (Piano):** Python 3.14+ FastAPI + ByteDance High-Resolution CRNN  
> **Frontend:** Next.js 14 App Router (TypeScript Strict)  

---

## 🏛️ Monorepo Clean Architecture Overview

```mermaid
graph TD
    Client["Browser Client (Next.js 14 + Yamaha C5 Sampler)"] -->|HTTP / JSON| API["LyricPhonics.Api (.NET 8 Minimal API)"]
    API -->|Dependency Injection| App["LyricPhonics.Application (Use Cases & Interfaces)"]
    App -->|Implements| Infra["LyricPhonics.Infrastructure (HTTP Stream Adapters & Polly)"]
    App -->|Uses| Domain["LyricPhonics.Domain (Records, Models, Enums)"]
    Infra -->|Uses| Domain
    API -->|Uses| Domain
    Infra -->|HTTP Stream (Lyric & Phonics)| Gemini["Google Gemini 3.5 Flash Audio API"]
    Infra -->|HTTP Stream (Piano Studio - Local/Dev)| ByteDance["Python AI Service (ByteDance CRNN on :8000)"]
```

---

## ⚙️ Backend Technology Stack (.NET 8 LTS & Python AI)

| Component | Technology / Library | Version | Role & Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime & SDK** | **.NET 8 LTS (C# 12)** | `net8.0` | Long-Term Support release with high-throughput runtime and AOT-readiness. |
| **API Framework** | **ASP.NET Core Minimal APIs** | 8.0 | Lightweight, low-overhead HTTP pipeline with superior RPS compared to traditional controllers. |
| **Architecture** | **Clean Architecture** | 4 Layers | Separation of Concerns (Domain $\to$ Application $\to$ Infrastructure $\to$ Api). |
| **Piano AI Service** | **Python FastAPI + ByteDance CRNN** | `0.0.6` | High-Resolution CRNN with onset/offset regression, 0-127 velocity, and sustain pedal estimation. |
| **Resilience & Fault Tolerance** | `Microsoft.Extensions.Http.Resilience` | 8.x | Built-in Polly v8 policies: Exponential Backoff, Retry on 503/429, Circuit Breaker, Timeout. |
| **API Documentation** | **Swashbuckle.AspNetCore (Swagger)** | 6.x | Interactive OpenAPI testing UI available at `/swagger`. |
| **Serialization** | `System.Text.Json` | Native 8.0 | High-performance, zero-allocation serialization with strongly typed records. |
| **Testing** | **xUnit + FluentAssertions + Moq** | Latest | Automated unit testing with zero dependency on external cloud networks. |

---

## 💻 Frontend Technology Stack (Next.js)

| Component | Technology / Library | Version | Role |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | ^14.2 | Server & Client Components with modern React hooks. |
| **Language** | **TypeScript Strict** | ^5.x | Strict mode (`strict: true`, zero `any`) for end-to-end type safety. |
| **UI & Styling** | **Tailwind CSS + Lucide Icons** | ^3.4 / ^0.450 | Modern responsive dark-mode styling with intuitive musical controls. |
| **Audio Sync** | **HTML5 Audio + rAF** | Native | 60fps `requestAnimationFrame` loop providing jitter-free karaoke highlighting. |
| **Concert Grand Piano** | **Yamaha C5 Multi-Sample Soundbank** | Local (30 keys) | High-definition acoustic sample engine (`public/audio/salamander/`) with Convolver Reverb & 3D Panning. |
| **Piano Roll Visualizer** | **HTML5 Canvas 2D** | Native | 60fps waterfall falling notes (Synthesia-style) with 61/88-key virtual keyboard and real-time chord display. |
| **MIDI & Audio Export** | **Binary SMF Type 1 + OfflineAudioContext** | Native | Zero-dependency browser-side binary Standard MIDI (.mid) generator and lossless 16-bit PCM .WAV renderer. |
| **Speech** | **Web Speech Synthesis API** | Native | Zero-latency browser-native speech synthesis for standard pronunciation practice. |

---

## 📁 Monorepo Directory Map

```text
LyricPhonics/
├── AGENTS.md                  # Mandatory architectural and coding rules
├── CONTRIBUTING.md            # Community contribution guidelines
├── LICENSE                    # MIT License
├── PROJECT_SPEC.md            # Detailed product requirements & user flow
├── TECHSTACK.md               # Technology choices & specifications
├── TODO.md                    # Roadmap & milestone tracking
├── CHANGELOG.md               # Keep a Changelog releases
├── TESTING_PLAN.md            # Automated testing strategy
│
├── services/                  # PYTHON AI MICROSERVICES
│   └── piano-transcription-service/
│       ├── main.py            # FastAPI service (ByteDance CRNN)
│       ├── requirements.txt   # PyTorch, piano-transcription-inference, mido
│       ├── setup.bat          # 1-click installer
│       └── run.bat            # 1-click startup (port 8000)
│
├── frontend/                  # CLIENT INTERFACE (NEXT.JS 14 APP ROUTER)
│   ├── public/audio/salamander/ # 30 Yamaha C5 anchor samples (A0 to C8)
│   ├── src/
│   │   ├── app/               # Page, layout, global styles
│   │   ├── components/        # AudioDropzone, LyricView, AudioPlayerBar, PianoRollVisualizer
│   │   ├── hooks/             # useAudioPlayer (60fps rAF), useLyricSync (O(log N))
│   │   ├── lib/               # SoundfontPlayer, PianoAudioExporter, MidiExporter, Security
│   │   └── types/             # Domain TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                   # SERVER ENGINE (ASP.NET CORE .NET 8 LTS)
    ├── LyricPhonics.sln       # Visual Studio Solution
    │
    ├── src/
    │   ├── LyricPhonics.Domain/          # Core Entities, Records, Enums, DTOs
    │   ├── LyricPhonics.Application/     # Interfaces, Services, LRC parser, Binary search
    │   ├── LyricPhonics.Infrastructure/  # ByteDance Adapter, Gemini Client, Polly, DB
    │   └── LyricPhonics.Api/             # Minimal API Endpoints, Middleware, Swagger UI
    │
    └── tests/
        └── LyricPhonics.Tests/           # xUnit Unit & Integration Tests
```
