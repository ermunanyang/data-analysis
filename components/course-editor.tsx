"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useDeferredValue, useMemo, useState, useTransition } from "react";

import { calculateCourse } from "@/lib/course-calculator";
import {
  createDefaultCourseInput,
  createEmptyStudent,
  normalizeStudentRows,
} from "@/lib/course-defaults";
import type { CourseInput } from "@/lib/course-schema";

type Props = {
  initialCourse?: CourseInput;
  courseId?: string;
};

type StepItem = {
  title: string;
  hint: string;
};

const steps: StepItem[] = [
  { title: "一、课程基本信息", hint: "录入课程名称、编码、学期、班级、教师等基础信息。" },
  { title: "二、课程目标与毕业要求的对应关系", hint: "支持新增、删除课程目标，并维护毕业要求与支撑强度。" },
  { title: "三、课程目标评价方式", hint: "按 Excel 结构维护过程性、直接、间接和综合评价构成及比例。" },
  { title: "四、间接评价", hint: "按课程目标录入问卷 A/B/C/D/E 人数，并实时预览间接评价达成度。" },
  { title: "五、考试试题对应课程分目标", hint: "按题号与分值维护各课程目标对应试题，可新增和删除。" },
  { title: "六、课程目标达成度目标分值", hint: "过程性评价目标分值可自动生成，生成后仍可继续编辑。" },
  { title: "七、课程分目标权重", hint: "维护课程目标权重，并填写教师分析、问题和改进措施。" },
];

const inputClass =
  "w-full rounded-2xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-teal-400";
const textareaClass = `${inputClass} min-h-24 resize-y`;
const sectionClass = "app-glass rounded-3xl p-5 shadow-sm";

