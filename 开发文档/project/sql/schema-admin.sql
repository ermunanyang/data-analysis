-- ============================================
-- 单管理员版Web后台管理系统 - 数据库设计
-- ============================================

-- 数据库：SQLite (开发环境)
-- 生产环境建议使用 MySQL 或 PostgreSQL

-- ============================================
-- 管理员相关表
-- ============================================

-- 管理员账号表
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 管理员登录记录表
CREATE TABLE IF NOT EXISTS "AdminLoginRecord" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "adminId" TEXT NOT NULL,
    "loginTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "loginStatus" TEXT NOT NULL DEFAULT 'success',
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminLoginRecord_adminId_idx" ON "AdminLoginRecord"("adminId");
CREATE INDEX IF NOT EXISTS "AdminLoginRecord_loginTime_idx" ON "AdminLoginRecord"("loginTime");

-- ============================================
-- 日志相关表
-- ============================================

-- 用户操作日志表
CREATE TABLE IF NOT EXISTS "UserOperationLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "userId" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "requestParams" TEXT,
    "responseStatus" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "UserOperationLog_userId_idx" ON "UserOperationLog"("userId");
CREATE INDEX IF NOT EXISTS "UserOperationLog_username_idx" ON "UserOperationLog"("username");
CREATE INDEX IF NOT EXISTS "UserOperationLog_action_idx" ON "UserOperationLog"("action");
CREATE INDEX IF NOT EXISTS "UserOperationLog_module_idx" ON "UserOperationLog"("module");
CREATE INDEX IF NOT EXISTS "UserOperationLog_createdAt_idx" ON "UserOperationLog"("createdAt");

-- 系统错误日志表
CREATE TABLE IF NOT EXISTS "SystemErrorLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "requestParams" TEXT,
    "userId" TEXT,
    "username" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SystemErrorLog_errorType_idx" ON "SystemErrorLog"("errorType");
CREATE INDEX IF NOT EXISTS "SystemErrorLog_severity_idx" ON "SystemErrorLog"("severity");
CREATE INDEX IF NOT EXISTS "SystemErrorLog_resolved_idx" ON "SystemErrorLog"("resolved");
CREATE INDEX IF NOT EXISTS "SystemErrorLog_createdAt_idx" ON "SystemErrorLog"("createdAt");

-- API访问日志表
CREATE TABLE IF NOT EXISTS "ApiAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "requestPath" TEXT NOT NULL,
    "requestMethod" TEXT NOT NULL,
    "requestParams" TEXT,
    "responseStatus" INTEGER,
    "responseTime" INTEGER,
    "requestIp" TEXT,
    "userId" TEXT,
    "username" TEXT,
    "userAgent" TEXT,
    "apiModule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ApiAccessLog_requestPath_idx" ON "ApiAccessLog"("requestPath");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_requestMethod_idx" ON "ApiAccessLog"("requestMethod");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_responseStatus_idx" ON "ApiAccessLog"("responseStatus");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_createdAt_idx" ON "ApiAccessLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_requestIp_idx" ON "ApiAccessLog"("requestIp");

-- ============================================
-- 文件管理相关表
-- ============================================

-- 文件记录表
CREATE TABLE IF NOT EXISTS "FileRecord" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileCategory" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "isDeleted" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME
);

CREATE INDEX IF NOT EXISTS "FileRecord_fileType_idx" ON "FileRecord"("fileType");
CREATE INDEX IF NOT EXISTS "FileRecord_fileCategory_idx" ON "FileRecord"("fileCategory");
CREATE INDEX IF NOT EXISTS "FileRecord_uploadedAt_idx" ON "FileRecord"("uploadedAt");
CREATE INDEX IF NOT EXISTS "FileRecord_isDeleted_idx" ON "FileRecord"("isDeleted");

-- ============================================
-- 系统设置相关表
-- ============================================

-- 系统设置表
CREATE TABLE IF NOT EXISTS "AdminSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "settingKey" TEXT NOT NULL UNIQUE,
    "settingValue" TEXT NOT NULL,
    "settingType" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" DATETIME NOT NULL,
    "adminId" TEXT,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id")
);

CREATE INDEX IF NOT EXISTS "AdminSetting_settingKey_idx" ON "AdminSetting"("settingKey");
CREATE INDEX IF NOT EXISTS "AdminSetting_category_idx" ON "AdminSetting"("category");

-- 数据备份记录表
CREATE TABLE IF NOT EXISTS "DataBackup" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "backupName" TEXT NOT NULL,
    "backupPath" TEXT NOT NULL,
    "backupType" TEXT NOT NULL,
    "backupSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "description" TEXT,
    "backupFileUrl" TEXT
);

CREATE INDEX IF NOT EXISTS "DataBackup_backupType_idx" ON "DataBackup"("backupType");
CREATE INDEX IF NOT EXISTS "DataBackup_status_idx" ON "DataBackup"("status");
CREATE INDEX IF NOT EXISTS "DataBackup_createdAt_idx" ON "DataBackup"("createdAt");

-- ============================================
-- 默认管理员账号初始化
-- 密码: admin123 (使用scrypt加密)
-- ============================================

-- 注意：密码哈希需要通过应用程序生成
-- 这里仅作为记录，实际创建请运行 seed-admin.ts
-- INSERT INTO "Admin" ("id", "username", "passwordHash", "createdAt", "updatedAt")
-- VALUES ('default-admin-id', 'admin', '<scrypt_hash>', datetime('now'), datetime('now'));

-- ============================================
-- 默认系统设置
-- ============================================

-- INSERT INTO "AdminSetting" ("id", "settingKey", "settingValue", "settingType", "description", "category", "updatedAt")
-- VALUES
--     (lower(hex(randomblob(16))), 'systemName', '课程达成度管理系统', 'string', '系统名称', 'general', datetime('now')),
--     (lower(hex(randomblob(16))), 'systemDescription', '', 'string', '系统描述', 'general', datetime('now')),
--     (lower(hex(randomblob(16))), 'logRetentionDays', '30', 'number', '日志保留天数', 'log', datetime('now')),
--     (lower(hex(randomblob(16))), 'autoBackupEnabled', 'false', 'boolean', '启用自动备份', 'backup', datetime('now'));
