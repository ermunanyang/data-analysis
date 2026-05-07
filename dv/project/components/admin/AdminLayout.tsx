"use client";

import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, Avatar, Dropdown } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  BugOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useRouter, usePathname } from "next/navigation";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; username: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  const fetchCurrentAdmin = async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      const data = await res.json();
      if (data.success) {
        setCurrentAdmin(data.data);
      } else if (pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    } catch {
      if (pathname !== "/admin/login") router.push("/admin/login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const menuItems: MenuProps["items"] = [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "仪表盘" },
    { key: "/admin/account", icon: <UserOutlined />, label: "管理员账号" },
    { key: "/admin/users", icon: <UserOutlined />, label: "前台用户" },
    {
      key: "logs", icon: <HistoryOutlined />, label: "日志管理",
      children: [
        { key: "/admin/logs/operation", icon: <FileOutlined />, label: "操作日志" },
        { key: "/admin/logs/error", icon: <BugOutlined />, label: "错误日志" },
        { key: "/admin/logs/api", icon: <ApiOutlined />, label: "接口日志" },
      ],
    },
    { key: "/admin/files", icon: <FileOutlined />, label: "文件管理" },
    { key: "/admin/data", icon: <DatabaseOutlined />, label: "业务数据" },
    { key: "/admin/settings", icon: <SettingOutlined />, label: "系统设置" },
  ];

  const userMenuItems: MenuProps["items"] = [
    { key: "change-password", icon: <SettingOutlined />, label: "修改密码" },
    { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
  ];

  const handleUserMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") handleLogout();
    else if (key === "change-password") router.push("/admin/account?tab=password");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ overflow: "auto", height: "100vh", position: "fixed", left: 0, top: 0, bottom: 0, borderRight: "1px solid #f0f0f0" }}
      >
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? 0 : "0 16px", borderBottom: "1px solid #f0f0f0" }}>
          <Title level={4} style={{ margin: 0 }}>{collapsed ? "后台" : "后台管理系统"}</Title>
        </div>
        <Menu mode="inline" selectedKeys={[pathname]} items={menuItems} onClick={({ key }) => router.push(key)} style={{ borderRight: 0, marginTop: 8 }} />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: "margin-left 0.2s" }}>
        <Header style={{ padding: "0 24px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ fontSize: 18, cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#1677ff" }} />
              <span>{currentAdmin?.username || "加载中..."}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: "#f5f5f5", minHeight: "calc(100vh - 64px)" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
