import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { countAdmins } from "@/lib/admin";
import { isUuid, revokeAllUserSessions, toPublicUser } from "@/lib/auth/service";
import { jsonError, parseJson, withAuth } from "@/lib/http";
import { updateUserSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/admin/users/[id]">;

async function findTarget(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return null;
  const db = await getDb();
  return (await db.query.users.findFirst({ where: eq(users.id, id) })) ?? null;
}

export const PATCH = withAuth(
  async (request, ctx: Ctx, { user: me }) => {
    const parsed = await parseJson(request, updateUserSchema);
    if (!parsed.ok) return parsed.error;
    const changes = parsed.data;

    const target = await findTarget(ctx);
    if (!target) return jsonError("Usuário não encontrado.", 404);

    const losingAdmin =
      target.role === "admin" && (changes.role === "user" || changes.active === false);
    if (losingAdmin && target.id === me.id) {
      return jsonError("Você não pode remover seu próprio acesso de admin.", 400);
    }
    if (losingAdmin && target.active && (await countAdmins()) <= 1) {
      return jsonError("É preciso manter ao menos um admin ativo.", 400);
    }

    const db = await getDb();
    const [updated] = await db.update(users).set(changes).where(eq(users.id, target.id)).returning();
    if (changes.active === false) await revokeAllUserSessions(target.id);

    return NextResponse.json({ user: toPublicUser(updated) });
  },
  { role: "admin" },
);

export const DELETE = withAuth(
  async (_request, ctx: Ctx, { user: me }) => {
    const target = await findTarget(ctx);
    if (!target) return jsonError("Usuário não encontrado.", 404);
    if (target.id === me.id) return jsonError("Você não pode excluir a própria conta por aqui.", 400);
    if (target.role === "admin" && target.active && (await countAdmins()) <= 1) {
      return jsonError("É preciso manter ao menos um admin ativo.", 400);
    }

    const db = await getDb();
    await db.delete(users).where(eq(users.id, target.id));
    return NextResponse.json({ ok: true });
  },
  { role: "admin" },
);
