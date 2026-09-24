import Link from "next/link";
import { getCurrentAuth } from "@/lib/auth/session";

const FEATURES = [
  ["JWT + refresh rotativo", "Access token de 15 min e refresh token de 7 dias, rotacionado a cada uso com detecção de reuso."],
  ["Sessões revogáveis", "Cada login vira uma sessão no banco. Revogue qualquer dispositivo com efeito imediato."],
  ["Papéis e auditoria", "Papéis user/admin, rate limit no login e log de todos os eventos de autenticação."],
  ["PostgreSQL + Drizzle", "Schema tipado com migrations. PGlite embutido em dev, qualquer Postgres em produção."],
];

export default async function Home() {
  const auth = await getCurrentAuth();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12 sm:py-20">
      <nav className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold tracking-tight">
          <span className="text-accent">{">"}</span> devdash
        </span>
        {auth ? (
          <Link href="/dashboard" className="btn btn-primary">
            Abrir dashboard
          </Link>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="btn btn-ghost">
              Entrar
            </Link>
            <Link href="/register" className="btn btn-primary">
              Criar conta
            </Link>
          </div>
        )}
      </nav>

      <section className="mt-16 sm:mt-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Dashboard de desenvolvimento com API de autenticação.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Next.js, PostgreSQL e JWT. Gerencie usuários, sessões e acompanhe cada login num só lugar.
        </p>
      </section>

      <section className="mt-12 grid gap-3 sm:grid-cols-2">
        {FEATURES.map(([title, desc]) => (
          <div key={title} className="card p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </section>

      <section className="card mt-12 overflow-x-auto p-5">
        <p className="mb-3 text-sm font-medium">Teste a API pelo terminal</p>
        <pre className="font-mono text-xs leading-relaxed text-muted">
          {`curl -X POST http://localhost:3000/api/auth/login \\
  -H "content-type: application/json" \\
  -d '{"email":"voce@exemplo.com","password":"suaSenha123"}'

curl http://localhost:3000/api/auth/me \\
  -H "authorization: Bearer <accessToken>"`}
        </pre>
      </section>
    </main>
  );
}
