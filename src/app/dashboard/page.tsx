import type { Metadata } from "next";
import Link from "next/link";
import { EventsTable } from "@/components/events-table";
import { PageHeader, StatCard } from "@/components/ui";
import { getStats, listActiveSessions, listAuthEvents } from "@/lib/admin";
import { getCurrentAuth } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Visão geral" };

const ENDPOINTS = [
  ["POST", "/api/auth/register", "Cria conta e retorna tokens"],
  ["POST", "/api/auth/login", "Autentica com email e senha"],
  ["POST", "/api/auth/refresh", "Rotaciona o refresh token"],
  ["POST", "/api/auth/logout", "Encerra a sessão atual"],
  ["GET", "/api/auth/me", "Usuário autenticado"],
  ["GET", "/api/auth/sessions", "Minhas sessões ativas"],
  ["DELETE", "/api/auth/sessions/:id", "Revoga uma sessão minha"],
  ["GET", "/api/admin/users", "Lista usuários (admin)"],
  ["PATCH", "/api/admin/users/:id", "Altera papel/status (admin)"],
  ["DELETE", "/api/admin/users/:id", "Exclui usuário (admin)"],
  ["GET", "/api/admin/sessions", "Todas as sessões ativas (admin)"],
  ["DELETE", "/api/admin/sessions/:id", "Revoga qualquer sessão (admin)"],
  ["GET", "/api/admin/events", "Log de eventos de auth (admin)"],
  ["GET", "/api/admin/stats", "Métricas agregadas (admin)"],
] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: "text-success",
  POST: "text-accent",
  PATCH: "text-warn",
  DELETE: "text-danger",
};

export default async function OverviewPage() {
  const auth = (await getCurrentAuth())!;
  const isAdmin = auth.user.role === "admin";

  const [stats, events, mySessions] = await Promise.all([
    isAdmin ? getStats() : null,
    isAdmin ? listAuthEvents(8) : null,
    listActiveSessions(auth.user.id),
  ]);

  return (
    <>
      <PageHeader title={`Olá, ${auth.user.name.split(" ")[0]}`} description="Resumo da autenticação e da sua conta." />

      {stats ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Usuários" value={stats.totalUsers} />
          <StatCard label="Sessões ativas" value={stats.activeSessions} />
          <StatCard label="Logins (24h)" value={stats.logins24h} />
          <StatCard label="Falhas de login (24h)" value={stats.failed24h} tone="danger" />
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Minhas sessões ativas" value={mySessions.length} />
          <div className="card p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Último login</p>
            <p className="mt-2 text-lg font-medium">{formatDate(auth.user.lastLoginAt)}</p>
          </div>
        </section>
      )}

      {events && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Eventos recentes</h2>
            <Link href="/dashboard/events" className="text-sm text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          <EventsTable events={events} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Endpoints da API</h2>
        <p className="mb-3 text-sm text-muted">
          Envie <code className="font-mono text-fg">Authorization: Bearer &lt;accessToken&gt;</code> ou use os cookies
          httpOnly definidos no login. Access token dura 15 min; refresh token, 7 dias.
        </p>
        <div className="card divide-y divide-border">
          {ENDPOINTS.map(([method, path, desc]) => (
            <div key={method + path} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className={`w-14 font-mono text-xs font-semibold ${METHOD_COLORS[method]}`}>{method}</span>
              <code className="font-mono">{path}</code>
              <span className="text-muted sm:ml-auto">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
