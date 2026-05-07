import { NextResponse } from "next/server";
import { adminLogin } from "../../../../../lib/admin-auth";

export async function POST(request: Request) {
  const result = await adminLogin(request);

  if (!result.success) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status });
  }

  const response = NextResponse.json({
    success: true,
    message: result.message,
    data: result.data,
  });

  response.cookies.set("admin_session", result.token!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: result.expiresAt!,
  });

  return response;
}
