"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createEmptyStudent } from "@/lib/course-defaults";
import type { CourseInput } from "@/lib/course-schema";

type Props = {
  courseId: string;
  initialCourse: CourseInput;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900";

function withMinimumRows(course: CourseInput, count = 30): CourseInput {
  const students = [...course.students];
  while (students.length < count) {
    students.push(createEmptyStudent(course.methods.length, course.targets.length));
  }
  return { ...course, students };
}

export function ScoreEditor({ courseId, initialCourse }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [course, setCourse] = useState<CourseInput>(() => withMinimumRows(initialCourse));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [importing, startImportTransition] = useTransition();

  function updateStudentField(
    studentIndex: number,
    key: keyof Omit<CourseInput["students"][number], "scores">,
    value: string,
  ) {
    setCourse((current) => {
      const students = [...current.students];
      students[studentIndex] = { ...students[studentIndex], [key]: value };
      return { ...current, students };
    });
  }

  function updateScore(
    studentIndex: number,
    methodIndex: number,
    targetIndex: number,
    value: string,
  ) {
    setCourse((current) => {
      const students = [...current.students];
      const student = { ...students[studentIndex], scores: { ...students[studentIndex].scores } };
      const methodKey = String(methodIndex);
      const targetKey = String(targetIndex);
      student.scores[methodKey] = {
        ...student.scores[methodKey],
        [targetKey]: value === "" ? null : Number(value),
      };
      students[studentIndex] = student;
      return { ...current, students };
    });
  }

  function methodTargetScore(methodIndex: number, targetIndex: number) {
    return (
      course.targetMethodConfigs.find(
        (item) => item.methodIndex === methodIndex && item.targetIndex === targetIndex,
      )?.targetScore ?? 0
    );
  }

  function methodTotalScore(methodIndex: number) {
    return course.targets.reduce(
      (sum, _, targetIndex) => sum + methodTargetScore(methodIndex, targetIndex),
      0,
    );
  }

  function studentMethodTotal(studentIndex: number, methodIndex: number) {
    return course.targets.reduce((sum, _, targetIndex) => {
      const value = course.students[studentIndex].scores[String(methodIndex)]?.[String(targetIndex)];
      return sum + (value ?? 0);
    }, 0);
  }

  async function saveScores() {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(course),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "成绩保存失败");
        }
        setMessage("成绩数据已保存");
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "成绩保存失败");
      }
    });
  }

  async function importWorkbook(file: File) {
    setError("");
    setMessage("");
    startImportTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/courses/${courseId}/scores/import`, {
          method: "POST",
          body: formData,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "导入失败");
        }
        setCourse(withMinimumRows(payload.course));
        setMessage(`已导入并覆盖 ${payload.studentCount} 条学生成绩`);
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : "导入失败");
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
            <h1 className="text-3xl font-semibold text-slate-900">成绩录入</h1>
            <p className="text-sm text-slate-600">
              页面结构按“课程考核方式及成绩组成”组织，目标分值和总分自动回填，也支持导入同结构
              Excel 覆盖学生信息。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/courses/${courseId}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
            >
              返回课程编辑
            </Link>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
            >
              {importing ? "导入中..." : "导入 Excel"}
            </button>
            <button
              type="button"
              onClick={saveScores}
              disabled={pending}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              {pending ? "保存中..." : "保存成绩"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importWorkbook(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-slate-100">
                <TH rowSpan={3}>序号</TH>
                <TH rowSpan={3}>专业名</TH>
                <TH rowSpan={3}>班级</TH>
                <TH rowSpan={3}>学号</TH>
                <TH rowSpan={3}>姓名</TH>
                {course.methods.map((method, methodIndex) => (
                  <TH key={`method-${methodIndex}`} colSpan={course.targets.length + 1}>
                    {method.name}
                  </TH>
                ))}
              </tr>
              <tr className="bg-slate-50">
                {course.methods.flatMap((_, methodIndex) => [
                  ...course.targets.map((target, targetIndex) => (
                    <TH key={`target-${methodIndex}-${targetIndex}`}>{target.name}</TH>
                  )),
                  <TH key={`total-${methodIndex}`}>总分</TH>,
                ])}
              </tr>
              <tr className="bg-slate-50">
                {course.methods.flatMap((_, methodIndex) => [
                  ...course.targets.map((_, targetIndex) => (
                    <TH key={`score-${methodIndex}-${targetIndex}`}>
                      {methodTargetScore(methodIndex, targetIndex)}
                    </TH>
                  )),
                  <TH key={`score-total-${methodIndex}`}>{methodTotalScore(methodIndex)}</TH>,
                ])}
              </tr>
            </thead>
            <tbody>
              {course.students.map((student, studentIndex) => (
                <tr key={`student-${studentIndex}`}>
                  <TD>{studentIndex + 1}</TD>
                  <TD>
                    <input
                      className={inputClass}
                      value={student.majorName}
                      onChange={(event) =>
                        updateStudentField(studentIndex, "majorName", event.target.value)
                      }
                    />
                  </TD>
                  <TD>
                    <input
                      className={inputClass}
                      value={student.className}
                      onChange={(event) =>
                        updateStudentField(studentIndex, "className", event.target.value)
                      }
                    />
                  </TD>
                  <TD>
                    <input
                      className={inputClass}
                      value={student.studentNo}
                      onChange={(event) =>
                        updateStudentField(studentIndex, "studentNo", event.target.value)
                      }
                    />
                  </TD>
                  <TD>
                    <input
                      className={inputClass}
                      value={student.studentName}
                      onChange={(event) =>
                        updateStudentField(studentIndex, "studentName", event.target.value)
                      }
                    />
                  </TD>
                  {course.methods.flatMap((_, methodIndex) => [
                    ...course.targets.map((_, targetIndex) => (
                      <TD key={`score-input-${studentIndex}-${methodIndex}-${targetIndex}`}>
                        <input
                          className={inputClass}
                          type="number"
                          step="0.01"
                          value={student.scores[String(methodIndex)]?.[String(targetIndex)] ?? ""}
                          onChange={(event) =>
                            updateScore(studentIndex, methodIndex, targetIndex, event.target.value)
                          }
                        />
                      </TD>
                    )),
                    <TD key={`score-total-view-${studentIndex}-${methodIndex}`}>
                      <span className="font-semibold text-slate-700">
                        {studentMethodTotal(studentIndex, methodIndex)}
                      </span>
                    </TD>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
      className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700"
    >
      {children}
    </th>
  );
}

function TD({ children }: { children?: React.ReactNode }) {
  return <td className="border border-slate-200 p-2 align-top">{children}</td>;
}
