import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { courseInputSchema } from "@/lib/course-schema";
import { getCourseSummaries, saveCourse } from "@/lib/course-repository";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const courses = await getCourseSummaries(user.id);
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = courseInputSchema.parse(await request.json());
    const id = await saveCourse(payload, user.id);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = formatZodError(error);
      return NextResponse.json({ errors: messages }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建课程失败" },
      { status: 400 },
    );
  }
}
