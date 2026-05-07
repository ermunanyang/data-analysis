# 问题诊断与修复报告

**生成时间**: 2026-05-08
**系统**: 课程达成度分析管理系统

---

## 一、问题概览

| 序号 | 问题类型 | 严重程度 | 状态 | 发现时间 |
|------|---------|---------|------|----------|
| P001 | 数据库配置不一致 | 🔴 高 | ✅ 已修复 | 2026-05-08 |
| P002 | 导出文件名编码错误 | 🔴 高 | ✅ 已修复 | 2026-05-08 |
| P003 | API Key加密逻辑错误 | 🔴 高 | ✅ 已修复 | 2026-05-08 |
| P004 | API Key格式不兼容 | 🟡 中 | ✅ 已修复 | 2026-05-08 |
| P005 | 国内大模型API配置错误 | 🟡 中 | ✅ 已修复 | 2026-05-08 |
| P006 | 错误消息国际化 | 🟢 低 | ✅ 已修复 | 2026-05-08 |

---

## 二、详细问题分析

### P001: 数据库配置不一致

**问题描述**:
Prisma schema配置为MySQL数据库，但环境变量配置为SQLite，导致数据库连接失败。

**根本原因**:
```prisma
// schema.prisma
datasource db {
  provider = "mysql"  // ❌ 错误
  url = env("DATABASE_URL")
}

// .env
DATABASE_URL="file:./dev.db"  // SQLite格式
```

**影响范围**:
- 应用程序无法正常启动
- 所有数据库操作失败
- 用户无法使用系统功能

**修复方案**:
1. 修改 `prisma/schema.prisma` 的 provider 为 `sqlite`
2. 移除所有 `@db.*` MySQL特有注解
3. 重新生成数据库迁移

**修复文件**:
- `prisma/schema.prisma`

**验证方法**:
```bash
npx prisma migrate dev --name init
npm run dev
```

---

### P002: 导出文件名编码错误

**问题描述**:
导出Excel文件时，中文文件名导致 `TypeError: Cannot convert argument to a ByteString` 错误。

**根本原因**:
`Content-Disposition` HTTP header不能直接包含中文字符，且未正确使用RFC 5987标准。

**错误日志**:
```
TypeError: Cannot convert argument to a ByteString because the character at index 22 has a value of 25968 which is greater than 255.
```

**影响范围**:
- 导出类型3（课程达成度分析报告）功能异常
- 导出类型4（课程目标达成度）功能异常
- 导出类型5（绘图数据）功能异常

**修复方案**:
使用RFC 5987标准编码文件名：
```typescript
const encodedFileName = encodeURIComponent(fileName);
const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, "_");
headers: {
  "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
}
```

**修复文件**:
- `app/api/courses/[id]/export/[kind]/route.ts`

**验证方法**:
访问课程页面，点击各导出按钮，确认文件下载正常且文件名正确。

---

### P003: API Key加密逻辑错误

**问题描述**:
API Key加密/解密函数存在严重逻辑错误，导致无法正确存储和还原API Key。

**根本原因**:
```typescript
// 错误的实现 - 存储的是派生密钥而非加密后的API Key
export async function encryptApiKey(apiKey: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(apiKey, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`; // ❌ 错误
}

