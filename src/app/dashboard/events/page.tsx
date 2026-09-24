import type { Metadata } from "next";
import { EventsTable } from "@/components/events-table";
import { PageHeader } from "@/components/ui";
import { listAuthEvents } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Eventos de auth" };

export default async function EventsPage() {
  await requireAdmin();
  const events = await listAuthEvents(200);

  return (
    <>
      <PageHeader title="Eventos de autenticação" description="Últimos 200 eventos: cadastros, logins, falhas, refresh e revogações." />
      <EventsTable events={events} />
    </>
  );
}
