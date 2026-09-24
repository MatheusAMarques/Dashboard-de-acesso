// Aplica as migrations de ./drizzle no banco configurado.
// Uso: npm run db:migrate  (com DATABASE_URL -> Postgres; sem -> PGlite em ./.pglite)
// Com PGlite, pare o servidor de dev antes: só um processo pode abrir a pasta.
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const migrationsFolder = "./drizzle";
  const url = process.env.DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 1 });
    await migrate(drizzle(client), { migrationsFolder });
    await client.end();
    console.log("Migrations aplicadas no Postgres.");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite("./.pglite");
    await migrate(drizzle(client), { migrationsFolder });
    await client.close();
    console.log("Migrations aplicadas no PGlite (./.pglite).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
