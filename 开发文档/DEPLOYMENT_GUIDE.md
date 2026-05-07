# 课程达成度管理系统 - 部署配置指南

> 适用于小白用户的完整部署教程

---

## 目录

- [一、系统概述](#一系统概述)
- [二、环境准备](#二环境准备)
- [三、项目获取与安装](#三项目获取与安装)
- [四、数据库配置](#四数据库配置)
- [五、系统初始化](#五系统初始化)
- [六、启动系统](#六启动系统)
- [七、常见问题](#七常见问题)

---

## 一、系统概述

### 1.1 系统功能

本系统是一个课程达成度分析与管理系统，包含两个部分：

- **前台用户系统**：用户注册登录、课程管理、学生成绩分析
- **后台管理系统**：管理员登录、用户管理、日志审计、系统设置

### 1.2 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| 操作系统 | Windows/Mac/Linux | 推荐 Windows 10/11 |
| Node.js | 20.x 或更高 | JavaScript 运行环境 |
| 包管理器 | pnpm 或 npm | 推荐使用 pnpm |
| Web 框架 | Next.js 16.2.1 | React 服务端渲染框架 |
| ORM | Prisma 6.19.0 | 数据库操作工具 |
| 数据库 | SQLite | 内置文件型数据库 |
| UI 组件 | Ant Design 5 | 后台管理界面 |

---

## 二、环境准备

### 2.1 安装 Node.js

#### 步骤 1：下载 Node.js

1. 打开浏览器，访问 [https://nodejs.org/](https://nodejs.org/)
2. 点击下载 LTS 版本（长期支持版），推荐版本 20.x
3. 运行下载的安装程序

#### 步骤 2：安装 Node.js

1. 双击运行安装程序
2. 点击 "Next"（下一步）
3. 勾选 "I accept the terms in the License Agreement"（我接受许可协议），点击 "Next"
4. 选择安装路径（默认即可），点击 "Next"
5. 点击 "Next" → "Install"（安装）→ "Finish"（完成）

#### 步骤 3：验证安装

打开 **命令提示符（CMD）** 或 **PowerShell**，输入：

```bash
node -v
npm -v
```

如果显示版本号，说明安装成功！

### 2.2 安装 pnpm（推荐）

pnpm 是一个快速、节省磁盘空间的包管理器。

#### 方法 1：使用 npm 安装

打开命令提示符，输入：

```bash
npm install -g pnpm
```

#### 方法 2：使用官方安装脚本（Windows）

```bash
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

#### 验证安装

```bash
pnpm -v
```

如果显示版本号，说明安装成功！

### 2.3 安装 Git（可选）

如果需要从 GitHub 克隆项目，需要安装 Git：

1. 访问 [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. 下载 Windows 版本安装
3. 一路点击 Next 完成安装

---

## 三、项目获取与安装

### 3.1 获取项目代码

如果您已经有项目文件（例如在桌面的 `data001` 文件夹），可以跳过此步骤。

#### 方法 1：从文件夹复制（推荐）

如果您有项目压缩包，直接解压到您想要的位置，例如：

```
C:\Users\您的用户名\Desktop\data001
```

#### 方法 2：从 Git 仓库克隆（如果有仓库地址）

```bash
cd C:\Users\您的用户名\Desktop
git clone <仓库地址>
```

### 3.2 安装项目依赖

#### 步骤 1：打开项目文件夹

1. 打开 **命令提示符（CMD）** 或 **PowerShell**
2. 进入项目文件夹：

```bash
cd C:\Users\PC\Desktop\data001
```

> 注意：将上面的路径替换为您实际的项目路径

#### 步骤 2：安装依赖

使用 pnpm 安装（推荐）：

```bash
pnpm install
```

或者使用 npm：

```bash
npm install
```

**等待安装完成**（可能需要 5-10 分钟，取决于网络速度）

#### 验证依赖安装

安装完成后，检查是否有 `node_modules` 文件夹：

```bash
dir node_modules
```

如果显示了很多文件夹，说明依赖安装成功！

---

## 四、数据库配置

### 4.1 数据库说明

本系统使用 SQLite 数据库，这是一个文件型数据库，无需额外安装数据库软件！

数据库文件位置：`prisma/dev.db`

### 4.2 配置环境变量

检查项目根目录是否有 `.env.local` 文件，如果没有，创建一个：

文件内容：

```env
# 数据库连接配置
DATABASE_URL="file:./prisma/dev.db"

# Node.js 内存配置
NODE_OPTIONS="--max-old-space-size=4096"

# Next.js 配置
NEXT_DISABLE_WEBPACK_CACHE=false
NEXT_PUBLIC_DEVELOPMENT_MODE=true
NEXT_LOG_LEVEL=warn
```

### 4.3 初始化数据库表结构

在项目根目录下，执行：

```bash
pnpm db:push
```

或者：

```bash
npx prisma db push
```

这个命令会自动创建数据库和所有需要的表。

#### 验证数据库

检查 `prisma` 文件夹下是否生成了 `dev.db` 文件：

```bash
dir prisma
```

如果看到 `dev.db` 文件，说明数据库创建成功！

---

## 五、系统初始化

### 5.1 创建管理员账户

执行以下命令创建默认管理员：

```bash
pnpm db:seed
```

或者：

```bash
npx tsx prisma/seed-admin.ts
```

执行成功后会显示：

```
✅ 默认管理员账户创建成功!
   用户名: admin
   密码: admin123
   ⚠️  请登录后立即修改密码!
```

### 5.2 初始化系统设置

上面的命令还会自动创建默认的系统设置，包括：
- 系统名称：课程达成度管理系统
- 日志保留天数：30天
- 自动备份：关闭

---

## 六、启动系统

### 6.1 开发模式启动（推荐用于测试）

在项目根目录下，执行：

```bash
pnpm dev
```

或者：

```bash
npm run dev
```

等待几秒钟，看到类似下面的信息表示启动成功：

```
  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 3.5s
```

### 6.2 访问系统

打开浏览器，访问：

| 系统 | 地址 |
|------|------|
| 前台系统首页 | http://localhost:3000 |
| 前台登录 | http://localhost:3000/login |
| 后台管理登录 | http://localhost:3000/admin/login |
| 后台管理仪表盘 | http://localhost:3000/admin/dashboard |

### 6.3 登录测试

#### 测试后台管理系统

1. 访问 http://localhost:3000/admin/login
2. 输入用户名：`admin`
3. 输入密码：`admin123`
4. 点击登录

如果登录成功，会跳转到后台管理仪表盘！

#### 测试前台用户系统

1. 访问 http://localhost:3000/register
2. 注册一个新用户账户
3. 使用注册的账户登录前台系统

### 6.4 生产模式启动（可选）

如果需要在生产环境运行：

#### 步骤 1：构建项目

```bash
pnpm build
```

#### 步骤 2：启动生产服务器

```bash
pnpm start
```

---

## 七、常见问题

### 问题 1：端口 3000 被占用

**错误信息**：`Error: listen EADDRINUSE: address already in use :::3000`

**解决方法**：

1. 关闭其他使用 3000 端口的程序
2. 或者修改端口，在 `package.json` 中修改：
   ```json
   "dev": "next dev -p 3001",
   ```

### 问题 2：pnpm 命令找不到

**错误信息**：`'pnpm' 不是内部或外部命令`

**解决方法**：

1. 使用 npm 代替：`npm install`、`npm run dev`
2. 或者重新安装 pnpm：`npm install -g pnpm`

### 问题 3：数据库文件不存在

**错误信息**：`PrismaClientInitializationError`

**解决方法**：

1. 确认 `.env.local` 文件存在且内容正确
2. 重新执行数据库初始化：`pnpm db:push`
3. 重新执行种子数据：`pnpm db:seed`

### 问题 4：依赖安装失败

**错误信息**：网络超时、安装卡住等

**解决方法**：

1. 配置国内镜像源：
   ```bash
   pnpm config set registry https://registry.npmmirror.com
   ```
2. 清理缓存后重新安装：
   ```bash
   pnpm store prune
   pnpm install
   ```

### 问题 5：内存不足

**错误信息**：`JavaScript heap out of memory`

**解决方法**：

1. `.env.local` 文件中已配置了 `NODE_OPTIONS="--max-old-space-size=4096"`
2. 或者使用优化后的启动命令：
   ```bash
   pnpm dev:optimized
   ```

---

## 附录

### A. 快速启动命令汇总

```bash
# 1. 进入项目目录
cd C:\Users\PC\Desktop\data001

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
pnpm db:push

# 4. 创建管理员
pnpm db:seed

# 5. 启动开发服务器
pnpm dev
```

### B. 默认账户信息

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 后台管理系统，**请登录后立即修改密码** |
| 前台用户 | 需要自行注册 | - | 前台课程管理系统 |

### C. 项目文件结构

```
data001/
├── app/                      # Next.js 应用目录
│   ├── admin/               # 后台管理页面
│   ├── api/                 # API 接口
│   ├── courses/             # 课程管理页面
│   ├── login/               # 前台登录
│   ├── register/            # 前台注册
│   └── page.tsx             # 首页
├── lib/                      # 工具函数
├── prisma/                   # 数据库相关
│   ├── dev.db              # SQLite 数据库文件（重要！）
│   ├── schema.prisma       # 数据库表结构定义
│   └── seed-admin.ts       # 管理员初始化脚本
├── public/                   # 静态资源
├── package.json             # 项目配置和依赖
├── .env.local               # 环境变量配置
└── next.config.ts           # Next.js 配置
```

### D. 数据库备份

#### 备份数据库

直接复制 `prisma/dev.db` 文件即可：

```bash
copy prisma\dev.db prisma\dev.db.backup
```

#### 恢复数据库

```bash
copy prisma\dev.db.backup prisma\dev.db
```

### E. 技术支持

如遇到问题，请检查：

1. Node.js 版本是否为 20.x 或更高
2. 所有依赖是否正确安装
3. 数据库文件是否存在
4. 端口 3000 是否被占用

---

**文档版本**：1.0  
**最后更新**：2026-05-08  
**适用系统**：课程达成度管理系统