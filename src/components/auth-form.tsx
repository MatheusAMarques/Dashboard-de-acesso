"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";

type Mode = "login" | "register";

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: body });
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else {
        setError("Não foi possível conectar ao servidor.");
      }
      setPending(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="card w-full max-w-sm p-6 sm:p-8">
      <h1 className="text-xl font-semibold">{isLogin ? "Entrar" : "Criar conta"}</h1>
      <p className="mt-1 text-sm text-muted">
        {isLogin ? "Acesse o dashboard de desenvolvimento." : "O primeiro cadastro vira admin."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {!isLogin && (
          <Field label="Nome" name="name" autoComplete="name" errors={fieldErrors.name} />
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" errors={fieldErrors.email} />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          hint={isLogin ? undefined : "Mínimo de 8 caracteres, com letras e números."}
          errors={fieldErrors.password}
        />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Aguarde…" : isLogin ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isLogin ? "Ainda não tem conta? " : "Já tem conta? "}
        <Link
          href={`${isLogin ? "/register" : "/login"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-accent hover:underline"
        >
          {isLogin ? "Cadastre-se" : "Entrar"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  errors,
  hint,
  ...props
}: { label: string; name: string; errors?: string[]; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input name={name} required className="input" aria-invalid={!!errors?.length} {...props} />
      {errors?.length ? (
        <span className="mt-1 block text-xs text-danger">{errors[0]}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
