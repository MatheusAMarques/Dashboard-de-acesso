import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { Nav } from "@/components/nav";
import { RoleBadge } from "@/components/ui";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  const { user } = auth;

  const items = [
    { href: "/dashboard", label: "Visão geral" },
    { href: "/dashboard/account", label: "Minha conta" },
    ...(user.role === "admin"
      ? [
          { href: "/dashboard/users", label: "Usuários" },
          { href: "/dashboard/sessions", label: "Sessões" },
          { href: "/dashboard/events", label: "Eventos de auth" },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-border bg-surface p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/" className="px-3 font-mono text-sm font-semibold tracking-tight">
          <span className="text-accent">{">"}</span> devdash
        </Link>
        <Nav items={items} />
        <div className="mt-auto hidden space-y-3 md:block">
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
        <div className="mt-8 md:hidden">
          <LogoutButton />
        </div>
      </main>
    </div>
  );
}
