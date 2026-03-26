import Link from "next/link";

import { getCourseSummaries } from "@/lib/course-repository";

export default async function HomePage() {
  const courses = await getCourseSummaries();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff3ff_0%,#f7fbff_32%,#f8fafc_68%,#fff8ec_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-lg shadow-slate-200/50">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
                课程达成度管理
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                在线填写、回显、计算并导出 Excel 报告
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                围绕 Excel 需求构建的多课程工作台，支持课程新增、再次编辑更新、实时计算预览，
                以及按单课程导出 3/4/5 报告。
              </p>
            </div>
            <Link
              href="/courses/new"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              新建课程
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-slate-600">
              还没有课程记录，先创建第一门课程吧。
            </div>
          ) : null}
          {courses.map((course) => (
            <article
              key={course.id}
              className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/50"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
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
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  进入编辑
                </Link>
                <Link
                  href={`/courses/${course.id}/scores`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  成绩录入
                </Link>
                <a
                  href={`/api/courses/${course.id}/export/3`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  导出 3
                </a>
                <a
                  href={`/api/courses/${course.id}/export/4`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  导出课程目标达成度
                </a>
                <a
                  href={`/api/courses/${course.id}/export/5`}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  导出绘图数据
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
