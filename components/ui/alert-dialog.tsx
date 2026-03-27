"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type AlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
  children,
}: AlertDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel, open, pending]);

  if (!open) {
    return null;
  }

  const confirmClassName = destructive
    ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
    : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-900/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-rose-700">
            危险操作
          </div>
          <div className="space-y-2">
            <h3 id="alert-dialog-title" className="text-xl font-semibold text-slate-900">
              {title}
            </h3>
            <p id="alert-dialog-description" className="text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          {children ? <div>{children}</div> : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
          >
            {pending ? "删除中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
