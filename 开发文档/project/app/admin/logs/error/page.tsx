"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, Modal, Typography, Descriptions, message } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined, CheckOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ErrorLog { id: string; errorType: string; errorMessage: string; stackTrace: string | null; severity: string; resolved: boolean; resolvedAt: string | null; resolvedBy: string | null; ipAddress: string | null; createdAt: string; }

const severityOptions = [{ value: "", label: "全部" }, { value: "error", label: "错误" }, { value: "warning", label: "警告" }, { value: "critical", label: "严重" }];
const resolvedOptions = [{ value: "", label: "全部" }, { value: "false", label: "未解决" }, { value: "true", label: "已解决" }];

export default function ErrorLogsPage() {
  const [data, setData] = useState<ErrorLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchKeyword) params.append("keyword", searchKeyword);
      if (severity) params.append("severity", severity);
      if (resolved) params.append("resolved", resolved);
      if (dateRange && dateRange[0] && dateRange[1]) { params.append("startDate", dateRange[0].format("YYYY-MM-DD")); params.append("endDate", dateRange[1].format("YYYY-MM-DD")); }
      const res = await fetch(`/api/admin/logs/error?${params}`);
      const result = await res.json();
      if (result.success) { setData(result.data.logs); setPagination(result.data.pagination); }
    } catch { message.error("获取日志失败"); } finally { setLoading(false); }
  };

  const handleResolve = async (logId: string) => {
    try {
      const res = await fetch("/api/admin/logs/error", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logId }) });
      const result = await res.json();
      if (result.success) { message.success("标记已解决"); fetchLogs(pagination.page, pagination.pageSize); }
    } catch { message.error("操作失败"); }
  };

  const getSeverityColor = (sev: string) => { const colorMap: Record<string, string> = { critical: "red", error: "orange", warning: "yellow" }; return colorMap[sev] || "default"; };

  const columns: TableColumnsType<ErrorLog> = [
    { title: "时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss") },
    { title: "错误类型", dataIndex: "errorType", key: "errorType", render: (type: string) => <Tag color="red">{type}</Tag> },
    { title: "错误信息", dataIndex: "errorMessage", key: "errorMessage", ellipsis: true },
    { title: "严重程度", dataIndex: "severity", key: "severity", render: (sev: string) => <Tag color={getSeverityColor(sev)}>{sev}</Tag> },
    { title: "状态", dataIndex: "resolved", key: "resolved", render: (resolved: boolean) => <Tag color={resolved ? "green" : "red"}>{resolved ? "已解决" : "未解决"}</Tag> },
    { title: "操作", key: "action", width: 150, render: (_, record) => (
      <Space><Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedLog(record); setDetailVisible(true); }}>详情</Button>{!record.resolved && <Button type="link" icon={<CheckOutlined />} onClick={() => handleResolve(record.id)}>标记解决</Button>}</Space>
    )},
  ];

  return (
    <div>
      <Card>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item><Input placeholder="搜索关键词" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} prefix={<SearchOutlined />} style={{ width: 180 }} allowClear /></Form.Item>
          <Form.Item><Select value={severity} onChange={setSeverity} options={severityOptions} style={{ width: 120 }} placeholder="严重程度" /></Form.Item>
          <Form.Item><Select value={resolved} onChange={setResolved} options={resolvedOptions} style={{ width: 120 }} placeholder="解决状态" /></Form.Item>
          <Form.Item><RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} /></Form.Item>
          <Form.Item><Space><Button type="primary" icon={<SearchOutlined />} onClick={() => fetchLogs(1, pagination.pageSize)}>搜索</Button><Button icon={<ReloadOutlined />} onClick={() => { setSearchKeyword(""); setSeverity(""); setResolved(""); setDateRange(null); fetchLogs(1, pagination.pageSize); }}>重置</Button><Button icon={<ExportOutlined />}>导出</Button></Space></Form.Item>
        </Form>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: true, showTotal: (total) => `共 ${total} 条`, onChange: (page, pageSize) => fetchLogs(page, pageSize) }} />
      </Card>
      <Modal title="错误日志详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={800}>
        {selectedLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="日志ID" span={2}>{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="错误类型">{selectedLog.errorType}</Descriptions.Item>
            <Descriptions.Item label="严重程度"><Tag color={getSeverityColor(selectedLog.severity)}>{selectedLog.severity}</Tag></Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress || "-"}</Descriptions.Item>
            <Descriptions.Item label="解决状态"><Tag color={selectedLog.resolved ? "green" : "red"}>{selectedLog.resolved ? "已解决" : "未解决"}</Tag></Descriptions.Item>
            <Descriptions.Item label="错误信息" span={2}><Text type="danger">{selectedLog.errorMessage}</Text></Descriptions.Item>
            <Descriptions.Item label="堆栈跟踪" span={2}><pre style={{ maxHeight: 200, overflow: "auto", background: "#f5f5f5", padding: 8 }}>{selectedLog.stackTrace || "-"}</pre></Descriptions.Item>
            <Descriptions.Item label="解决时间">{selectedLog.resolvedAt ? dayjs(selectedLog.resolvedAt).format("YYYY-MM-DD HH:mm") : "-"}</Descriptions.Item>
            <Descriptions.Item label="解决人">{selectedLog.resolvedBy || "-"}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(selectedLog.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
