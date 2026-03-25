"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { createEmptyStudent } from "@/lib/course-defaults";
import type { CourseInput } from "@/lib/course-schema";
import {
  getMethodTargetScore,
  getMethodTotalScore,
  getScoreSheetMethodIndexes,
  getStudentMethodTotal,
  SCORE_SHEET_STUDENT_START_ROW,
  withMinimumScoreSheetRows,
} from "@/lib/score-sheet";

type Props = {
  courseId: string;
  initialCourse: CourseInput;
};

const gutterClass =
  "min-w-12 border border-slate-300 bg-slate-100 px-2 py-2 text-center font-medium text-slate-500";
const stickyGutterClass =
  "sticky left-0 z-20 min-w-12 border border-slate-300 bg-slate-100 px-2 py-2 text-center font-medium text-slate-500 shadow-[inset_-1px_0_0_#cbd5e1,6px_0_10px_-8px_rgba(15,23,42,0.2)]";
const scoreInputClass =
  "h-full w-full bg-transparent px-2 py-2 text-center text-[13px] text-slate-900 outline-none placeholder:text-slate-300";
const textInputClass =
  "block min-h-10 min-w-[8rem] resize-x overflow-hidden bg-transparent px-2 py-2 text-left text-[13px] leading-5 text-slate-900 outline-none";
const readOnlyClass = "px-2 py-2 text-center text-[13px] font-medium text-slate-700";
const stickyNameCellClass =
  "sticky left-12 z-30 min-w-[9rem] bg-white shadow-[inset_-1px_0_0_#cbd5e1,6px_0_10px_-8px_rgba(15,23,42,0.35)]";

function ensureRows(course: CourseInput) {
  return withMinimumScoreSheetRows(course, createEmptyStudent);
}

function methodTint(methodIndex: number) {
  return methodIndex % 2 === 0 ? "bg-sky-50" : "bg-amber-50";
}

function getInfoCellSpans(contentColumnCount: number) {
  const labelSpan = 2;
  const pairCount = 3;
  const usableColumns = Math.max(contentColumnCount, labelSpan * pairCount + pairCount);
  const basePairSpan = Math.floor(usableColumns / pairCount);
  const remainder = usableColumns - basePairSpan * pairCount;

  return Array.from({ length: pairCount }, (_, index) => {
    const pairSpan = basePairSpan + (index < remainder ? 1 : 0);
    return {
      label: labelSpan,
      value: Math.max(1, pairSpan - labelSpan),
    };
  });
}

