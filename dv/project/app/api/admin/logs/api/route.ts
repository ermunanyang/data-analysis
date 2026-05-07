import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const apiModule = searchParams.get("apiModule") || "";
    const method = searchParams.get("method") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const ipAddress = searchParams.get("ipAddress") || "";
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (apiModule) where.apiModule = apiModule;
    if (method) where.requestMethod = method;
    if (status) where.responseStatus = parseInt(status);
    if (ipAddress) where.requestIp = { contains: ipAddress };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59");
    }

    const [logs, total] = await Promise.all([
      prisma.apiAccessLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.apiAccessLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
    });
  } catch (error) {
    console.error("Get API access logs error:", error);
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}
