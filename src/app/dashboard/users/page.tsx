import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { UsersTable } from "@/components/users-table";
import { listUsers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage() {
  const { user } = await requireAdmin();
  const users = await listUsers();

  return (
    <>
      <PageHeader
        title="Usuários"
        description={`${users.length} cadastrados. Desativar um usuário encerra todas as sessões dele.`}
      />
      <UsersTable users={users} currentUserId={user.id} />
    </>
  );
}
