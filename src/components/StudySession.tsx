"use client";

import { ArrowRight, Check, CornerDownLeft, Pause } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { AppReady } from "@/components/AppReady";
import { EmptyState } from "@/components/SystemScreens";
import { FlagImage } from "@/components/FlagImage";
import { SessionSummary } from "@/components/SessionSummary";
import { FeedbackPanel, feedbackTone } from "@/components/ui/feedback-panel";
import { InkBubble } from "@/components/ui/ink-bubble";
import { OptionButton, type OptionState } from "@/components/ui/option-button";
import {
  SessionPips,
  amendedPipState,
  pipStateFor,
  type PipState
} from "@/components/ui/pips";
import { entities, entityById } from "@/data/runtime-catalog";
import { getNameResolver } from "@/data/name-index";
import { newAttemptId } from "@/domain/ids";
import { buildChoiceRound } from "@/domain/distractors";
import { describePalette } from "@/domain/palette";
import { mulberry32 } from "@/domain/shuffle";
import { buildDailyQueue, type DailyQueueItem } from "@/domain/daily-queue";
import {
  createSkillState,
  scheduleAttempt,
  skillStateId
} from "@/domain/scheduler";
import type {
  AttemptOutcome,
  LearningSnapshot,
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

const SESSION_LIMIT = 20;
const CHOICE_COUNT = 4;

function newAttempt(
  item: SessionItem,
  outcome: AttemptOutcome,
  responseMs: number,
  exercise: ReviewAttempt["exercise"],
  answer?: string
): ReviewAttempt {
  return {
    id: newAttemptId(),
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
  return (
    <AppReady loadingLabel="Preparando sua sessão.">
      {({ snapshot, refresh }) => (
        <StudySessionReady snapshot={snapshot} refresh={refresh} />
      )}
    </AppReady>
  );
}

function StudySessionReady({
  snapshot,
  refresh
}: {
  snapshot: LearningSnapshot;
  refresh: () => Promise<void>;
}) {
  const { diagnostic, skills, attempts, settings } = snapshot;
  const [queue, setQueue] = useState<SessionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<StudyStep>("teach");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<StudyFeedback>();
  // Guardado para marcar em lugar a alternativa escolhida. Antes a grade era
  // desmontada ao surgir o veredito e o app respondia "Sua resposta: Chade" em
  // prosa; marcar o botão que a pessoa tocou faz o vínculo erro→estímulo, que
  // num app de memória vale mais do que num quiz.
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  // As bolinhas são indexadas pelo item, e não pela posição na fila. A fila
  // cresce no meio da sessão — um erro reinsere o item quatro posições à
  // frente —, e por posição isso faria nascer uma bolinha do nada. Como a
  // repetição imediata tem o mesmo `skillStateId` do item que corrige, ela
  // reescreve a bolinha existente: uma correção não é um item novo.
  const [pipOrder, setPipOrder] = useState<string[]>([]);
  const [pipOutcomes, setPipOutcomes] = useState<Record<string, PipState>>({});
  const startedAt = useRef(0);
  // Semente sorteada uma vez por sessão. Combinada com a posição na fila, dá
  // alternativas estáveis enquanto a questão está na tela — nada de
  // reembaralhar a cada re-render — e diferentes a cada nova sessão.
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  const stateById = useMemo(
    () => new Map(skills.map((state) => [state.id, state])),
    [skills]
  );

  function beginSession() {
    if (initialized || !diagnostic?.completedAt) return;
    const plan = buildDailyQueue({
      entityOrder: entities.map(({ id }) => id),
      states: skills,
      recentAttempts: attempts,
      baseNewLimit: 5
    });
    const items = plan.items.slice(0, SESSION_LIMIT);
    setQueue(items);
    // Fixado aqui, e nunca reescrito: é o conjunto de itens desta sessão, que
    // não muda quando a fila ganha uma repetição.
    setPipOrder(
      items.map(({ entityId, skill }) => skillStateId(entityId, skill))
    );
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
  const pipStates = pipOrder.map((id) => pipOutcomes[id] ?? "pending");
  // A posição também sai da identidade do item, e não de `index`: depois de
  // uma repetição imediata os dois divergem, e é a bolinha do item corrigido
  // que deve estar marcada.
  const pipPosition = item
    ? pipOrder.indexOf(skillStateId(item.entityId, item.skill))
    : pipOrder.length;
  /**
   * Antes do veredito toda alternativa está em repouso. Depois, a certa é
   * marcada como correta — inclusive quando foi a escolhida —, a escolhida
   * errada é marcada como erro, e as outras duas recuam sem sumir: é vendo as
   * quatro juntas que se percebe *o que* se confundiu com *o quê*.
   */
  function optionState(choiceId: string): OptionState {
    if (!feedback || !entity) return "idle";
    if (choiceId === entity.id) return "correct";
    if (choiceId === selectedId) return "wrong";
    return "muted";
  }

  const choices = useMemo(() => {
    if (!entity) return [];
    return buildChoiceRound(
      entity,
      entities,
      CHOICE_COUNT,
      mulberry32(sessionSeed + index * 2654435761)
    );
  }, [entity, index, sessionSeed]);

  function moveToNext() {
    setFeedback(undefined);
    setSelectedId(undefined);
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
      setSelectedId(undefined);
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
      setPipOutcomes((current) => ({
        ...current,
        [nextState.id]: item.immediate
          ? amendedPipState(outcome)
          : pipStateFor(outcome)
      }));

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
    setSelectedId(selectedId);
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
    setSelectedId(selectedId);
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
    const result = getNameResolver().classify(answer, entity.id);
    const outcome: AttemptOutcome =
      result.kind === "exact"
        ? "correct"
        : result.kind === "partial"
          ? "partial"
          : "incorrect";
    await persistAttempt(outcome, "flagToNameInput", answer.trim());
    setFeedback({ outcome, answer: answer.trim() });
  }

  if (!diagnostic?.completedAt) {
    return (
      <EmptyState
        eyebrow="Primeiro passo"
        title="Faça o diagnóstico antes de estudar."
        description="Assim a primeira sessão começa no que você ainda não reconhece."
        action={
          <Link href="/diagnostico" className="button">
            Ir ao diagnóstico <ArrowRight size={18} aria-hidden="true" />
          </Link>
        }
      />
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
      <EmptyState
        icon={<Check size={54} aria-hidden="true" />}
        title="Tudo em dia por enquanto."
        description="As próximas revisões aparecerão quando estiverem vencidas."
        action={
          <Link href="/catalogo" className="button button-secondary">
            Explorar o atlas
          </Link>
        }
      />
    );
  }

  if (initialized && (!item || !entity)) {
    const countOf = (state: PipState) =>
      pipStates.filter((value) => value === state).length;
    return (
      <SessionSummary
        eyebrow="Sessão concluída"
        figure={countOf("correct")}
        figureLabel={`de ${pipStates.length} na primeira tentativa`}
        pips={pipStates}
        tallies={[
          { label: "Parciais", value: countOf("partial") },
          { label: "Corrigidos", value: countOf("amended") },
          { label: "Ainda a rever", value: countOf("missed") }
        ]}
        action={
          <Link href="/" className="button">
            Voltar ao painel <ArrowRight size={18} aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  if (!item || !entity) return null;

  return (
    <div className="page page-narrow">
      <div className="study-shell">
        <div className="study-topbar">
          <div className="min-w-0 flex-1">
            <SessionPips
              states={pipStates}
              position={pipPosition}
              label="Sessão de hoje"
            />
          </div>
          <Link href="/" className="button button-secondary">
            <Pause size={17} aria-hidden="true" /> Encerrar
          </Link>
        </div>

        {/* Sem aria-live aqui. Ele desceu para o painel de veredito: com a
            grade permanecendo montada, uma região viva no cartão inteiro faria
            o leitor reler enunciado, bandeira e as quatro alternativas a cada
            passo. */}
        <section className="study-card">
          {step === "teach" ? (
            <>
              <span className="eyebrow">Primeiro contato</span>
              <h1 className="study-prompt">
                Esta é a bandeira de {entity.displayNamePtBr}.
              </h1>
              <FlagImage
                entity={entity}
                alt={{ kind: "named" }}
                eager
                size="hero"
              />
              {/* Só neste passo. A nota do Paraguai diz qual lado da bandeira
                  está na tela, e a de Taiwan nomeia a entidade: nos passos de
                  pergunta seriam dica ou resposta. Aqui o nome já foi
                  revelado, então ela não vaza nada. */}
              <InkBubble className="mb-5">{entity.editorialNote}</InkBubble>
              <p className="muted text-center">
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
              <FlagImage
                entity={entity}
                // Respondida, a bandeira passa a ser nomeada: a resposta já
                // está na tela, e descrevê-la pelas cores seria esconder o
                // que acabou de ser revelado.
                alt={{ kind: feedback ? "named" : "unnamed" }}
                eager
                size="hero"
              />
              <div className="choice-grid">
                {choices.map((choice) => (
                  <OptionButton
                    key={choice.id}
                    layout="row"
                    state={optionState(choice.id)}
                    locked={busy || Boolean(feedback)}
                    onClick={() => void answerForwardChoice(choice.id)}
                  >
                    {choice.displayNamePtBr}
                  </OptionButton>
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
                  <OptionButton
                    key={choice.id}
                    layout="tile"
                    state={optionState(choice.id)}
                    locked={busy || Boolean(feedback)}
                    // Sem a descrição das cores, as quatro opções tinham o
                    // mesmo nome acessível e eram indistinguíveis para quem
                    // usa leitor de tela. O ordinal continua no rótulo porque
                    // paletas empatam — Irlanda e Costa do Marfim têm as
                    // mesmas três cores — e a navegação precisa ser
                    // inequívoca mesmo assim.
                    aria-label={`Opção ${choiceIndex + 1}: bandeira com ${describePalette(choice.palette)}`}
                    onClick={() => void answerReverseChoice(choice.id)}
                  >
                    {/* Decorativa: o rótulo do botão já descreve a bandeira. */}
                    <FlagImage
                      entity={choice}
                      alt={{ kind: "decorative" }}
                      size="fill"
                    />
                    <span aria-hidden="true">Opção {choiceIndex + 1}</span>
                  </OptionButton>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">Recordação sem pista</span>
              <h1 className="study-prompt">Digite o nome desta entidade.</h1>
              <FlagImage
                entity={entity}
                alt={{ kind: feedback ? "named" : "unnamed" }}
                eager
                size="hero"
              />
              {/* O formulário permanece montado depois de respondido, pelo
                  mesmo motivo da grade: o que a pessoa escreveu continua à
                  vista ao lado da correção. */}
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
                  readOnly={Boolean(feedback)}
                />
                {!feedback && (
                  <>
                    <span className="field-hint">
                      Acentos são opcionais; nomes ambíguos não são aceitos.
                    </span>
                    <div className="answer-actions">
                      <button
                        className="button"
                        type="submit"
                        disabled={!answer.trim() || busy}
                      >
                        Responder{" "}
                        <CornerDownLeft size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}

          {feedback && (
            <>
              <FeedbackPanel
                className="mt-5"
                tone={feedbackTone(feedback.outcome)}
                eyebrow={
                  feedback.outcome === "correct"
                    ? "Acerto de primeira"
                    : feedback.outcome === "partial"
                      ? "Acerto parcial"
                      : "Vamos corrigir"
                }
                answer={entity.displayNamePtBr}
                submitted={
                  feedback.outcome === "correct" ? undefined : feedback.answer
                }
                explanation={
                  feedback.outcome === "correct"
                    ? "A próxima revisão será espaçada conforme a estabilidade desta lembrança."
                    : feedback.outcome === "partial"
                      ? "Você sabia a entidade, mas a grafia será reforçada mais cedo."
                      : "O item reaparecerá depois de outras bandeiras; a correção imediata não contará como retenção."
                }
              />
              <div className="answer-actions mt-[18px]">
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
          )}
        </section>
      </div>
    </div>
  );
}
