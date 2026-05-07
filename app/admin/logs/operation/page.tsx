"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, Modal, Typography, Descriptions } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface OperationLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  module: string;
  description: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  requestParams: string | null;
  responseStatus: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const moduleOptions = [
  { value: "", label: "全部" },
  { value: "auth", label: "认证" },
  { value: "course", label: "课程" },
  { value: "score", label: "成绩" },
  { value: "export", label: "导出" },
  { value: "import", label: "导入" },
];

const actionOptions = [
  { value: "", label: "全部" },
  { value: "login", label: "登录" },
  { value: "logout", label: "退出" },
  { value: "create", label: "创建" },
  { value: "update", label: "更新" },
  { value: "delete", label: "删除" },
  { value: "export", label: "导出" },
  { value: "import", label: "导入" },
];

export default function OperationLogsPage() {
  const [data, setData] = useState<OperationLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchKeyword) params.append("keyword", searchKeyword);
      if (module) params.append("module", module);
      if (action) params.append("action", action);
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await fetch(`/api/admin/logs/operation?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data.logs);
        setPagination(result.data.pagination);
      }
    } catch {
      console.error("获取日志失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword("");
    setModule("");
    setAction("");
    setDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLogs(1, pagination.pageSize);
  };

  const handleViewDetail = (log: OperationLog) => {
    setSelectedLog(log);
    setDetailVisible(true);
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      login: "green",
      logout: "default",
      create: "blue",
      update: "orange",
      delete: "red",
      export: "purple",
      import: "cyan",
    };
    return colorMap[action] || "default";
  };

  const columns: TableColumnsType<OperationLog> = [
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      render: (username: string | null) => username || "-",
    },
    {
      title: "模块",
      dataIndex: "module",
      key: "module",
      render: (module: string) => <Tag>{module}</Tag>,
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      render: (action: string) => <Tag color={getActionColor(action)}>{action}</Tag>,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 140,
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item>
            <Input
              placeholder="搜索关键词"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 180 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={module}
              onChange={setModule}
              options={moduleOptions}
              style={{ width: 120 }}
              placeholder="选择模块"
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={action}
              onChange={setAction}
              options={actionOptions}
              style={{ width: 120 }}
              placeholder="选择操作"
            />
          </Form.Item>
          <Form.Item>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
              <Button icon={<ExportOutlined />}>导出</Button>
            </Space>
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => fetchLogs(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title="操作日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="日志ID" span={2}>{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="用户">{selectedLog.username || "-"}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedLog.userId || "-"}</Descriptions.Item>
            <Descriptions.Item label="模块">{selectedLog.module}</Descriptions.Item>
            <Descriptions.Item label="操作">{selectedLog.action}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{selectedLog.description || "-"}</Descriptions.Item>
            <Descriptions.Item label="请求路径" span={2}>{selectedLog.requestPath || "-"}</Descriptions.Item>
            <Descriptions.Item label="请求方法">{selectedLog.requestMethod || "-"}</Descriptions.Item>
            <Descriptions.Item label="响应状态">{selectedLog.responseStatus || "-"}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress || "-"}</Descriptions.Item>
            <Descriptions.Item label="User-Agent" span={2}>
              <Text ellipsis={{ tooltip: selectedLog.userAgent }}>{selectedLog.userAgent || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="请求参数" span={2}>
              <pre style={{ maxHeight: 200, overflow: "auto" }}>
                {selectedLog.requestParams || "-"}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedLog.createdAt).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
