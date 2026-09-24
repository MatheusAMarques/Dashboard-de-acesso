import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carrega WASM/arquivos de dados em runtime; não deve ser empacotado.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
