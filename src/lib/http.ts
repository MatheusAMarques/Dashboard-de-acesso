import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, type TokenPair } from "@/lib/auth/service";
import { authenticate, type AuthContext } from "@/lib/auth/session";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from "@/lib/auth/tokens";
import type { Role } from "@/db/schema";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function getClientInfo(request: Request) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: jsonError("Corpo da requisição deve ser JSON válido.", 400) } as const;
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, error: jsonError("Dados inválidos.", 422, z.flattenError(result.error).fieldErrors) } as const;
  }
  return { ok: true, data: result.data as z.infer<T> } as const;
}

const secure = process.env.NODE_ENV === "production";

export function setAuthCookies(res: NextResponse, tokens: TokenPair) {
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: tokens.refreshExpiresAt,
  });
  return res;
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: REFRESH_COOKIE_PATH, maxAge: 0 });
  return res;
}

// Resposta padrão de login/registro/refresh: tokens no corpo (para clientes de
// API) e em cookies httpOnly (para o navegador).
export function tokenResponse(tokens: TokenPair, extra: Record<string, unknown> = {}, status = 200) {
  const res = NextResponse.json(
    {
      ...extra,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    },
    { status },
  );
  return setAuthCookies(res, tokens);
}

type Handler<C> = (request: Request, ctx: C, auth: AuthContext) => Promise<Response>;

// Protege um Route Handler: exige usuário autenticado (e opcionalmente um papel).
export function withAuth<C>(handler: Handler<C>, opts: { role?: Role } = {}) {
  return async (request: Request, ctx: C) => {
    try {
      const auth = await authenticate(request);
      if (!auth) return jsonError("Não autenticado.", 401);
      if (opts.role && auth.user.role !== opts.role) return jsonError("Acesso negado.", 403);
      return await handler(request, ctx, auth);
    } catch (err) {
      return handleError(err);
    }
  };
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) return jsonError(err.message, err.status);
  console.error(err);
  return jsonError("Erro interno do servidor.", 500);
}
