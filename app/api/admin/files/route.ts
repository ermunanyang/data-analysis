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
    const fileType = searchParams.get("fileType") || "";
    const fileCategory = searchParams.get("fileCategory") || "";
    const keyword = searchParams.get("keyword") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * pageSize;

    const where: any = {
      isDeleted: false,
    };

    if (fileType) {
      where.fileType = fileType;
    }

    if (fileCategory) {
      where.fileCategory = fileCategory;
    }

    if (keyword) {
      where.OR = [
        { fileName: { contains: keyword } },
        { originalName: { contains: keyword } },
      ];
    }

    if (startDate || endDate) {
      where.uploadedAt = {};
      if (startDate) {
        where.uploadedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.uploadedAt.lte = new Date(endDate + "T23:59:59");
      }
    }

    const [files, total] = await Promise.all([
      adminPrisma.fileRecord.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        skip,
        take: pageSize,
      }),
      adminPrisma.fileRecord.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        files,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Get files error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: "文件ID不能为空" },
        { status: 400 }
      );
    }

    await adminPrisma.fileRecord.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "文件删除成功",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
