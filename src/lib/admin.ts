import "server-only";
import { and, count, desc, eq, gt, gte, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authEvents, sessions, users } from "@/db/schema";

const activeSession = () => and(isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()));

export async function listUsers() {
  const db = await getDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      activeSessions: db.$count(sessions, and(eq(sessions.userId, users.id), activeSession())),
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

const sessionColumns = {
  id: sessions.id,
  userId: sessions.userId,
  userEmail: users.email,
  userName: users.name,
  ip: sessions.ip,
  userAgent: sessions.userAgent,
  createdAt: sessions.createdAt,
  lastUsedAt: sessions.lastUsedAt,
  expiresAt: sessions.expiresAt,
};

export async function listActiveSessions(userId?: string) {
  const db = await getDb();
  return db
    .select(sessionColumns)
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(userId ? and(activeSession(), eq(sessions.userId, userId)) : activeSession())
    .orderBy(desc(sessions.lastUsedAt));
}

export async function listAuthEvents(limit = 50) {
  const db = await getDb();
  return db
    .select({
      id: authEvents.id,
      type: authEvents.type,
      email: authEvents.email,
      userId: authEvents.userId,
      ip: authEvents.ip,
      userAgent: authEvents.userAgent,
      createdAt: authEvents.createdAt,
    })
    .from(authEvents)
    .orderBy(desc(authEvents.id))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function getStats() {
  const db = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const eventsSince = (type: (typeof authEvents.$inferSelect)["type"]) =>
    db.$count(authEvents, and(eq(authEvents.type, type), gte(authEvents.createdAt, since)));

  const [totalUsers, admins, activeSessions, logins24h, failed24h, signups24h] = await Promise.all([
    db.$count(users),
    db.$count(users, eq(users.role, "admin")),
    db.$count(sessions, activeSession()),
    eventsSince("login_success"),
    eventsSince("login_failed"),
    eventsSince("register"),
  ]);
  return { totalUsers, admins, activeSessions, logins24h, failed24h, signups24h };
}

export async function countAdmins() {
  const db = await getDb();
  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));
  return total;
}
