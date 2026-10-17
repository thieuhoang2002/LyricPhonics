# Roadmap & Sprints — LyricPhonics (.NET 8 + Next.js)

> **Project:** LyricPhonics Monorepo  
> **Architecture:** Clean Architecture (C# .NET 8 LTS + Next.js App Router)  
> **Current Status:** Sprint 2 Completed — Full-Stack Monorepo Active  

---

## 🏁 Milestone 1: Frontend Audio Engine & Synchronized UI (Sprint 1)
*Goal: Build responsive Next.js web application, 60fps rAF Karaoke Player, and 1-click export suite.*

- [x] ✅ Initialize Next.js App Router, Tailwind CSS, Lucide React
- [x] ✅ Implement $O(\log N)$ Binary Search for real-time line positioning
- [x] ✅ Build 60fps synchronized karaoke playback via `useAudioPlayer` and `useLyricSync`
- [x] ✅ Build inline editing modal and $\pm 0.5s$ timeline micro-adjustment controls
- [x] ✅ Implement native speech pronunciation playback (Web Speech Synthesis API)
- [x] ✅ Build 1-click multi-format export tooling: TXT, Karaoke LRC, SRT Subtitles, Clipboard

---

## 🏛️ Milestone 2: C# .NET 8 LTS Backend Clean Architecture (Sprint 2)
*Goal: Build high-performance ASP.NET Core .NET 8 LTS backend adhering to Clean Architecture principles.*

- [x] ✅ Initialize Solution `LyricPhonics.sln` with 4 Clean Architecture projects
- [x] ✅ Domain Layer (`LyricPhonics.Domain`): Declare `LyricLine`, `TranscriptionResult`, `TranscriptionMetadata` as C# 12 immutable `record` types
- [x] ✅ Application Layer (`LyricPhonics.Application`): Define `ITranscriptionService`, `ILrcService`, and implement $O(\log N)$ Binary Search in C#
- [x] ✅ Infrastructure Layer (`LyricPhonics.Infrastructure`): Integrate Google Gemini 3.5 Flash Audio REST API via `HttpClientFactory` with Polly v8 Resilience (`AddStandardResilienceHandler`)
- [x] ✅ API Layer (`LyricPhonics.Api`): Minimal API endpoint (`POST /api/transcribe`), Swagger OpenAPI documentation, CORS middleware, global exception handling

---

## 🧪 Milestone 3: Automated Testing & End-to-End Validation (Sprint 3)
*Goal: Achieve comprehensive test coverage for core business logic and seamless client-server integration.*

- [x] ✅ Write xUnit tests for $O(\log N)$ Binary Search in C#
- [x] ✅ Write xUnit tests for LRC generator and parser
- [x] ✅ Write xUnit tests with Mock HttpMessageHandler for Gemini API client and resilience
- [x] ✅ Maintain 100% automated test pass rate: 19/19 xUnit tests and 43/43 Vitest tests passing

---

## 🚀 Milestone 4: Open Source Release & GitHub Portfolio (Sprint 4)
*Goal: Polish documentation, configure repository metadata, and establish community guidelines.*

- [x] ✅ Set up Git Remote `origin https://github.com/thieuhoang2002/LyricPhonics.git`
- [x] ✅ Create English documentation (`README.md`, `docs/OVERVIEW.md`, `CONTRIBUTING.md`)
- [x] ✅ Enable GitHub Sponsors, Ko-fi, Buy Me a Coffee, and PayPal funding
- [x] ✅ Push entire codebase to GitHub repository
- [ ] ⬜ Add GitHub Actions CI workflow for automated testing on push/PR
