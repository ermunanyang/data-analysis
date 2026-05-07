@echo off
chcp 65001 >nul
echo ========================================
echo   课程达成度管理系统 - 快速启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] 检查 Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装！请先安装 Node.js 20.x 或更高版本
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安装
node -v

echo.
echo [2/6] 检查 pnpm...
pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  pnpm 未安装，尝试使用 npm...
    set PACKAGE_MANAGER=npm
) else (
    set PACKAGE_MANAGER=pnpm
    echo ✅ pnpm 已安装
)

echo.
echo [3/6] 检查依赖...
if not exist "node_modules" (
    echo 📦 正在安装依赖（首次运行可能需要几分钟）...
    %PACKAGE_MANAGER% install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
    echo ✅ 依赖安装成功
) else (
    echo ✅ 依赖已存在
)

echo.
echo [4/6] 检查数据库...
if not exist "prisma\dev.db" (
    echo 🗄️  正在初始化数据库...
    %PACKAGE_MANAGER% db:push
    if %errorlevel% neq 0 (
        echo ❌ 数据库初始化失败！
        pause
        exit /b 1
    )
    echo ✅ 数据库初始化成功
    
    echo.
    echo 👤 正在创建管理员账户...
    %PACKAGE_MANAGER% db:seed
    if %errorlevel% neq 0 (
        echo ❌ 管理员创建失败！
        pause
        exit /b 1
    )
) else (
    echo ✅ 数据库已存在
)

echo.
echo [5/6] 生成 Prisma Client...
%PACKAGE_MANAGER% db:generate >nul 2>&1

echo.
echo [6/6] 启动开发服务器...
echo.
echo ========================================
echo   系统即将启动！
echo   前台地址：http://localhost:3000
echo   后台地址：http://localhost:3000/admin/login
echo.
echo   默认管理员：
echo   用户名：admin
echo   密码：admin123
echo.
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

%PACKAGE_MANAGER% dev

pause