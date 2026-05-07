"use client";

import React, { useState, useEffect } from "react";
import { Card, Form, Input, Switch, Button, InputNumber, Space, message, App, Typography, Divider } from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message: antdMessage } = App.useApp();

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        form.setFieldsValue({
          systemName: data.data.systemName || "课程达成度管理系统",
          systemDescription: data.data.systemDescription || "",
          logRetentionDays: parseInt(data.data.logRetentionDays) || 30,
          autoBackupEnabled: data.data.autoBackupEnabled === "true",
        });
      }
    } catch { antdMessage.error("获取设置失败"); }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: values }) });
      const data = await res.json();
      if (data.success) antdMessage.success("设置保存成功"); else antdMessage.error(data.message || "保存失败");
    } catch { antdMessage.error("网络错误"); } finally { setLoading(false); }
  };

  return (
    <div>
      <Card>
        <Title level={5}>系统基础设置</Title>
        <Text type="secondary">配置后台系统的基础信息</Text>
        <Divider />
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ systemName: "课程达成度管理系统", systemDescription: "", logRetentionDays: 30, autoBackupEnabled: false }} style={{ maxWidth: 600 }}>
          <Form.Item label="系统名称" name="systemName" rules={[{ required: true, message: "请输入系统名称" }]}><Input placeholder="请输入系统名称" /></Form.Item>
          <Form.Item label="系统描述" name="systemDescription"><Input.TextArea placeholder="请输入系统描述信息" rows={3} /></Form.Item>
          <Divider /><Title level={5}>日志管理设置</Title>
          <Form.Item label="日志保留天数" name="logRetentionDays" extra="超过此天数的日志将被自动清理"><InputNumber min={1} max={365} style={{ width: 200 }} /></Form.Item>
          <Divider /><Title level={5}>备份设置</Title>
          <Form.Item label="启用自动备份" name="autoBackupEnabled" valuePropName="checked" extra="开启后系统将按设定频率自动备份数据"><Switch /></Form.Item>
          <Divider />
          <Form.Item style={{ marginBottom: 0 }}><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>保存设置</Button></Form.Item>
        </Form>
      </Card>
    </div>
  );
}
