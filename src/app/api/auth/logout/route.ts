import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/service";
import { authenticate } from "@/lib/auth/session";
import { REFRESH_COOKIE } from "@/lib/auth/tokens";
import { clearAuthCookies, getClientInfo, handleError } from "@/lib/http";

// Encerra a sessão atual (via access token, cookie de refresh ou { refreshToken } no corpo).
export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    let refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (!auth && !refreshToken) {
      const body = await request.json().catch(() => null);
      if (typeof body?.refreshToken === "string") refreshToken = body.refreshToken;
    }
    await logout(refreshToken, getClientInfo(request), auth?.sessionId);
    return clearAuthCookies(NextResponse.json({ ok: true }));
  } catch (err) {
    return clearAuthCookies(handleError(err) as NextResponse);
  }
}
