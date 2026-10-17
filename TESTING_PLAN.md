# Testing Strategy & Automated Verification Plan

> **Project:** LyricPhonics (C# .NET 8 LTS Backend & Next.js Frontend)  
> **Updated:** 2026-10-17  

---

## 🧪 1. Backend Automated Testing Matrix (.NET 8 LTS — xUnit)

Backend testing is powered by the enterprise-grade triad: **xUnit + FluentAssertions + Moq**.

| Test Scope | Test File | Testing Methodology & Objectives |
| :--- | :--- | :--- |
| **Binary Search Algorithm** | `BinarySearchTests.cs` | • Verify $O(\log N)$ lookups at boundary timestamps (`0.0s`, midway, after song end).<br>• Benchmark throughput across 10,000 lyric lines in $<50\text{ms}$. |
| **Karaoke LRC Parsing & Generation** | `LrcServiceTests.cs` | • Verify format conversion from `LyricLine` to standard `[mm:ss.xx]` tags.<br>• Perform roundtrip verification: parse generated LRC back into strongly typed domain objects. |
| **File Validation & Input Security** | `AudioValidationTests.cs` | • Verify allowed MIME types (audio/mpeg, audio/wav, video/mp4).<br>• Enforce rejection of files exceeding the 25MB threshold or spoofed extensions. |
| **Gemini Client & Polly Resilience** | `GeminiTranscriptionServiceTests.cs` | • Mock `HttpMessageHandler` simulating HTTP 503 and 429 status codes.<br>• Assert that Polly resilience policies activate retries and fallback models without crashing. |

---

## 🧪 2. Frontend Automated Testing Matrix (Next.js — Vitest)

| Test Scope | Test File | Objectives |
| :--- | :--- | :--- |
| **Time Conversion Utilities** | `time.test.ts` | Seconds $\leftrightarrow$ mm:ss format conversions and display formatting. |
| **Client-side Binary Search** | `binary-search.test.ts` | $O(\log N)$ real-time active line index lookup during 60fps playback. |
| **Content Security** | `security.test.ts` | XSS sanitization, safe localStorage quota verification (<2MB). |
| **Export Engines** | `export.test.ts`, `lrc.test.ts` | Multi-format generation for TXT, LRC, SRT, and Clipboard formats. |
| **Native Pronunciation Mapping** | `speech.test.ts` | Accurate locale mapping (`zh-CN`, `ja-JP`, `ko-KR`, `en-US`). |

---

## 🚀 3. Running All Tests

1. **Run Backend Test Suite (.NET 8):**
   ```bash
   dotnet test backend/LyricPhonics.sln
   ```
2. **Run Frontend Test Suite (Next.js):**
   ```bash
   cd frontend
   npm run test
   ```
