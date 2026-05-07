import { NextResponse } from "next/server";
import { adminLogin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  return adminLogin(request);
}
