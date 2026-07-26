"use client";

import type { ReactNode } from "react";

import { useApp } from "@/components/AppProvider";
import {
  LoadingScreen,
  StorageUnavailableScreen
} from "@/components/SystemScreens";
import type { LearningSnapshot } from "@/types/learning";

interface AppReadyProps {
  loadingLabel: string;
  children: (ready: {
    snapshot: LearningSnapshot;
    refresh: () => Promise<void>;
  }) => ReactNode;
}

/**
 * Os três estados do armazenamento, tratados uma vez só.
 *
 * O mesmo par de early returns estava copiado em quatro telas, e cada cópia
 * era uma chance de alguém tratar dois dos três estados — que é exatamente o
 * defeito que o union discriminado de `AppState` foi criado para impedir.
 *
 * É render-prop, e as três alternativas mais óbvias não servem:
 *
 * Um hook não faz o early return pelo chamador — ele continuaria escrevendo os
 * dois `if`. Fazê-lo lançar para um error boundary transformaria "não foi
 * possível ler", que é estado esperado e tem tela própria, em exceção; e
 * "carregando" não tem equivalente sem Suspense, que aqui não se aplica,
 * porque o estado vem de um `useEffect` no provider e não de uma promise que
 * um boundary possa ler. Pior: manteria os `useState` da sessão no mesmo
 * componente do portão, que é justamente o risco documentado em
 * `StudySession`.
 *
 * Um layout de rota não parametriza `children`, então não teria como entregar
 * o snapshot — e gatearia `/catalogo`, `/creditos` e as páginas estáticas
 * de detalhe, que não dependem de armazenamento nenhum.
 *
 * Um HOC teria o mesmo efeito com tipos piores, e esconderia onde o portão
 * acontece.
 *
 * De graça, esta forma preserva um invariante que hoje se mantém à mão: como
 * `children` é chamado dentro deste render, o elemento devolvido só existe
 * quando há snapshot, e os hooks dele nascem e morrem com o ramo.
 */
export function AppReady({ loadingLabel, children }: AppReadyProps) {
  const { state, refresh } = useApp();

  if (state.kind === "loading") {
    return <LoadingScreen label={loadingLabel} />;
  }
  if (state.kind === "unavailable") {
    return <StorageUnavailableScreen error={state.error} />;
  }
  return <>{children({ snapshot: state.snapshot, refresh })}</>;
}
