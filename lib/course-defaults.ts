import type { CourseInput } from "@/lib/course-schema";

export const DEFAULT_STUDENT_ROWS = 50;
export const DEFAULT_EXAM_QUESTION_COUNT = 9;

const LEGACY_PLACEHOLDER_METHOD = /^(评价方式\d+|过程性评价\d+)$/;

export function createEmptyStudent(
  methodCount = 3,
  targetCount = 7,
): CourseInput["students"][number] {
  const scores: Record<string, Record<string, number | null>> = {};
  for (let methodIndex = 0; methodIndex < methodCount; methodIndex += 1) {
    scores[String(methodIndex)] = {};
    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      scores[String(methodIndex)][String(targetIndex)] = null;
    }
  }

  return {
    majorName: "",
    className: "",
    studentNo: "",
    studentName: "",
    scores,
  };
}

function createDefaultTargets() {
  return Array.from({ length: 7 }, (_, index) => ({
    name: `课程目标${index + 1}`,
    summary: "",
    graduationRequirement: "",
    supportStrength: "L" as const,
    overallWeight: 0,
    processEvaluationRatio: 0,
    resultEvaluationRatio: 0,
    surveyEvaluationRatio: 0,
    otherEvaluationRatio: 0,
    directWeight: 0,
    indirectWeight: 0,
  }));
}

function createDefaultMethods(): CourseInput["methods"] {
  return [
    { name: "平时作业", category: "PROCESS", fullScore: 100, enabled: true },
    { name: "实验考核", category: "PROCESS", fullScore: 100, enabled: true },
    { name: "结果性评价", category: "RESULT", fullScore: 100, enabled: true },
  ];
}

function syncDerivedTargetMethodConfigs(input: CourseInput): CourseInput["targetMethodConfigs"] {
  return input.targetMethodConfigs.map((config) => {
    const method = input.methods[config.methodIndex];
    if (!method) {
      return { ...config, normalizedWeight: 0 };
    }

    const processConfigs = input.targetMethodConfigs.filter((item) => {
      const currentMethod = input.methods[item.methodIndex];
      return (
        item.targetIndex === config.targetIndex &&
        currentMethod?.enabled &&
        currentMethod.category === "PROCESS"
      );
    });
    const processTotal = processConfigs.reduce((sum, item) => sum + item.weight, 0);
    const normalizedWeight =
      method.category === "PROCESS" && method.enabled && processTotal > 0
        ? Number((config.weight / processTotal).toFixed(4))
        : 0;

    if (method.category === "RESULT") {
      return {
        ...config,
        normalizedWeight,
        targetScore: input.examQuestions.reduce(
          (sum, question) => sum + (question.targetScores[config.targetIndex] ?? 0),
          0,
        ),
      };
    }

    return {
      ...config,
      normalizedWeight,
    };
  });
}

export function createDefaultCourseInput(): CourseInput {
  const targets = createDefaultTargets();
  const methods = createDefaultMethods();

  const targetMethodConfigs = targets.flatMap((target, targetIndex) =>
    methods.map((method, methodIndex) => ({
      targetIndex,
      methodIndex,
      weight:
        method.category === "PROCESS" && targetIndex === 0 && methodIndex === 0
          ? 0.4
          : method.category === "PROCESS" && targetIndex === 1 && methodIndex === 0
            ? 0.6
            : method.category === "PROCESS" && targetIndex === 3 && methodIndex === 1
              ? 1
              : 0,
      targetScore:
        method.category === "PROCESS" && targetIndex === 0 && methodIndex === 0
          ? 40
          : method.category === "PROCESS" && targetIndex === 1 && methodIndex === 0
            ? 60
            : method.category === "PROCESS" && targetIndex === 3 && methodIndex === 1
              ? 100
              : 0,
      normalizedWeight: 0,
    })),
  );

  const courseInput: CourseInput = {
    courseName: "",
    courseCode: "",
    courseType: "",
    semester: "",
    className: "",
    department: "",
    major: "",
    teacherNames: "",
    ownerTeacher: "",
    hours: "",
    credit: "",
    selectedCount: 0,
    evaluatedCount: 0,
    expectedValue: 0.65,
    directWeight: 0.8,
    indirectWeight: 0.2,
    surveyWeight: 1,
    targets,
    methods,
    targetMethodConfigs,
    examQuestions: Array.from({ length: DEFAULT_EXAM_QUESTION_COUNT }, (_, index) => ({
      label: `${index + 1}`,
      title: "",
      score: 0,
      targetLabels: targets.map(() => `${index + 1}`),
      targetScores: targets.map(() => 0),
    })),
    students: Array.from({ length: DEFAULT_STUDENT_ROWS }, () =>
      createEmptyStudent(methods.length, targets.length),
    ),
    indirectEvaluations: targets.map((_, index) => ({
      targetIndex: index,
      countA: 0,
      countB: 0,
      countC: 0,
      countD: 0,
      countE: 0,
    })),
    reportTexts: {
      analysisText: "",
      problemText: "",
      improvementText: "",
      teacherComment: "",
    },
  };

  return {
    ...courseInput,
    targetMethodConfigs: syncDerivedTargetMethodConfigs(courseInput),
  };
}

function hasStudentScoresForMethod(input: CourseInput, methodIndex: number) {
  return input.students.some((student) =>
    Object.values(student.scores[String(methodIndex)] ?? {}).some(
      (value) => value !== null && value !== undefined && !Number.isNaN(value),
    ),
  );
}

