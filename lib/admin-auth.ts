import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

import { prisma } from "@/lib/prisma";
import { prisma as adminPrisma } from "@/lib/prisma-admin";

const scrypt = promisify(scryptCallback);

const ADMIN_SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24;

type AdminUser = {
  id: string;
  username: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(keyHex, "hex");
  const derivedKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
  return derivedKey.length === expectedKey.length && timingSafeEqual(derivedKey, expectedKey);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

function getUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown";
}

export async function adminLogin(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const admin = await adminPrisma.admin.findUnique({
      where: { username },
    });

    const clientIp = getClientIp(request);
    const userAgent = getUserAgent(request);

    if (!admin) {
      await logLoginAttempt(adminPrisma, username, clientIp, userAgent, "failed", "用户不存在");
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      await logLoginAttempt(adminPrisma, username, clientIp, userAgent, "failed", "密码错误");
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await adminPrisma.adminLoginRecord.create({
      data: {
        adminId: admin.id,
        ipAddress: clientIp,
        userAgent: userAgent,
        loginStatus: "success",
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        id: admin.id,
        username: admin.username,
      },
    });

    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

async function logLoginAttempt(
  prisma: any,
  username: string,
  ip: string,
  userAgent: string,
  status: string,
  reason?: string
) {
  try {
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (admin) {
      await prisma.adminLoginRecord.create({
        data: {
          adminId: admin.id,
          ipAddress: ip,
          userAgent: userAgent,
          loginStatus: status,
        },
      });
    }
  } catch (e) {
    console.error("Failed to log login attempt:", e);
  }
}

export async function adminLogout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (token) {
    cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
  }

  return NextResponse.json({
    success: true,
    message: "退出登录成功",
  });
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const admin = await adminPrisma.admin.findFirst({
    where: {},
    select: {
      id: true,
      username: true,
    },
  });

  return admin;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return null;
  }
  return admin;
}
