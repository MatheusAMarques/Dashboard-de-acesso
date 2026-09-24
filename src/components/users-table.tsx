"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/db/schema";
import { api, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { EmptyRow, RoleBadge } from "./ui";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  activeSessions: number;
};

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha na operação.");
    } finally {
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : users;

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar por nome ou email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input max-w-xs"
      />
      <div className="card overflow-hidden">
        {error && <p className="border-b border-border bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Sessões</th>
                <th>Último login</th>
                <th>Criado</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <EmptyRow colSpan={7}>Nenhum usuário encontrado.</EmptyRow>}
              {filtered.map((u) => {
                const isMe = u.id === currentUserId;
                const url = `/api/admin/users/${u.id}`;
                const disabled = isMe || busy === u.id;
                return (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td>
                      <p className="font-medium">
                        {u.name} {isMe && <span className="text-xs font-normal text-muted">(você)</span>}
                      </p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      {u.active ? (
                        <span className="badge bg-success/15 text-success">ativo</span>
                      ) : (
                        <span className="badge bg-danger/15 text-danger">desativado</span>
                      )}
                    </td>
                    <td className="tabular-nums">{u.activeSessions}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(u.lastLoginAt)}</td>
                    <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="btn btn-ghost px-2.5 py-1 text-xs whitespace-nowrap"
                          disabled={disabled}
                          onClick={() =>
                            run(u.id, () =>
                              api(url, { method: "PATCH", json: { role: u.role === "admin" ? "user" : "admin" } }),
                            )
                          }
                        >
                          {u.role === "admin" ? "Tornar user" : "Tornar admin"}
                        </button>
                        <button
                          className="btn btn-ghost px-2.5 py-1 text-xs"
                          disabled={disabled}
                          onClick={() => run(u.id, () => api(url, { method: "PATCH", json: { active: !u.active } }))}
                        >
                          {u.active ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          className="btn btn-danger px-2.5 py-1 text-xs"
                          disabled={disabled}
                          onClick={() => {
                            if (confirm(`Excluir ${u.email}? Isso não pode ser desfeito.`)) {
                              run(u.id, () => api(url, { method: "DELETE" }));
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
