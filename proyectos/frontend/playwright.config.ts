import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas end to end (skill .claude/skills/pruebas-e2e-tecreview).
 *
 * - Capa A, "simulada" (npm run test:e2e): la app compilada con hosts
 *   ficticios y el backend simulado con page.route. Corre en la CI.
 * - Capa B, "pila-completa" (npm run test:e2e:pila, E2E_PILA=1): Next.js,
 *   Spring Boot y un PostgreSQL local con las migraciones. Solo local; ver
 *   la skill (references/pila-completa.md) para preparar la base.
 *
 * webServer es de toda la corrida: se elige según E2E_PILA y las dos capas
 * nunca corren a la vez (compilan el mismo .next con variables distintas).
 */
const PILA = process.env.E2E_PILA === "1";

const ENV_SIMULADA = {
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:3999",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};

const ENV_PILA = { ...ENV_SIMULADA, NEXT_PUBLIC_API_URL: "http://127.0.0.1:8081" };
const PG_URL = process.env.E2E_PG_URL ?? "jdbc:postgresql://127.0.0.1:55433/postgres";
const ARGUMENTOS_BACKEND = [
  `-Dspring.datasource.url=${PG_URL}`,
  "-Dspring.datasource.username=postgres",
  `-Dspring.datasource.password=${process.env.E2E_PG_PASSWORD ?? "local"}`,
  "-Dspring.datasource.driver-class-name=org.postgresql.Driver",
  "-Dspring.jpa.hibernate.ddl-auto=validate",
  "-Dsupabase.jwt.issuer-uri=http://127.0.0.1:54399/auth/v1",
  "-Dsupabase.jwt.jwk-set-uri=http://127.0.0.1:54399/auth/v1/.well-known/jwks.json",
  "-DFRONTEND_URL=http://127.0.0.1:3101",
  "-Dserver.port=8081",
].join(" ");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: !PILA,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  globalSetup: PILA ? "./e2e/pila-completa/preparar.ts" : undefined,
  projects: [
    {
      name: "simulada",
      testDir: "e2e/simulada",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3100" },
    },
    {
      name: "pila-completa",
      testDir: "e2e/pila-completa",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3101" },
    },
  ],
  webServer: PILA
    ? [
        {
          command: `./mvnw -q spring-boot:run -Dspring-boot.run.jvmArguments="${ARGUMENTOS_BACKEND}"`,
          cwd: "../backend",
          url: "http://127.0.0.1:8081/api/health",
          reuseExistingServer: false,
          timeout: 300_000,
        },
        {
          command: "npm run build && npm run start -- -p 3101 -H 127.0.0.1",
          url: "http://127.0.0.1:3101",
          env: ENV_PILA,
          reuseExistingServer: false,
          timeout: 300_000,
        },
      ]
    : {
        command: "npm run build && npm run start -- -p 3100 -H 127.0.0.1",
        url: "http://127.0.0.1:3100",
        env: ENV_SIMULADA,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
