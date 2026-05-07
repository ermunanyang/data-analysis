import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "后台管理系统",
  description: "单管理员版Web后台管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
