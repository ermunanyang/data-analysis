"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError("");

    const payload =
      mode === "register"
        ? {
            username: String(formData.get("username") ?? ""),
            password: String(formData.get("password") ?? ""),
            confirmPassword: String(formData.get("confirmPassword") ?? ""),
          }
        : {
            username: String(formData.get("username") ?? ""),
            password: String(formData.get("password") ?? ""),
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || (mode === "login" ? "登录失败" : "注册失败"));
      }

      startTransition(() => {
        router.replace("/");
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "提交失败");
    }
  }

  return (
    <div className="app-glass-strong app-grid w-full max-w-5xl overflow-hidden rounded-[2rem]">
      <div className="grid md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#0f172a_0%,#115e59_55%,#164e63_100%)] p-8 text-white md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_34%)]" />
          <div className="relative space-y-6">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold tracking-[0.28em] text-cyan-100">
              COURSE STUDIO
            </p>
            <div className="space-y-3">
              <h1 className="max-w-md text-4xl font-semibold tracking-tight">
                {mode === "login" ? "登录你的课程空间" : "创建专属课程空间"}
              </h1>
              <p className="max-w-md text-sm leading-7 text-slate-100/88">
                课程录入、达成度计算、成绩导入和导出报告集中在一个工作区里，账号之间的数据彼此隔离，使用起来更安心。
              </p>
            </div>
            <div className="grid gap-3 text-sm text-white/90">
              <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
                只看自己的课程：课程、成绩、导出数据默认按账号隔离。
              </div>
              <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
                注册后直接登录：不用重复跳转，进入系统更顺。
              </div>
              <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
                统一工作流：编辑方案、录入成绩、导出报告都在同一系统里完成。
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/88 p-8 md:p-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">
              {mode === "login" ? "Sign In" : "Sign Up"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              {mode === "login" ? "登录账号" : "注册账号"}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {mode === "login"
                ? "登录后只能查看和管理你自己的课程数据。"
                : "注册成功后会自动登录，并进入你自己的课程空间。"}
            </p>
          </div>

          <form
            action={(formData) => {
              void handleSubmit(formData);
            }}
            className="mt-8 space-y-5"
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">用户名</span>
              <input
                name="username"
                required
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-teal-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">密码</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-teal-400"
              />
            </label>

            {mode === "register" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">确认密码</span>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none focus:border-teal-400"
                />
              </label>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#115e59_100%)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "提交中..." : mode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-600">
            {mode === "login" ? "还没有账号？" : "已有账号？"}{" "}
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="font-semibold text-teal-700 hover:text-teal-800"
            >
              {mode === "login" ? "去注册" : "去登录"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
