import { NextResponse } from "next/server";
import { z } from "zod";

import {
  attachSessionCookie,
  createSessionRecord,
  findUserByUsername,
  verifyPassword,
} from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await findUserByUsername(payload.username);

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 400 });
    }

    const session = await createSessionRecord(user.id);
    const response = NextResponse.json({ id: user.id, username: user.username });
    attachSessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登录失败" },
      { status: 400 },
    );
  }
}
