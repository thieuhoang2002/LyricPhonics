# Contributing to LyricPhonics

Thank you for your interest in contributing to **LyricPhonics**! We welcome contributions from developers of all skill levels. Whether you are fixing bugs, improving documentation, optimizing algorithms, or proposing new features, your help is greatly appreciated.

---

## 📋 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and kind in all interactions.

---

## 🛠️ Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/thieuhoang2002/LyricPhonics.git
cd LyricPhonics
```

### 2. Prerequisites
- **.NET 8 SDK** (or .NET 10 SDK with RollForward enabled)
- **Node.js 18+** & **npm**
- A free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Setting Up Local Environment

#### Backend (.NET 8 LTS Web API)
```bash
cd backend/src/LyricPhonics.Api
# Create appsettings.Development.json with your Gemini API Key
dotnet run
```
Backend will run at: `http://localhost:5000` (Swagger UI at: `http://localhost:5000/swagger`)

#### Frontend (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at: `http://localhost:3000`

---

## 🧪 Running Tests

Ensure all tests pass before submitting a Pull Request:

1. **Backend Tests (xUnit + FluentAssertions + Moq):**
   ```bash
   dotnet test backend/LyricPhonics.sln
   ```
2. **Frontend Tests (Vitest):**
   ```bash
   cd frontend && npm run test
   ```

---

## 📝 Coding Standards & Guidelines

- **Clean Architecture:** Keep domain entities decoupled from external libraries. Use interfaces in `LyricPhonics.Application` and implementations in `LyricPhonics.Infrastructure`.
- **Memory & Big-O:**
  - Avoid buffering full audio files into byte arrays (`byte[]`); use streaming (`Stream`).
  - Keep real-time line searches $O(\log N)$ with Binary Search.
- **Strong Typing & Zero `any`:**
  - C# 12 `record` immutable types for DTOs.
  - TypeScript strict mode (`strict: true`, no `any`).
- **Secret Isolation:** Never commit API keys or sensitive secrets to Git.

---

## 🚀 Submitting a Pull Request (PR)

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit changes using Conventional Commits: `git commit -m "feat(module): description"`
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a Pull Request against the `main` branch with a clear description of the problem and your solution.

---

## 💖 Community & Questions

Feel free to open an [Issue](https://github.com/thieuhoang2002/LyricPhonics/issues) or reach out via [LinkedIn](https://www.linkedin.com/in/thhoang0903). Thank you for making LyricPhonics better!
