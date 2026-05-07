"use client";

import Link from "next/link";
import { useState } from "react";

import { DeleteCourseButton } from "@/components/delete-course-button";
import { LogoutButton } from "@/components/logout-button";
import { ApiKeyModal } from "@/components/api-key-modal";

type Course = {
  id: string;
  courseName: string;
  courseCode: string;
  semester: string;
  className: string;
  major: string | null;
  updatedAt: Date;
};

type Props = {
  courses: Course[];
  semesterOptions: string[];
  selectedSemester: string;
};

export function HomePageClient({ courses, semesterOptions, selectedSemester }: Props) {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const filteredCourses = selectedSemester
    ? courses.filter((course) => course.semester === selectedSemester)
    : courses;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsApiKeyModalOpen(true)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            API Key设置
          </span>
        </button>
        <LogoutButton />
        <Link
          href="/courses/new"
          className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#115e59_100%)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 hover:-translate-y-0.5"
        >
          新建课程
        </Link>
      </div>

      <section className="app-glass rounded-[2rem] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">课程列表</h2>
            <p className="text-sm text-slate-500">
              支持按学期筛选当前账号下的课程记录。
            </p>
          </div>

          <form className="flex flex-nowrap items-center gap-3" action="/">
            <select
              name="semester"
              defaultValue={selectedSemester}
              className="min-w-48 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
            >
              <option value="">全部学期</option>
              {semesterOptions.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50/80"
            >
              筛选
            </button>
            {selectedSemester ? (
              <Link
                href="/"
                className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50/80"
              >
                清除筛选
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-slate-600">
            {selectedSemester
              ? `当前学期"${selectedSemester}"下还没有课程记录。`
              : "你还没有课程记录，先创建第一门课程吧。"}
          </div>
        ) : null}
        {filteredCourses.map((course) => (
          <article
            key={course.id}
            className="app-glass overflow-hidden rounded-[2rem] p-6 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {course.semester}
                </span>
                <span className="text-xs text-slate-500">
                  最近更新：{new Date(course.updatedAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">{course.courseName}</h2>
              <div className="grid gap-2 text-sm text-slate-600">
                <p>课程编码：{course.courseCode}</p>
                <p>班级：{course.className}</p>
                <p>专业：{course.major || "未填写"}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  进入编辑
                </Link>
                <DeleteCourseButton
                  courseId={course.id}
                  courseName={course.courseName}
                  className="w-full text-center"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`/api/courses/${course.id}/export/4`}
                  className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50/80"
                >
                  导出课程目标达成度
                </a>
                <a
                  href={`/api/courses/${course.id}/export/5`}
                  className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50/80"
                >
                  导出绘图数据
                </a>
              </div>
              <div>
                <div className="grid gap-3">
                  <a
                    href={`/api/courses/${course.id}/export/3`}
                    className="block rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50/80"
                  >
                    导出课程达成度分析报告
                  </a>
                  <a
                    href="/api/templates/attainment-example"
                    className="block rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50/80"
                  >
                    下载模板
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </>
  );
}