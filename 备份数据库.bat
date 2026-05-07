@echo off
chcp 65001 >nul
echo ========================================
echo   数据库备份工具
echo ========================================
echo.

cd /d "%~dp0"

if not exist "prisma\dev.db" (
    echo ❌ 数据库文件不存在！
    echo 请先启动系统生成数据库。
    pause
    exit /b 1
)

set "YEAR=%date:~0,4%"
set "MONTH=%date:~5,2%"
set "DAY=%date:~8,2%"
set "HOUR=%time:~0,2%"
set "MINUTE=%time:~3,2%"
set "SECOND=%time:~6,2%"

set "HOUR=%HOUR: =0%"

set "BACKUP_FILENAME=prisma\backups\dev.db_%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%.db"

if not exist "prisma\backups" mkdir prisma\backups

echo 📦 正在备份数据库...
copy prisma\dev.db "%BACKUP_FILENAME%" >nul

if %errorlevel% equ 0 (
    echo ✅ 备份成功！
    echo 📂 备份文件：%BACKUP_FILENAME%
) else (
    echo ❌ 备份失败！
)

echo.
echo 📋 现有备份文件：
dir /b /o-d prisma\backups\*.db 2>nul
if %errorlevel% neq 0 (
    echo    （暂无备份文件）
)

echo.
pause