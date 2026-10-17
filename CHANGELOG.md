# Changelog

All notable changes to the **LyricPhonics** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned (Post-MVP Roadmap)
- GitHub Actions CI workflow for automated .NET 8 and Next.js testing.
- Supabase Auth (Google, Email) and Supabase Database for persistent song history.
- Automated VietQR payment processing (SePay/Casso).
- Direct audio extraction via TikTok and YouTube Shorts URLs.

---

## [0.3.0] - 2026-10-17

### Added
- **Migration to Full-Stack Monorepo (.NET 8 LTS Backend + Next.js Frontend):**
  - **Backend Clean Architecture (.NET 8):** Decomposed into 4 decoupled projects: `LyricPhonics.Domain`, `LyricPhonics.Application`, `LyricPhonics.Infrastructure`, `LyricPhonics.Api`.
  - **C# 12 Records & High Performance:** Implemented immutable records, $O(\log N)$ real-time binary search, and direct binary stream forwarding without in-memory buffering.
  - **Polly v8 Resilience:** Integrated `Microsoft.Extensions.Http.Resilience` with Exponential Backoff and Jitter to automatically retry on HTTP 503/429 rate limit errors from Google Gemini API.
  - **Minimal API & OpenAPI:** Built high-throughput `POST /api/transcribe` endpoint with ASP.NET Core Minimal APIs, providing interactive Swagger UI at `/swagger`.
  - **Frontend Workspace Isolation:** Moved Next.js App Router into `frontend/` directory, cleanly connecting to .NET 8 backend via `NEXT_PUBLIC_API_URL`.
  - **Native Speech Synthesis:** Added browser-native pronunciation playback via Web Speech API.
  - **Comprehensive Automated Testing (62 Tests Passing):** 19/19 xUnit tests backend (.NET 8) and 43/43 Vitest tests frontend (Next.js).
  - **Open-Source Enhancements:** Added `CONTRIBUTING.md`, `docs/OVERVIEW.md`, GitHub Funding (`FUNDING.yml`), and MIT License.

---

## [0.2.0] - 2026-10-16

### Added
- **Core MVP Engine (Client-side & Node route prototype):**
  - Audio transcription with Google Gemini audio models.
  - 60fps real-time synchronized karaoke highlight player (`useAudioPlayer`, `useLyricSync`).
  - 1-Click multi-format export: .TXT, .LRC, .SRT, Clipboard.
  - Content security sanitization and safe localStorage quota management.

---

## [0.1.0] - 2026-10-16

### Added
- Initial project foundation, specifications, and architecture planning documents.
