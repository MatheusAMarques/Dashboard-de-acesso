import { NextResponse } from "next/server";
import { logAuthEvent, revokeSession } from "@/lib/auth/service";
import { getClientInfo, jsonError, withAuth } from "@/lib/http";

// Revoga uma sessão do próprio usuário (ex.: "sair deste dispositivo").
export const DELETE = withAuth(async (request, ctx: RouteContext<"/api/auth/sessions/[id]">, { user }) => {
  const { id } = await ctx.params;
  const revoked = await revokeSession(id, { userId: user.id });
  if (!revoked) return jsonError("Sessão não encontrada.", 404);
  await logAuthEvent("session_revoked", { userId: user.id, email: user.email, ...getClientInfo(request) });
  return NextResponse.json({ ok: true });
});
