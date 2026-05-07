import { NextResponse } from "next/server";
import { adminLogout } from "../../../../../lib/admin-auth";

export async function POST() {
  const result = await adminLogout();
  const response = NextResponse.json(result);
  response.cookies.delete("admin_session");
  return response;
}
