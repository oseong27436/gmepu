import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "지메뿌 — 지도에 메모 뿌리기",
  description: "주변 사람들이 남긴 메모를 지도에서 발견해보세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
