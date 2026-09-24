import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authEvents, sessions, users, type User } from "@/db/schema";
import { assertJwtConfigured, REFRESH_TOKEN_TTL_SECONDS, signAccessToken } from "./tokens";

const BCRYPT_ROUNDS = 11;

export type ClientInfo = { ip: string | null; userAgent: string | null };

export type PublicUser = Pick<User, "id" | "email" | "name" | "role" | "active" | "createdAt" | "lastLoginAt">;

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Refresh token = "<sessionId>.<segredo aleatório>". Só o hash do segredo vai pro banco.
function newRefreshSecret() {
  const secret = randomBytes(32).toString("base64url");
  return { secret, hash: sha256(secret) };
}

function parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const [sessionId, secret, ...rest] = token.split(".");
  if (!sessionId || !secret || rest.length || !isUuid(sessionId)) return null;
  return { sessionId, secret };
}

export async function logAuthEvent(
  type: (typeof authEvents.$inferInsert)["type"],
  data: { userId?: string | null; email?: string | null } & Partial<ClientInfo>,
) {
  const db = await getDb();
  let email = data.email ?? null;
  if (!email && data.userId) {
    const user = await db.query.users.findFirst({ where: eq(users.id, data.userId), columns: { email: true } });
    email = user?.email ?? null;
  }
  await db.insert(authEvents).values({
    type,
    userId: data.userId ?? null,
    email,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
  });
}

async function createSession(user: User, client: ClientInfo): Promise<TokenPair> {
  const db = await getDb();
  const { secret, hash } = newRefreshSecret();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, refreshTokenHash: hash, expiresAt, ...client })
    .returning({ id: sessions.id });

  const accessToken = await signAccessToken({ sub: user.id, sid: session.id, role: user.role });
  return { accessToken, refreshToken: `${session.id}.${secret}`, refreshExpiresAt: expiresAt };
}

export async function register(
  input: { name: string; email: string; password: string },
  client: ClientInfo,
): Promise<{ user: PublicUser; tokens: TokenPair }> {
  assertJwtConfigured();
  const db = await getDb();
  const email = input.email.trim().toLowerCase();

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw new AuthError("Este email já está cadastrado.", 409);

  // O primeiro usuário cadastrado vira admin (facilita o bootstrap em dev).
  const [{ total }] = await db.select({ total: count() }).from(users);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email,
      name: input.name.trim(),
      passwordHash,
      role: total === 0 ? "admin" : "user",
      lastLoginAt: new Date(),
    })
    .returning();

  const tokens = await createSession(user, client);
  await logAuthEvent("register", { userId: user.id, email, ...client });
  return { user: toPublicUser(user), tokens };
}

// Hash fixo para comparar quando o email não existe (evita timing attack de enumeração).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

export async function login(
  input: { email: string; password: string },
  client: ClientInfo,
): Promise<{ user: PublicUser; tokens: TokenPair }> {
  assertJwtConfigured();
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const user =await db.query.users.findFirst({ where: eq(users.email, email) });

  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    await logAuthEvent("login_failed", { userId: user?.id, email, ...client });
    throw new AuthError("Email ou senha inválidos.", 401);
  }
  if (!user.active) {
    await logAuthEvent("login_failed", { userId: user.id, email, ...client });
    throw new AuthError("Conta desativada. Fale com um administrador.", 403);
  }

  const [updated] = await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  const tokens = await createSession(updated, client);
  await logAuthEvent("login_success", { userId: user.id, email, ...client });
  return { user: toPublicUser(updated), tokens };
}

// Rotaciona o refresh token. Se um token antigo for reutilizado, a sessão é
// revogada (sinal de que o token vazou).
export async function refresh(refreshToken: string, client: ClientInfo): Promise<TokenPair> {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) throw new AuthError("Refresh token inválido.", 401);

  const db = await getDb();
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, parsed.sessionId) });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AuthError("Sessão expirada ou revogada.", 401);
  }

  if (!safeEqualHex(sha256(parsed.secret), session.refreshTokenHash)) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
    await logAuthEvent("refresh_reuse", { userId: session.userId, ...client });
    throw new AuthError("Refresh token reutilizado. Sessão revogada por segurança.", 401);
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || !user.active) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
    throw new AuthError("Usuário inexistente ou desativado.", 401);
  }

  const { secret, hash } = newRefreshSecret();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  // Condição no hash antigo garante que duas rotações simultâneas não passem as duas.
  const rotated = await db
    .update(sessions)
    .set({ refreshTokenHash: hash, lastUsedAt: new Date(), expiresAt, ...client })
    .where(and(eq(sessions.id, session.id), eq(sessions.refreshTokenHash, session.refreshTokenHash)))
    .returning({ id: sessions.id });
  if (rotated.length === 0) throw new AuthError("Refresh token já utilizado.", 401);

  await logAuthEvent("refresh", { userId: user.id, email: user.email, ...client });
  const accessToken = await signAccessToken({ sub: user.id, sid: session.id, role: user.role });
  return { accessToken, refreshToken: `${session.id}.${secret}`, refreshExpiresAt: expiresAt };
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function revokeSession(sessionId: string, opts: { userId?: string } = {}) {
  if (!isUuid(sessionId)) return null;
  const db = await getDb();
  const conditions = [eq(sessions.id, sessionId), isNull(sessions.revokedAt)];
  if (opts.userId) conditions.push(eq(sessions.userId, opts.userId));
  const res = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: sessions.id, userId: sessions.userId });
  return res[0] ?? null;
}

export async function revokeAllUserSessions(userId: string) {
  const db = await getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

// Encerra a sessão identificada pelo access token (sessionId) ou por um refresh token válido.
export async function logout(refreshToken: string | undefined, client: ClientInfo, sessionId?: string) {
  let id = sessionId;
  if (!id && refreshToken) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) return;
    const db = await getDb();
    const session = await db.query.sessions.findFirst({ where: eq(sessions.id, parsed.sessionId) });
    if (session && safeEqualHex(sha256(parsed.secret), session.refreshTokenHash)) id = session.id;
  }
  if (!id) return;
  const revoked = await revokeSession(id);
  if (revoked) await logAuthEvent("logout", { userId: revoked.userId, ...client });
}
