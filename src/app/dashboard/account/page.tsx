import type { Metadata } from "next";
import { SessionsTable } from "@/components/sessions-table";
import { PageHeader, RoleBadge } from "@/components/ui";
import { listActiveSessions } from "@/lib/admin";
import { getCurrentAuth } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const { user, sessionId } = (await getCurrentAuth())!;
  const sessions = await listActiveSessions(user.id);

  return (
    <>
      <PageHeader title="Minha conta" description="Seus dados e os dispositivos conectados à sua conta." />

      <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Nome" value={user.name} />
        <Info label="Email" value={user.email} />
        <div>
          <p className="text-xs text-muted">Papel</p>
          <div className="mt-1">
            <RoleBadge role={user.role} />
          </div>
        </div>
        <Info label="Membro desde" value={formatDate(user.createdAt)} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Sessões ativas</h2>
        <SessionsTable scope="self" sessions={sessions.map((s) => ({ ...s, current: s.id === sessionId }))} />
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
