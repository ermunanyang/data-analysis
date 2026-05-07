"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Button, DatePicker, Space, message, App, Tag, Modal, Descriptions } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined, EyeOutlined, KeyOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface User {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  courseCount: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { message: antdMessage } = App.useApp();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchKeyword) {
        params.append("keyword", searchKeyword);
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await fetch(`/api/admin/users?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data.users);
        setPagination(result.data.pagination);
      }
    } catch {
      antdMessage.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchKeyword("");
    setDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers(1, pagination.pageSize);
  };

  const handleViewDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/detail?userId=${userId}`);
      const result = await res.json();
      if (result.success) {
        setSelectedUser(result.data);
        setUserDetailVisible(true);
      }
    } catch {
      antdMessage.error("获取用户详情失败");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await res.json();
      if (result.success) {
        antdMessage.success(result.message);
      } else {
        antdMessage.error(result.message);
      }
    } catch {
      antdMessage.error("重置密码失败");
    }
  };

  const maskString = (str: string, visibleStart = 3, visibleEnd = 4) => {
    if (!str) return "";
    if (str.length <= visibleStart + visibleEnd) return str;
    return str.slice(0, visibleStart) + "***" + str.slice(-visibleEnd);
  };

  const columns: TableColumnsType<User> = [
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      render: (username: string) => <Tag color="blue">{maskString(username)}</Tag>,
    },
    {
      title: "注册时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "课程数量",
      dataIndex: "courseCount",
      key: "courseCount",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: () => <Tag color="green">正常</Tag>,
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
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
              placeholder="搜索用户名"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              allowClear
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
            onChange: (page, pageSize) => fetchUsers(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title="用户详情"
        open={userDetailVisible}
        onCancel={() => setUserDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedUser && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="用户名">{selectedUser.username}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedUser.id}</Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {dayjs(selectedUser.createdAt).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {dayjs(selectedUser.updatedAt).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label="课程数量" span={2}>
              {selectedUser.courses?.length || 0}
            </Descriptions.Item>
            <Descriptions.Item label="最近登录" span={2}>
              {selectedUser.sessions?.[0]
                ? dayjs(selectedUser.sessions[0].createdAt).format("YYYY-MM-DD HH:mm")
                : "暂无记录"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
