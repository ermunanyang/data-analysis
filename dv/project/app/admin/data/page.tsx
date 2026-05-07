"use client";

import React from "react";
import { Card, Typography, Row, Col, Table, Tag } from "antd";
import { DatabaseOutlined, BookOutlined, UserOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";

const { Title, Text } = Typography;

export default function DataPage() {
  return (
    <div>
      <Title level={3}>业务数据管理</Title>
      <Text type="secondary">集中管理现有Web端业务数据</Text>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <div style={{ textAlign: "center", padding: 20 }}>
              <BookOutlined style={{ fontSize: 48, color: "#1677ff" }} />
              <Title level={4}>课程数据</Title>
              <Text type="secondary">查看和管理所有课程信息</Text>
            </div>
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 24 }} title="数据概览">
        <Text>请通过左侧菜单选择具体的数据类型进行管理</Text>
      </Card>
    </div>
  );
}
