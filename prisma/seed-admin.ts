import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("正在初始化后台管理系统...");

  // 创建默认管理员账户
  const adminUsername = "admin";
  const adminPassword = "admin123";

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log("✅ 管理员账户已存在");
  } else {
    const passwordHash = hashPassword(adminPassword);
    await prisma.admin.create({
      data: {
        username: adminUsername,
        passwordHash: passwordHash,
      },
    });
    console.log("✅ 默认管理员账户创建成功!");
    console.log("   用户名:", adminUsername);
    console.log("   密码:", adminPassword);
    console.log("   ⚠️  请登录后立即修改密码!");
  }

  // 创建默认系统设置
  const defaultSettings = [
    {
      settingKey: "systemName",
      settingValue: "课程达成度管理系统",
      category: "general",
    },
    {
      settingKey: "logRetentionDays",
      settingValue: "30",
      settingType: "number",
      category: "log",
    },
    {
      settingKey: "autoBackupEnabled",
      settingValue: "false",
      settingType: "boolean",
      category: "backup",
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.adminSetting.upsert({
      where: { settingKey: setting.settingKey },
      update: {},
      create: setting,
    });
  }

  console.log("✅ 默认系统设置已创建");
  console.log("\n🎯 系统初始化完成!");
}

main()
  .catch((e) => {
    console.error("初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
