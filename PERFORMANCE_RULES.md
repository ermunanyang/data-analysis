# 项目性能优化规则

## 一、配置层面规则

### 1. 内存管理规则
- 开发环境最大内存限制：4GB (`--max-old-space-size=4096`)
- 垃圾回收间隔：100ms (`--gc-interval=100`)
- 生产环境使用默认内存配置

### 2. 文件监听规则
- 仅监听必要目录：`app/`, `components/`, `lib/`, `public/`
- 排除 `node_modules/`, `.next/`, `prisma/` 等大型目录

### 3. 编译器配置规则
- 使用 SWC 替代 Terser 进行压缩
- 生产环境自动移除 console.log
- 启用 CSS 优化

### 4. 开发模式规则
- 开发环境关闭 React StrictMode（避免双重渲染）
- 生产环境启用 React StrictMode
- 启用 Turbo 模式加速构建

## 二、代码层面规则

### 1. 组件性能规则
- 避免在 useEffect 中进行大量计算
- 使用 useMemo/useCallback 缓存计算结果
- 避免无限循环的状态更新

### 2. 数据处理规则
- 数据库查询使用分页
- 避免一次性加载大量数据
- 及时关闭数据库连接

### 3. 依赖管理规则
- 使用国内镜像源（npmmirror.com）
- 定期检查依赖版本（`pnpm outdated`）
- 移除未使用的依赖

## 三、运维层面规则

### 1. 启动脚本规则
- 开发使用：`pnpm dev` 或 `pnpm dev:optimized`
- 构建使用：`pnpm build`
- 健康检查：`pnpm check:health`

### 2. 缓存清理规则
- 定期执行 `pnpm clean` 清理缓存
- 遇到卡死问题时执行 `pnpm reinstall`

### 3. 监控规则
- 使用 Chrome DevTools 监控内存占用
- 关注 CPU 使用率（正常应 < 70%）
- 定期检查构建日志

## 四、紧急处理规则

### 1. 卡死处理流程
1. 使用 `Ctrl + Shift + Esc` 打开任务管理器
2. 终止 `node.exe` 进程
3. 执行 `pnpm clean` 清理缓存
4. 使用 `pnpm dev:optimized` 重新启动

### 2. 问题排查步骤
1. 检查终端日志是否有错误信息
2. 使用 `pnpm check:types` 检查类型错误
3. 使用 `pnpm lint` 检查代码规范
4. 检查内存占用是否持续增长

## 五、全局配置文件清单

| 文件 | 作用 | 配置项 |
|------|------|--------|
| `.env.local` | 环境变量配置 | NODE_OPTIONS, NEXT_LOG_LEVEL |
| `.npmrc` | npm 镜像配置 | registry=https://registry.npmmirror.com |
| `.pnpmrc` | pnpm 镜像配置 | registry=https://registry.npmmirror.com |
| `next.config.ts` | Next.js 配置 | watchPaths, swcMinify, turbo |
| `package.json` | 脚本配置 | dev:optimized, clean, reinstall |

## 六、最佳实践

1. **开发前**：运行 `pnpm check:health` 确保代码健康
2. **开发中**：使用 `pnpm dev:optimized` 启动开发服务器
3. **遇到问题**：先执行 `pnpm reinstall` 尝试修复
4. **定期维护**：每周执行 `pnpm outdated` 检查依赖