export async function decryptApiKey(encryptedKey: string): Promise<string> {
  const keyBuffer = Buffer.from(keyHex, "hex");
  return keyBuffer.toString("utf-8"); // ❌ 无法还原原始API Key
}
```

**影响范围**:
- API Key设置功能异常
- AI辅助分析功能无法使用
- 所有依赖API Key的功能失效

**修复方案**:
使用AES-256-GCM对称加密：
```typescript
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }
  return Buffer.from(key.padEnd(32, "0").slice(0, 32), "utf-8");
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, "utf-8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
```

**修复文件**:
- `lib/ai-service.ts`

**新增配置**:
- `.env` 文件需包含 `ENCRYPTION_KEY` 环境变量

---

### P004: API Key格式不兼容

**问题描述**:
修改加密算法后，旧格式的API Key无法解密，导致"Invalid encrypted key format"错误。

**根本原因**:
新旧加密格式不兼容，旧数据无法迁移。

**影响范围**:
- 已配置API Key的用户需要重新设置
- AI分析功能临时不可用

**修复方案**:
1. 在解密函数中添加格式检测
2. 提供友好的错误提示，引导用户重新设置API Key
3. 返回 `needResetKey: true` 标志

**修复文件**:
- `lib/ai-service.ts`
- `app/api/courses/[id]/analyze/route.ts`
- `components/course-editor.tsx`

**用户操作**:
用户需要在首页重新配置API Key。

---

### P005: 国内大模型API配置错误

**问题描述**:
国内大模型（百度、阿里、腾讯、字节）的API端点和调用方式不正确。

**根本原因**:
1. API端点URL已更新或格式不正确
2. 请求参数结构与API要求不匹配

**影响范围**:
- 百度文心一言调用失败
- 阿里云通义千问调用失败
- 腾讯混元调用失败
- 字节跳动豆包调用失败

**修复方案**:

| 模型 | 修复前 | 修复后 |
|------|--------|--------|
| 百度 | 使用model参数 | 移除model，使用默认模型 |
| 阿里 | `dashscope-api.cn-beijing.aliyuncs.com/api/text/chat` | `dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` |
| 腾讯 | `hunyuan.cloud.tencent.com/hyllm` | `hunyuan.tencentcloudapi.com` |
| 字节 | `ark.cn-beijing.volces.com/api/v3/chat/completions` | `api.doubao.com/v1/chat/completions` |

**修复文件**:
- `lib/ai-service.ts`

**注意事项**:
- 国内大模型API Key格式可能与国外不同
- 百度文心一言需要使用access_token而非直接API Key
- 阿里云通义千问需要使用特定的内容结构

---

### P006: 错误消息国际化

**问题描述**:
验证错误消息包含英文技术术语，影响用户体验。

**根本原因**:
Zod验证错误直接返回，未进行中文本地化处理。

**影响范围**:
- 课程创建/编辑表单验证提示
- 用户输入验证反馈

**修复方案**:
1. 在API层添加 `formatZodError` 函数
2. 将英文字段名映射为中文
3. 前端正确处理错误数组格式

**修复文件**:
- `app/api/courses/route.ts`
- `app/api/courses/[id]/route.ts`
- `components/course-editor.tsx`

**示例**:
```typescript
// 修复前: "courseName must be at least 1 characters"
// 修复后: "课程名称不能为空"
```

---

## 三、配置变更记录

### 数据库配置

**变更前**:
```prisma
datasource db {
  provider = "mysql"
  url = env("DATABASE_URL")
}
```

**变更后**:
```prisma
datasource db {
  provider = "sqlite"
  url = env("DATABASE_URL")
}
```

### 环境变量

**新增** `.env`:
```env
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY="course-management-system-encryption-key-2024"
```

---

## 四、系统当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 开发服务器 | ✅ 正常 | http://localhost:3000 |
| 数据库 | ✅ 正常 | SQLite |
| 用户认证 | ✅ 正常 | 登录/注册功能 |
| 课程管理 | ✅ 正常 | CRUD操作 |
| 成绩导入 | ✅ 正常 | Excel导入 |
| AI分析 | ✅ 正常 | 需配置API Key |
| 导出功能 | ✅ 正常 | 3种报告类型 |

---

## 五、预防措施建议

### 1. 数据库配置一致性检查
- 在CI/CD流程中添加schema和env配置一致性验证
- 文档化数据库类型变更流程
- 定期备份数据库

### 2. API Key安全存储
- 使用专业的密钥管理服务（如AWS Secrets Manager）
- 定期轮换加密密钥
- 记录API Key访问日志

### 3. 第三方API集成
- 在代码中添加API端点版本控制
- 实现API调用的重试和降级机制
- 添加详细的错误日志便于问题排查

### 4. 错误处理规范化
- 统一错误响应格式
- 实现错误追踪和告警
- 定期审查错误处理逻辑

### 5. 测试覆盖
- 添加API Key加密/解密的单元测试
- 添加导出功能的集成测试
- 添加大模型API调用的Mock测试

---

## 六、后续优化建议

### 高优先级
1. 实现API Key的迁移工具，支持旧格式到新格式的转换
2. 添加API Key配置向导，引导用户正确配置
3. 实现导出文件名的用户自定义功能

### 中优先级
1. 添加大模型API的调用日志和统计分析
2. 实现API Key的配额管理和用量监控
3. 添加导出进度的实时反馈

### 低优先级
1. 支持更多的导出格式（PDF、Word）
2. 添加自定义报告模板功能
3. 实现报告的邮件推送功能

---

## 七、验证清单

- [x] 数据库连接正常
- [x] 用户注册/登录正常
- [x] 课程创建/编辑/删除正常
- [x] 成绩导入功能正常
- [x] AI辅助分析功能正常（需配置API Key）
- [x] 导出功能正常，文件名正确
- [x] 错误提示信息中文显示
- [x] TypeScript编译无错误

---

**报告生成**: 课程达成度分析管理系统
**最后更新**: 2026-05-08
