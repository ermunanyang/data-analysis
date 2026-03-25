import type { CourseInput } from "@/lib/course-schema";

export const SCORE_SHEET_STUDENT_START_ROW = 7;
export const SCORE_SHEET_HEADER_ROW_COUNT = 6;

export type StudentFieldKey = "majorName" | "className" | "studentNo" | "studentName";

export type ScoreSheetColumn =
  | {
      kind: "student";
      key: StudentFieldKey;
      label: string;
    }
  | {
      kind: "score";
      methodIndex: number;
      targetIndex: number;
      label: string;
    }
  | {
      kind: "total";
      methodIndex: number;
      label: string;
    };

export function getScoreSheetMethodIndexes(course: CourseInput): number[] {
  const processIndexes = course.methods
    .map((method, index) => ({ method, index }))
    .filter(({ method }) => method.enabled && method.category === "PROCESS")
    .map(({ index }) => index);
  const resultIndex = course.methods.findIndex(
    (method) => method.enabled && method.category === "RESULT",
  );

  return resultIndex >= 0 ? [...processIndexes, resultIndex] : processIndexes;
}

export function getScoreSheetColumns(course: CourseInput): ScoreSheetColumn[] {
  const methodIndexes = getScoreSheetMethodIndexes(course);
  const columns: ScoreSheetColumn[] = [
    { kind: "student", key: "majorName", label: "专业名" },
    { kind: "student", key: "className", label: "班级" },
    { kind: "student", key: "studentNo", label: "学号" },
    { kind: "student", key: "studentName", label: "姓名" },
  ];

  methodIndexes.forEach((methodIndex) => {
    course.targets.forEach((target, targetIndex) => {
      columns.push({
        kind: "score",
        methodIndex,
        targetIndex,
        label: target.name,
      });
    });

    columns.push({
      kind: "total",
      methodIndex,
      label: "总分",
    });
  });

  return columns;
}

export function getMethodTargetScore(
  course: CourseInput,
  methodIndex: number,
  targetIndex: number,
): number {
  return (
    course.targetMethodConfigs.find(
      (item) => item.methodIndex === methodIndex && item.targetIndex === targetIndex,
    )?.targetScore ?? 0
  );
}

export function getMethodTotalScore(course: CourseInput, methodIndex: number): number {
  return course.targets.reduce(
    (sum, _, targetIndex) => sum + getMethodTargetScore(course, methodIndex, targetIndex),
    0,
  );
}

export function getStudentMethodTotal(
  course: CourseInput,
  studentIndex: number,
  methodIndex: number,
): number {
  return course.targets.reduce((sum, _, targetIndex) => {
    const value = course.students[studentIndex]?.scores[String(methodIndex)]?.[String(targetIndex)];
    return sum + (value ?? 0);
  }, 0);
}

export function withMinimumScoreSheetRows(
  course: CourseInput,
  createStudent: (methodCount: number, targetCount: number) => CourseInput["students"][number],
): CourseInput {
  const students = [...course.students];
  const expectedCount = Math.max(
    students.length,
    course.evaluatedCount || 0,
    course.selectedCount || 0,
  );

  while (students.length < expectedCount) {
    students.push(createStudent(course.methods.length, course.targets.length));
  }

  return { ...course, students };
}
