"use client";

import { ArrowRight, Check, CornerDownLeft, Pause } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { FlagImage } from "@/components/FlagImage";
import { ProgressBar } from "@/components/ProgressBar";
import { entities, entityById } from "@/data/catalog";
import { buildDailyQueue, type DailyQueueItem } from "@/domain/daily-queue";
import { CountryNameResolver } from "@/domain/name-resolution";
import {
  createSkillState,
  scheduleAttempt,
  skillStateId
} from "@/domain/scheduler";
import type {
  AttemptOutcome,
  ReviewAttempt,
  SkillState
} from "@/types/learning";

type StudyStep = "teach" | "forwardChoice" | "forwardInput" | "reverseChoice";

interface SessionItem extends DailyQueueItem {
  immediate?: boolean;
}

interface StudyFeedback {
  outcome: AttemptOutcome;
  answer?: string;
  nextStep?: StudyStep;
}

const resolver = new CountryNameResolver(entities);
const SESSION_LIMIT = 20;

function distractors(entityId: string, count = 3) {
  const target = entityById.get(entityId)!;
  const sameRegion = entities.filter(
    (entity) => entity.id !== entityId && entity.region === target.region
  );
  const rest = entities.filter(
    (entity) => entity.id !== entityId && entity.region !== target.region
  );
  return [...sameRegion, ...rest]
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, count);
}

function shuffled<T>(items: readonly T[], seed: string): T[] {
  return [...items].sort((left, right) => {
    const leftKey = `${seed}:${JSON.stringify(left)}`;
    const rightKey = `${seed}:${JSON.stringify(right)}`;
    return leftKey.localeCompare(rightKey) * (seed.charCodeAt(0) % 2 ? 1 : -1);
  });
}

function newAttempt(
  item: SessionItem,
  outcome: AttemptOutcome,
  responseMs: number,
  exercise: ReviewAttempt["exercise"],
  answer?: string
): ReviewAttempt {
  return {
    id: crypto.randomUUID(),
    entityId: item.entityId,
    skill: item.skill,
    exercise,
    outcome,
    // A repetição imediata que se segue a um erro fica registrada na própria
    // tentativa, e não só no argumento do agendador: assim o histórico
    // distingue uma recuperação genuína de uma segunda chance.
    isImmediateCorrection: item.immediate ?? false,
    responseMs,
    ...(answer ? { answer } : {}),
    createdAt: new Date().toISOString()
  };
}

function initialStep(item: SessionItem, state?: SkillState): StudyStep {
  if (item.skill === "nameToFlagRecognition") return "reverseChoice";
  if (
    item.reason === "new" ||
    !state ||
    state.lastOutcome === "incorrect" ||
    state.lastOutcome === "skipped"
  ) {
    return "teach";
  }
  return "forwardInput";
}

