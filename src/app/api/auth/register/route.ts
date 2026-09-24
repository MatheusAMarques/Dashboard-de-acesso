import { register } from "@/lib/auth/service";
import { getClientInfo, handleError, jsonError, parseJson, tokenResponse } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const client = getClientInfo(request);
  const rl = rateLimit(`register:${client.ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return jsonError(`Muitas tentativas. Tente em ${rl.retryAfterSeconds}s.`, 429);

  const parsed = await parseJson(request, registerSchema);
  if (!parsed.ok) return parsed.error;

  try {
    const { user, tokens } = await register(parsed.data, client);
    return tokenResponse(tokens, { user }, 201);
  } catch (err) {
    return handleError(err);
  }
}
