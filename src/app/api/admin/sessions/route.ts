import { NextResponse } from "next/server";
import { listActiveSessions } from "@/lib/admin";
import { withAuth } from "@/lib/http";

export const GET = withAuth(
  async () => NextResponse.json({ sessions: await listActiveSessions() }),
  { role: "admin" },
);
