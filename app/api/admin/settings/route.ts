import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma as adminPrisma } from "@/lib/prisma-admin";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const settings = await adminPrisma.adminSetting.findMany({
      orderBy: { category: "asc" },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((setting) => {
      settingsMap[setting.settingKey] = setting.settingValue;
    });

    return NextResponse.json({
      success: true,
      data: settingsMap,
    });
  } catch (error) {
    console.error("Get settings error:", error);
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
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, message: "设置数据无效" },
        { status: 400 }
      );
    }

    for (const [key, value] of Object.entries(settings)) {
      await adminPrisma.adminSetting.upsert({
        where: { settingKey: key },
        update: { settingValue: String(value) },
        create: {
          settingKey: key,
          settingValue: String(value),
          settingType: typeof value === "boolean" ? "boolean" : "string",
          category: getCategoryForKey(key),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "设置保存成功",
    });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

function getCategoryForKey(key: string): string {
  const categoryMap: Record<string, string> = {
    systemName: "general",
    systemDescription: "general",
    logRetentionDays: "log",
    autoBackupEnabled: "backup",
    autoBackupFrequency: "backup",
  };
  return categoryMap[key] || "general";
}
