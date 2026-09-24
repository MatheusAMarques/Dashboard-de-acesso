import { NextResponse } from "next/server";
import { listUsers } from "@/lib/admin";
import { withAuth } from "@/lib/http";

export const GET = withAuth(
  async () => NextResponse.json({ users: await listUsers() }),
  { role: "admin" },
);
