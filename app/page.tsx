import Link from "next/link";

import { DeleteCourseButton } from "@/components/delete-course-button";
import { LogoutButton } from "@/components/logout-button";
import { requireCurrentUser } from "@/lib/auth";
import { getCourseSummaries } from "@/lib/course-repository";

export default async function HomePage() {
  const user = await requireCurrentUser();
  const courses = await getCourseSummaries(user.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff3ff_0%,#f7fbff_32%,#f8fafc_68%,#fff8ec_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="app-glass-strong app-grid overflow-hidden rounded-[2rem] p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="space-y-3">
              <p className="inline-flex rounded-full bg-teal-50 px-4 py-1 text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">
                课程达成度管理
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                在线填写、回显、计算并导出 Excel 报告
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                当前登录用户只能查看和管理自己的课程数据，课程的新建、编辑、导出和删除都会自动限制在当前账号下。
              </p>
              <p className="text-sm text-slate-500">当前登录：{user.username}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LogoutButton />
              <Link
                href="/courses/new"
                className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#115e59_100%)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 hover:-translate-y-0.5"
              >
                新建课程
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-slate-600">
              你还没有课程记录，先创建第一门课程吧。
            </div>
          ) : null}
          {courses.map((course) => (
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
                  <a
                    href={`/api/courses/${course.id}/export/3`}
                    className="block rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50/80"
                  >
                    导出课程达成度分析报告
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
