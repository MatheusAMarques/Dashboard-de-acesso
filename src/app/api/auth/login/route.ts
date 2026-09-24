import { login } from "@/lib/auth/service";
import { getClientInfo, handleError, jsonError, parseJson, tokenResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const client = getClientInfo(request);
  const parsed = await parseJson(request, loginSchema);
  if (!parsed.ok) return parsed.error;

  const rl = rateLimit(`login:${client.ip}:${parsed.data.email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return jsonError(`Muitas tentativas. Tente em ${rl.retryAfterSeconds}s.`, 429);

  try {
    const { user, tokens } = await login(parsed.data, client);
    return tokenResponse(tokens, { user });
  } catch (err) {
    return handleError(err);
  }
}
