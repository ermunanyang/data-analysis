import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { exportWorkbook } from "@/lib/course-export";
import { getCourseInputById } from "@/lib/course-repository";

type RouteProps = {
  params: Promise<{ id: string; kind: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id, kind } = await params;

  if (!["3", "4", "5"].includes(kind)) {
    return NextResponse.json({ error: "不支持的导出类型" }, { status: 400 });
  }

  const course = await getCourseInputById(id, user.id);
  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  const buffer = await exportWorkbook(course, kind as "3" | "4" | "5");

  const courseName = (course.courseName || "课程").replace(/[^\w\u4e00-\u9fa5]/g, "_");
  const reportNames: Record<string, string> = {
    "3": "课程达成度分析报告",
    "4": "课程目标达成度",
    "5": "绘图数据",
  };
  const reportName = reportNames[kind] || "导出数据";
  const fileName = `${courseName}${reportName}.xlsx`;

  const encodedFileName = encodeURIComponent(fileName);
  const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, "_");

  const response = new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
    },
  });

  return response;
}
