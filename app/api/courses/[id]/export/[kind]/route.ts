import { NextResponse } from "next/server";

import { exportWorkbook } from "@/lib/course-export";
import { getCourseInputById } from "@/lib/course-repository";

type RouteProps = {
  params: Promise<{ id: string; kind: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { id, kind } = await params;

  if (!["3", "4", "5"].includes(kind)) {
    return NextResponse.json({ error: "不支持的导出类型" }, { status: 400 });
  }

  const course = await getCourseInputById(id);
  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  const buffer = await exportWorkbook(course, kind as "3" | "4" | "5");
  const fileName =
    kind === "4"
      ? `${course.courseName || "课程"}课程目标达成度.xlsx`
      : kind === "5"
        ? `${course.courseName || "课程"}绘图数据.xlsx`
      : `${course.courseName || "课程"}-${kind}.xlsx`;
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
