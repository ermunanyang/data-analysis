// 操作日志记录器
import { prisma } from "@/lib/prisma";

export interface LogContext {
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logUserOperation(
  action: string,
  module: string,
  description?: string,
  context?: LogContext,
  extra?: Record<string, any>
) {
  try {
    await prisma.userOperationLog.create({
      data: {
        userId: context?.userId,
        username: context?.username,
        action,
        module,
        description,
        requestPath: extra?.path,
        requestMethod: extra?.method,
        responseStatus: extra?.status,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      },
    });
  } catch (e) {
    console.error("Log write failed:", e);
  }
}

export async function logError(
  errorType: string,
  error: Error,
  context?: LogContext,
  extra?: Record<string, any>
) {
  try {
    await prisma.systemErrorLog.create({
      data: {
        errorType,
        errorMessage: error.message,
        stackTrace: error.stack,
        requestPath: extra?.path,
        requestMethod: extra?.method,
        requestParams: extra?.params ? JSON.stringify(extra.params) : null,
        userId: context?.userId,
        username: context?.username,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        severity: extra?.severity || "error",
      },
    });
  } catch (e) {
    console.error("Error log write failed:", e);
  }
}

export async function logApiAccess(
  path: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  context?: LogContext,
  extra?: Record<string, any>
) {
  try {
    await prisma.apiAccessLog.create({
      data: {
        requestPath: path,
        requestMethod: method,
        requestParams: extra?.params ? JSON.stringify(extra.params) : null,
        responseStatus: statusCode,
        responseTime: responseTimeMs,
        requestIp: context?.ipAddress,
        userId: context?.userId,
        username: context?.username,
        userAgent: context?.userAgent,
        apiModule: extra?.module,
      },
    });
  } catch (e) {
    console.error("API access log write failed:", e);
  }
}

// API 访问时间测量包装器
export async function measureApiTime<T>(
  path: string,
  method: string,
  module: string,
  context: LogContext | undefined,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await handler();
    const responseTime = Math.round(performance.now() - startTime);
    await logApiAccess(path, method, 200, responseTime, context, { module });
    return result;
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    await logApiAccess(path, method, 500, responseTime, context, { module });
    if (error instanceof Error) {
      await logError("API_ERROR", error, context, { path, method, module });
    }
    throw error;
  }
}
