"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, Modal, Typography, Descriptions } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ApiLog { id: string; requestPath: string; requestMethod: string; requestParams: string | null; responseStatus: number | null; responseTime: number | null; requestIp: string | null; username: string | null; apiModule: string | null; createdAt: string; }

const methodOptions = [{ value: "", label: "全部" }, { value: "GET", label: "GET" }, { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }, { value: "DELETE", label: "DELETE" }];
const moduleOptions = [{ value: "", label: "全部" }, { value: "courses", label: "课程" }, { value: "scores", label: "成绩" }, { value: "auth", label: "认证" }];
const statusOptions = [{ value: "", label: "全部" }, { value: "200", label: "成功" }, { value: "400", label: "客户端错误" }, { value: "500", label: "服务端错误" }];

export default function ApiLogsPage() {
  const [data, setData] = useState<ApiLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [method, setMethod] = useState("");
  const [apiModule, setApiModule] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (ipAddress) params.append("ipAddress", ipAddress);
      if (method) params.append("method", method);
      if (apiModule) params.append("apiModule", apiModule);
      if (status) params.append("status", status);
      if (dateRange && dateRange[0] && dateRange[1]) { params.append("startDate", dateRange[0].format("YYYY-MM-DD")); params.append("endDate", dateRange[1].format("YYYY-MM-DD")); }
      const res = await fetch(`/api/admin/logs/api?${params}`);
      const result = await res.json();
      if (result.success) { setData(result.data.logs); setPagination(result.data.pagination); }
    } catch {} finally { setLoading(false); }
  };

  const getMethodColor = (m: string) => { const colorMap: Record<string, string> = { GET: "green", POST: "blue", PUT: "orange", DELETE: "red" }; return colorMap[m] || "default"; };
  const getStatusColor = (status: number | null) => { if (!status) return "default"; if (status >= 200 && status < 300) return "green"; if (status >= 400 && status < 500) return "orange"; if (status >= 500) return "red"; return "default"; };

  const columns: TableColumnsType<ApiLog> = [
    { title: "时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss") },
    { title: "请求方法", dataIndex: "requestMethod", key: "requestMethod", render: (method: string) => <Tag color={getMethodColor(method)}>{method}</Tag> },
    { title: "请求路径", dataIndex: "requestPath", key: "requestPath", ellipsis: true },
    { title: "模块", dataIndex: "apiModule", key: "apiModule", render: (module: string | null) => module || "-" },
    { title: "响应状态", dataIndex: "responseStatus", key: "responseStatus", render: (status: number | null) => <Tag color={getStatusColor(status)}>{status || "-"}</Tag> },
    { title: "响应时间", dataIndex: "responseTime", key: "responseTime", render: (time: number | null) => time ? `${time}ms` : "-" },
    { title: "IP地址", dataIndex: "requestIp", key: "requestIp" },
    { title: "操作", key: "action", width: 80, render: (_, record) => <Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedLog(record); setDetailVisible(true); }}>详情</Button> },
  ];

  return (
    <div>
      <Card>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item><Input placeholder="IP地址" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} style={{ width: 140 }} allowClear /></Form.Item>
          <Form.Item><Select value={method} onChange={setMethod} options={methodOptions} style={{ width: 100 }} placeholder="请求方法" /></Form.Item>
          <Form.Item><Select value={apiModule} onChange={setApiModule} options={moduleOptions} style={{ width: 120 }} placeholder="模块" /></Form.Item>
          <Form.Item><Select value={status} onChange={setStatus} options={statusOptions} style={{ width: 120 }} placeholder="状态" /></Form.Item>
          <Form.Item><RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} /></Form.Item>
          <Form.Item><Space><Button type="primary" icon={<SearchOutlined />} onClick={() => fetchLogs(1, pagination.pageSize)}>搜索</Button><Button icon={<ReloadOutlined />} onClick={() => { setIpAddress(""); setMethod(""); setApiModule(""); setStatus(""); setDateRange(null); fetchLogs(1, pagination.pageSize); }}>重置</Button><Button icon={<ExportOutlined />}>导出</Button></Space></Form.Item>
        </Form>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: true, showTotal: (total) => `共 ${total} 条`, onChange: (page, pageSize) => fetchLogs(page, pageSize) }} />
      </Card>
      <Modal title="API访问日志详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={700}>
        {selectedLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="日志ID" span={2}>{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="请求方法"><Tag color={getMethodColor(selectedLog.requestMethod)}>{selectedLog.requestMethod}</Tag></Descriptions.Item>
            <Descriptions.Item label="响应状态"><Tag color={getStatusColor(selectedLog.responseStatus)}>{selectedLog.responseStatus || "-"}</Tag></Descriptions.Item>
            <Descriptions.Item label="请求路径" span={2}>{selectedLog.requestPath}</Descriptions.Item>
            <Descriptions.Item label="模块">{selectedLog.apiModule || "-"}</Descriptions.Item>
            <Descriptions.Item label="响应时间">{selectedLog.responseTime ? `${selectedLog.responseTime}ms` : "-"}</Descriptions.Item>
            <Descriptions.Item label="用户">{selectedLog.username || "-"}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.requestIp || "-"}</Descriptions.Item>
            <Descriptions.Item label="User-Agent" span={2}><Text ellipsis={{ tooltip: selectedLog.userAgent }}>{selectedLog.userAgent || "-"}</Text></Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(selectedLog.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
