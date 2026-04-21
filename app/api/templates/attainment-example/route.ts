import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

const TEMPLATE_FILE_NAME = "达成度修改图表后例子.xlsx";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const templatePath = path.join(process.cwd(), TEMPLATE_FILE_NAME);

  try {
    const buffer = await fs.readFile(templatePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(TEMPLATE_FILE_NAME)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "模板文件不存在" }, { status: 404 });
  }
}
