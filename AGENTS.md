# AGENTS.md — MANDATORY CODING RULES & ARCHITECTURAL GUARDRAILS (.NET 8 & NEXT.JS)

> **Role:** Principal Software Architect  
> **Target:** C# .NET 8 LTS (Backend) & Next.js 14 App Router (Frontend)  
> **Status:** MANDATORY & 100% ENFORCED for all AI Coding Assistants and Developers.  

---

## 🚨 MISSION CRITICAL GROUND RULES (.NET 8 BACKEND)

All C# code written for the **LyricPhonics Backend** must strictly adhere to the following architecture and performance rules:

### 1. Clean Architecture (4-Tier Decoupled Structure)
- **`LyricPhonics.Domain`:** Contains Entities, Value Objects, Enums, DTOs. **FORBIDDEN** from depending on any external libraries or other project layers.
- **`LyricPhonics.Application`:** Contains Interfaces (`ITranscriptionService`, `ILrcService`), Use Cases, and Business Logic. Depends only on `Domain`.
- **`LyricPhonics.Infrastructure`:** Implements external services: `GeminiTranscriptionService`, `HttpClient`, Polly Resilience Handlers, Logging. Depends only on `Application` and `Domain`.
- **`LyricPhonics.Api`:** ASP.NET Core Minimal API Endpoints, Middleware (CORS, Rate Limiting, Exception Handling), Swagger. Depends on `Infrastructure`, `Application`, and `Domain`.
- **`LyricPhonics.Tests`:** xUnit Automated Unit Tests using `FluentAssertions` and `Moq`.

### 2. Performance & Memory First in C#
- **FORBIDDEN: BUFFERING FULL AUDIO FILES INTO BYTE ARRAYS (`byte[]`):**
  - Never use `BinaryReader.ReadBytes()` or `File.ReadAllBytes()` for large media files.
  - MUST use **`Stream`** (`IFormFile.OpenReadStream()`, `StreamContent`) to forward audio streams directly to Google Gemini API.
- **ZERO/LOW-ALLOCATION MEMORY PATTERNS:**
  - Use `ReadOnlySpan<char>` when parsing timestamps or splitting LRC tags `[mm:ss.xx]`, avoiding heap allocation from `string.Split()`.
  - Use C# 12 `record` immutable types for all DTOs.
  - Use native `System.Text.Json` with strongly typed schemas. Strictly **FORBIDDEN to use `dynamic` or `object`**.
- **REAL-TIME LINE LOOKUPS IN $O(\log N)$:**
  - `LyricLine` collections must always be sorted by `StartTime`.
  - Active line lookup by `currentTime` must use **Binary Search $O(\log N)$**, never linear $O(N)$ iteration in real-time loops.

### 3. Fault Tolerance & Automatic Recovery with Polly
- All outgoing HTTP communication with Gemini API MUST be registered via `IHttpClientFactory` paired with `Microsoft.Extensions.Http.Resilience` (Polly v8).
- Automatically catch HTTP `503 Service Unavailable` and `429 Too Many Requests` status codes and retry with **Exponential Backoff and Jitter**.

### 4. Zero Secret Leakage (100% Isolation)
- `GEMINI_API_KEY` must only be loaded from:
  1. System environment variables (`Environment.GetEnvironmentVariable("GEMINI_API_KEY")`).
  2. `IConfiguration["GEMINI_API_KEY"]` from `appsettings.Development.json` (gitignored).
- **STRICTLY FORBIDDEN:** Do not hardcode API keys into C# code. Do not commit actual keys to Git repository. The committed `appsettings.json` must only contain empty placeholders.

### 5. Code Documentation Standards
- Core classes, interfaces, and methods must include XML Documentation comments (`/// <summary>`) and clear, explanatory technical Vietnamese comments for learning purposes.

---

## 🎨 FRONTEND GUARDRAILS (NEXT.JS)

- Source code resides independently in `frontend/`.
- Uses Next.js App Router, TypeScript Strict Mode (`strict: true`, zero `any`), Tailwind CSS.
- Real-time 60fps karaoke synchronization via `requestAnimationFrame` (`useAudioPlayer` and `useLyricSync`).
- Communicates with C# .NET Backend via environment variable `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000`).
