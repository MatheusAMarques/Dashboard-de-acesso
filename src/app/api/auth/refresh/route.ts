import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthError, refresh } from "@/lib/auth/service";
import { REFRESH_COOKIE } from "@/lib/auth/tokens";
import {
  clearAuthCookies,
  getClientInfo,
  handleError,
  jsonError,
  setAuthCookies,
  tokenResponse,
} from "@/lib/http";
import { safeNext } from "@/lib/next-param";
import { refreshSchema } from "@/lib/validation";

// POST: clientes de API ({ refreshToken } no corpo) ou navegador (cookie).
export async function POST(request: Request) {
  const text = await request.text();
  let bodyToken: string | undefined;
  if (text.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return jsonError("Corpo da requisição deve ser JSON válido.", 400);
    }
    const parsed = refreshSchema.safeParse(json);
    if (!parsed.success) return jsonError("Dados inválidos.", 422);
    bodyToken = parsed.data.refreshToken;
  }

  const token = bodyToken ?? (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!token) return clearAuthCookies(NextResponse.json({ error: "Refresh token ausente." }, { status: 401 }));

  try {
    const tokens = await refresh(token, getClientInfo(request));
    return tokenResponse(tokens);
  } catch (err) {
    const res = handleError(err);
    return err instanceof AuthError ? clearAuthCookies(res) : res;
  }
}

// GET: usado pelo proxy quando o access token expirou durante a navegação.
// Renova os cookies e volta para a página original (ou manda para o login).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const token = (await cookies()).get(REFRESH_COOKIE)?.value;

  if (token) {
    try {
      const tokens = await refresh(token, getClientInfo(request));
      return setAuthCookies(NextResponse.redirect(new URL(next, url)), tokens);
    } catch (err) {
      if (!(err instanceof AuthError)) console.error(err);
    }
  }

  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("next", next);
  return clearAuthCookies(NextResponse.redirect(loginUrl));
}
