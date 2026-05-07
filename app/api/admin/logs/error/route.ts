import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma as adminPrisma } from "@/lib/prisma-admin";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const errorType = searchParams.get("errorType") || "";
    const severity = searchParams.get("severity") || "";
    const keyword = searchParams.get("keyword") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const resolved = searchParams.get("resolved");

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (errorType) {
      where.errorType = errorType;
    }

    if (severity) {
      where.severity = severity;
    }

    if (resolved !== null && resolved !== "") {
      where.resolved = resolved === "true";
    }

    if (keyword) {
      where.OR = [
        { errorMessage: { contains: keyword } },
        { errorType: { contains: keyword } },
        { username: { contains: keyword } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59");
      }
    }

    const [logs, total] = await Promise.all([
      adminPrisma.systemErrorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      adminPrisma.systemErrorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Get error logs error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json(
        { success: false, message: "日志ID不能为空" },
        { status: 400 }
      );
    }

    await adminPrisma.systemErrorLog.update({
      where: { id: logId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: admin.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: "标记已解决成功",
    });
  } catch (error) {
    console.error("Resolve error log error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
