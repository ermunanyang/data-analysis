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
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      prisma.adminLoginRecord.findMany({
        where: { adminId: admin.id },
        orderBy: { loginTime: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.adminLoginRecord.count({ where: { adminId: admin.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    console.error("Get login records error:", error);
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}
