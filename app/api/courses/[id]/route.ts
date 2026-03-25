import { NextResponse } from "next/server";

import { courseInputSchema } from "@/lib/course-schema";
import { getCourseInputById, saveCourse } from "@/lib/course-repository";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const course = await getCourseInputById(id);

  if (!course) {
    return NextResponse.json({ error: "课程不存在" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const payload = courseInputSchema.parse(await request.json());
    const savedId = await saveCourse(payload, id);
    return NextResponse.json({ id: savedId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新课程失败" },
      { status: 400 },
    );
  }
}
