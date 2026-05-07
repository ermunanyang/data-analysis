"use client";

import React from "react";
import { ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 6,
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
};

export default function AntdConfig({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider theme={theme}>{children}</ConfigProvider>
    </StyleProvider>
  );
}
