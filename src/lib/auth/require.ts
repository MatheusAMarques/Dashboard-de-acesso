import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "./session";

export async function requireAdmin() {
  const auth = await getCurrentAuth();
  if (!auth) redirect("/login");
  if (auth.user.role !== "admin") redirect("/dashboard");
  return auth;
}
