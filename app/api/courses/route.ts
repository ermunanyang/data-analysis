import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { courseInputSchema } from "@/lib/course-schema";
import { getCourseSummaries, saveCourse } from "@/lib/course-repository";

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建课程失败" },
      { status: 400 },
    );
  }
}
