"use client";

import { ArrowRight, CornerDownLeft, Pause, SkipForward } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppReady } from "@/components/AppReady";
import { FlagImage } from "@/components/FlagImage";
import { SessionSummary } from "@/components/SessionSummary";
import { FeedbackPanel, feedbackTone } from "@/components/ui/feedback-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardVariants, sessionCard } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Meter } from "@/components/ui/meter";
import { PageHeader } from "@/components/ui/page-header";
import { entities, entityById } from "@/data/runtime-catalog";
import { getNameResolver } from "@/data/name-index";
import type {
  AttemptOutcome,
  DiagnosticState,
  LearningSnapshot
} from "@/types/learning";

interface Feedback {
  outcome: AttemptOutcome;
  entityId: string;
  answer?: string;
}

export function DiagnosticSession() {
  return (
    <AppReady loadingLabel="Carregando seu diagnóstico.">
      {({ snapshot, refresh }) => (
        <DiagnosticSessionReady snapshot={snapshot} refresh={refresh} />
      )}
    </AppReady>
  );
}

function DiagnosticSessionReady({
  snapshot,
  refresh
}: {
  snapshot: LearningSnapshot;
  refresh: () => Promise<void>;
}) {
  // A prop alargou de `diagnostic` para o snapshot inteiro por causa do
  // resumo, que conta as tentativas. `attempts` já vinha no snapshot e já era
  // consumido por /estudar; nada em domínio ou armazenamento muda.
  const { diagnostic: savedDiagnostic, attempts } = snapshot;
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
      <div className="mx-auto w-full max-w-narrow">
        <PageHeader
          eyebrow="Antes de ensinar, medir"
          title="O que você já reconhece?"
          description={`Você verá as ${entities.length} bandeiras uma vez. Digite o nome quando souber ou pule sem chutar. O teste pode ser pausado a qualquer momento.`}
        />
        <section className={cardVariants()}>
          <div
            className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1"
            aria-hidden="true"
          >
            {introExamples.map((entity) => (
              <FlagImage
                entity={entity}
                alt={{ kind: "named" }}
                size="fill"
                key={entity.id}
              />
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
          {/* Convite de entrada, não ação destrutiva. O CSS legado dava a
              este botão e ao "Apagar progresso" o mesmo coral; aqui os dois se
              separam, e o coral fica reservado ao que não tem volta. */}
          <Button type="button" onClick={begin} disabled={busy}>
            Começar diagnóstico <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </section>
      </div>
    );
  }

  if (complete && !feedback) {
    // A contagem sai do snapshot, e não de um contador local: o diagnóstico é
    // explicitamente pausável, e uma retomada zeraria o contador — o resumo
    // reportaria a menos, em silêncio, justamente para quem levou dias.
    const answered = attempts.filter(
      ({ exercise }) => exercise === "diagnostic"
    );
    const countOf = (outcome: AttemptOutcome) =>
      answered.filter((attempt) => attempt.outcome === outcome).length;
    return (
      <SessionSummary
        eyebrow="Diagnóstico concluído"
        figure={countOf("correct")}
        figureLabel={`de ${entities.length} reconhecidas de imediato`}
        tallies={[
          { label: "Quase", value: countOf("partial") },
          { label: "Puladas", value: countOf("skipped") },
          { label: "A aprender", value: countOf("incorrect") }
        ]}
        action={
          <Link href="/estudar" className={buttonVariants()}>
            Começar a aprender <ArrowRight size={18} aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  const feedbackEntity = feedback
    ? entityById.get(feedback.entityId)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-narrow">
      <div className="grid gap-[18px]">
        {/* Em coluna única a barra empilha: lado a lado, o medidor e o "Pausar"
            não cabem numa Pixel 7. */}
        <div className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
          <div className="min-w-0 flex-1">
            <Meter value={measured} max={entities.length} label="Diagnóstico" />
          </div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            <Pause size={17} aria-hidden="true" /> Pausar
          </Link>
        </div>

        {/* A região viva não fica mais no cartão inteiro. Aqui, diferente da
            sessão de estudo, o veredito de fato substitui a pergunta — a
            bandeira respondida não é mais a da vez —, mas anunciar o cartão
            todo relia enunciado, texto alternativo e dica a cada bandeira. O
            veredito é anunciado pelo próprio painel; a pergunta seguinte se
            anuncia sozinha, porque o foco vai para o campo. */}
        <section className={sessionCard}>
          {feedback && feedbackEntity ? (
            <>
              <FlagImage
                entity={feedbackEntity}
                alt={{ kind: "named" }}
                eager
                size="hero"
              />
              <FeedbackPanel
                tone={feedbackTone(feedback.outcome)}
                eyebrow={
                  feedback.outcome === "correct"
                    ? "Você reconheceu"
                    : feedback.outcome === "partial"
                      ? "Quase"
                      : "Resposta"
                }
                answer={feedbackEntity.displayNamePtBr}
                submitted={
                  feedback.outcome === "correct" ? undefined : feedback.answer
                }
                submittedLabel="Você escreveu"
                explanation={
                  feedback.outcome === "partial"
                    ? "O nome estava inequívoco, mas esta bandeira voltará mais cedo."
                    : feedback.outcome === "correct"
                      ? "Este acerto inicia a primeira revisão; ainda não significa domínio."
                      : "Esta bandeira entrará na etapa de aprendizagem."
                }
              />
              <div className="mt-[18px] flex justify-end gap-2.5 max-md:flex-col max-md:items-stretch">
                <Button type="button" onClick={next}>
                  {complete ? "Ver resultado" : "Próxima bandeira"}
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : current ? (
            <>
              <Eyebrow>
                Bandeira {measured + 1} de {entities.length}
              </Eyebrow>
              <h1 className="mt-1.5 mb-[22px] font-title text-prompt tracking-title">
                De onde é esta bandeira?
              </h1>
              <FlagImage
                entity={current}
                alt={{ kind: "unnamed" }}
                eager
                size="hero"
              />
              <form className="mx-auto grid max-w-copy gap-3" onSubmit={submit}>
                <label htmlFor="country-answer" className="sr-only">
                  Nome da entidade
                </label>
                <input
                  id="country-answer"
                  className="h-[58px] w-full rounded-[13px] border-2 border-input bg-white px-4 py-[13px] text-lg text-ink"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Digite o nome em português"
                  autoComplete="off"
                  autoCapitalize="words"
                  autoFocus
                  disabled={busy}
                />
                <span className="text-sm text-ink-soft">
                  Pressione Enter para responder. Acentos são opcionais.
                </span>
                <div className="flex justify-end gap-2.5 max-md:flex-col max-md:items-stretch">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => void record("skipped")}
                    disabled={busy}
                  >
                    <SkipForward size={18} aria-hidden="true" /> Pular
                  </Button>
                  <Button type="submit" disabled={!answer.trim() || busy}>
                    Responder <CornerDownLeft size={18} aria-hidden="true" />
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
