"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { LearningSnapshot } from "@/types/learning";

/**
 * Os três estados possíveis da leitura do armazenamento local.
 *
 * Antes, "carregando", "sem progresso" e "não foi possível ler" colapsavam no
 * mesmo valor: um `catch` silencioso devolvia listas vazias, e quem estivesse
 * em janela anônima via a tela de primeiro acesso — com o convite a refazer o
 * diagnóstico sobre dados que continuavam lá. Como union discriminado, o
 * compilador exige que cada tela trate os três.
 */
export type AppState =
  | { kind: "loading" }
  | { kind: "ready"; snapshot: LearningSnapshot }
  | { kind: "unavailable"; error: Error };

interface AppContextValue {
  state: AppState;
  refresh(): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

async function loadState(): Promise<AppState> {
  try {
    const storage = await import("@/storage");
    return { kind: "ready", snapshot: await storage.readLearningSnapshot() };
  } catch (cause) {
    return {
      kind: "unavailable",
      error:
        cause instanceof Error
          ? cause
          : new Error("Falha desconhecida ao abrir o armazenamento local")
    };
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ kind: "loading" });

  const refresh = useCallback(async () => {
    setState(await loadState());
  }, []);

  useEffect(() => {
    let active = true;
    void loadState().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ state, refresh }), [state, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return value;
}
