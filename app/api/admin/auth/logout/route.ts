import { NextResponse } from "next/server";
import { adminLogout } from "@/lib/admin-auth";

export async function POST() {
  return adminLogout();
}
