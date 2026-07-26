"use client";

import {
  ArrowRight,
  Check,
  CornerDownLeft,
  Pause,
  SkipForward
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import {
  LoadingScreen,
  StorageUnavailableScreen
} from "@/components/SystemScreens";
import { FlagImage } from "@/components/FlagImage";
import { ProgressBar } from "@/components/ProgressBar";
import { entities, entityById } from "@/data/catalog";
import { getNameResolver } from "@/data/name-index";
import type { AttemptOutcome, DiagnosticState } from "@/types/learning";

interface Feedback {
  outcome: AttemptOutcome;
  entityId: string;
  answer?: string;
}

/**
 * Gate dos três estados do armazenamento. Fica separado do corpo porque o
 * estado inicial do diagnóstico é semeado a partir do snapshot, e um
 * `useState` não pode ficar atrás de um early return.
 */
export function DiagnosticSession() {
  const { state, refresh } = useApp();
  if (state.kind === "loading") {
    return <LoadingScreen label="Carregando seu diagnóstico." />;
  }
  if (state.kind === "unavailable") {
    return <StorageUnavailableScreen error={state.error} />;
  }
  return (
    <DiagnosticSessionReady
      savedDiagnostic={state.snapshot.diagnostic}
      refresh={refresh}
    />
  );
}

function DiagnosticSessionReady({
  savedDiagnostic,
  refresh
}: {
  savedDiagnostic?: DiagnosticState;
  refresh: () => Promise<void>;
}) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticState | undefined>(
    savedDiagnostic
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const state = diagnostic ?? savedDiagnostic;
  const currentId = state?.entityOrder[state.currentIndex];
  const current = currentId ? entityById.get(currentId) : undefined;
  const complete = Boolean(state?.completedAt);

  const measured = state?.currentIndex ?? 0;
  const introExamples = useMemo(
    () =>
      entities.filter((entity) => ["bra", "jpn", "zaf"].includes(entity.id)),
    []
  );

  async function begin() {
    setBusy(true);
    try {
      const storage = await import("@/storage");
      const next = await storage.startOrResumeDiagnostic(
        entities.map(({ id }) => id)
      );
      setDiagnostic(next);
      startedAt.current = performance.now();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function record(outcome: AttemptOutcome, typedAnswer?: string) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const storage = await import("@/storage");
      const result = await storage.saveDiagnosticAnswer({
        entityId: current.id,
        outcome,
        responseMs: Math.max(
          0,
          Math.round(performance.now() - startedAt.current)
        ),
        ...(typedAnswer ? { answer: typedAnswer } : {})
      });
      setFeedback({ outcome, entityId: current.id, answer: typedAnswer });
      setDiagnostic(result.diagnosticState);
      setAnswer("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!current || !answer.trim()) return;
    const resolution = getNameResolver().classify(answer, current.id);
    const outcome: AttemptOutcome =
      resolution.kind === "exact"
        ? "correct"
        : resolution.kind === "partial"
          ? "partial"
          : "incorrect";
    void record(outcome, answer.trim());
  }

  function next() {
    setFeedback(undefined);
    startedAt.current = performance.now();
  }

  if (!state) {
    return (
      <div className="page page-narrow">
        <header className="page-header">
          <div>
            <span className="eyebrow">Antes de ensinar, medir</span>
            <h1>O que você já reconhece?</h1>
            <p>
              Você verá as 220 bandeiras uma vez. Digite o nome quando souber ou
              pule sem chutar. O teste pode ser pausado a qualquer momento.
            </p>
          </div>
        </header>
        <section className="card">
          <div
            className="catalog-grid"
            aria-hidden="true"
            style={{ marginBottom: 24 }}
          >
            {introExamples.map((entity) => (
              <FlagImage entity={entity} revealName key={entity.id} />
            ))}
          </div>
          <h2>Como funciona</h2>
          <ol>
            <li>Não há alternativas nem autocomplete.</li>
            <li>Acentos, caixa e pontuação não fazem diferença.</li>
            <li>
              Um typo pequeno vira acerto parcial e será revisto mais cedo.
            </li>
            <li>Pular é melhor do que tentar adivinhar.</li>
          </ol>
          <button
            className="button button-coral"
            type="button"
            onClick={begin}
            disabled={busy}
          >
            Começar diagnóstico <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </div>
    );
  }

  if (complete && !feedback) {
    return (
      <div className="page page-narrow">
        <section className="study-card" style={{ textAlign: "center" }}>
          <span className="eyebrow">Diagnóstico concluído</span>
          <Check
            size={54}
            aria-hidden="true"
            style={{ margin: "30px auto 14px" }}
          />
          <h1 className="study-title">Seu ponto de partida está pronto.</h1>
          <p className="muted">
            Agora o Ptanki vai revisar os acertos e ensinar o que foi pulado ou
            confundido. Reconhecer a bandeira pelo nome será medido nas sessões.
          </p>
          <Link href="/estudar" className="button" style={{ marginTop: 18 }}>
            Começar a aprender <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  const feedbackEntity = feedback
    ? entityById.get(feedback.entityId)
    : undefined;

  return (
    <div className="page page-narrow">
      <div className="study-shell">
        <div className="study-topbar">
          <div style={{ flex: 1 }}>
            <ProgressBar
              value={measured}
              max={entities.length}
              label="Diagnóstico"
            />
          </div>
          <Link href="/" className="button button-secondary">
            <Pause size={17} aria-hidden="true" /> Pausar
          </Link>
        </div>

        <section className="study-card" aria-live="polite">
          {feedback && feedbackEntity ? (
            <>
              <span className="eyebrow">
                {feedback.outcome === "correct"
                  ? "Você reconheceu"
                  : feedback.outcome === "partial"
                    ? "Quase"
                    : "Resposta"}
              </span>
              <FlagImage
                entity={feedbackEntity}
                revealName
                eager
                className="quiz-flag"
              />
              <div
                className={`feedback ${
                  feedback.outcome === "correct"
                    ? "feedback-correct"
                    : feedback.outcome === "partial"
                      ? "feedback-partial"
                      : "feedback-incorrect"
                }`}
              >
                <strong>{feedbackEntity.displayNamePtBr}</strong>
                {feedback.answer && feedback.outcome !== "correct" && (
                  <span>Você escreveu: {feedback.answer}</span>
                )}
                <span>
                  {feedback.outcome === "partial"
                    ? "O nome estava inequívoco, mas esta bandeira voltará mais cedo."
                    : feedback.outcome === "correct"
                      ? "Este acerto inicia a primeira revisão; ainda não significa domínio."
                      : "Esta bandeira entrará na etapa de aprendizagem."}
                </span>
              </div>
              <div className="answer-actions" style={{ marginTop: 18 }}>
                <button className="button" type="button" onClick={next}>
                  {complete ? "Ver resultado" : "Próxima bandeira"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : current ? (
            <>
              <span className="eyebrow">
                Bandeira {measured + 1} de {entities.length}
              </span>
              <h1 className="study-prompt">De onde é esta bandeira?</h1>
              <FlagImage entity={current} eager className="quiz-flag" />
              <form className="answer-form" onSubmit={submit}>
                <label htmlFor="country-answer" className="sr-only">
                  Nome da entidade
                </label>
                <input
                  id="country-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Digite o nome em português"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoFocus
                  disabled={busy}
                />
                <span className="field-hint">
                  Pressione Enter para responder. Acentos são opcionais.
                </span>
                <div className="answer-actions">
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => void record("skipped")}
                    disabled={busy}
                  >
                    <SkipForward size={18} aria-hidden="true" /> Pular
                  </button>
                  <button
                    className="button"
                    type="submit"
                    disabled={!answer.trim() || busy}
                  >
                    Responder <CornerDownLeft size={18} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
