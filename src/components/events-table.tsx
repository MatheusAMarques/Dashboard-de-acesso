import type { AuthEvent } from "@/db/schema";
import { describeUserAgent, formatDate } from "@/lib/format";
import { EmptyRow, EventBadge } from "./ui";

type Row = Pick<AuthEvent, "id" | "type" | "email" | "ip" | "userAgent" | "createdAt">;

export function EventsTable({ events }: { events: Row[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Email</th>
              <th>Dispositivo</th>
              <th>IP</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && <EmptyRow colSpan={5}>Nenhum evento registrado ainda.</EmptyRow>}
            {events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">
                  <EventBadge type={e.type} />
                </td>
                <td>{e.email ?? <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap text-muted">{describeUserAgent(e.userAgent)}</td>
                <td className="font-mono text-xs text-muted">{e.ip ?? "—"}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
