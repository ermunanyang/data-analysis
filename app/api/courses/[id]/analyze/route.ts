import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey, generateCourseAnalysis, type CourseAnalysisData } from "@/lib/ai-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id: courseId } = await params;

    const [course, userRecord] = await Promise.all([
      prisma.course.findFirst({
        where: { id: courseId, userId: user.id },
        include: {
          targets: { orderBy: { sortOrder: "asc" } },
          methods: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { apiKeyEncrypted: true, apiKeyType: true },
      }),
    ]);

    if (!course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    if (!userRecord?.apiKeyEncrypted || !userRecord?.apiKeyType) {
      return NextResponse.json({ error: "未配置API Key，请先在首页设置" }, { status: 400 });
    }

    let apiKey: string;
    try {
      apiKey = await decryptApiKey(userRecord.apiKeyEncrypted);
    } catch (decryptError) {
      return NextResponse.json({ 
        error: decryptError instanceof Error ? decryptError.message : "API Key解密失败，请重新设置",
        needResetKey: true
      }, { status: 400 });
    }

    const courseData: CourseAnalysisData = {
      courseName: course.courseName,
      courseCode: course.courseCode,
      courseType: course.courseType || "",
      semester: course.semester,
      className: course.className,
      department: course.department || "",
      major: course.major || "",
      teacherNames: course.teacherNames || "",
      selectedCount: course.selectedCount,
      evaluatedCount: course.evaluatedCount,
      expectedValue: Number(course.expectedValue),
      targets: course.targets.map((t) => ({
        name: t.name,
        summary: t.summary,
        graduationRequirement: t.graduationRequirement,
        supportStrength: t.supportStrength || "L",
        overallWeight: Number(t.overallWeight),
        processEvaluationRatio: Number(t.processEvaluationRatio),
        resultEvaluationRatio: Number(t.resultEvaluationRatio),
        surveyEvaluationRatio: Number(t.surveyEvaluationRatio),
        directWeight: Number(t.directWeight),
        indirectWeight: Number(t.indirectWeight),
      })),
      methods: course.methods.map((m) => ({
        name: m.name,
        category: m.category,
        fullScore: Number(m.fullScore),
      })),
    };

    const result = await generateCourseAnalysis(apiKey, userRecord.apiKeyType as any, courseData);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("AI分析错误:", error);
    if (error instanceof Error) {
      if (error.message.includes("fetch failed") || error.message.includes("Failed to fetch")) {
        return NextResponse.json({ 
          error: "网络连接失败，请检查网络连接或稍后重试",
          detail: error.message
        }, { status: 503 });
      }
      if (error.message.includes("ENCRYPTION_KEY")) {
        return NextResponse.json({ 
          error: "系统配置错误，请联系管理员",
          detail: error.message
        }, { status: 500 });
      }
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "分析生成失败",
      detail: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}