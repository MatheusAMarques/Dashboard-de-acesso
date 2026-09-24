# DevDash

Dashboard de desenvolvimento com API de autenticação JWT.
**Next.js 16 (App Router) · PostgreSQL · Drizzle ORM · jose · bcrypt · Zod · Tailwind 4**

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e defina JWT_SECRET (openssl rand -base64 48)
npm run dev                  # http://localhost:3000
```

Sem `DATABASE_URL`, o app usa o **PGlite**, um Postgres completo embutido (WASM), salvo em `./.pglite`.
As migrations são aplicadas automaticamente. Não precisa instalar Postgres nem Docker.

**O primeiro usuário cadastrado vira `admin`.**

### Usando um Postgres real

Defina `DATABASE_URL` (Neon, Supabase, Vercel Postgres, um Postgres local etc.) e aplique as migrations:

```bash
npm run db:migrate
```

## Scripts

| Script                | O que faz                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Servidor de desenvolvimento                                      |
| `npm run build`       | Build de produção                                                |
| `npm run db:generate` | Gera uma nova migration a partir de `src/db/schema.ts`           |
| `npm run db:migrate`  | Aplica as migrations (com PGlite, pare o `dev` antes)            |
| `npm run db:studio`   | Drizzle Studio para inspecionar o banco (requer `DATABASE_URL`)  |
| `npm run typecheck`   | Checagem de tipos                                                |

## Como a autenticação funciona

- **Access token**: JWT HS256 com validade de 15 min (`sub` = usuário, `sid` = sessão, `role`).
- **Refresh token**: `<sessionId>.<segredo aleatório>`, validade de 7 dias. O banco guarda só o
  SHA-256 do segredo. O token é **rotacionado a cada uso**. Se um refresh token antigo for reutilizado,
  a sessão é revogada (sinal de vazamento).
- **Revogação imediata**: além de validar a assinatura do JWT, toda requisição confere no banco se a sessão
  continua ativa e se o usuário está ativo.
- **Navegador**: os tokens ficam em cookies `httpOnly` + `SameSite=Lax`. O refresh token vai com
  `path=/api/auth`. O `src/proxy.ts` protege `/dashboard/*` e renova o access token de forma transparente.
- **Clientes de API**: os tokens também voltam no corpo da resposta. Use `Authorization: Bearer <accessToken>`.
- Senhas com bcrypt, validação com Zod, rate limit no login (5 tentativas a cada 15 min por IP + email) e
  log de eventos (`auth_events`).

## Endpoints

| Método | Rota                      | Auth  | Descrição                                            |
| ------ | ------------------------- | ----- | ---------------------------------------------------- |
| POST   | `/api/auth/register`      | —     | `{ name, email, password }` → usuário + tokens       |
| POST   | `/api/auth/login`         | —     | `{ email, password }` → usuário + tokens             |
| POST   | `/api/auth/refresh`       | —     | `{ refreshToken }` ou cookie → novos tokens          |
| POST   | `/api/auth/logout`        | —     | Encerra a sessão atual                               |
| GET    | `/api/auth/me`            | user  | Usuário autenticado                                  |
| GET    | `/api/auth/sessions`      | user  | Minhas sessões ativas                                |
| DELETE | `/api/auth/sessions/:id`  | user  | Revoga uma sessão minha                              |
| GET    | `/api/admin/users`        | admin | Lista usuários                                       |
| PATCH  | `/api/admin/users/:id`    | admin | `{ role?, active?, name? }` (desativar revoga sessões) |
| DELETE | `/api/admin/users/:id`    | admin | Exclui usuário                                       |
| GET    | `/api/admin/sessions`     | admin | Todas as sessões ativas                              |
| DELETE | `/api/admin/sessions/:id` | admin | Revoga qualquer sessão                               |
| GET    | `/api/admin/events`       | admin | Log de eventos (`?limit=`, máx. 500)                 |
| GET    | `/api/admin/stats`        | admin | Métricas agregadas (usuários, sessões, logins 24h)   |

Erros seguem o formato `{ "error": "mensagem", "details"?: { campo: [erros] } }`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"voce@exemplo.com","password":"suaSenha123"}'

curl http://localhost:3000/api/auth/me -H "authorization: Bearer <accessToken>"
```

## Estrutura

```
src/
  proxy.ts                 # proteção otimista de /dashboard (antigo middleware)
  db/schema.ts             # tabelas users, sessions, auth_events
  db/index.ts              # conexão (Postgres ou PGlite)
  lib/auth/tokens.ts       # assinatura/validação de JWT
  lib/auth/service.ts      # register, login, refresh, logout, revogação
  lib/auth/session.ts      # autenticação de requests e Server Components
  lib/http.ts              # helpers de resposta, cookies, withAuth()
  lib/admin.ts             # consultas do dashboard
  app/api/...              # rotas da API
  app/dashboard/...        # páginas do dashboard
drizzle/                   # migrations SQL geradas
```

## Produção

- Use um `JWT_SECRET` forte e exclusivo, e um Postgres real (`DATABASE_URL`).
- O rate limit é em memória: com várias instâncias, troque por Redis/Upstash (`src/lib/rate-limit.ts`).
- Em serverless (Vercel), use um Postgres com pooling (Neon, Supabase pooler etc.).
