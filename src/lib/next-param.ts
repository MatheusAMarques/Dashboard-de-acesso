// Garante que o redirecionamento pós-login fique dentro do próprio site.
export function safeNext(value: string | string[] | undefined | null) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}
