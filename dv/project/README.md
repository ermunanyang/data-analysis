# 单管理员版Web后台管理系统

基于已有Web端系统开发的后台管理系统，采用前后端分离架构，前端使用Ant Design风格。

## 系统架构

### 技术栈
- **前端框架**: Next.js 16 (App Router)
- **UI组件库**: Ant Design 5
- **后端框架**: Next.js API Routes
- **数据库ORM**: Prisma
- **数据库**: SQLite (开发环境)

### 目录结构

```
project/
├── app/                          # Next.js App Router
│   ├── admin/                    # 后台管理页面
│   │   ├── account/              # 管理员账号管理
│   │   ├── dashboard/           # 仪表盘
│   │   ├── data/                # 业务数据管理
│   │   ├── files/               # 文件管理
│   │   ├── logs/                # 日志管理
│   │   ├── settings/            # 系统设置
│   │   ├── users/               # 前台用户管理
│   │   └── login/               # 登录页面
│   └── api/                     # API路由
│       └── admin/               # 后台管理API
├── components/                   # React组件
├── lib/                         # 工具库
└── prisma/                      # 数据库模型
```

## 功能模块

### 1. 管理员账号管理
- 超级管理员登录/登出
- 修改登录密码
- 查看登录历史记录（含登录时间、IP、设备）

### 2. 前台用户管理
- 分页展示所有用户
- 关键词模糊搜索
- 按注册时间筛选
- 查看用户详情
- 重置用户密码
- 用户数据导出

### 3. 日志管理
- **操作日志**: 记录用户登录、退出及各类功能操作
- **错误日志**: 记录系统异常、程序报错，支持标记已解决
- **接口日志**: 记录所有API请求，包含请求参数、响应状态、耗时、IP

所有日志支持：
- 时间范围筛选
- 关键词检索
- 数据导出

### 4. 文件管理
- 文件列表展示
- 按类型/分类筛选
- 在线预览
- 下载功能
- 删除功能

### 5. 业务数据管理
- 课程数据集中展示
- 多条件筛选（学期、课程名、教师）
- 查看数据详情
- 数据导出

### 6. 系统设置
- 系统名称配置
- 系统描述
- 日志保留天数设置
- 自动备份开关

## 数据库模型

### 管理员相关
- `Admin`: 管理员账号
- `AdminLoginRecord`: 管理员登录记录

### 日志相关
- `UserOperationLog`: 用户操作日志
- `SystemErrorLog`: 系统错误日志
- `ApiAccessLog`: API访问日志

### 数据相关
- `FileRecord`: 文件记录
- `AdminSetting`: 系统设置
- `DataBackup`: 数据备份记录

### 业务数据（复用原系统）
- `User`: 前台用户
- `Course`: 课程
- `Session`: 会话

## 安装部署

### 1. 安装依赖
```bash
pnpm install
```

### 2. 初始化数据库
```bash
pnpm db:push     # 创建数据库表
pnpm db:seed     # 创建管理员账号
```

### 3. 启动开发服务器
```bash
pnpm dev
```

### 4. 访问系统
- 后台管理: http://localhost:3000/admin
- 默认管理员: admin / admin123

## 默认管理员账号

- **用户名**: admin
- **密码**: admin123

**请及时修改默认密码！**

## 全局通用功能

所有功能页面标配：
- 分页展示
- 关键词模糊搜索
- 时间范围筛选
- 操作行为留痕
- 敏感信息脱敏（如手机号、账号部分字符隐藏）

## 安全性

- 管理员密码加密存储（scrypt算法）
- HTTP-only Cookie会话管理
- 所有操作全程留痕
- 敏感数据脱敏展示
- 备份文件安全下载

## 开发指南

### 添加新的API路由
在 `app/api/admin/` 下创建新的路由文件：

```typescript
// app/api/admin/example/route.ts
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
  }
  // 业务逻辑
  return NextResponse.json({ success: true, data: {} });
}
```

### 添加新的管理页面
在 `app/admin/` 下创建新的页面：

```tsx
// app/admin/example/page.tsx
"use client";
import { Card, Typography } from "antd";
const { Title } = Typography;

export default function ExamplePage() {
  return (
    <div>
      <Title level={3}>页面标题</Title>
      <Card>页面内容</Card>
    </div>
  );
}
```

## 注意事项

1. 本系统仅支持单管理员账号，不支持多用户
2. 所有管理操作都会记录日志
3. 定期备份数据库文件 `prisma/dev.db`
4. 生产环境请更换数据库为MySQL/PostgreSQL
