import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getCourseInputById } from "@/lib/course-repository";
import { importScoresFromWorkbook } from "@/lib/score-import";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const course = await getCourseInputById(id, user.id);

    if (!course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传 Excel 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const students = await importScoresFromWorkbook(buffer, course);
    const nextCourse = { ...course, students };

    return NextResponse.json({
      studentCount: students.length,
      course: nextCourse,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导入失败" },
      { status: 400 },
    );
  }
}
