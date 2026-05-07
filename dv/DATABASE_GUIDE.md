# 数据库配置与说明文档

> 课程达成度管理系统数据库详细说明

---

## 目录

- [一、数据库概述](#一数据库概述)
- [二、数据库文件说明](#二数据库文件说明)
- [三、数据表结构](#三数据表结构)
- [四、数据库操作](#四数据库操作)
- [五、数据迁移与备份](#五数据迁移与备份)
- [六、常见问题](#六常见问题)

---

## 一、数据库概述

### 1.1 数据库类型

本系统使用 **SQLite** 作为默认数据库，特点：

| 特性 | 说明 |
|------|------|
| 文件型数据库 | 所有数据存储在单个文件中 |
| 零配置 | 无需安装数据库服务器 |
| 轻量级 | 适合中小型应用 |
| 跨平台 | 支持 Windows/Mac/Linux |

### 1.2 数据库位置

```
项目根目录/
├── prisma/
│   ├── dev.db              # SQLite 数据库文件（实际数据）
│   ├── schema.prisma       # 数据库表结构定义
│   ├── seed-admin.ts       # 初始化脚本
│   └── migrations/         # 数据库迁移文件
```

### 1.3 连接配置

在 `.env.local` 文件中配置：

```env
DATABASE_URL="file:./prisma/dev.db"
```

---

## 二、数据库文件说明

### 2.1 主要文件

| 文件 | 说明 | 是否需要备份 |
|------|------|-------------|
| `prisma/dev.db` | SQLite 数据库主文件 | ✅ **非常重要** |
| `prisma/schema.prisma` | 数据表结构定义 | ✅ 建议备份 |
| `prisma/dev.db-journal` | SQLite 事务日志（运行时生成） | 不需要 |

### 2.2 数据库文件大小估算

| 数据规模 | 估计大小 |
|---------|---------|
| 1-10 门课程，100-500 学生 | < 10 MB |
| 10-50 门课程，500-2000 学生 | 10-50 MB |
| 50+ 门课程，2000+ 学生 | 50-200 MB |

---

## 三、数据表结构

### 3.1 数据表总览

系统包含以下数据表：

| 表名 | 说明 | 属于哪个系统 |
|------|------|-------------|
| User | 前台用户账户 | 前台系统 |
| Session | 用户会话 | 前台系统 |
| Course | 课程数据 | 前台系统 |
| CourseTarget | 课程指标点 | 前台系统 |
| AssessmentMethod | 考核方法 | 前台系统 |
| Student | 学生信息 | 前台系统 |
| StudentScore | 学生成绩 | 前台系统 |
| ExamQuestion | 试题配置 | 前台系统 |
| IndirectEvaluation | 间接评价 | 前台系统 |
| TargetMethodConfig | 指标-方法配置 | 前台系统 |
| Admin | 管理员账户 | 后台管理系统 |
| AdminLoginRecord | 管理员登录记录 | 后台管理系统 |
| AdminSetting | 系统设置 | 后台管理系统 |
| UserOperationLog | 用户操作日志 | 后台管理系统 |
| ApiAccessLog | API 访问日志 | 后台管理系统 |
| SystemErrorLog | 系统错误日志 | 后台管理系统 |
| FileRecord | 文件记录 | 后台管理系统 |
| DataBackup | 数据备份 | 后台管理系统 |

### 3.2 核心数据表详情

#### User 表（前台用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 用户唯一ID |
| username | String | 用户名（唯一） |
| passwordHash | String | 加密后的密码 |
| apiKeyEncrypted | String | 加密的API密钥 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Admin 表（管理员）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 管理员唯一ID |
| username | String | 管理员用户名（唯一） |
| passwordHash | String | 加密后的密码 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Course 表（课程）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 课程唯一ID |
| userId | String | 创建课程的用户ID |
| courseName | String | 课程名称 |
| courseCode | String | 课程代码 |
| semester | String | 学期 |
| className | String | 班级名称 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Student 表（学生）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 学生唯一ID |
| courseId | String | 所属课程ID |
| studentNo | String | 学号 |
| studentName | String | 学生姓名 |
| className | String | 班级 |
| majorName | String | 专业 |

---

## 四、数据库操作

### 4.1 初始化数据库

首次部署时执行：

```bash
# 1. 创建数据库表结构
pnpm db:push

# 2. 初始化管理员和系统设置
pnpm db:seed
```

### 4.2 查看数据库内容

使用 Prisma Studio 可视化查看数据库：

```bash
pnpm db:studio
```

这会打开一个网页界面，可以方便地浏览和编辑数据。

### 4.3 重置数据库（危险操作）

⚠️ **警告：这会删除所有数据！**

```bash
# 1. 删除数据库文件
del prisma\dev.db

# 2. 重新创建表结构
pnpm db:push

# 3. 重新初始化
pnpm db:seed
```

---

## 五、数据迁移与备份

### 5.1 备份数据库

#### 方法 1：手动复制文件（最简单）

```bash
# Windows
copy prisma\dev.db prisma\dev.db.backup_%date:~0,4%%date:~5,2%%date:~8,2%

# 或者使用时间戳
copy prisma\dev.db prisma\dev.db.backup_%time:~0,2%%time:~3,2%%time:~6,2%
```

#### 方法 2：使用数据库命令

```bash
# 在项目根目录创建 backup.bat 文件
@echo off
set BACKUP_FILENAME=prisma\dev.db.backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%
copy prisma\dev.db %BACKUP_FILENAME%
echo 备份完成: %BACKUP_FILENAME%
pause
```

### 5.2 恢复数据库

```bash
# 从备份文件恢复
copy prisma\dev.db.backup_20260508 prisma\dev.db
```

### 5.3 定期备份建议

| 数据重要程度 | 备份频率 | 保留时间 |
|------------|---------|---------|
| 生产环境 | 每天1次 | 30天 |
| 测试环境 | 每周1次 | 90天 |
| 开发环境 | 按需备份 | 按需 |

---

## 六、常见问题

### 问题 1：数据库文件被锁定

**错误信息**：`database is locked`

**解决方法**：
1. 停止正在运行的开发服务器
2. 关闭 Prisma Studio（如果打开）
3. 等待几秒后重试

### 问题 2：数据库文件损坏

**错误信息**：`database disk image is malformed`

**解决方法**：
1. 从最近的备份恢复
2. 如果没有备份，尝试修复：
   ```bash
   sqlite3 prisma/dev.db .recover > recovered.sql
   sqlite3 prisma/new.db < recovered.sql
   ```

### 问题 3：Prisma Client 报错

**错误信息**：`The table does not exist in the current database`

**解决方法**：
```bash
# 重新生成 Prisma Client
pnpm db:generate

# 或者推送数据库结构
pnpm db:push
```

### 问题 4：数据库迁移失败

**解决方法**：
```bash
# 重置并重新初始化
del prisma\dev.db
pnpm db:push
pnpm db:seed
```

---

## 附录

### A. SQLite 命令行工具（可选）

如果需要直接操作 SQLite 数据库，可以安装 SQLite 工具：

1. 下载：https://www.sqlite.org/download.html
2. 解压后将 `sqlite3.exe` 放到项目根目录
3. 使用命令：
   ```bash
   sqlite3 prisma/dev.db
   ```

### B. 切换到 MariaDB/MySQL（可选）

如果需要使用 MySQL/MariaDB：

1. 修改 `.env.local`：
   ```env
   DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"
   ```

2. 修改 `prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "mysql"  // 或 "mariadb"
     url = env("DATABASE_URL")
   }
   ```

3. 重新推送：
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

---

**文档版本**：1.0  
**最后更新**：2026-05-08