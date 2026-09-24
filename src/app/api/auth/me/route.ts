import { NextResponse } from "next/server";
import { withAuth } from "@/lib/http";

export const GET = withAuth(async (_request, _ctx, { user, sessionId }) => {
  return NextResponse.json({ user, sessionId });
});
