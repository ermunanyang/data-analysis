import { notFound } from "next/navigation";

import { ScoreEditor } from "@/components/score-editor";
import { requireCurrentUser } from "@/lib/auth";
import { getCourseInputById } from "@/lib/course-repository";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CourseScoresPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const course = await getCourseInputById(id, user.id);

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef8ff_0%,#f8fafc_55%,#fff7ed_100%)]">
      <ScoreEditor courseId={id} initialCourse={course} />
    </main>
  );
}
