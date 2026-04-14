import { NextResponse } from "next/server";
import { z } from "zod";

import {
  attachSessionCookie,
  createSessionRecord,
  findUserByUsername,
  hashPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z
  .object({
    username: z.string().trim().min(3, "用户名至少 3 位").max(32, "用户名最多 32 位"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string().min(6, "确认密码至少 6 位"),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "两次输入的密码不一致",
      });
    }
  });

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const existingUser = await findUserByUsername(payload.username);

    if (existingUser) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        username: payload.username,
        passwordHash: await hashPassword(payload.password),
      },
      select: {
        id: true,
        username: true,
      },
    });

    const session = await createSessionRecord(user.id);
    const response = NextResponse.json({ id: user.id, username: user.username });
    attachSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "注册失败" },
      { status: 400 },
    );
  }
}