export function CourseEditor({ initialCourse, courseId }: Props) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseInput>(
    normalizeStudentRows(initialCourse ?? createDefaultCourseInput()),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [examQuestionLabelDrafts, setExamQuestionLabelDrafts] = useState<Record<string, string>>({});
  const [examTargetScoreDrafts, setExamTargetScoreDrafts] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const preview = calculateCourse(useDeferredValue(course));
  const isEdit = Boolean(courseId);

  const processMethodIndexes = useMemo(
    () =>
      course.methods
        .map((method, index) => ({ method, index }))
        .filter((item) => item.method.category === "PROCESS")
        .map((item) => item.index),
    [course.methods],
  );

  const resultMethodIndex = useMemo(
    () => course.methods.findIndex((method) => method.category === "RESULT"),
    [course.methods],
  );

  const processRowTotals = useMemo(
    () =>
      course.targets.map((_, targetIndex) =>
        round(
          processMethodIndexes.reduce(
            (sum, methodIndex) => sum + getConfig(course, targetIndex, methodIndex).weight,
            0,
          ),
        ),
      ),
    [course, processMethodIndexes],
  );

  const processMethodTotals = useMemo(
    () =>
      processMethodIndexes.map((methodIndex) =>
        round(
          course.targets.reduce(
            (sum, _target, targetIndex) => sum + getConfig(course, targetIndex, methodIndex).weight,
            0,
          ),
        ),
      ),
    [course, processMethodIndexes],
  );

  const overallWeightTotal = useMemo(
    () => round(course.targets.reduce((sum, target) => sum + target.overallWeight, 0)),
    [course.targets],
  );

  const clampUnit = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  function patch(value: Partial<CourseInput>) {
    setCourse((current) => normalizeStudentRows({ ...current, ...value }));
  }

  function remapStudents(
    nextMethods: CourseInput["methods"],
    nextTargets: CourseInput["targets"],
    sourceStudents = course.students,
    methodIndexMap?: number[],
    targetIndexMap?: number[],
  ) {
    return sourceStudents.map((student) => {
      const nextStudent = createEmptyStudent(nextMethods.length, nextTargets.length);
      nextStudent.majorName = student.majorName ?? "";
      nextStudent.className = student.className ?? "";
      nextStudent.studentNo = student.studentNo ?? "";
      nextStudent.studentName = student.studentName ?? "";

      nextMethods.forEach((_, nextMethodIndex) => {
        const prevMethodIndex = methodIndexMap?.[nextMethodIndex] ?? nextMethodIndex;
        nextTargets.forEach((_, nextTargetIndex) => {
          const prevTargetIndex = targetIndexMap?.[nextTargetIndex] ?? nextTargetIndex;
          const value = student.scores[String(prevMethodIndex)]?.[String(prevTargetIndex)] ?? null;
          nextStudent.scores[String(nextMethodIndex)][String(nextTargetIndex)] = value;
        });
      });

      return nextStudent;
    });
  }

  function updateTarget(index: number, key: keyof CourseInput["targets"][number], value: string | number) {
    const targets = [...course.targets];
    targets[index] = { ...targets[index], [key]: value };
    patch({ targets });
  }

  function getIndirectEvaluation(targetIndex: number) {
    return (
      course.indirectEvaluations.find((item) => item.targetIndex === targetIndex) ?? {
        targetIndex,
        countA: 0,
        countB: 0,
        countC: 0,
        countD: 0,
        countE: 0,
      }
    );
  }

  function updateIndirectEvaluation(
    targetIndex: number,
    key: "countA" | "countB" | "countC" | "countD" | "countE",
    value: number,
  ) {
    const nextValue = Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0);
    const exists = course.indirectEvaluations.some((item) => item.targetIndex === targetIndex);
    const indirectEvaluations = exists
      ? course.indirectEvaluations.map((item) =>
          item.targetIndex === targetIndex ? { ...item, [key]: nextValue } : item,
        )
      : [
          ...course.indirectEvaluations,
          {
            targetIndex,
            countA: 0,
            countB: 0,
            countC: 0,
            countD: 0,
            countE: 0,
            [key]: nextValue,
          },
        ];

    patch({ indirectEvaluations });
  }

  function calculateSurveyAttainment(targetIndex: number) {
    const row = getIndirectEvaluation(targetIndex);
    const total = row.countA + row.countB + row.countC + row.countD + row.countE;
    if (total === 0) return 0;

    return round(
      (row.countA * 1 +
        row.countB * 0.8 +
        row.countC * 0.6 +
        row.countD * 0.4 +
        row.countE * 0.2) /
        total,
    );
  }

  function updateMethod(index: number, key: "name" | "fullScore", value: string | number) {
    const methods = [...course.methods];
    methods[index] = { ...methods[index], [key]: value };
    patch({ methods });
  }

  function updateConfig(
    targetIndex: number,
    methodIndex: number,
    key: "weight" | "targetScore",
    value: number,
  ) {
    patch({
      targetMethodConfigs: course.targetMethodConfigs.map((item) =>
        item.targetIndex === targetIndex && item.methodIndex === methodIndex
          ? { ...item, [key]: value }
          : item,
      ),
    });
  }

  function updateProcessWeight(targetIndex: number, methodIndex: number, value: number) {
    updateConfig(targetIndex, methodIndex, "weight", clampUnit(value));
  }

  function updatePairedTargetValues(
    index: number,
    key: "processEvaluationRatio" | "resultEvaluationRatio" | "surveyEvaluationRatio" | "otherEvaluationRatio" | "directWeight" | "indirectWeight",
    counterpart: "processEvaluationRatio" | "resultEvaluationRatio" | "surveyEvaluationRatio" | "otherEvaluationRatio" | "directWeight" | "indirectWeight",
    value: number,
  ) {
    const nextValue = clampUnit(value);
    const targets = [...course.targets];
    targets[index] = {
      ...targets[index],
      [key]: nextValue,
      [counterpart]: round(1 - nextValue),
    };
    patch({ targets });
  }

  function updateExamQuestionTargetLabel(questionIndex: number, targetIndex: number, value: string) {
    const examQuestions = [...course.examQuestions];
    const targetLabels = [...(examQuestions[questionIndex]?.targetLabels ?? [])];
    targetLabels[targetIndex] = value;
    examQuestions[questionIndex] = {
      ...examQuestions[questionIndex],
      label: targetLabels[0] ?? examQuestions[questionIndex]?.label ?? "",
      targetLabels,
    };
    patch({
      examQuestions,
      targetMethodConfigs: syncResultTargetScores(course.targetMethodConfigs, examQuestions, course.methods),
    });
  }

  function getExamQuestionLabelDraft(questionIndex: number, targetIndex: number) {
    const key = `${questionIndex}-${targetIndex}`;
    return (
      examQuestionLabelDrafts[key] ??
      course.examQuestions[questionIndex]?.targetLabels?.[targetIndex] ??
      ""
    );
  }

  function updateExamQuestionLabelDraft(questionIndex: number, targetIndex: number, value: string) {
    const key = `${questionIndex}-${targetIndex}`;
    setExamQuestionLabelDrafts((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function commitExamQuestionLabelDraft(questionIndex: number, targetIndex: number) {
    const key = `${questionIndex}-${targetIndex}`;
    const draft = examQuestionLabelDrafts[key];
    if (draft === undefined) {
      return;
    }

    updateExamQuestionTargetLabel(questionIndex, targetIndex, draft);
    setExamQuestionLabelDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateExamTargetScore(questionIndex: number, targetIndex: number, value: number) {
    const examQuestions = [...course.examQuestions];
    const targetScores = [...examQuestions[questionIndex].targetScores];
    targetScores[targetIndex] = value;
    examQuestions[questionIndex] = { ...examQuestions[questionIndex], targetScores };
    patch({
      examQuestions,
      targetMethodConfigs: syncResultTargetScores(course.targetMethodConfigs, examQuestions, course.methods),
    });
  }

  function getExamTargetScoreDraft(questionIndex: number, targetIndex: number) {
    const key = `${questionIndex}-${targetIndex}`;
    return examTargetScoreDrafts[key] ?? String(course.examQuestions[questionIndex]?.targetScores[targetIndex] ?? 0);
  }

  function updateExamTargetScoreDraft(questionIndex: number, targetIndex: number, value: string) {
    const key = `${questionIndex}-${targetIndex}`;
    setExamTargetScoreDrafts((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function commitExamTargetScoreDraft(questionIndex: number, targetIndex: number) {
    const key = `${questionIndex}-${targetIndex}`;
    const draft = examTargetScoreDrafts[key];
    if (draft === undefined) {
      return;
    }

    const nextValue = draft.trim() === "" ? 0 : Number(draft);
    updateExamTargetScore(questionIndex, targetIndex, Number.isFinite(nextValue) ? nextValue : 0);
    setExamTargetScoreDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addTarget() {
    const targetIndex = course.targets.length;
    const nextTargets = [
      ...course.targets,
      {
        name: `课程目标${targetIndex + 1}`,
        summary: "",
        graduationRequirement: "",
        supportStrength: "",
        overallWeight: 0,
        processEvaluationRatio: 0,
        resultEvaluationRatio: 0,
        surveyEvaluationRatio: 1,
        otherEvaluationRatio: 0,
        directWeight: 0.8,
        indirectWeight: 0.2,
      },
    ];

    patch({
      targets: nextTargets,
      targetMethodConfigs: syncResultTargetScores(
        [
          ...course.targetMethodConfigs,
          ...course.methods.map((_, methodIndex) => ({
            targetIndex,
            methodIndex,
            weight: 0,
            normalizedWeight: 0,
            targetScore: 0,
          })),
        ],
        course.examQuestions,
        course.methods,
      ),
      examQuestions: course.examQuestions.map((question) => ({
        ...question,
        targetLabels: [...question.targetLabels, ""],
        targetScores: [...question.targetScores, 0],
      })),
      indirectEvaluations: [
        ...course.indirectEvaluations,
        { targetIndex, countA: 0, countB: 0, countC: 0, countD: 0, countE: 0 },
      ],
      students: remapStudents(course.methods, nextTargets),
    });
  }

  function removeTarget(index: number) {
    if (course.targets.length === 1) {
      setError("至少需要保留一个课程目标");
      return;
    }

    const nextTargets = course.targets.filter((_, targetIndex) => targetIndex !== index);
    const targetIndexMap = nextTargets.map((_, nextIndex) =>
      nextIndex >= index ? nextIndex + 1 : nextIndex,
    );
    const nextConfigs = course.targetMethodConfigs
      .filter((item) => item.targetIndex !== index)
      .map((item) => ({
        ...item,
        targetIndex: item.targetIndex > index ? item.targetIndex - 1 : item.targetIndex,
      }));

    patch({
      targets: nextTargets,
      targetMethodConfigs: syncResultTargetScores(
        nextConfigs,
        course.examQuestions.map((question) => ({
          ...question,
          targetLabels: question.targetLabels.filter((_, targetIndex) => targetIndex !== index),
          targetScores: question.targetScores.filter((_, targetIndex) => targetIndex !== index),
        })),
        course.methods,
      ),
      examQuestions: course.examQuestions.map((question) => ({
        ...question,
        targetLabels: question.targetLabels.filter((_, targetIndex) => targetIndex !== index),
        targetScores: question.targetScores.filter((_, targetIndex) => targetIndex !== index),
      })),
      indirectEvaluations: course.indirectEvaluations
        .filter((item) => item.targetIndex !== index)
        .map((item) => ({
          ...item,
          targetIndex: item.targetIndex > index ? item.targetIndex - 1 : item.targetIndex,
        })),
      students: remapStudents(course.methods, nextTargets, course.students, undefined, targetIndexMap),
    });
  }

  function addProcessMethod() {
    const insertIndex = resultMethodIndex >= 0 ? resultMethodIndex : course.methods.length;
    const nextMethods = [...course.methods];
    nextMethods.splice(insertIndex, 0, {
      name: "",
      category: "PROCESS",
      fullScore: 100,
      enabled: true,
    });

    const nextConfigs = course.targetMethodConfigs.map((item) => ({
      ...item,
      methodIndex: item.methodIndex >= insertIndex ? item.methodIndex + 1 : item.methodIndex,
    }));

    course.targets.forEach((_, targetIndex) => {
      nextConfigs.push({
        targetIndex,
        methodIndex: insertIndex,
        weight: 0,
        normalizedWeight: 0,
        targetScore: 0,
      });
    });

    const nextStudents = course.students.map((student) => {
      const nextStudent = createEmptyStudent(nextMethods.length, course.targets.length);
      nextStudent.majorName = student.majorName ?? "";
      nextStudent.className = student.className ?? "";
      nextStudent.studentNo = student.studentNo ?? "";
      nextStudent.studentName = student.studentName ?? "";

      nextMethods.forEach((_, nextMethodIndex) => {
        if (nextMethodIndex === insertIndex) return;
        const prevMethodIndex = nextMethodIndex < insertIndex ? nextMethodIndex : nextMethodIndex - 1;
        course.targets.forEach((_, targetIndex) => {
          nextStudent.scores[String(nextMethodIndex)][String(targetIndex)] =
            student.scores[String(prevMethodIndex)]?.[String(targetIndex)] ?? null;
        });
      });

      return nextStudent;
    });

    patch({
      methods: nextMethods,
      targetMethodConfigs: syncResultTargetScores(nextConfigs, course.examQuestions, nextMethods),
      students: nextStudents,
    });
  }

  function removeProcessMethod(index: number) {
    if (processMethodIndexes.length === 1) {
      setError("至少需要保留一个过程性评价方式");
      return;
    }

    const nextMethods = course.methods.filter((_, methodIndex) => methodIndex !== index);
    const methodIndexMap = nextMethods.map((_, nextIndex) =>
      nextIndex >= index ? nextIndex + 1 : nextIndex,
    );

    const nextConfigs = course.targetMethodConfigs
      .filter((item) => item.methodIndex !== index)
      .map((item) => ({
        ...item,
        methodIndex: item.methodIndex > index ? item.methodIndex - 1 : item.methodIndex,
      }));

    patch({
      methods: nextMethods,
      targetMethodConfigs: syncResultTargetScores(nextConfigs, course.examQuestions, nextMethods),
      students: remapStudents(nextMethods, course.targets, course.students, methodIndexMap),
    });
  }

  function addExamQuestion() {
    const examQuestions = [
      ...course.examQuestions,
      {
        label: `${course.examQuestions.length + 1}`,
        title: "",
        score: 0,
        targetLabels: course.targets.map(() => ""),
        targetScores: course.targets.map(() => 0),
      },
    ];

    patch({
      examQuestions,
      targetMethodConfigs: syncResultTargetScores(course.targetMethodConfigs, examQuestions, course.methods),
    });
  }

  function removeExamQuestion(index: number) {
    if (course.examQuestions.length === 1) {
      setError("至少需要保留一列试题映射");
      return;
    }

    const examQuestions = course.examQuestions.filter((_, questionIndex) => questionIndex !== index);

    patch({
      examQuestions,
      targetMethodConfigs: syncResultTargetScores(course.targetMethodConfigs, examQuestions, course.methods),
    });
  }

  function syncResultTargetScores(
    configs: CourseInput["targetMethodConfigs"],
    examQuestions: CourseInput["examQuestions"],
    methods: CourseInput["methods"],
  ) {
    return configs.map((config) => {
      const method = methods[config.methodIndex];
      if (!method || method.category !== "RESULT") {
        return config;
      }

      return {
        ...config,
        targetScore: round(
          examQuestions.reduce(
            (sum, question) => sum + (question.targetScores[config.targetIndex] ?? 0),
            0,
          ),
        ),
      };
    });
  }

  async function save() {
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch(isEdit ? `/api/courses/${courseId}` : "/api/courses", {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(course),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "保存失败");
        }
        setMessage("课程方案已保存");
        if (isEdit) {
          router.refresh();
        } else {
          router.replace(`/courses/${payload.id}`);
        }
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "保存失败");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6">
      <div className="rounded-[2rem] bg-[linear-gradient(135deg,#dff2ff_0%,#f8fbff_55%,#fff6e8_100%)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              课程达成度在线工作台
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {course.courseName || "新建课程"}
            </h1>
            <p className="text-sm text-slate-600">{steps[currentStep].hint}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 text-sm">
              返回列表
            </Link>
            {isEdit ? (
              <Link
                href={`/courses/${courseId}/scores`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm"
              >
                成绩录入
              </Link>
            ) : null}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              {pending ? "保存中..." : isEdit ? "更新课程" : "创建课程"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Stat label="当前步骤" value={`${currentStep + 1} / ${steps.length}`} />
          <Stat label="课程目标数" value={String(course.targets.length)} />
          <Stat label="过程性评价方式数" value={String(processMethodIndexes.length)} />
          <Stat label="平均总目标达成度" value={String(preview.averages.totalAverage)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setCurrentStep(index)}
              className={`rounded-full px-4 py-2 text-sm ${
                currentStep === index
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {step.title}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep((value) => Math.max(0, value - 1))}
            disabled={currentStep === 0}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((value) => Math.min(steps.length - 1, value + 1))}
            disabled={currentStep === steps.length - 1}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            下一步
          </button>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      {currentStep === 0 ? (
        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">{steps[0].title}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="课程名称"><input className={inputClass} value={course.courseName} onChange={(e) => patch({ courseName: e.target.value })} /></Field>
            <Field label="课程编码"><input className={inputClass} value={course.courseCode} onChange={(e) => patch({ courseCode: e.target.value })} /></Field>
            <Field label="课程类别"><input className={inputClass} value={course.courseType} onChange={(e) => patch({ courseType: e.target.value })} /></Field>
            <Field label="开课学期"><input className={inputClass} value={course.semester} onChange={(e) => patch({ semester: e.target.value })} /></Field>
            <Field label="班级"><input className={inputClass} value={course.className} onChange={(e) => patch({ className: e.target.value })} /></Field>
            <Field label="专业"><input className={inputClass} value={course.major} onChange={(e) => patch({ major: e.target.value })} /></Field>
            <Field label="开课学院（部）"><input className={inputClass} value={course.department} onChange={(e) => patch({ department: e.target.value })} /></Field>
            <Field label="任课教师"><input className={inputClass} value={course.teacherNames} onChange={(e) => patch({ teacherNames: e.target.value })} /></Field>
            <Field label="课程负责人"><input className={inputClass} value={course.ownerTeacher} onChange={(e) => patch({ ownerTeacher: e.target.value })} /></Field>
            <Field label="学时"><input className={inputClass} value={course.hours} onChange={(e) => patch({ hours: e.target.value })} /></Field>
            <Field label="学分"><input className={inputClass} value={course.credit} onChange={(e) => patch({ credit: e.target.value })} /></Field>
            <Field label="选课人数"><input className={inputClass} type="number" value={course.selectedCount} onChange={(e) => patch({ selectedCount: Number(e.target.value) })} /></Field>
            <Field label="参评人数"><input className={inputClass} type="number" value={course.evaluatedCount} onChange={(e) => patch({ evaluatedCount: Number(e.target.value) })} /></Field>
            <Field label="期望值"><input className={inputClass} type="number" step="0.01" value={course.expectedValue} onChange={(e) => patch({ expectedValue: Number(e.target.value) })} /></Field>
          </div>
        </section>
      ) : null}

      {currentStep === 1 ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{steps[1].title}</h2>
            <button type="button" onClick={addTarget} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
              新增课程目标
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TH>课程目标</TH>
                  <TH>目标描述</TH>
                  <TH>支撑的毕业要求指标点</TH>
                  <TH>支撑强度</TH>
                  <TH>操作</TH>
                </tr>
              </thead>
              <tbody>
                {course.targets.map((target, index) => (
                  <tr key={index}>
                    <TD><input className={inputClass} value={target.name} onChange={(e) => updateTarget(index, "name", e.target.value)} /></TD>
                    <TD><textarea className={textareaClass} value={target.summary} onChange={(e) => updateTarget(index, "summary", e.target.value)} /></TD>
                    <TD><textarea className={textareaClass} value={target.graduationRequirement} onChange={(e) => updateTarget(index, "graduationRequirement", e.target.value)} /></TD>
                    <TD><input className={inputClass} value={target.supportStrength} onChange={(e) => updateTarget(index, "supportStrength", e.target.value)} /></TD>
                    <TD>
                      <button
                        type="button"
                        onClick={() => removeTarget(index)}
                        className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-600"
                      >
                        删除
                      </button>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section className={`${sectionClass} space-y-8`}>
          <h2 className="text-xl font-semibold">{steps[2].title}</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">（一）过程性评价构成及比例</h3>
              <button type="button" onClick={addProcessMethod} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
                新增评价方式
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <TH>课程目标</TH>
                    {processMethodIndexes.map((methodIndex) => (
                      <TH key={methodIndex}>
                        <input
                          className={inputClass}
                          value={course.methods[methodIndex]?.name ?? ""}
                          onChange={(e) => updateMethod(methodIndex, "name", e.target.value)}
                        />
                      </TH>
                    ))}
                    <TH>合计</TH>
                    {processMethodIndexes.map((methodIndex) => (
                      <TH key={`normalized-${methodIndex}`}>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-500">归一化</div>
                          <div>{course.methods[methodIndex]?.name || "评价方式"}</div>
                        </div>
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {course.targets.map((target, targetIndex) => (
                    <tr key={target.name}>
                      <TD>{target.name}</TD>
                      {processMethodIndexes.map((methodIndex, methodTotalIndex) => (
                        <TD key={`${target.name}-${methodIndex}`}>
                          <input
                            className={`${inputClass} ${
                              Math.abs(processMethodTotals[methodTotalIndex] - 1) > 0.0001
                                ? "border-rose-300 bg-rose-50"
                                : ""
                            }`}
                            type="number"
                            step="0.01"
                            value={getConfig(course, targetIndex, methodIndex).weight}
                            onChange={(e) => updateProcessWeight(targetIndex, methodIndex, Number(e.target.value))}
                          />
                        </TD>
                      ))}
                      <TD className="text-center align-middle font-medium text-slate-700">
                        {processRowTotals[targetIndex]}
                      </TD>
                      {processMethodIndexes.map((methodIndex) => (
                        <TD
                          key={`normalized-${target.name}-${methodIndex}`}
                          className="text-center align-middle font-medium text-slate-700"
                        >
                          {getConfig(course, targetIndex, methodIndex).normalizedWeight}
                        </TD>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <TD>总计</TD>
                    {processMethodIndexes.map((methodIndex, index) => (
                      <TD key={methodIndex} className="space-y-2 text-center align-middle">
                        <div
                          className={
                            Math.abs(processMethodTotals[index] - 1) > 0.0001
                              ? "font-semibold text-rose-600"
                              : "font-semibold text-sky-700"
                          }
                        >
                          {processMethodTotals[index]}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProcessMethod(methodIndex)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        >
                          删除列
                        </button>
                      </TD>
                    ))}
                    <TD className="text-center align-middle text-slate-500">每列总计为 1</TD>
                    {processMethodIndexes.map((methodIndex) => (
                      <TD key={`normalized-total-${methodIndex}`} className="text-center align-middle text-slate-400">
                        -
                      </TD>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-500">归一化 = 当前单元格原始比例 / 该课程目标这一行的原始比例合计；过程性评价方式各列底部总计应为 1。</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">（二）直接评价构成及比例</h3>
              <button type="button" onClick={addTarget} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
                新增行
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <TH>课程目标</TH>
                    <TH>过程性评价</TH>
                    <TH>结果性评价</TH>
                    <TH>总计</TH>
                    <TH>操作</TH>
                  </tr>
                </thead>
                <tbody>
                  {course.targets.map((target, index) => (
                    <tr key={target.name}>
                      <TD>{target.name}</TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.processEvaluationRatio + target.resultEvaluationRatio > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.processEvaluationRatio}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "processEvaluationRatio", "resultEvaluationRatio", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.processEvaluationRatio + target.resultEvaluationRatio > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.resultEvaluationRatio}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "resultEvaluationRatio", "processEvaluationRatio", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <span
                          className={
                            target.processEvaluationRatio + target.resultEvaluationRatio > 1
                              ? "text-rose-600"
                              : "text-slate-700"
                          }
                        >
                          {round(target.processEvaluationRatio + target.resultEvaluationRatio)}
                        </span>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          onClick={() => removeTarget(index)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        >
                          删除行
                        </button>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">（三）间接评价构成及比例</h3>
              <button type="button" onClick={addTarget} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
                新增行
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <TH>课程目标</TH>
                    <TH>学生调查问卷</TH>
                    <TH>其它</TH>
                    <TH>总计</TH>
                    <TH>操作</TH>
                  </tr>
                </thead>
                <tbody>
                  {course.targets.map((target, index) => (
                    <tr key={target.name}>
                      <TD>{target.name}</TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.surveyEvaluationRatio + target.otherEvaluationRatio > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.surveyEvaluationRatio}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "surveyEvaluationRatio", "otherEvaluationRatio", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.surveyEvaluationRatio + target.otherEvaluationRatio > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.otherEvaluationRatio}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "otherEvaluationRatio", "surveyEvaluationRatio", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <span
                          className={
                            target.surveyEvaluationRatio + target.otherEvaluationRatio > 1
                              ? "text-rose-600"
                              : "text-slate-700"
                          }
                        >
                          {round(target.surveyEvaluationRatio + target.otherEvaluationRatio)}
                        </span>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          onClick={() => removeTarget(index)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        >
                          删除行
                        </button>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">（四）综合评价构成及比例</h3>
              <button type="button" onClick={addTarget} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
                新增行
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <TH>课程目标</TH>
                    <TH>直接评价</TH>
                    <TH>间接评价</TH>
                    <TH>总计</TH>
                    <TH>操作</TH>
                  </tr>
                </thead>
                <tbody>
                  {course.targets.map((target, index) => (
                    <tr key={target.name}>
                      <TD>{target.name}</TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.directWeight + target.indirectWeight > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.directWeight}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "directWeight", "indirectWeight", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} ${
                            target.directWeight + target.indirectWeight > 1
                              ? "border-rose-300 bg-rose-50"
                              : ""
                          }`}
                          type="number"
                          step="0.01"
                          value={target.indirectWeight}
                          onChange={(e) =>
                            updatePairedTargetValues(index, "indirectWeight", "directWeight", Number(e.target.value))
                          }
                        />
                      </TD>
                      <TD>
                        <span
                          className={
                            target.directWeight + target.indirectWeight > 1
                              ? "text-rose-600"
                              : "text-slate-700"
                          }
                        >
                          {round(target.directWeight + target.indirectWeight)}
                        </span>
                      </TD>
                      <TD>
                        <button
                          type="button"
                          onClick={() => removeTarget(index)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        >
                          删除行
                        </button>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section className={`${sectionClass} space-y-4`}>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">2. 间接评价</h2>
            <p className="text-sm text-slate-500">
              当前版本先支持“学生调查问卷”链路，其它评价暂未启用，默认按 0 处理。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TH>课程目标</TH>
                  <TH>A 完全达成</TH>
                  <TH>B 达成</TH>
                  <TH>C 基本达成</TH>
                  <TH>D 较低达成</TH>
                  <TH>E 未达成</TH>
                  <TH>问卷达成度</TH>
                  <TH>间接评价达成度</TH>
                </tr>
              </thead>
              <tbody>
                {course.targets.map((target, targetIndex) => {
                  const row = getIndirectEvaluation(targetIndex);
                  const surveyAttainment = calculateSurveyAttainment(targetIndex);
                  const indirectAttainment = preview.targetSummaries[targetIndex]?.indirectAttainment ?? 0;

                  return (
                    <tr key={target.name}>
                      <TD className="text-center align-middle">{target.name}</TD>
                      <TD>
                        <input
                          className={`${inputClass} text-center`}
                          type="number"
                          min="0"
                          step="1"
                          value={row.countA}
                          onChange={(e) => updateIndirectEvaluation(targetIndex, "countA", Number(e.target.value))}
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} text-center`}
                          type="number"
                          min="0"
                          step="1"
                          value={row.countB}
                          onChange={(e) => updateIndirectEvaluation(targetIndex, "countB", Number(e.target.value))}
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} text-center`}
                          type="number"
                          min="0"
                          step="1"
                          value={row.countC}
                          onChange={(e) => updateIndirectEvaluation(targetIndex, "countC", Number(e.target.value))}
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} text-center`}
                          type="number"
                          min="0"
                          step="1"
                          value={row.countD}
                          onChange={(e) => updateIndirectEvaluation(targetIndex, "countD", Number(e.target.value))}
                        />
                      </TD>
                      <TD>
                        <input
                          className={`${inputClass} text-center`}
                          type="number"
                          min="0"
                          step="1"
                          value={row.countE}
                          onChange={(e) => updateIndirectEvaluation(targetIndex, "countE", Number(e.target.value))}
                        />
                      </TD>
                      <TD className="text-center align-middle font-medium text-slate-700">
                        {formatDecimal(surveyAttainment)}
                      </TD>
                      <TD className="text-center align-middle font-medium text-sky-700">
                        {formatDecimal(indirectAttainment)}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {currentStep === 4 ? (
        <section className={`${sectionClass} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{steps[4].title}</h2>
            <button type="button" onClick={addExamQuestion} className="rounded-full border border-slate-300 px-4 py-2 text-sm">
              新增列
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TH>课程目标</TH>
                  <TH>行名称</TH>
                  {course.examQuestions.map((_, index) => (
                    <TH key={index}>试题{index + 1}</TH>
                  ))}
                  <TH>合计</TH>
                </tr>
              </thead>
              <tbody>
                {course.targets.map((target, targetIndex) => (
                  <Fragment key={target.name}>
                    <tr>
                      <TD rowSpan={2}>{target.name}</TD>
                      <TD>小题号</TD>
                      {course.examQuestions.map((question, questionIndex) => (
                        <TD key={questionIndex}>
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            value={getExamQuestionLabelDraft(questionIndex, targetIndex)}
                            onChange={(e) =>
                              updateExamQuestionLabelDraft(questionIndex, targetIndex, e.target.value)
                            }
                            onBlur={() => commitExamQuestionLabelDraft(questionIndex, targetIndex)}
                          />
                        </TD>
                      ))}
                      <TD className="bg-slate-50" />
                    </tr>
                    <tr>
                      <TD>分值</TD>
                      {course.examQuestions.map((question, questionIndex) => (
                        <TD key={questionIndex}>
                          <input
                            className={inputClass}
                            type="number"
                            step="1"
                            value={getExamTargetScoreDraft(questionIndex, targetIndex)}
                            onChange={(e) => updateExamTargetScoreDraft(questionIndex, targetIndex, e.target.value)}
                            onBlur={() => commitExamTargetScoreDraft(questionIndex, targetIndex)}
                          />
                        </TD>
                      ))}
                      <TD>
                        {round(
                          course.examQuestions.reduce(
                            (sum, question) => sum + (question.targetScores[targetIndex] ?? 0),
                            0,
                          ),
                        )}
                      </TD>
                    </tr>
                  </Fragment>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <TD colSpan={course.examQuestions.length + 2}>总分</TD>
                  <TD>
                    {round(
                      course.targets.reduce(
                        (targetSum, _target, targetIndex) =>
                          targetSum +
                          course.examQuestions.reduce(
                            (questionSum, question) => questionSum + (question.targetScores[targetIndex] ?? 0),
                            0,
                          ),
                        0,
                      ),
                    )}
                  </TD>
                </tr>
                <tr className="bg-slate-50">
                  <TD colSpan={2}>操作</TD>
                  {course.examQuestions.map((question, index) => (
                    <TD key={index}>
                      <button
                        type="button"
                        onClick={() => removeExamQuestion(index)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-600"
                      >
                          删除列
                      </button>
                    </TD>
                  ))}
                  <TD />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {currentStep === 5 ? (
        <section className={`${sectionClass} space-y-4`}>
          <h2 className="text-xl font-semibold">{steps[5].title}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-center align-middle text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TH>课程目标</TH>
                  <TH colSpan={3}>评价方式</TH>
                  <TH>目标分值</TH>
                </tr>
              </thead>
              <tbody>
                {course.targets.map((target, targetIndex) => (
                  <Fragment key={target.name}>
                    {processMethodIndexes.map((methodIndex, rowIndex) => (
                      <tr key={`${target.name}-${methodIndex}`}>
                        {rowIndex === 0 ? (
                          <TD
                            rowSpan={processMethodIndexes.length + (resultMethodIndex >= 0 ? 2 : 1)}
                            className="text-center align-middle"
                          >
                            {target.name}
                          </TD>
                        ) : null}
                        {rowIndex === 0 ? (
                          <TD
                            rowSpan={processMethodIndexes.length + (resultMethodIndex >= 0 ? 1 : 0)}
                            className="px-2 text-center align-middle font-semibold [writing-mode:vertical-rl]"
                          >
                            直接评价
                          </TD>
                        ) : null}
                        {rowIndex === 0 ? (
                          <TD
                            rowSpan={processMethodIndexes.length}
                            className="px-2 text-center align-middle font-semibold [writing-mode:vertical-rl]"
                          >
                            过程性评价
                          </TD>
                        ) : null}
                        <TD className="text-center align-middle">{course.methods[methodIndex]?.name}</TD>
                        <TD className="text-center align-middle">
                          <input
                            className={`${inputClass} text-center align-middle`}
                            type="number"
                            step="0.01"
                            value={getConfig(course, targetIndex, methodIndex).targetScore}
                            onChange={(e) =>
                              updateConfig(targetIndex, methodIndex, "targetScore", Number(e.target.value))
                            }
                          />
                        </TD>
                      </tr>
                    ))}
                    {resultMethodIndex >= 0 ? (
                      <tr>
                        <TD colSpan={2} className="text-center align-middle font-semibold">
                          结果性评价
                        </TD>
                        <TD className="text-center align-middle">
                          {round(
                            course.examQuestions.reduce(
                              (sum, question) => sum + (question.targetScores[targetIndex] ?? 0),
                              0,
                            ),
                          )}
                        </TD>
                      </tr>
                    ) : null}
                    <tr>
                      <TD colSpan={3} className="text-center align-middle font-semibold">
                        间接评价
                      </TD>
                      <TD className="text-center align-middle">1</TD>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {currentStep === 6 ? (
        <section className={`${sectionClass} space-y-6`}>
          <h2 className="text-xl font-semibold">{steps[6].title}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full max-w-xl border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TH>课程目标</TH>
                  <TH>分目标权重</TH>
                </tr>
              </thead>
              <tbody>
                {course.targets.map((target, index) => (
                  <tr key={index}>
                    <TD className="text-center align-middle">{target.name}</TD>
                    <TD className="text-center align-middle">
                      <input
                        className={`${inputClass} text-center ${
                          Math.abs(overallWeightTotal - 1) > 0.0001 ? "border-rose-300 bg-rose-50" : ""
                        }`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={target.overallWeight}
                        onChange={(e) => updateTarget(index, "overallWeight", Number(e.target.value))}
                      />
                    </TD>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <TD>合计</TD>
                  <TD
                    className={
                      Math.abs(overallWeightTotal - 1) > 0.0001 ? "text-rose-600" : "text-sky-700"
                    }
                  >
                    {overallWeightTotal}
                  </TD>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            className={`text-sm ${
              Math.abs(overallWeightTotal - 1) > 0.0001 ? "text-rose-600" : "text-slate-500"
            }`}
          >
            分目标权重之和必须等于 1。
          </p>

        </section>
      ) : null}
    </div>
  );
}

function getConfig(course: CourseInput, targetIndex: number, methodIndex: number) {
  return (
    course.targetMethodConfigs.find(
      (item) => item.targetIndex === targetIndex && item.methodIndex === methodIndex,
    ) ?? { weight: 0, normalizedWeight: 0, targetScore: 0 }
  );
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function formatDecimal(value: number) {
  return value.toFixed(2);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/75 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TH({
  children,
  colSpan,
  rowSpan,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className="border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-center font-semibold text-slate-700"
    >
      {children}
    </th>
  );
}

function TD({
  children,
  colSpan,
  rowSpan,
  className,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`border border-slate-200/80 bg-white/82 p-2 align-top ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

