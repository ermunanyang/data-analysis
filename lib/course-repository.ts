import { randomUUID } from "node:crypto";

import { createDefaultCourseInput, normalizeStudentRows } from "@/lib/course-defaults";
import { courseInputSchema, type CourseInput } from "@/lib/course-schema";
import { prisma } from "@/lib/prisma";

const toNumber = (value: { toString(): string } | number | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value);

function sortBy<T extends { sortOrder: number }>(rows: T[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCourseSummaries(userId: string) {
  return prisma.course.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      semester: true,
      className: true,
      major: true,
      updatedAt: true,
    },
  });
}

export async function getCourseInputById(id: string, userId: string): Promise<CourseInput | null> {
  const course = await prisma.course.findFirst({
    where: { id, userId },
    include: {
      targets: {
        orderBy: { sortOrder: "asc" },
        include: {
          methodConfigs: true,
          indirectEvaluation: true,
        },
      },
      methods: {
        orderBy: { sortOrder: "asc" },
      },
      examQuestions: {
        orderBy: { sortOrder: "asc" },
      },
      students: {
        orderBy: { sortOrder: "asc" },
        include: {
          scores: true,
        },
      },
    },
  });

  if (!course) return null;

  const targets = sortBy(course.targets);
  const methods = sortBy(course.methods);

  const input: CourseInput = {
    id: course.id,
    courseName: course.courseName,
    courseCode: course.courseCode,
    courseType: course.courseType ?? "",
    semester: course.semester,
    className: course.className,
    department: course.department ?? "",
    major: course.major ?? "",
    teacherNames: course.teacherNames ?? "",
    ownerTeacher: course.ownerTeacher ?? "",
    hours: course.hours ?? "",
    credit: course.credit ?? "",
    selectedCount: course.selectedCount,
    evaluatedCount: course.evaluatedCount,
    expectedValue: toNumber(course.expectedValue),
    directWeight: toNumber(course.directWeight),
    indirectWeight: toNumber(course.indirectWeight),
    surveyWeight: toNumber(course.surveyWeight),
    targets: targets.map((target) => ({
      name: target.name,
      summary: target.summary,
      graduationRequirement: target.graduationRequirement,
      supportStrength: (target.supportStrength ?? "L") as "L" | "M" | "H",
      overallWeight: toNumber(target.overallWeight),
      processEvaluationRatio: toNumber(target.processEvaluationRatio),
      resultEvaluationRatio: toNumber(target.resultEvaluationRatio),
      surveyEvaluationRatio: toNumber(target.surveyEvaluationRatio),
      otherEvaluationRatio: toNumber(target.otherEvaluationRatio),
      directWeight: toNumber(target.directWeight),
      indirectWeight: toNumber(target.indirectWeight),
    })),
    methods: methods.map((method) => ({
      name: method.name,
      category: method.category,
      fullScore: toNumber(method.fullScore),
      enabled: method.enabled,
    })),
    targetMethodConfigs: targets.flatMap((target, targetIndex) =>
      methods.map((method, methodIndex) => {
        const config = target.methodConfigs.find((item) => item.methodId === method.id);
        return {
          targetIndex,
          methodIndex,
          weight: toNumber(config?.weight),
          normalizedWeight: toNumber(config?.normalizedWeight),
          targetScore: toNumber(config?.targetScore),
        };
      }),
    ),
    examQuestions: course.examQuestions.map((question) => ({
      label:
        (Array.isArray(question.targetLabels) ? String(question.targetLabels[0] ?? "") : "") ||
        question.label,
      title: question.title,
      score: toNumber(question.score),
      targetLabels: Array.isArray(question.targetLabels)
        ? question.targetLabels.map((value) => String(value ?? ""))
        : targets.map(() => question.label ?? ""),
      targetScores: Array.isArray(question.targetScores)
        ? question.targetScores.map((value) => Number(value ?? 0))
        : [],
    })),
    students: course.students.map((student) => {
      const scores: Record<string, Record<string, number | null>> = {};

      methods.forEach((_, methodIndex) => {
        scores[String(methodIndex)] = {};
        targets.forEach((_, targetIndex) => {
          const methodId = methods[methodIndex]?.id;
          const targetId = targets[targetIndex]?.id;
          const score = student.scores.find(
            (item) => item.methodId === methodId && item.targetId === targetId,
          );
          scores[String(methodIndex)][String(targetIndex)] =
            score?.score === null || score?.score === undefined ? null : Number(score.score);
        });
      });

      return {
        majorName: student.majorName ?? "",
        className: student.className ?? "",
        studentNo: student.studentNo,
        studentName: student.studentName,
        scores,
      };
    }),
    indirectEvaluations: targets.map((target, targetIndex) => ({
      targetIndex,
      countA: target.indirectEvaluation?.countA ?? 0,
      countB: target.indirectEvaluation?.countB ?? 0,
      countC: target.indirectEvaluation?.countC ?? 0,
      countD: target.indirectEvaluation?.countD ?? 0,
      countE: target.indirectEvaluation?.countE ?? 0,
    })),
    reportTexts: {
      analysisText: course.analysisText,
      problemText: course.problemText,
      improvementText: course.improvementText,
      teacherComment: course.teacherComment,
    },
  };

  return normalizeStudentRows(input);
}

function compactStudents(students: CourseInput["students"]) {
  return students.filter((student) => student.studentNo.trim() || student.studentName.trim());
}

