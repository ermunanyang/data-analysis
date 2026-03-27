"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AlertDialog } from "@/components/ui/alert-dialog";

type Props = {
  courseId: string;
  courseName: string;
  className?: string;
};

export function DeleteCourseButton({ courseId, courseName, className = "" }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    setError("");

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "删除课程失败");
      }

      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "删除课程失败");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        disabled={isPending}
        className={`rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      >
        删除课程
      </button>

      <AlertDialog
        open={open}
        title="确认删除课程？"
        description={`删除“${courseName || "未命名课程"}”后，该课程的课程目标、考核方式、学生成绩和分析数据都会一起删除，且无法恢复。`}
        confirmLabel="确认删除"
        cancelLabel="再想想"
        destructive
        pending={isPending}
        onCancel={() => {
          if (!isPending) {
            setOpen(false);
          }
        }}
        onConfirm={handleDelete}
      >
        {error ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </AlertDialog>
    </>
  );
}
