"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { describeUserAgent, formatDate } from "@/lib/format";
import { EmptyRow } from "./ui";

export type SessionRow = {
  id: string;
  userEmail: string;
  userName: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  current?: boolean;
};

// scope "self": sessões do próprio usuário; "admin": todas as sessões ativas.
export function SessionsTable({ sessions, scope }: { sessions: SessionRow[]; scope: "self" | "admin" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(s: SessionRow) {
    const msg = s.current
      ? "Encerrar a sessão atual? Você será deslogado."
      : `Revogar a sessão de ${s.userEmail} (${describeUserAgent(s.userAgent)})?`;
    if (!confirm(msg)) return;
    setBusy(s.id);
    setError(null);
    try {
      const base = scope === "admin" ? "/api/admin/sessions" : "/api/auth/sessions";
      await api(`${base}/${s.id}`, { method: "DELETE" });
      if (s.current) {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao revogar sessão.");
    } finally {
      setBusy(null);
    }
  }

  const cols = scope === "admin" ? 7 : 6;

  return (
    <div className="card overflow-hidden">
      {error && <p className="border-b border-border bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {scope === "admin" && <th>Usuário</th>}
              <th>Dispositivo</th>
              <th>IP</th>
              <th>Criada</th>
              <th>Último uso</th>
              <th>Expira</th>
              <th className="text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && <EmptyRow colSpan={cols}>Nenhuma sessão ativa.</EmptyRow>}
            {sessions.map((s) => (
              <tr key={s.id}>
                {scope === "admin" && (
                  <td>
                    <p className="font-medium">{s.userName}</p>
                    <p className="text-xs text-muted">{s.userEmail}</p>
                  </td>
                )}
                <td className="whitespace-nowrap">
                  {describeUserAgent(s.userAgent)}
                  {s.current && <span className="badge ml-2 bg-success/15 text-success">esta sessão</span>}
                </td>
                <td className="font-mono text-xs text-muted">{s.ip ?? "—"}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(s.createdAt)}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(s.lastUsedAt)}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(s.expiresAt)}</td>
                <td className="text-right">
                  <button
                    className="btn btn-danger px-2.5 py-1 text-xs"
                    disabled={busy === s.id}
                    onClick={() => revoke(s)}
                  >
                    {busy === s.id ? "…" : "Revogar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
