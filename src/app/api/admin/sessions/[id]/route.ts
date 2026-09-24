import { NextResponse } from "next/server";
import { logAuthEvent, revokeSession } from "@/lib/auth/service";
import { getClientInfo, jsonError, withAuth } from "@/lib/http";

export const DELETE = withAuth(
  async (request, ctx: RouteContext<"/api/admin/sessions/[id]">) => {
    const { id } = await ctx.params;
    const revoked = await revokeSession(id);
    if (!revoked) return jsonError("Sessão não encontrada ou já revogada.", 404);
    await logAuthEvent("session_revoked", { userId: revoked.userId, ...getClientInfo(request) });
    return NextResponse.json({ ok: true });
  },
  { role: "admin" },
);
