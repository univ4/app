import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "univ4 — AI 대입 전략 플랫폼",
    template: "%s | univ4",
  },
  description:
    "AI 기반 대입 전략 플랫폼. 합격 가능성 신호등, AI 요강 챗봇, 원서 배분 시뮬레이터로 대입을 준비하세요.",
  keywords: ["대입", "수시", "정시", "입시", "AI", "합격"],
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
