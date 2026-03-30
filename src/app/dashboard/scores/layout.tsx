import type { Metadata } from "next";

export const metadata: Metadata = { title: "성적 관리" };

export default function ScoresLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
