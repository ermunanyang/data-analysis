import { NextResponse } from "next/server";

import { courseInputSchema } from "@/lib/course-schema";
import { getCourseSummaries, saveCourse } from "@/lib/course-repository";

export async function GET() {
  const courses = await getCourseSummaries();
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  try {
    const payload = courseInputSchema.parse(await request.json());
    const id = await saveCourse(payload);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建课程失败" },
      { status: 400 },
    );
  }
}
