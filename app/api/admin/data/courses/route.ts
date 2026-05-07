import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const semester = searchParams.get("semester") || "";
    const courseName = searchParams.get("courseName") || "";
    const teacher = searchParams.get("teacher") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (semester) {
      where.semester = semester;
    }

    if (courseName) {
      where.courseName = { contains: courseName };
    }

    if (teacher) {
      where.OR = [
        { teacherNames: { contains: teacher } },
        { ownerTeacher: { contains: teacher } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59");
      }
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              students: true,
              targets: true,
              methods: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.course.count({ where }),
    ]);

    const formattedCourses = courses.map((course) => ({
      id: course.id,
      courseName: course.courseName,
      courseCode: course.courseCode,
      semester: course.semester,
      className: course.className,
      teacherNames: course.teacherNames,
      ownerTeacher: course.ownerTeacher,
      department: course.department,
      major: course.major,
      credit: course.credit,
      selectedCount: course.selectedCount,
      evaluatedCount: course.evaluatedCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      username: course.user?.username,
      studentCount: course._count.students,
      targetCount: course._count.targets,
      methodCount: course._count.methods,
    }));

    return NextResponse.json({
      success: true,
      data: {
        courses: formattedCourses,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
