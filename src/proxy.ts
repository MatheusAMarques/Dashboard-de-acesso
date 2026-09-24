import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth/tokens";

const ADMIN_PATHS = ["/dashboard/users", "/dashboard/sessions", "/dashboard/events"];

// Checagem otimista (só o JWT). A verificação completa — sessão não revogada,
// usuário ativo — acontece no layout do dashboard e em cada rota da API.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  if (!payload) {
    // Access token ausente/expirado: tenta renovar com o refresh token e voltar.
    const url = new URL("/api/auth/refresh", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (payload.role !== "admin" && ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