function shouldDropLegacyMethod(
  input: CourseInput,
  method: CourseInput["methods"][number],
  methodIndex: number,
) {
  if (method.category !== "PROCESS") return false;
  if (!LEGACY_PLACEHOLDER_METHOD.test(method.name.trim())) return false;

  const hasConfigValue = input.targetMethodConfigs.some(
    (config) =>
      config.methodIndex === methodIndex &&
      (config.weight > 0 || config.normalizedWeight > 0 || config.targetScore > 0),
  );

  return !hasConfigValue && !hasStudentScoresForMethod(input, methodIndex);
}

function sanitizeLegacyMethods(input: CourseInput): CourseInput {
  const keepMethodIndexes = input.methods
    .map((method, methodIndex) => ({ method, methodIndex }))
    .filter(({ method, methodIndex }) => !shouldDropLegacyMethod(input, method, methodIndex))
    .map(({ methodIndex }) => methodIndex);

  if (keepMethodIndexes.length === input.methods.length) {
    return input;
  }

  const methodIndexMap = new Map<number, number>();
  keepMethodIndexes.forEach((oldIndex, newIndex) => {
    methodIndexMap.set(oldIndex, newIndex);
  });

  const methods = keepMethodIndexes.map((methodIndex) => input.methods[methodIndex]);
  const targetMethodConfigs = input.targetMethodConfigs
    .filter((config) => methodIndexMap.has(config.methodIndex))
    .map((config) => ({
      ...config,
      methodIndex: methodIndexMap.get(config.methodIndex) ?? config.methodIndex,
    }));

  const students = input.students.map((student) => {
    const nextStudent = createEmptyStudent(methods.length, input.targets.length);
    nextStudent.majorName = student.majorName ?? "";
    nextStudent.className = student.className ?? "";
    nextStudent.studentNo = student.studentNo ?? "";
    nextStudent.studentName = student.studentName ?? "";

    keepMethodIndexes.forEach((oldMethodIndex, newMethodIndex) => {
      Object.entries(student.scores[String(oldMethodIndex)] ?? {}).forEach(([targetKey, value]) => {
        nextStudent.scores[String(newMethodIndex)][targetKey] = value;
      });
    });

    return nextStudent;
  });

  return {
    ...input,
    methods,
    targetMethodConfigs,
    students,
  };
}

export function normalizeStudentRows(input: CourseInput): CourseInput {
  const sanitizedInput = sanitizeLegacyMethods(input);
  const targetCount = sanitizedInput.targets.length;
  const methodCount = sanitizedInput.methods.length;
  const students = sanitizedInput.students.map((student) => {
    const next = createEmptyStudent(methodCount, targetCount);
    next.majorName = student.majorName ?? "";
    next.className = student.className ?? "";
    next.studentNo = student.studentNo ?? "";
    next.studentName = student.studentName ?? "";

    Object.entries(student.scores ?? {}).forEach(([methodKey, targetScores]) => {
      if (!(methodKey in next.scores)) return;
      Object.entries(targetScores ?? {}).forEach(([targetKey, value]) => {
        if (targetKey in next.scores[methodKey]) {
          next.scores[methodKey][targetKey] = value;
        }
      });
    });

    return next;
  });

  while (students.length < DEFAULT_STUDENT_ROWS) {
    students.push(createEmptyStudent(methodCount, targetCount));
  }

  const examQuestions =
    sanitizedInput.examQuestions.length > 0
      ? sanitizedInput.examQuestions.map((question, index) => ({
          ...question,
          label: (question.targetLabels?.[0] ?? question.label) || `${index + 1}`,
          targetLabels: Array.from({ length: targetCount }, (_, targetIndex) =>
            question.targetLabels?.[targetIndex] ?? question.label ?? `${index + 1}`,
          ),
          targetScores: Array.from({ length: targetCount }, (_, targetIndex) =>
            question.targetScores[targetIndex] ?? 0,
          ),
        }))
      : Array.from({ length: DEFAULT_EXAM_QUESTION_COUNT }, (_, index) => ({
          label: `${index + 1}`,
          title: "",
          score: 0,
          targetLabels: Array.from({ length: targetCount }, () => `${index + 1}`),
          targetScores: Array.from({ length: targetCount }, () => 0),
        }));

  const targets = sanitizedInput.targets.map((target) => ({
    ...target,
    supportStrength: target.supportStrength || "L",
    otherEvaluationRatio: target.otherEvaluationRatio ?? 0,
    directWeight: target.directWeight ?? 0,
    indirectWeight: target.indirectWeight ?? 0,
  }));

  const indirectEvaluations = Array.from({ length: targetCount }, (_, targetIndex) => {
    const row = sanitizedInput.indirectEvaluations.find((item) => item.targetIndex === targetIndex);
    return {
      targetIndex,
      countA: row?.countA ?? 0,
      countB: row?.countB ?? 0,
      countC: row?.countC ?? 0,
      countD: row?.countD ?? 0,
      countE: row?.countE ?? 0,
    };
  });

  const normalizedInput: CourseInput = {
    ...sanitizedInput,
    targets,
    examQuestions,
    indirectEvaluations,
    students,
  };

  return {
    ...normalizedInput,
    targetMethodConfigs: syncDerivedTargetMethodConfigs(normalizedInput),
  };
}
