import type { UsuarioE2E } from "../soporte/sesion";

/** Usuarios de la capa B. Los UUID cambian en cada corrida para empezar sin historial. */
const corrida = Date.now().toString(16).padStart(12, "0").slice(-12);
const uuid = (n: number) => `00000000-0000-4000-8000-${(parseInt(corrida, 16) + n).toString(16).padStart(12, "0").slice(-12)}`;

export const USUARIOS_PILA: Record<string, UsuarioE2E> = {
  ana: { sub: uuid(1), email: `ana.${corrida}@e2e.test`, nombre: "Ana E2E" },
  bea: { sub: uuid(2), email: `bea.${corrida}@e2e.test`, nombre: "Bea E2E" },
  carlos: { sub: uuid(3), email: `carlos.${corrida}@e2e.test`, nombre: "Carlos E2E" },
  dora: { sub: uuid(4), email: `dora.${corrida}@e2e.test`, nombre: "Dora E2E" },
  mod: { sub: uuid(5), email: `mod.${corrida}@e2e.test`, nombre: "Moderadora E2E" },
};
