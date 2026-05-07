import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma as adminPrisma } from "@/lib/prisma-admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const [userCount, courseCount, operationLogCount, errorLogCount, apiLogCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        adminPrisma.userOperationLog.count(),
        adminPrisma.systemErrorLog.count(),
        adminPrisma.apiAccessLog.count(),
      ]);

    const recentErrors = await adminPrisma.systemErrorLog.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        userCount,
        courseCount,
        operationLogCount,
        errorLogCount,
        apiLogCount,
        recentErrors,
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
