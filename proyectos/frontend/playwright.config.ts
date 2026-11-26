import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas end to end (skill .claude/skills/pruebas-e2e-tecreview).
 * Capa A, "simulada": la app compilada con hosts ficticios y el backend
 * simulado con page.route. La capa B (pila completa) se añadirá con su
 * propio servidor, según references/pila-completa.md.
 */
const ENV_SIMULADA = {
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:3999",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "simulada",
      testDir: "e2e/simulada",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3100" },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100 -H 127.0.0.1",
    url: "http://127.0.0.1:3100",
    env: ENV_SIMULADA,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
