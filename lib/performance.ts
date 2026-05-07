// 性能优化工具
// 数据库查询缓存和优化
import { prisma } from "@/lib/prisma";

interface QueryCacheOptions {
  ttlMs?: number;
}

const queryCache = new Map<string, { data: any; expires: number }>();

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: QueryCacheOptions = {}
): Promise<T> {
  const now = Date.now();
  const ttlMs = options.ttlMs ?? 60_000;

  const cached = queryCache.get(key);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  const data = await queryFn();
  queryCache.set(key, { data, expires: now + ttlMs });
  return data;
}

export function clearCache(keyPattern?: string) {
  if (!keyPattern) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.includes(keyPattern)) {
      queryCache.delete(key);
    }
  }
}

// 批量操作优化
export async function batchProcess<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize = 50
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
  }
}

// 数据压缩工具
export function compressData(data: any) {
  return JSON.stringify(data);
}

export function decompressData(compressed: string) {
  return JSON.parse(compressed);
}
