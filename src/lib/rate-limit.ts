import "server-only";

// Rate limit simples em memória (janela fixa). Suficiente para um único
// processo; em produção com várias instâncias, troque por Redis/Upstash.
type Bucket = { count: number; resetAt: number };

const globalForRl = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const buckets = (globalForRl.__rateLimit ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}
