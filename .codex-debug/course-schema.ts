import { z } from "zod";

export const assessmentCategorySchema = z.enum(["PROCESS", "RESULT", "OTHER"]);

export const assessmentMethodInputSchema = z.object({
  name: z.string().trim().min(1, "评价方式名称不能为空"),
  category: assessmentCategorySchema,
  fullScore: z.coerce.number().min(0),
  enabled: z.boolean().default(true),
});

export const courseTargetInputSchema = z.object({
  name: z.string().trim().min(1, "课程目标名称不能为空"),
  summary: z.string().default(""),
  graduationRequirement: z.string().default(""),
  supportStrength: z.string().default(""),
  overallWeight: z.coerce.number().min(0).max(1),
  processEvaluationRatio: z.coerce.number().min(0).max(1),
  resultEvaluationRatio: z.coerce.number().min(0).max(1),
  surveyEvaluationRatio: z.coerce.number().min(0).max(1),
  otherEvaluationRatio: z.coerce.number().min(0).max(1).default(0),
  directWeight: z.coerce.number().min(0).max(1).default(0.8),
  indirectWeight: z.coerce.number().min(0).max(1).default(0.2),
});

export const targetMethodConfigInputSchema = z.object({
  targetIndex: z.coerce.number().int().min(0),
  methodIndex: z.coerce.number().int().min(0),
  weight: z.coerce.number().min(0).max(1),
  targetScore: z.coerce.number().min(0),
});

export const examQuestionInputSchema = z.object({
  label: z.string().default(""),
  title: z.string().default(""),
  score: z.coerce.number().min(0),
  targetLabels: z.array(z.string().default("")).default([]),
  targetScores: z.array(z.coerce.number().min(0)),
});

export const studentInputSchema = z.object({
  majorName: z.string().default(""),
  className: z.string().default(""),
  studentNo: z.string().default(""),
  studentName: z.string().default(""),
  scores: z.record(z.string(), z.record(z.string(), z.union([z.number(), z.null()]))),
});

export const indirectEvaluationInputSchema = z.object({
  targetIndex: z.coerce.number().int().min(0),
  countA: z.coerce.number().int().min(0),
  countB: z.coerce.number().int().min(0),
  countC: z.coerce.number().int().min(0),
  countD: z.coerce.number().int().min(0),
  countE: z.coerce.number().int().min(0),
});

export const reportTextsInputSchema = z.object({
  analysisText: z.string().default(""),
  problemText: z.string().default(""),
  improvementText: z.string().default(""),
  teacherComment: z.string().default(""),
});

export const courseInputSchema = z
  .object({
    id: z.string().optional(),
    courseName: z.string().trim().min(1, "课程名称不能为空"),
    courseCode: z.string().trim().min(1, "课程编码不能为空"),
    courseType: z.string().default(""),
    semester: z.string().trim().min(1, "学期不能为空"),
    className: z.string().trim().min(1, "班级不能为空"),
    department: z.string().default(""),
    major: z.string().default(""),
    teacherNames: z.string().default(""),
    ownerTeacher: z.string().default(""),
    hours: z.string().default(""),
    credit: z.string().default(""),
    selectedCount: z.coerce.number().int().min(0),
    evaluatedCount: z.coerce.number().int().min(0),
    expectedValue: z.coerce.number().min(0).max(1),
    directWeight: z.coerce.number().min(0).max(1),
    indirectWeight: z.coerce.number().min(0).max(1),
    surveyWeight: z.coerce.number().min(0).max(1),
    targets: z.array(courseTargetInputSchema).min(1),
    methods: z.array(assessmentMethodInputSchema).min(1),
    targetMethodConfigs: z.array(targetMethodConfigInputSchema),
    examQuestions: z.array(examQuestionInputSchema),
    students: z.array(studentInputSchema),
    indirectEvaluations: z.array(indirectEvaluationInputSchema),
    reportTexts: reportTextsInputSchema,
  })
  .superRefine((course, ctx) => {
    course.targets.forEach((target, index) => {
      const processTotal = course.targetMethodConfigs
        .filter(
          (config) =>
            config.targetIndex === index &&
            course.methods[config.methodIndex]?.enabled &&
            course.methods[config.methodIndex]?.category === "PROCESS",
        )
        .reduce((sum, config) => sum + config.weight, 0);

      if (processTotal > 1.0001) {
        ctx.addIssue({
          code: "custom",
          path: ["targetMethodConfigs"],
          message: `${target.name} 的过程性评价构成不能超�?100%`,
        });
      }

      if (target.processEvaluationRatio + target.resultEvaluationRatio > 1.0001) {
        ctx.addIssue({
          code: "custom",
          path: ["targets", index, "resultEvaluationRatio"],
          message: `${target.name} 的直接评价构成不能超�?100%`,
        });
      }

      if (target.surveyEvaluationRatio + target.otherEvaluationRatio > 1.0001) {
        ctx.addIssue({
          code: "custom",
          path: ["targets", index, "otherEvaluationRatio"],
          message: `${target.name} 的间接评价构成不能超�?100%`,
        });
      }

      if (target.directWeight + target.indirectWeight > 1.0001) {
        ctx.addIssue({
          code: "custom",
          path: ["targets", index, "indirectWeight"],
          message: `${target.name} 的综合评价构成不能超�?100%`,
        });
      }
    });

    const overallWeightTotal = course.targets.reduce((sum, target) => sum + target.overallWeight, 0);
    if (Math.abs(overallWeightTotal - 1) > 1e-4) {
      ctx.addIssue({
        code: "custom",
        path: ["targets"],
        message: "课程分目标权重之和必须等�?1",
      });
    }
  });

export type CourseInput = z.infer<typeof courseInputSchema>;
export type AssessmentMethodInput = z.infer<typeof assessmentMethodInputSchema>;
export type CourseTargetInput = z.infer<typeof courseTargetInputSchema>;
export type StudentInput = z.infer<typeof studentInputSchema>;

