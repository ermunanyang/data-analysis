import { CourseEditor } from "@/components/course-editor";
import { requireCurrentUser } from "@/lib/auth";
import { createCourseDraft } from "@/lib/course-repository";

export default async function NewCoursePage() {
  await requireCurrentUser();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef8ff_0%,#f8fafc_55%,#fff7ed_100%)]">
      <CourseEditor initialCourse={createCourseDraft()} />
    </main>
  );
}
