import { NextResponse } from "next/server";
import { getCurrentAdmin, hashPassword, verifyPassword } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, message: "旧密码和新密码不能为空" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: "新密码长度不能少于6位" }, { status: 400 });
    }

    const adminRecord = await prisma.admin.findUnique({ where: { id: admin.id } });
    if (!adminRecord) {
      return NextResponse.json({ success: false, message: "管理员不存在" }, { status: 404 });
    }

    const isValid = await verifyPassword(oldPassword, adminRecord.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, message: "旧密码错误" }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ success: true, message: "密码修改成功" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}
