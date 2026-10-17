import type { Metadata } from "next";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "LyricPhonics - Phiên Âm Lời Bài Hát Quốc Tế Sang Tiếng Việt",
  description: "Web app phiên âm lời bài hát tiếng Trung, Hàn, Nhật, Anh sang tiếng Việt bồi chuẩn ngữ âm và nhịp điệu để hát cover bằng Gemini Multimodal Audio",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
