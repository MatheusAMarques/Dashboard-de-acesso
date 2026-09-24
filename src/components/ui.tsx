import type { AuthEvent, Role } from "@/db/schema";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </header>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tone === "danger" && value > 0 ? "text-danger" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return role === "admin" ? (
    <span className="badge bg-accent/15 text-accent">admin</span>
  ) : (
    <span className="badge bg-surface-2 text-muted">user</span>
  );
}

const EVENT_LABELS: Record<AuthEvent["type"], { label: string; className: string }> = {
  register: { label: "Cadastro", className: "bg-accent/15 text-accent" },
  login_success: { label: "Login", className: "bg-success/15 text-success" },
  login_failed: { label: "Login falhou", className: "bg-danger/15 text-danger" },
  logout: { label: "Logout", className: "bg-surface-2 text-muted" },
  refresh: { label: "Refresh", className: "bg-surface-2 text-muted" },
  refresh_reuse: { label: "Reuso de token", className: "bg-danger/15 text-danger" },
  session_revoked: { label: "Sessão revogada", className: "bg-warn/15 text-warn" },
};

export function EventBadge({ type }: { type: AuthEvent["type"] }) {
  const e = EVENT_LABELS[type];
  return <span className={`badge ${e.className}`}>{e.label}</span>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}
