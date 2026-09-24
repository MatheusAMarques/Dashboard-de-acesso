import { z } from "zod";

const email = z.email("Email inválido.").max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(80),
  email,
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(128)
    .regex(/[A-Za-z]/, "A senha precisa de ao menos uma letra.")
    .regex(/\d/, "A senha precisa de ao menos um número."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha.").max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum(["user", "admin"]).optional(),
    active: z.boolean().optional(),
    name: z.string().trim().min(2).max(80).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Informe ao menos um campo.");
