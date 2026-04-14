import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as PrismaClientPackage from "@prisma/client";

const { PrismaClient } = PrismaClientPackage;
type PrismaClientInstance = InstanceType<typeof PrismaClient>;

declare global {
  var prisma: PrismaClientInstance | undefined;
}

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL 未配置");
  }

  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  });
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const shouldReuseGlobal = process.env.NODE_ENV === "production";

export const prisma =
  shouldReuseGlobal && globalThis.prisma ? globalThis.prisma : createPrismaClient();

if (shouldReuseGlobal) {
  globalThis.prisma = prisma;
}
