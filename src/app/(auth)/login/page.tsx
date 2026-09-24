import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentAuth } from "@/lib/auth/session";
import { safeNext } from "@/lib/next-param";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentAuth()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
