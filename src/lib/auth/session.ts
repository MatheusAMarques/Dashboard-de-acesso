import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { toPublicUser, type PublicUser } from "./service";
import { ACCESS_COOKIE, verifyAccessToken } from "./tokens";

export type AuthContext = { user: PublicUser; sessionId: string };

// Valida o JWT *e* confere no banco que a sessão não foi revogada e o usuário
// continua ativo — assim revogar uma sessão no dashboard tem efeito imediato.
export async function resolveAccessToken(token: string | undefined | null): Promise<AuthContext | null> {
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const db = await getDb();
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, payload.sid),
        eq(sessions.userId, payload.sub),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || !row.user.active) return null;
  return { user: toPublicUser(row.user), sessionId: payload.sid };
}

// Lê "Authorization: Bearer <token>" (clientes de API) ou o cookie (navegador).
export async function authenticate(request: Request): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const cookieToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  return resolveAccessToken(bearer ?? cookieToken);
}

// Para Server Components (deduplicado por request).
export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  return resolveAccessToken(token);
});
