import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProvider, useApp } from "../AppProvider";

// vi.hoisted porque o AppProvider carrega @/storage por import dinâmico: o
// duplo precisa existir antes de o módulo ser resolvido.
const { readLearningSnapshot } = vi.hoisted(() => ({
  readLearningSnapshot: vi.fn()
}));

vi.mock("@/storage", () => ({ readLearningSnapshot }));

function StateProbe() {
  const { state } = useApp();
  return (
    <output data-testid="kind">
      {state.kind}
      {state.kind === "ready" ? `:${state.snapshot.skills.length}` : ""}
      {state.kind === "unavailable" ? `:${state.error.message}` : ""}
    </output>
  );
}

function renderProbe() {
  return render(
    <AppProvider>
      <StateProbe />
    </AppProvider>
  );
}

afterEach(() => {
  // Sem `globals: true` no vitest, o Testing Library não desmonta sozinho: um
  // provider remanescente do teste anterior voltaria a chamar o duplo já
  // resetado e produziria um snapshot indefinido.
  cleanup();
  readLearningSnapshot.mockReset();
});

describe("AppProvider", () => {
  it("começa em loading, antes de o armazenamento responder", () => {
    readLearningSnapshot.mockReturnValue(new Promise(() => {}));
    renderProbe();
    expect(screen.getByTestId("kind")).toHaveTextContent("loading");
  });

  it("distingue progresso vazio de falha de leitura", async () => {
    readLearningSnapshot.mockResolvedValue({
      skills: [],
      attempts: [],
      settings: { desiredRetention: 0.9, timeZone: "America/Sao_Paulo" }
    });
    renderProbe();

    // Um usuário sem progresso chega a "ready" com listas vazias — não a
    // "unavailable". Antes os dois casos produziam exatamente o mesmo valor.
    await waitFor(() =>
      expect(screen.getByTestId("kind")).toHaveTextContent("ready:0")
    );
  });

  it("expõe a falha do armazenamento em vez de fingir primeiro acesso", async () => {
    // É o caso de janela anônima ou cota esgotada: antes o catch devolvia
    // listas vazias e a interface convidava a refazer o diagnóstico sobre um
    // progresso que continuava salvo.
    readLearningSnapshot.mockRejectedValue(
      new Error("IndexedDB indisponível neste contexto")
    );
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("kind")).toHaveTextContent(
        "unavailable:IndexedDB indisponível neste contexto"
      )
    );
  });

  it("converte rejeição não-Error em Error", async () => {
    readLearningSnapshot.mockRejectedValue("falha crua");
    renderProbe();

    await waitFor(() =>
      expect(screen.getByTestId("kind")).toHaveTextContent("unavailable:")
    );
  });
});
