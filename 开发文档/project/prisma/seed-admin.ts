import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function main() {
  console.log("开始初始化管理员账号...");

  const adminUsername = "admin";
  const adminPassword = "admin123";

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log("管理员账号已存在，跳过创建");
    return;
  }

  const passwordHash = hashPassword(adminPassword);

  await prisma.admin.create({
    data: {
      username: adminUsername,
      passwordHash: passwordHash,
    },
  });

  console.log("管理员账号创建成功!");
  console.log(`用户名: ${adminUsername}`);
  console.log(`密码: ${adminPassword}`);
  console.log("请及时修改默认密码!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
