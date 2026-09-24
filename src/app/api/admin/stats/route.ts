import { NextResponse } from "next/server";
import { getStats } from "@/lib/admin";
import { withAuth } from "@/lib/http";

export const GET = withAuth(async () => NextResponse.json(await getStats()), { role: "admin" });
