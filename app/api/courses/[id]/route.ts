import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { courseInputSchema } from "@/lib/course-schema";
import { deleteCourse, getCourseInputById, saveCourse } from "@/lib/course-repository";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function formatZodError(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const message = issue.message;
    if (message && typeof message === "string" && !message.match(/^[a-z]+$/i)) {
      return message;
    }
    const field = issue.path.join(".");
    const fieldNames: Record<string, string> = {
      courseName: "课程名称",
      courseCode: "课程编码",
      semester: "学期",
      className: "班级",
      targets: "课程分目标",
    };
    return `${fieldNames[field] || field}不能为空`;
  });
}

export async function GET(_request: Request, { params }: RouteProps) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const course = await getCourseInputById(id, user.id);

  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const payload = courseInputSchema.parse(await request.json());
    const savedId = await saveCourse(payload, user.id, id);
    return NextResponse.json({ id: savedId });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = formatZodError(error);
      return NextResponse.json({ errors: messages }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新课程失败" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteCourse(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "课程不存在或无权访问" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除课程失败" },
      { status: 400 },
    );
  }
}
