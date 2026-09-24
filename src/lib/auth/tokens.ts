// JWT de acesso. Sem dependência do banco para poder ser usado no proxy.ts.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/db/schema";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
// O refresh token só é enviado pelo navegador para as rotas de auth.
export const REFRESH_COOKIE_PATH = "/api/auth";

const ISSUER = "dev-dashboard";

export type AccessTokenPayload = {
  sub: string; // id do usuário
  sid: string; // id da sessão
  role: Role;
};

let cachedKey: Uint8Array | undefined;

function getSecret(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). Veja .env.example.");
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

// Falha cedo (antes de gravar algo no banco) se o segredo não estiver configurado.
export function assertJwtConfigured() {
  getSecret();
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ sid: payload.sid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    if (payload.role !== "user" && payload.role !== "admin") return null;
    return { sub: payload.sub, sid: payload.sid, role: payload.role };
  } catch {
    return null;
  }
}
