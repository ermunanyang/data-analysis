import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, verifyApiKey, type ApiKeyType } from "@/lib/ai-service";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { apiKeyType: true },
    });

    return NextResponse.json({
      hasApiKey: !!userRecord?.apiKeyType,
      apiKeyType: userRecord?.apiKeyType || null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    
    const { apiKey, apiKeyType } = body as { apiKey: string; apiKeyType: ApiKeyType };

    if (!apiKey || !apiKeyType) {
      return NextResponse.json({ error: "API Key和类型不能为空" }, { status: 400 });
    }

    const isValid = await verifyApiKey(apiKey, apiKeyType);
    if (!isValid) {
      return NextResponse.json({ error: "API Key验证失败，请检查密钥是否正确" }, { status: 400 });
    }

    const encryptedKey = await encryptApiKey(apiKey);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiKeyEncrypted: encryptedKey,
        apiKeyType,
      },
    });

    return NextResponse.json({ success: true, message: "API Key设置成功" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "设置失败" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiKeyEncrypted: null,
        apiKeyType: null,
      },
    });

    return NextResponse.json({ success: true, message: "API Key已删除" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}