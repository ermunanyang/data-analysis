import type { CourseInput } from "@/lib/course-schema";

type StudentTargetDetail = {
  targetName: string;
  methodScores: { methodName: string; score: number | null; targetScore: number }[];
  attainment: number;
};

export type CourseCalculation = {
  targetSummaries: {
    targetName: string;
    directAttainment: number;
    indirectAttainment: number;
    finalAttainment: number;
    expectedValue: number;
    processRatio: number;
    resultRatio: number;
  }[];
  studentSummaries: {
    studentNo: string;
    studentName: string;
    targetAttainments: number[];
    totalAttainment: number;
  }[];
  studentDetails: {
    studentNo: string;
    studentName: string;
    details: StudentTargetDetail[];
    totalAttainment: number;
  }[];
  chartRows: {
    index: number;
    studentNo: string;
    studentName: string;
    targetAttainments: number[];
    totalAttainment: number;
    averageTargetAttainments: number[];
    averageTotalAttainment: number;
    expectedValue: number;
  }[];
  averages: {
    targetAverages: number[];
    totalAverage: number;
  };
};

const round = (value: number) => Number(value.toFixed(4));

function getConfig(input: CourseInput, targetIndex: number, methodIndex: number) {
  return (
    input.targetMethodConfigs.find(
      (item) => item.targetIndex === targetIndex && item.methodIndex === methodIndex,
    ) ?? { weight: 0, targetScore: 0 }
  );
}

function calculateIndirect(input: CourseInput, targetIndex: number) {
  const result = input.indirectEvaluations.find((item) => item.targetIndex === targetIndex);
  if (!result) return 0;

  const total = result.countA + result.countB + result.countC + result.countD + result.countE;
  if (total === 0) return 0;

  const surveyScore =
    (result.countA * 1 +
      result.countB * 0.8 +
      result.countC * 0.6 +
      result.countD * 0.4 +
      result.countE * 0.2) /
    total;

  const target = input.targets[targetIndex];
  const otherScore = 0;

  return round(
    surveyScore * (target?.surveyEvaluationRatio ?? 0) +
      otherScore * (target?.otherEvaluationRatio ?? 0),
  );
}

function getNormalizedProcessWeight(
  input: CourseInput,
  targetIndex: number,
  methodIndex: number,
) {
  const processConfigs = input.targetMethodConfigs.filter((config) => {
    const method = input.methods[config.methodIndex];
    return (
      config.targetIndex === targetIndex &&
      method?.enabled &&
      method.category === "PROCESS"
    );
  });

  const totalWeight = processConfigs.reduce((sum, config) => sum + config.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const config = processConfigs.find((item) => item.methodIndex === methodIndex);
  return config ? config.weight / totalWeight : 0;
}

function isStudentFilled(student: CourseInput["students"][number]) {
  return Boolean(student.studentNo.trim() || student.studentName.trim());
}

export function calculateCourse(input: CourseInput): CourseCalculation {
  const activeStudents = input.students.filter(isStudentFilled);

  const studentDetails = activeStudents.map((student) => {
    const details = input.targets.map((target, targetIndex) => {
      const methodScores = input.methods.map((method, methodIndex) => {
        const config = getConfig(input, targetIndex, methodIndex);
        const raw = student.scores[String(methodIndex)]?.[String(targetIndex)];
        return {
          methodName: method.name,
          score: raw ?? null,
          targetScore: config.targetScore,
        };
      });

      const processAttainment = input.methods.reduce((sum, method, methodIndex) => {
        if (method.category !== "PROCESS" || !method.enabled) {
          return sum;
        }

        const config = getConfig(input, targetIndex, methodIndex);
        const raw = student.scores[String(methodIndex)]?.[String(targetIndex)];
        if (raw === null || raw === undefined || config.targetScore <= 0) {
          return sum;
        }

        const normalizedWeight = getNormalizedProcessWeight(input, targetIndex, methodIndex);
        return sum + (raw / config.targetScore) * normalizedWeight;
      }, 0);

      const resultMethodIndex = input.methods.findIndex(
        (method) => method.category === "RESULT" && method.enabled,
      );
      const resultConfig =
        resultMethodIndex >= 0 ? getConfig(input, targetIndex, resultMethodIndex) : null;
      const resultRaw =
        resultMethodIndex >= 0
          ? student.scores[String(resultMethodIndex)]?.[String(targetIndex)]
          : null;
      const resultAttainment =
        resultMethodIndex >= 0 &&
        resultConfig &&
        resultRaw !== null &&
        resultRaw !== undefined &&
        resultConfig.targetScore > 0
          ? resultRaw / resultConfig.targetScore
          : 0;

      const attainment = round(
        processAttainment * target.processEvaluationRatio +
          resultAttainment * target.resultEvaluationRatio,
      );

      return {
        targetName: target.name,
        methodScores,
        attainment,
      };
    });

    const totalAttainment = round(
      details.reduce(
        (sum, detail, index) => sum + detail.attainment * input.targets[index].overallWeight,
        0,
      ),
    );

    return {
      studentNo: student.studentNo,
      studentName: student.studentName,
      details,
      totalAttainment,
    };
  });

  const studentSummaries = studentDetails.map((item) => ({
    studentNo: item.studentNo,
    studentName: item.studentName,
    targetAttainments: item.details.map((detail) => detail.attainment),
    totalAttainment: item.totalAttainment,
  }));

  const targetAverages = input.targets.map((_, index) => {
    if (studentSummaries.length === 0) return 0;
    const total = studentSummaries.reduce(
      (sum, student) => sum + (student.targetAttainments[index] ?? 0),
      0,
    );
    return round(total / studentSummaries.length);
  });

  const totalAverage =
    studentSummaries.length === 0
      ? 0
      : round(
          studentSummaries.reduce((sum, student) => sum + student.totalAttainment, 0) /
            studentSummaries.length,
        );

  const targetSummaries = input.targets.map((target, index) => {
    const directAttainment = targetAverages[index] ?? 0;
    const indirectAttainment = calculateIndirect(input, index);
    const finalAttainment = round(
      directAttainment * target.directWeight + indirectAttainment * target.indirectWeight,
    );

    return {
      targetName: target.name,
      directAttainment,
      indirectAttainment,
      finalAttainment,
      expectedValue: input.expectedValue,
      processRatio: target.processEvaluationRatio,
      resultRatio: target.resultEvaluationRatio,
    };
  });

  const chartRows = studentSummaries.map((student, index) => ({
    index: index + 1,
    studentNo: student.studentNo,
    studentName: student.studentName,
    targetAttainments: student.targetAttainments,
    totalAttainment: student.totalAttainment,
    averageTargetAttainments: targetAverages,
    averageTotalAttainment: totalAverage,
    expectedValue: input.expectedValue,
  }));

  return {
    targetSummaries,
    studentSummaries,
    studentDetails,
    chartRows,
    averages: {
      targetAverages,
      totalAverage,
    },
  };
}
