import { HomePageClient } from "@/components/home-page-client";
import { requireCurrentUser } from "@/lib/auth";
import { getCourseSummaries } from "@/lib/course-repository";

type HomePageProps = {
  searchParams?: Promise<{
    semester?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await requireCurrentUser();
  const courses = await getCourseSummaries(user.id);
  const params = searchParams ? await searchParams : undefined;
  const selectedSemester = params?.semester?.trim() ?? "";

  const semesterOptions = Array.from(
    new Set(courses.map((course) => course.semester.trim()).filter(Boolean)),
  ).sort((a, b) => b.localeCompare(a, "zh-CN"));

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
            <HomePageClient
              courses={courses}
              semesterOptions={semesterOptions}
              selectedSemester={selectedSemester}
            />
          </div>
        </section>
      </div>
    </main>
  );
}