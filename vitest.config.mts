import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Los barrels re-exportan Server Actions que importan `db`: lib/env exige una URL válida, pero el Pool de pg
    // es perezoso y ningún unit test se conecta.
    env: { DATABASE_URL: "postgres://unit-test@127.0.0.1:1/unit-test" },
  },
});
