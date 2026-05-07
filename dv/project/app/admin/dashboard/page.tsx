"use client";

import React, { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, message } from "antd";
import { UserOutlined, BookOutlined, FileTextOutlined, WarningOutlined, ApiOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

interface DashboardStats {
  userCount: number;
  courseCount: number;
  operationLogCount: number;
  errorLogCount: number;
  apiLogCount: number;
  recentErrors: Array<{ id: string; errorType: string; errorMessage: string; severity: string; createdAt: string }>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/statistics");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch { message.error("获取统计数据失败"); }
    finally { setLoading(false); }
  };

  const errorColumns: TableColumnsType<DashboardStats["recentErrors"][0]> = [
    { title: "错误类型", dataIndex: "errorType", key: "errorType" },
    { title: "错误信息", dataIndex: "errorMessage", key: "errorMessage", ellipsis: true },
    { title: "严重程度", dataIndex: "severity", key: "severity", render: (severity: string) => <Tag color={severity === "critical" ? "red" : severity === "error" ? "orange" : "yellow"}>{severity}</Tag> },
    { title: "发生时间", dataIndex: "createdAt", key: "createdAt" },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;

  return (
    <div>
      <Title level={3}>仪表盘</Title>
      <Text type="secondary">系统运行状态概览</Text>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="用户总数" value={stats?.userCount || 0} prefix={<UserOutlined style={{ color: "#1677ff" }} />} valueStyle={{ color: "#1677ff" }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="课程总数" value={stats?.courseCount || 0} prefix={<BookOutlined style={{ color: "#52c41a" }} />} valueStyle={{ color: "#52c41a" }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="操作日志" value={stats?.operationLogCount || 0} prefix={<FileTextOutlined style={{ color: "#722ed1" }} />} valueStyle={{ color: "#722ed1" }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="接口调用" value={stats?.apiLogCount || 0} prefix={<ApiOutlined style={{ color: "#fa8c16" }} />} valueStyle={{ color: "#fa8c16" }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="错误日志" value={stats?.errorLogCount || 0} prefix={<WarningOutlined style={{ color: "#f5222d" }} />} valueStyle={{ color: stats?.errorLogCount && stats.errorLogCount > 0 ? "#f5222d" : "#52c41a" }} /></Card></Col>
      </Row>
      <Card style={{ marginTop: 24 }} title="最近错误"><Table columns={errorColumns} dataSource={stats?.recentErrors || []} rowKey="id" pagination={false} locale={{ emptyText: "暂无错误日志" }} /></Card>
    </div>
  );
}
