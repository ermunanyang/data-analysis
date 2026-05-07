"use client";

import { useState, useEffect } from "react";

import type { ApiKeyType } from "@/lib/ai-service";

function getApiKeyTypeName(type: ApiKeyType): string {
  const names: Record<ApiKeyType, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    baidu: "百度文心一言",
    ali: "阿里云通义千问",
    tencent: "腾讯混元",
    doubao: "字节跳动豆包",
  };
  return names[type] || type;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ApiKeyModal({ isOpen, onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyType, setApiKeyType] = useState<ApiKeyType>("openai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentType, setCurrentType] = useState<ApiKeyType | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/user/apikey")
        .then((res) => res.json())
        .then((data) => {
          setHasApiKey(data.hasApiKey);
          setCurrentType(data.apiKeyType || null);
        });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setMessage("请输入API Key");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), apiKeyType }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setApiKey("");
        setHasApiKey(true);
        setCurrentType(apiKeyType);
      } else {
        setMessage(data.error || "设置失败");
      }
    } catch {
      setMessage("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/user/apikey", { method: "DELETE" });

      if (response.ok) {
        setMessage("API Key已删除");
        setHasApiKey(false);
        setCurrentType(null);
      } else {
        setMessage("删除失败");
      }
    } catch {
      setMessage("网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">API Key 设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {hasApiKey && currentType && (
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              已配置 {getApiKeyTypeName(currentType)} API Key
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Key 类型
            </label>
            <select
              value={apiKeyType}
              onChange={(e) => setApiKeyType(e.target.value as ApiKeyType)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="baidu">百度文心一言</option>
              <option value="ali">阿里云通义千问</option>
              <option value="tencent">腾讯混元</option>
              <option value="doubao">字节跳动豆包</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入您的API Key"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 font-mono"
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes("成功") || message.includes("已")
                  ? "text-green-600"
                  : "text-rose-600"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-6 space-y-3">
            {!hasApiKey ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? "验证中..." : "保存并验证"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !apiKey}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSubmitting ? "更新中..." : "更新API Key"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 disabled:opacity-50"
                >
                  删除API Key
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500">
            <strong>隐私说明：</strong>您的API Key将以加密形式存储在服务器上，仅用于调用AI分析服务。
            我们不会将您的API Key用于任何其他目的，也不会与第三方共享。
          </p>
        </div>
      </div>
    </div>
  );
}