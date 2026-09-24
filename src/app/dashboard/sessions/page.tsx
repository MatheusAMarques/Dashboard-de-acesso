import type { Metadata } from "next";
import { SessionsTable } from "@/components/sessions-table";
import { PageHeader } from "@/components/ui";
import { listActiveSessions } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Sessões" };

export default async function SessionsPage() {
  const { sessionId } = await requireAdmin();
  const sessions = await listActiveSessions();

  return (
    <>
      <PageHeader
        title="Sessões ativas"
        description="Cada sessão corresponde a um refresh token. Revogar tem efeito imediato na API."
      />
      <SessionsTable scope="admin" sessions={sessions.map((s) => ({ ...s, current: s.id === sessionId }))} />
    </>
  );
}
