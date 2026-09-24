import { NextResponse } from "next/server";
import { listAuthEvents } from "@/lib/admin";
import { withAuth } from "@/lib/http";

export const GET = withAuth(
  async (request) => {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50;
    return NextResponse.json({ events: await listAuthEvents(limit) });
  },
  { role: "admin" },
);
