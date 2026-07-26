import { afterEach, describe, expect, it, vi } from "vitest";

import { newAttemptId } from "../ids";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newAttemptId", () => {
  it("devolve identificadores distintos", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newAttemptId()));
    expect(ids.size).toBe(50);
  });

  it("sinaliza a ausência de crypto.randomUUID em vez de improvisar", () => {
    // Fora de contexto seguro a API não existe. Um gerador improvisado
    // produziria colisões silenciosas no histórico, que é a única cópia do
    // progresso de quem estuda.
    vi.stubGlobal("crypto", {});
    expect(() => newAttemptId()).toThrow(/crypto.randomUUID/);
  });
});
