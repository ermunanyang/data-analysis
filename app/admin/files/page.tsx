"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, Modal, message, App, Typography } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined, FileOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

interface FileRecord {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileCategory: string;
  uploadedBy: string | null;
  uploadedAt: string;
  description: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const fileTypeOptions = [
  { value: "", label: "全部" },
  { value: "xlsx", label: "Excel" },
  { value: "pdf", label: "PDF" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "docx", label: "Word" },
];

const fileCategoryOptions = [
  { value: "", label: "全部" },
  { value: "excel", label: "Excel文件" },
  { value: "pdf", label: "PDF文件" },
  { value: "image", label: "图片" },
  { value: "document", label: "文档" },
  { value: "backup", label: "备份文件" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function FilesPage() {
  const [data, setData] = useState<FileRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileCategory, setFileCategory] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { message: antdMessage } = App.useApp();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchKeyword) params.append("keyword", searchKeyword);
      if (fileType) params.append("fileType", fileType);
      if (fileCategory) params.append("fileCategory", fileCategory);
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await fetch(`/api/admin/files?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data.files);
        setPagination(result.data.pagination);
      }
    } catch {
      antdMessage.error("获取文件列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchFiles(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword("");
    setFileType("");
    setFileCategory("");
    setDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchFiles(1, pagination.pageSize);
  };

  const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch(`/api/admin/files?fileId=${fileId}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        antdMessage.success("文件删除成功");
        fetchFiles(pagination.page, pagination.pageSize);
      }
    } catch {
      antdMessage.error("删除失败");
    }
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = fileName;
    link.click();
  };

  const getFileTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      xlsx: "green",
      pdf: "red",
      png: "blue",
      jpg: "cyan",
      jpeg: "cyan",
      docx: "purple",
      doc: "purple",
      zip: "orange",
      rar: "orange",
    };
    return colorMap[type.toLowerCase()] || "default";
  };

  const columns: TableColumnsType<FileRecord> = [
    {
      title: "文件名",
      dataIndex: "originalName",
      key: "originalName",
      render: (name: string, record) => (
        <Space>
          <FileOutlined />
          <Text ellipsis={{ tooltip: name }} style={{ maxWidth: 200 }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: "文件类型",
      dataIndex: "fileType",
      key: "fileType",
      render: (type: string) => <Tag color={getFileTypeColor(type)}>{type.toUpperCase()}</Tag>,
    },
    {
      title: "文件大小",
      dataIndex: "fileSize",
      key: "fileSize",
      render: (size: number) => formatFileSize(size),
    },
    {
      title: "分类",
      dataIndex: "fileCategory",
      key: "fileCategory",
    },
    {
      title: "上传时间",
      dataIndex: "uploadedAt",
      key: "uploadedAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.filePath, record.originalName)}
          >
            下载
          </Button>
          <Button
            type="link"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item>
            <Input
              placeholder="搜索文件名"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 180 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={fileType}
              onChange={setFileType}
              options={fileTypeOptions}
              style={{ width: 120 }}
              placeholder="文件类型"
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={fileCategory}
              onChange={setFileCategory}
              options={fileCategoryOptions}
              style={{ width: 120 }}
              placeholder="文件分类"
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
            onChange: (page, pageSize) => fetchFiles(page, pageSize),
          }}
        />
      </Card>
    </div>
  );
}