export function ScoreEditor({ courseId, initialCourse }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollContentRef = useRef<HTMLDivElement | null>(null);
  const [course, setCourse] = useState<CourseInput>(() => ensureRows(initialCourse));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [importing, startImportTransition] = useTransition();

  const sheetMethodIndexes = getScoreSheetMethodIndexes(course);
  const contentColumnCount = 5 + sheetMethodIndexes.length * (course.targets.length + 1);
  const infoCellSpans = getInfoCellSpans(contentColumnCount);
  const syncSignature = useMemo(
    () => `${sheetMethodIndexes.join(",")}-${course.targets.length}-${course.students.length}`,
    [course.students.length, course.targets.length, sheetMethodIndexes],
  );

  useEffect(() => {
    const tableScroller = tableScrollRef.current;
    const tableElement = tableRef.current;
    const bottomScroller = bottomScrollRef.current;
    const bottomContent = bottomScrollContentRef.current;

    if (!tableScroller || !tableElement || !bottomScroller || !bottomContent) {
      return;
    }

    const syncMetrics = () => {
      bottomContent.style.width = `${tableElement.getBoundingClientRect().width}px`;
      bottomScroller.scrollLeft = tableScroller.scrollLeft;
    };

    syncMetrics();

    let source: "table" | "bottom" | null = null;

    const syncFromTable = () => {
      if (source && source !== "table") return;
      source = "table";
      bottomScroller.scrollLeft = tableScroller.scrollLeft;
      source = null;
    };

    const syncFromBottom = () => {
      if (source && source !== "bottom") return;
      source = "bottom";
      tableScroller.scrollLeft = bottomScroller.scrollLeft;
      source = null;
    };

    tableScroller.addEventListener("scroll", syncFromTable);
    bottomScroller.addEventListener("scroll", syncFromBottom);

    const resizeObserver = new ResizeObserver(syncMetrics);
    resizeObserver.observe(tableScroller);
    resizeObserver.observe(tableElement);

    return () => {
      tableScroller.removeEventListener("scroll", syncFromTable);
      bottomScroller.removeEventListener("scroll", syncFromBottom);
      resizeObserver.disconnect();
    };
  }, [syncSignature]);

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
      const normalized = value.trim();

      student.scores[methodKey] = {
        ...student.scores[methodKey],
        [targetKey]: normalized === "" ? null : Number(normalized),
      };

      students[studentIndex] = student;
      return { ...current, students };
    });
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

        setMessage("成绩工作表已保存");
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

        setCourse(ensureRows(payload.course));
        setMessage(`已导入 ${payload.studentCount} 条学生成绩，可继续在线编辑后保存`);
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : "导入失败");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[2200px] flex-col gap-6 px-4 py-6 pb-20">
      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7ed_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Score Sheet Workspace
            </p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-slate-900">成绩录入</h1>
              <p className="max-w-4xl text-sm leading-6 text-slate-600">
                页面直接渲染成绩工作表，过程性评价动态展示，结果性评价固定保留，支持导入同结构
                Excel，导入后可继续在线编辑并保存到数据库。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/courses/${courseId}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              返回课程编辑
            </Link>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? "导入中..." : "导入同模板 Excel"}
            </button>
            <button
              type="button"
              onClick={saveScores}
              disabled={pending}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "保存中..." : "保存工作表"}
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
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="overflow-visible rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div
          ref={tableScrollRef}
          className="scrollbar-hidden overflow-x-auto overflow-y-visible bg-slate-100 p-4 pb-0"
        >
          <table ref={tableRef} className="border-collapse text-[13px] text-slate-900">
            <tbody>
              <tr>
                <td className={gutterClass}>1</td>
                <td
                  colSpan={infoCellSpans[0].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  课程：
                </td>
                <td
                  colSpan={infoCellSpans[0].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.courseName || "\u00A0"}
                </td>
                <td
                  colSpan={infoCellSpans[1].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  课程编码：
                </td>
                <td
                  colSpan={infoCellSpans[1].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.courseCode || "\u00A0"}
                </td>
                <td
                  colSpan={infoCellSpans[2].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  专业：
                </td>
                <td
                  colSpan={infoCellSpans[2].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.major || "\u00A0"}
                </td>
              </tr>

              <tr>
                <td className={gutterClass}>2</td>
                <td
                  colSpan={infoCellSpans[0].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  班级：
                </td>
                <td
                  colSpan={infoCellSpans[0].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.className || "\u00A0"}
                </td>
                <td
                  colSpan={infoCellSpans[1].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  开课学部（院）：
                </td>
                <td
                  colSpan={infoCellSpans[1].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.department || "\u00A0"}
                </td>
                <td
                  colSpan={infoCellSpans[2].label}
                  className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
                >
                  任课教师：
                </td>
                <td
                  colSpan={infoCellSpans[2].value}
                  className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {course.teacherNames || "\u00A0"}
                </td>
              </tr>

              <tr>
                <td className={gutterClass}>3</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700" rowSpan={4}>
                  序号
                </td>
                <td
                  className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700"
                  colSpan={4}
                  rowSpan={2}
                >
                  学生基本信息
                </td>
                {sheetMethodIndexes.map((methodIndex, visibleMethodIndex) => {
                  const method = course.methods[methodIndex];
                  return (
                    <td
                      key={`method-${methodIndex}`}
                      colSpan={course.targets.length + 1}
                      className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                    >
                      {method.name}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className={gutterClass}>4</td>
                {sheetMethodIndexes.map((methodIndex, visibleMethodIndex) => {
                  const method = course.methods[methodIndex];
                  return (
                    <td
                      key={`method-score-${methodIndex}`}
                      colSpan={course.targets.length + 1}
                      className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                    >
                      {`（满分${method.fullScore}分）`}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className={gutterClass}>5</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700">专业名</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700">班级</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700">学号</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700">姓名</td>
                {sheetMethodIndexes.flatMap((methodIndex, visibleMethodIndex) => [
                  ...course.targets.map((target, targetIndex) => (
                    <td
                      key={`target-${methodIndex}-${targetIndex}`}
                      className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                    >
                      {target.name}
                    </td>
                  )),
                  <td
                    key={`total-${methodIndex}`}
                    className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                  >
                    总分
                  </td>,
                ])}
              </tr>

              <tr>
                <td className={gutterClass}>6</td>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700" colSpan={4}>
                  目标分值
                </td>
                {sheetMethodIndexes.flatMap((methodIndex, visibleMethodIndex) => [
                  ...course.targets.map((_, targetIndex) => (
                    <td
                      key={`target-score-${methodIndex}-${targetIndex}`}
                      className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                    >
                      {getMethodTargetScore(course, methodIndex, targetIndex)}
                    </td>
                  )),
                  <td
                    key={`method-total-${methodIndex}`}
                    className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 ${methodTint(visibleMethodIndex)}`}
                  >
                    {getMethodTotalScore(course, methodIndex)}
                  </td>,
                ])}
              </tr>

              {course.students.map((student, studentIndex) => {
                const rowNumber = SCORE_SHEET_STUDENT_START_ROW + studentIndex;

                return (
                  <tr key={`student-row-${studentIndex}`}>
                    <td className={stickyGutterClass}>{rowNumber}</td>
                    <td className="min-w-24 border border-slate-300 bg-white px-2 py-2 text-center font-medium text-slate-600">
                      {studentIndex + 1}
                    </td>
                    <td className="min-w-[10rem] border border-slate-300 bg-white transition focus-within:bg-sky-50">
                      <textarea
                        rows={1}
                        className={textInputClass}
                        value={student.majorName}
                        onChange={(event) =>
                          updateStudentField(studentIndex, "majorName", event.target.value)
                        }
                      />
                    </td>
                    <td className="min-w-[10rem] border border-slate-300 bg-white transition focus-within:bg-sky-50">
                      <textarea
                        rows={1}
                        className={textInputClass}
                        value={student.className}
                        onChange={(event) =>
                          updateStudentField(studentIndex, "className", event.target.value)
                        }
                      />
                    </td>
                    <td className="min-w-[9rem] border border-slate-300 bg-white transition focus-within:bg-sky-50">
                      <textarea
                        rows={1}
                        className={textInputClass}
                        value={student.studentNo}
                        onChange={(event) =>
                          updateStudentField(studentIndex, "studentNo", event.target.value)
                        }
                      />
                    </td>
                    <td className={`${stickyNameCellClass} border border-slate-300 transition focus-within:bg-sky-50`}>
                      <textarea
                        rows={1}
                        className={textInputClass}
                        value={student.studentName}
                        onChange={(event) =>
                          updateStudentField(studentIndex, "studentName", event.target.value)
                        }
                      />
                    </td>

                    {sheetMethodIndexes.flatMap((methodIndex, visibleMethodIndex) => [
                      ...course.targets.map((_, targetIndex) => (
                        <td
                          key={`score-${studentIndex}-${methodIndex}-${targetIndex}`}
                          className={`min-w-24 border border-slate-300 bg-white transition focus-within:bg-sky-50 ${methodTint(visibleMethodIndex)}`}
                        >
                          <input
                            className={scoreInputClass}
                            inputMode="decimal"
                            value={student.scores[String(methodIndex)]?.[String(targetIndex)] ?? ""}
                            onChange={(event) =>
                              updateScore(studentIndex, methodIndex, targetIndex, event.target.value)
                            }
                          />
                        </td>
                      )),
                      <td
                        key={`sum-${studentIndex}-${methodIndex}`}
                        className={`min-w-24 border border-slate-300 ${methodTint(visibleMethodIndex)} ${readOnlyClass}`}
                      >
                        {getStudentMethodTotal(course, studentIndex, methodIndex)}
                      </td>,
                    ])}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fixed bottom-3 left-1/2 z-50 w-[min(92vw,2168px)] -translate-x-1/2 px-2">
        <div
          ref={bottomScrollRef}
          className="overflow-x-auto overflow-y-hidden rounded-full border border-slate-300 bg-white/95 shadow-lg backdrop-blur"
        >
          <div ref={bottomScrollContentRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
