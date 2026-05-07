// 安全工具函数
import { randomBytes, createHash, timingSafeEqual, createHmac } from "node:crypto";

// 密码策略验证
export interface PasswordPolicy {
  minLength: number;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  requireUppercase: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 6,
  requireNumbers: false,
  requireSpecialChars: false,
  requireUppercase: false,
};

export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): { valid: boolean; message?: string } {
  if (password.length < policy.minLength) {
    return { valid: false, message: `密码长度不能少于 ${policy.minLength} 位` };
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: "密码需要包含大写字母" };
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    return { valid: false, message: "密码需要包含数字" };
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: "密码需要包含特殊字符" };
  }
  return { valid: true };
}

// 输入验证与清理
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim();
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// CSRF token 生成与验证
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

// SQL注入防护
export function safeSqlLike(input: string): string {
  return input
    .replace(/[\\%_]/g, (char) => `\\${char}`);
}

// XSS防护 - 输出编码
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>\/'"]/g, (m) => escapeMap[m]);
}

// 会话安全检查
export function isSecureOrigin(): boolean {
  return process.env.NODE_ENV === "production";
}

// 速率限制追踪
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(identifier, entry);
  }

  entry.count++;

  const resetTime = entry.windowStart + windowMs;
  const remaining = Math.max(0, maxRequests - entry.count);

  return {
    allowed: entry.count <= maxRequests,
    remaining,
    resetTime,
  };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > windowMs) {
      rateLimitStore.delete(key);
    }
  }
}