export function StudySession() {
  const { diagnostic, skills, attempts, settings, refresh, loading } = useApp();
  const [queue, setQueue] = useState<SessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<StudyStep>("teach");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<StudyFeedback>();
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const startedAt = useRef(0);

  const stateById = useMemo(
    () => new Map(skills.map((state) => [state.id, state])),
    [skills]
  );

  function beginSession() {
    if (loading || initialized || !diagnostic?.completedAt) return;
    const plan = buildDailyQueue({
      entityOrder: entities.map(({ id }) => id),
      states: skills,
      recentAttempts: attempts,
      baseNewLimit: 5
    });
    const items = plan.items.slice(0, SESSION_LIMIT);
    setQueue(items);
    const first = items[0];
    if (first) {
      setStep(
        initialStep(
          first,
          stateById.get(skillStateId(first.entityId, first.skill))
        )
      );
    }
    setInitialized(true);
    startedAt.current = performance.now();
  }

  const item = queue[index];
  const entity = item ? entityById.get(item.entityId) : undefined;
  const choices = useMemo(() => {
    if (!entity) return [];
    return shuffled(
      [entity, ...distractors(entity.id)],
      `${entity.id}:${item?.skill ?? ""}`
    );
  }, [entity, item?.skill]);

  function moveToNext() {
    setFeedback(undefined);
    setAnswer("");
    const nextIndex = index + 1;
    setIndex(nextIndex);
    const next = queue[nextIndex];
    if (next) {
      setStep(
        initialStep(
          next,
          stateById.get(skillStateId(next.entityId, next.skill))
        )
      );
    }
    startedAt.current = performance.now();
  }

  function continueAfterFeedback() {
    if (feedback?.nextStep) {
      setStep(feedback.nextStep);
      setFeedback(undefined);
      setAnswer("");
      startedAt.current = performance.now();
      return;
    }
    moveToNext();
  }

  async function persistAttempt(
    outcome: AttemptOutcome,
    exercise: ReviewAttempt["exercise"],
    typedAnswer?: string,
    schedule = true
  ) {
    if (!item) return;
    setBusy(true);
    try {
      const storage = await import("@/storage");
      const current =
        stateById.get(skillStateId(item.entityId, item.skill)) ??
        createSkillState(item.entityId, item.skill);
      const attempt = newAttempt(
        item,
        outcome,
        Math.max(0, Math.round(performance.now() - startedAt.current)),
        exercise,
        typedAnswer
      );
      const nextState = schedule
        ? scheduleAttempt(current, attempt, settings)
        : current;
      await storage.saveReview(nextState, attempt);

      if (
        schedule &&
        outcome !== "correct" &&
        (retryCounts[nextState.id] ?? 0) < 1
      ) {
        const retry: SessionItem = {
          entityId: item.entityId,
          skill: item.skill,
          reason: "correction",
          immediate: true
        };
        setQueue((currentQueue) => {
          const insertion = Math.min(index + 4, currentQueue.length);
          return [
            ...currentQueue.slice(0, insertion),
            retry,
            ...currentQueue.slice(insertion)
          ];
        });
        setRetryCounts((currentCounts) => ({
          ...currentCounts,
          [nextState.id]: (currentCounts[nextState.id] ?? 0) + 1
        }));
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function answerForwardChoice(selectedId: string) {
    if (!entity) return;
    const outcome: AttemptOutcome =
      selectedId === entity.id ? "correct" : "incorrect";
    await persistAttempt(
      outcome,
      "flagToNameChoice",
      entityById.get(selectedId)?.displayNamePtBr,
      false
    );
    setFeedback({
      outcome,
      answer: entityById.get(selectedId)?.displayNamePtBr,
      nextStep: "forwardInput"
    });
  }

  async function answerReverseChoice(selectedId: string) {
    if (!entity) return;
    const outcome: AttemptOutcome =
      selectedId === entity.id ? "correct" : "incorrect";
    await persistAttempt(
      outcome,
      "nameToFlagChoice",
      entityById.get(selectedId)?.displayNamePtBr
    );
    setFeedback({
      outcome,
      answer: entityById.get(selectedId)?.displayNamePtBr
    });
  }

  async function submitForward(event: FormEvent) {
    event.preventDefault();
    if (!entity || !answer.trim()) return;
    const result = resolver.classify(answer, entity.id);
    const outcome: AttemptOutcome =
      result.kind === "exact"
        ? "correct"
        : result.kind === "partial"
          ? "partial"
          : "incorrect";
    await persistAttempt(outcome, "flagToNameInput", answer.trim());
    setFeedback({ outcome, answer: answer.trim() });
  }

  if (loading) {
    return (
      <div className="page page-narrow">
        <div className="empty-state">Preparando sua sessão…</div>
      </div>
    );
  }

  if (!diagnostic?.completedAt) {
    return (
      <div className="page page-narrow">
        <section className="study-card" style={{ textAlign: "center" }}>
          <span className="eyebrow">Primeiro passo</span>
          <h1 className="study-title">Faça o diagnóstico antes de estudar.</h1>
          <p className="muted">
            Assim a primeira sessão começa no que você ainda não reconhece.
          </p>
          <Link
            href="/diagnostico"
            className="button"
            style={{ marginTop: 18 }}
          >
            Ir ao diagnóstico <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  if (!initialized) {
    const preview = buildDailyQueue({
      entityOrder: entities.map(({ id }) => id),
      states: skills,
      recentAttempts: attempts,
      baseNewLimit: 5
    });
    return (
      <div className="page page-narrow">
        <section className="study-card">
          <span className="eyebrow">Meta adaptativa</span>
          <h1 className="study-title">Sua sessão está pronta.</h1>
          <p className="muted">
            Hoje há {preview.dueCount} revisões vencidas,{" "}
            {preview.correctionCount} correções e espaço para até{" "}
            {preview.newLimit} novas associações. Esta rodada terá no máximo{" "}
            {SESSION_LIMIT} itens.
          </p>
          <button
            className="button"
            type="button"
            onClick={beginSession}
            style={{ marginTop: 18 }}
          >
            Começar sessão <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </div>
    );
  }

  if (initialized && queue.length === 0) {
    return (
      <div className="page page-narrow">
        <section className="study-card" style={{ textAlign: "center" }}>
          <Check
            size={54}
            aria-hidden="true"
            style={{ margin: "30px auto 14px" }}
          />
          <h1 className="study-title">Tudo em dia por enquanto.</h1>
          <p className="muted">
            As próximas revisões aparecerão quando estiverem vencidas.
          </p>
          <Link
            href="/catalogo"
            className="button button-secondary"
            style={{ marginTop: 18 }}
          >
            Explorar o atlas
          </Link>
        </section>
      </div>
    );
  }

  if (initialized && (!item || !entity)) {
    return (
      <div className="page page-narrow">
        <section className="study-card" style={{ textAlign: "center" }}>
          <Check
            size={54}
            aria-hidden="true"
            style={{ margin: "30px auto 14px" }}
          />
          <span className="eyebrow">Sessão concluída</span>
          <h1 className="study-title">Bom trabalho de recuperação.</h1>
          <p className="muted">
            Acertos imediatos corrigem o erro; as revisões futuras confirmarão a
            retenção.
          </p>
          <Link href="/" className="button" style={{ marginTop: 18 }}>
            Voltar ao painel
          </Link>
        </section>
      </div>
    );
  }

  if (!item || !entity) return null;

  return (
    <div className="page page-narrow">
      <div className="study-shell">
        <div className="study-topbar">
          <div style={{ flex: 1 }}>
            <ProgressBar
              value={index}
              max={queue.length}
              label="Sessão de hoje"
            />
          </div>
          <Link href="/" className="button button-secondary">
            <Pause size={17} aria-hidden="true" /> Encerrar
          </Link>
        </div>

        <section className="study-card" aria-live="polite">
          {feedback ? (
            <>
              <span className="eyebrow">
                {feedback.outcome === "correct"
                  ? "Acerto de primeira"
                  : feedback.outcome === "partial"
                    ? "Acerto parcial"
                    : "Vamos corrigir"}
              </span>
              <FlagImage
                entity={entity}
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
                <strong>{entity.displayNamePtBr}</strong>
                {feedback.answer && feedback.outcome !== "correct" && (
                  <span>Sua resposta: {feedback.answer}</span>
                )}
                <span>
                  {feedback.outcome === "correct"
                    ? "A próxima revisão será espaçada conforme a estabilidade desta lembrança."
                    : feedback.outcome === "partial"
                      ? "Você sabia a entidade, mas a grafia será reforçada mais cedo."
                      : "O item reaparecerá depois de outras bandeiras; a correção imediata não contará como retenção."}
                </span>
              </div>
              <div className="answer-actions" style={{ marginTop: 18 }}>
                <button
                  className="button"
                  type="button"
                  onClick={continueAfterFeedback}
                >
                  {feedback.nextStep
                    ? "Agora, lembre sem alternativas"
                    : "Continuar"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : step === "teach" ? (
            <>
              <span className="eyebrow">Primeiro contato</span>
              <h1 className="study-prompt">
                Esta é a bandeira de {entity.displayNamePtBr}.
              </h1>
              <FlagImage
                entity={entity}
                revealName
                eager
                className="quiz-flag"
              />
              <p className="muted" style={{ textAlign: "center" }}>
                Observe a composição antes de tentar recuperar o nome.
              </p>
              <div className="answer-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setStep("forwardChoice");
                    startedAt.current = performance.now();
                  }}
                >
                  Praticar <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : step === "forwardChoice" ? (
            <>
              <span className="eyebrow">Reconhecimento com apoio</span>
              <h1 className="study-prompt">De onde é esta bandeira?</h1>
              <FlagImage entity={entity} eager className="quiz-flag" />
              <div className="choice-grid">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    className="choice"
                    type="button"
                    disabled={busy}
                    onClick={() => void answerForwardChoice(choice.id)}
                  >
                    {choice.displayNamePtBr}
                  </button>
                ))}
              </div>
            </>
          ) : step === "reverseChoice" ? (
            <>
              <span className="eyebrow">Associação inversa</span>
              <h1 className="study-prompt">
                Qual é a bandeira de {entity.displayNamePtBr}?
              </h1>
              <div className="choice-grid">
                {choices.map((choice, choiceIndex) => (
                  <button
                    key={choice.id}
                    className="choice choice-flag"
                    type="button"
                    disabled={busy}
                    aria-label={`Opção ${choiceIndex + 1}`}
                    onClick={() => void answerReverseChoice(choice.id)}
                  >
                    <FlagImage entity={choice} />
                    <span>Opção {choiceIndex + 1}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">Recordação sem pista</span>
              <h1 className="study-prompt">Digite o nome desta entidade.</h1>
              <FlagImage entity={entity} eager className="quiz-flag" />
              <form className="answer-form" onSubmit={submitForward}>
                <label htmlFor="study-answer" className="sr-only">
                  Nome da entidade
                </label>
                <input
                  id="study-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Digite o nome em português"
                  autoComplete="off"
                  autoFocus
                  disabled={busy}
                />
                <span className="field-hint">
                  Acentos são opcionais; nomes ambíguos não são aceitos.
                </span>
                <div className="answer-actions">
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
          )}
        </section>
      </div>
    </div>
  );
}
