"use client";

import React, { useState, useEffect } from "react";
import { Tabs, Card, Form, Input, Button, Table, message, App, Typography, Tag } from "antd";
import { useSearchParams } from "next/navigation";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

interface LoginRecord {
  id: string;
  loginTime: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginStatus: string;
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("password");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const { message: antdMessage } = App.useApp();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "password") {
      setActiveTab("password");
    } else if (tab === "records") {
      setActiveTab("records");
      fetchLoginRecords();
    }
  }, [searchParams]);

  const handlePasswordChange = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      antdMessage.error("两次输入的密码不一致");
      return;
    }
    if (values.newPassword.length < 6) {
      antdMessage.error("新密码长度不能少于6位");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        antdMessage.success("密码修改成功");
      } else {
        antdMessage.error(data.message || "修改失败");
      }
    } catch {
      antdMessage.error("网络错误");
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchLoginRecords = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/account/login-records?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      if (data.success) {
        setLoginRecords(data.data.records);
        setPagination({
          current: data.data.pagination.page,
          pageSize: data.data.pagination.pageSize,
          total: data.data.pagination.total,
        });
      }
    } catch {
      antdMessage.error("获取登录记录失败");
    } finally {
      setLoading(false);
    }
  };

  const loginColumns: TableColumnsType<LoginRecord> = [
    {
      title: "登录时间",
      dataIndex: "loginTime",
      key: "loginTime",
      render: (time: string) => new Date(time).toLocaleString("zh-CN"),
    },
    { title: "IP地址", dataIndex: "ipAddress", key: "ipAddress" },
    {
      title: "登录状态",
      dataIndex: "loginStatus",
      key: "loginStatus",
      render: (status: string) => (
        <Tag color={status === "success" ? "green" : "red"}>
          {status === "success" ? "成功" : "失败"}
        </Tag>
      ),
    },
    {
      title: "设备信息",
      dataIndex: "userAgent",
      key: "userAgent",
      ellipsis: true,
    },
  ];

  const tabItems = [
    {
      key: "password",
      label: "修改密码",
      children: (
        <Card style={{ maxWidth: 500 }}>
          <Title level={5}>修改登录密码</Title>
          <Text type="secondary">为保障账户安全，建议定期更换密码</Text>
          <Form layout="vertical" onFinish={handlePasswordChange} style={{ marginTop: 24 }}>
            <Form.Item
              name="oldPassword"
              label="旧密码"
              rules={[{ required: true, message: "请输入旧密码" }]}
            >
              <Input.Password placeholder="请输入旧密码" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: "请输入新密码" },
                { min: 6, message: "密码长度不能少于6位" },
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              rules={[{ required: true, message: "请确认新密码" }]}
            >
              <Input.Password placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={passwordLoading}>
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: "records",
      label: "登录记录",
      children: (
        <Card>
          <Title level={5}>登录历史</Title>
          <Text type="secondary">查看您的登录历史记录</Text>
          <Table
            columns={loginColumns}
            dataSource={loginRecords}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => fetchLoginRecords(page, pageSize),
            }}
            style={{ marginTop: 16 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>管理员账号</Title>
      <Text type="secondary">管理您的账号信息和安全设置</Text>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: 24 }}
      />
    </div>
  );
}
