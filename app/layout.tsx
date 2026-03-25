import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "课程达成度在线管理",
  description: "支持在线填写、计算预览、保存回显和导出课程达成度 Excel 报告",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
