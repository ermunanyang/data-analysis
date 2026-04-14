import { NextResponse } from "next/server";

import { clearSessionCookie, deleteCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await deleteCurrentSession();
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "退出登录失败" },
      { status: 400 },
    );
  }
}