export async function saveCourse(input: CourseInput, userId: string, id?: string) {
  const parsed = courseInputSchema.parse(normalizeStudentRows(input));
  const students = compactStudents(parsed.students);

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.course.findFirst({
      where: {
        userId,
        courseName: parsed.courseName,
        semester: parsed.semester,
        className: parsed.className,
        ...(id ? { NOT: { id } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new Error("已存在相同课程名称、学期和班级的课程记录");
    }

    const baseData = {
      userId,
      courseName: parsed.courseName,
      courseCode: parsed.courseCode,
      courseType: parsed.courseType,
      semester: parsed.semester,
      className: parsed.className,
      department: parsed.department,
      major: parsed.major,
      teacherNames: parsed.teacherNames,
      ownerTeacher: parsed.ownerTeacher,
      hours: parsed.hours,
      credit: parsed.credit,
      selectedCount: parsed.selectedCount,
      evaluatedCount: parsed.evaluatedCount,
      targetCount: parsed.targets.length,
      expectedValue: parsed.expectedValue,
      directWeight: parsed.directWeight,
      indirectWeight: parsed.indirectWeight,
      surveyWeight: parsed.surveyWeight,
      analysisText: parsed.reportTexts.analysisText,
      problemText: parsed.reportTexts.problemText,
      improvementText: parsed.reportTexts.improvementText,
      teacherComment: parsed.reportTexts.teacherComment,
    };

    let courseRecord;
    if (id) {
      const existingCourse = await tx.course.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!existingCourse) {
        throw new Error("课程不存在或无权访问");
      }

      courseRecord = await tx.course.update({
        where: { id },
        data: baseData,
      });
    } else {
      courseRecord = await tx.course.create({
        data: baseData,
      });
    }

    await tx.studentScore.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.indirectEvaluation.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.targetMethodConfig.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.examQuestion.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.student.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.assessmentMethod.deleteMany({ where: { courseId: courseRecord.id } });
    await tx.courseTarget.deleteMany({ where: { courseId: courseRecord.id } });

    const targetIds = parsed.targets.map(() => randomUUID());
    const methodIds = parsed.methods.map(() => randomUUID());

    await tx.courseTarget.createMany({
      data: parsed.targets.map((target, index) => ({
        id: targetIds[index],
        courseId: courseRecord.id,
        sortOrder: index,
        name: target.name,
        summary: target.summary,
        graduationRequirement: target.graduationRequirement,
        supportStrength: target.supportStrength,
        overallWeight: target.overallWeight,
        processEvaluationRatio: target.processEvaluationRatio,
        resultEvaluationRatio: target.resultEvaluationRatio,
        surveyEvaluationRatio: target.surveyEvaluationRatio,
        otherEvaluationRatio: target.otherEvaluationRatio,
        directWeight: target.directWeight,
        indirectWeight: target.indirectWeight,
      })),
    });

    await tx.assessmentMethod.createMany({
      data: parsed.methods.map((method, index) => ({
        id: methodIds[index],
        courseId: courseRecord.id,
        sortOrder: index,
        name: method.name,
        category: method.category,
        fullScore: method.fullScore,
        enabled: method.enabled,
      })),
    });

    await tx.targetMethodConfig.createMany({
      data: parsed.targetMethodConfigs.map((config) => ({
        id: randomUUID(),
        courseId: courseRecord.id,
        targetId: targetIds[config.targetIndex],
        methodId: methodIds[config.methodIndex],
        weight: config.weight,
        normalizedWeight: config.normalizedWeight,
        targetScore: config.targetScore,
      })),
    });

    await tx.examQuestion.createMany({
      data: parsed.examQuestions.map((question, index) => ({
        id: randomUUID(),
        courseId: courseRecord.id,
        sortOrder: index,
        label: question.label || `${index + 1}`,
        title: question.title,
        score: question.score,
        targetLabels: question.targetLabels,
        targetScores: question.targetScores,
      })),
    });

    await tx.indirectEvaluation.createMany({
      data: parsed.indirectEvaluations.map((item) => ({
        id: randomUUID(),
        courseId: courseRecord.id,
        targetId: targetIds[item.targetIndex],
        countA: item.countA,
        countB: item.countB,
        countC: item.countC,
        countD: item.countD,
        countE: item.countE,
      })),
    });

    const studentIds = students.map(() => randomUUID());

    if (students.length > 0) {
      await tx.student.createMany({
        data: students.map((student, index) => ({
          id: studentIds[index],
          courseId: courseRecord.id,
          sortOrder: index,
          majorName: student.majorName,
          className: student.className,
          studentNo: student.studentNo || `TEMP-${index + 1}`,
          studentName: student.studentName || `未命名学生${index + 1}`,
        })),
      });

      const scoreRows = students.flatMap((student, studentIndex) =>
        parsed.methods.flatMap((_, methodIndex) =>
          parsed.targets.flatMap((_, targetIndex) => {
            const value = student.scores[String(methodIndex)]?.[String(targetIndex)];
            if (value === null || value === undefined || Number.isNaN(value)) {
              return [];
            }

            return {
              id: randomUUID(),
              courseId: courseRecord.id,
              studentId: studentIds[studentIndex],
              methodId: methodIds[methodIndex],
              targetId: targetIds[targetIndex],
              score: value,
            };
          }),
        ),
      );

      if (scoreRows.length > 0) {
        await tx.studentScore.createMany({
          data: scoreRows,
        });
      }
    }

    return courseRecord.id;
  });
}

export async function deleteCourse(id: string, userId: string) {
  const result = await prisma.course.deleteMany({
    where: { id, userId },
  });

  return result.count > 0;
}

export function createCourseDraft() {
  return createDefaultCourseInput();
}
