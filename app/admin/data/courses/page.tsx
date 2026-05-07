"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Form, Input, Select, Button, DatePicker, Space, Tag, Typography } from "antd";
import { SearchOutlined, ReloadOutlined, ExportOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface Course {
  id: string;
  courseName: string;
  courseCode: string;
  semester: string;
  className: string;
  teacherNames: string | null;
  ownerTeacher: string | null;
  department: string | null;
  major: string | null;
  credit: string | null;
  selectedCount: number;
  evaluatedCount: number;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  studentCount: number;
  targetCount: number;
  methodCount: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function DataCoursesPage() {
  const [data, setData] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [semester, setSemester] = useState("");
  const [courseName, setCourseName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (semester) params.append("semester", semester);
      if (courseName) params.append("courseName", courseName);
      if (teacher) params.append("teacher", teacher);
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
        params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await fetch(`/api/admin/data/courses?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data.courses);
        setPagination(result.data.pagination);
      }
    } catch {
      console.error("获取课程列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchCourses(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSemester("");
    setCourseName("");
    setTeacher("");
    setDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchCourses(1, pagination.pageSize);
  };

  const columns: TableColumnsType<Course> = [
    {
      title: "课程名称",
      dataIndex: "courseName",
      key: "courseName",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "课程代码",
      dataIndex: "courseCode",
      key: "courseCode",
    },
    {
      title: "学期",
      dataIndex: "semester",
      key: "semester",
      render: (semester: string) => <Tag color="blue">{semester}</Tag>,
    },
    {
      title: "班级",
      dataIndex: "className",
      key: "className",
    },
    {
      title: "授课教师",
      dataIndex: "teacherNames",
      key: "teacherNames",
      render: (teacher: string | null) => teacher || "-",
    },
    {
      title: "学分",
      dataIndex: "credit",
      key: "credit",
    },
    {
      title: "学生数",
      dataIndex: "studentCount",
      key: "studentCount",
    },
    {
      title: "指标点数",
      dataIndex: "targetCount",
      key: "targetCount",
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "所属用户",
      dataIndex: "username",
      key: "username",
      render: (username: string | null) => username || "-",
    },
  ];

  return (
    <div>
      <Card>
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item>
            <Input
              placeholder="搜索课程名称"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 180 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Input
              placeholder="搜索教师"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              style={{ width: 140 }}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Input
              placeholder="学期"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{ width: 120 }}
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
            onChange: (page, pageSize) => fetchCourses(page, pageSize),
          }}
        />
      </Card>
    </div>
  );
}
