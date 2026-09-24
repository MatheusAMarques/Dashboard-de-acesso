import "server-only";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Com DATABASE_URL -> Postgres real (postgres-js).
// Sem DATABASE_URL -> PGlite (Postgres embutido em WASM) salvo em ./.pglite,
// com migrations aplicadas automaticamente. Ótimo para desenvolvimento local.
export type Db = PostgresJsDatabase<typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 10 });
    return drizzle(client, { schema });
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(path.join(process.cwd(), ".pglite"));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}

// Cache em globalThis: sobrevive ao hot reload e evita abrir o PGlite duas vezes.
const globalForDb = globalThis as unknown as { __dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__dbPromise ??= createDb().catch((err) => {
    globalForDb.__dbPromise = undefined;
    throw err;
  });
  return globalForDb.__dbPromise;
}

export { schema };
