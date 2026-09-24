import { NextResponse } from "next/server";
import { listActiveSessions } from "@/lib/admin";
import { withAuth } from "@/lib/http";

// Sessões ativas do próprio usuário.
export const GET = withAuth(async (_request, _ctx, { user, sessionId }) => {
  const sessions = await listActiveSessions(user.id);
  return NextResponse.json({
    sessions: sessions.map((s) => ({ ...s, current: s.id === sessionId })),
  });
});
