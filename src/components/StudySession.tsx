"use client";

import {
  ArrowRight,
  Check,
  CornerDownLeft,
  HelpCircle,
  Pause
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { AppReady } from "@/components/AppReady";
import { EmptyState } from "@/components/SystemScreens";
import { FlagImage } from "@/components/FlagImage";
import { SessionSummary } from "@/components/SessionSummary";
import { Button, buttonVariants } from "@/components/ui/button";
import { sessionCard } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FeedbackPanel, feedbackTone } from "@/components/ui/feedback-panel";
import { InkBubble } from "@/components/ui/ink-bubble";
import { OptionButton, type OptionState } from "@/components/ui/option-button";
import {
  amendedPipState,
  pipStateFor,
  type PipState
} from "@/components/ui/pips";
import { entities, entityById } from "@/data/runtime-catalog";
import { getNameResolver } from "@/data/name-index";
import { CONTINENT_OF_PT_BR, SUBREGION } from "@/types/geography";
import { CURRICULUM, introductionOrder } from "@/data/curriculum";
import { verdictExplanation } from "@/domain/feedback";
import { newAttemptId } from "@/domain/ids";
import {
  attemptFlags,
  initialPosition,
  markedAsGuess,
  nextPosition,
  skillForStep,
  type StudyPosition
} from "@/domain/study-flow";
import { awardedXpFor, xpTotals } from "@/domain/xp";
import { buildChoiceRound } from "@/domain/distractors";
import { describePalette } from "@/domain/palette";
import { mulberry32 } from "@/domain/shuffle";
import {
  dueCount,
  nextActivity,
  type NextActivity
} from "@/domain/next-activity";
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

type SessionItem = NextActivity;

interface StudyFeedback {
  outcome: AttemptOutcome;
  answer?: string;
  /** A bandeira que a pessoa indicou, quando ela é identificável. */
  chosenId?: string;
  /** O passo seguinte da mesma atividade, ou nada quando a fila retoma. */
  next?: StudyPosition;
}

/**
 * A última tentativa gravada, com o estado e o histórico de antes dela. "Foi
 * chute" reagenda a partir daqui, e não do estado que a tentativa produziu:
 * senão a nota rebaixada se somaria à original em vez de substituí-la.
 */
interface GradedAttempt {
  original: ReviewAttempt;
  stateBefore: SkillState;
  historyBefore: readonly ReviewAttempt[];
  guessed: boolean;
}

const CHOICE_COUNT = 4;

/**
 * O relógio da sessão. Só é lido em handlers de clique e de digitação, nunca
 * no render; fica fora do componente porque o lint de pureza do React não
 * consegue provar isso para funções aninhadas que chamam umas às outras.
 */
function clockNow(): number {
  return performance.now();
}

function newAttempt(
  item: SessionItem,
  position: StudyPosition,
  outcome: AttemptOutcome,
  exercise: ReviewAttempt["exercise"],
  timing: { responseMs: number; firstInputMs?: number },
  answer: string | undefined
): ReviewAttempt {
  // A correção fica registrada na própria tentativa, e não só no argumento do
  // agendador: assim o histórico distingue uma recuperação genuína de uma
  // segunda chance. O que conta como correção é regra do domínio.
  const { isImmediateCorrection } = attemptFlags(position, item.reason);
  return {
    id: newAttemptId(),
    entityId: item.entityId,
    skill: skillForStep(position.step),
    exercise,
    outcome,
    isImmediateCorrection,
    mode: "scheduled",
    awardedXp: awardedXpFor({ outcome, isImmediateCorrection }),
    responseMs: timing.responseMs,
    ...(timing.firstInputMs === undefined
      ? {}
      : { firstInputMs: timing.firstInputMs }),
    ...(answer ? { answer } : {}),
    createdAt: new Date().toISOString()
  };
}

function optionalNext(next: StudyPosition | undefined): {
  next?: StudyPosition;
} {
  return next ? { next } : {};
}

/** O botão que leva adiante diz para onde leva. */
function continueLabel(next: StudyPosition | undefined): string {
  switch (next?.step) {
    case "teach":
      return "Ver a bandeira com o nome";
    case "forwardInput":
      return "Agora, lembre sem alternativas";
    case "reverseChoice":
      return "Agora, ache a bandeira pelo nome";
    default:
      return "Continuar";
  }
}

export function StudySession({
  priorityEntityId
}: {
  /** Bandeira puxada do álbum para ser a próxima novidade. */
  priorityEntityId?: string;
}) {
  return (
    <AppReady loadingLabel="Preparando sua sessão.">
      {({ snapshot, refresh }) => (
        <StudySessionReady
          snapshot={snapshot}
          refresh={refresh}
          priorityEntityId={priorityEntityId}
        />
      )}
    </AppReady>
  );
}

function StudySessionReady({
  snapshot,
  refresh,
  priorityEntityId
}: {
  snapshot: LearningSnapshot;
  refresh: () => Promise<void>;
  priorityEntityId?: string;
}) {
  const { skills, attempts, settings } = snapshot;
  // Novidade só do continente em estudo, na ordem do currículo; revisão
  // vencida de qualquer um, porque a fila tira as revisões dos estados
  // guardados, e não desta ordem.
  const newEntityOrderForSession = useMemo(
    () => introductionOrder(settings.activeContinent, priorityEntityId),
    [settings.activeContinent, priorityEntityId]
  );
  const [item, setItem] = useState<SessionItem>();
  const [position, setPosition] = useState<StudyPosition>({
    step: "firstContact",
    taught: false
  });
  const step = position.step;
  const [graded, setGraded] = useState<GradedAttempt>();
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<StudyFeedback>();
  // Guardado para marcar em lugar a alternativa escolhida. Antes a grade era
  // desmontada ao surgir o veredito e o app respondia "Sua resposta: Chade" em
  // prosa; marcar o botão que a pessoa tocou faz o vínculo erro→estímulo, que
  // num app de memória vale mais do que num quiz.
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  // "exhausted" quando a fila esvaziou, "ended" quando a pessoa encerrou: o
  // resumo é o mesmo, mas só o primeiro pode dizer que está tudo em dia.
  const [finished, setFinished] = useState<"exhausted" | "ended">();
  // O histórico da sessão, uma bolinha por resposta. A sessão não tem tamanho
  // fixo, então não há "x de N" a mostrar durante ela; o histórico só aparece
  // no resumo do fim.
  const [history, setHistory] = useState<PipState[]>([]);
  // Quantas questões já passaram, para variar a semente das alternativas.
  const [presented, setPresented] = useState(0);
  const startedAt = useRef(0);
  // O instante da primeira tecla no campo de digitação. A nota por velocidade
  // lê o tempo até ela, e não até o envio, que somaria o tempo de digitar um
  // nome longo num teclado de celular ao de reconhecer a bandeira.
  const firstInputAt = useRef<number | undefined>(undefined);
  // Semente sorteada uma vez por sessão. Combinada com a posição na fila, dá
  // alternativas estáveis enquanto a questão está na tela — nada de
  // reembaralhar a cada re-render — e diferentes a cada nova sessão.
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));

  // Refeita a cada snapshot novo, que chega a cada resposta, e não a cada
  // tecla do campo de digitação.
  const xp = useMemo(
    () => xpTotals(attempts, settings.timeZone),
    [attempts, settings.timeZone]
  );

  const stateById = useMemo(
    () => new Map(skills.map((state) => [state.id, state])),
    [skills]
  );

  function resetStep() {
    setFeedback(undefined);
    setSelectedId(undefined);
    setAnswer("");
    setGraded(undefined);
    startedAt.current = clockNow();
    firstInputAt.current = undefined;
  }

  function present(next: SessionItem | undefined) {
    resetStep();
    if (!next) {
      setItem(undefined);
      setFinished("exhausted");
      return;
    }
    setItem(next);
    setPresented((count) => count + 1);
    setPosition(initialPosition(next));
  }

  function advanceTo(next: StudyPosition) {
    resetStep();
    setPosition(next);
  }

  // A próxima atividade é recalculada a cada passo, a partir dos estados
  // gravados até agora: é isso que deixa uma correção voltar antes da
  // novidade seguinte e uma revisão que acabou de vencer entrar na frente.
  function upNext(justAnswered?: SessionItem) {
    return nextActivity({
      states: skills,
      entityOrder: newEntityOrderForSession,
      now: new Date(),
      ...(justAnswered ? { justAnswered } : {})
    });
  }

  function beginSession() {
    if (started) return;
    setStarted(true);
    present(upNext());
  }

  const entity = item ? entityById.get(item.entityId) : undefined;
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
      mulberry32(sessionSeed + presented * 2654435761)
    );
  }, [entity, presented, sessionSeed]);

  function continueAfterFeedback() {
    if (feedback?.next) {
      advanceTo(feedback.next);
      return;
    }
    present(upNext(item));
  }

  function elapsedSince(instant: number): number {
    return Math.max(0, Math.round(instant - startedAt.current));
  }

  async function persistAttempt(
    outcome: AttemptOutcome,
    exercise: ReviewAttempt["exercise"],
    firstInputMs: number | undefined,
    typedAnswer?: string
  ) {
    if (!item) return;
    setBusy(true);
    try {
      const storage = await import("@/storage");
      const skill = skillForStep(position.step);
      const current =
        stateById.get(skillStateId(item.entityId, skill)) ??
        createSkillState(item.entityId, skill);
      const attempt = newAttempt(
        item,
        position,
        outcome,
        exercise,
        {
          responseMs: elapsedSince(clockNow()),
          ...(firstInputMs === undefined ? {} : { firstInputMs })
        },
        typedAnswer
      );
      // O histórico dá o limiar pessoal de velocidade da nota; é o de antes
      // desta tentativa, como a própria pessoa o tinha quando respondeu. A
      // escolha do nome não move o FSRS, e o agendador a devolve intacta.
      const nextState = scheduleAttempt(current, attempt, settings, attempts);
      await storage.saveReview(nextState, attempt);
      setGraded({
        original: attempt,
        stateBefore: current,
        historyBefore: attempts,
        guessed: false
      });
      // A escolha do nome não move o FSRS, porque não é recuperação, e
      // contá-la poria no resumo duas respostas para uma bandeira só.
      if (exercise !== "flagToNameChoice") {
        setHistory((pips) => [
          ...pips,
          attempt.isImmediateCorrection
            ? amendedPipState(outcome)
            : pipStateFor(outcome)
        ]);
      }
      // A leitura nova é o que a próxima escolha de atividade consulta.
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Marca ou desmarca "Foi chute". Desmarcar existe porque o botão fica ao
   * lado de "Continuar", e um toque errado no celular não pode rebaixar a
   * nota sem volta.
   */
  async function toggleGuess() {
    if (!graded) return;
    const guessed = !graded.guessed;
    const attempt = guessed ? markedAsGuess(graded.original) : graded.original;
    setBusy(true);
    try {
      const storage = await import("@/storage");
      await storage.amendReview(
        scheduleAttempt(
          graded.stateBefore,
          attempt,
          settings,
          graded.historyBefore
        ),
        attempt
      );
      setGraded({ ...graded, guessed });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function answerChoice(chosenId: string) {
    if (!entity) return;
    const clickMs = elapsedSince(clockNow());
    setSelectedId(chosenId);
    const outcome: AttemptOutcome =
      chosenId === entity.id ? "correct" : "incorrect";
    const chosenName = entityById.get(chosenId)?.displayNamePtBr;
    await persistAttempt(
      outcome,
      step === "reverseChoice" ? "nameToFlagChoice" : "flagToNameChoice",
      // Na escolha, o clique é a própria resposta.
      clickMs,
      chosenName
    );
    setFeedback({
      outcome,
      answer: chosenName,
      chosenId,
      ...optionalNext(nextPosition(position, outcome))
    });
  }

  async function submitTyped(event: FormEvent) {
    event.preventDefault();
    if (!entity || !answer.trim()) return;
    const result = getNameResolver().classify(answer, entity.id);
    const outcome: AttemptOutcome =
      result.kind === "exact"
        ? "correct"
        : result.kind === "partial"
          ? "partial"
          : "incorrect";
    await persistAttempt(
      outcome,
      "flagToNameInput",
      firstInputAt.current === undefined
        ? undefined
        : elapsedSince(firstInputAt.current),
      answer.trim()
    );
    setFeedback({
      outcome,
      answer: answer.trim(),
      // Um nome digitado que é de outro país identifica a bandeira confundida,
      // e o feedback pode dizer a diferença entre as duas.
      ...(result.kind === "incorrect" && result.matchedEntityId
        ? { chosenId: result.matchedEntityId }
        : {}),
      ...optionalNext(nextPosition(position, outcome))
    });
  }

  /**
   * "Não sei" vai direto ao ensino, sem veredito: não há resposta a corrigir,
   * e uma tela dizendo que a pessoa não sabia seria só atrito.
   */
  async function answerDontKnow() {
    const clickMs = elapsedSince(clockNow());
    await persistAttempt("skipped", "flagToNameInput", clickMs);
    const next = nextPosition(position, "skipped");
    if (next) advanceTo(next);
    else present(upNext(item));
  }

  if (!started) {
    const firstUp = upNext();
    if (!firstUp) {
      return (
        <EmptyState
          icon={<Check size={54} aria-hidden="true" />}
          title="Tudo em dia por enquanto."
          description="As próximas revisões aparecerão quando estiverem vencidas."
          action={
            <Link
              href="/catalogo"
              className={buttonVariants({ variant: "secondary" })}
            >
              Abrir o álbum
            </Link>
          }
        />
      );
    }
    // A frase diz o que vem primeiro, lido da própria atividade escolhida, e
    // não a ordem da fila escrita em prosa, que mentiria quando uma correção
    // passa na frente ou quando as novidades do continente acabaram.
    const due = dueCount(skills);
    const opening =
      firstUp.reason === "due"
        ? due === 1
          ? "1 revisão vencida vem primeiro."
          : `${due} revisões vencidas vêm primeiro.`
        : firstUp.reason === "correction"
          ? "Primeiro, a correção de um erro recente."
          : `Primeiro, uma bandeira nova ${CONTINENT_OF_PT_BR[settings.activeContinent]}.`;
    return (
      <div className="mx-auto w-full max-w-narrow">
        <section className={sessionCard}>
          <h1 className="m-0 font-title leading-page font-bold tracking-page">
            Sua sessão está pronta.
          </h1>
          <p className="text-ink-soft">
            {opening} Pare quando quiser: cada resposta já fica guardada.
          </p>
          <Button className="mt-[18px]" type="button" onClick={beginSession}>
            Começar sessão <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </section>
      </div>
    );
  }

  if (finished || !item || !entity) {
    const countOf = (state: PipState) =>
      history.filter((value) => value === state).length;
    return (
      <SessionSummary
        eyebrow={
          finished === "ended" ? "Sessão encerrada" : "Tudo em dia por enquanto"
        }
        figure={countOf("correct")}
        figureLabel={`de ${history.length} na primeira tentativa`}
        pips={history}
        tallies={[
          { label: "Parciais", value: countOf("partial") },
          { label: "Corrigidos", value: countOf("amended") },
          { label: "Ainda a rever", value: countOf("missed") }
        ]}
        action={
          <Link href="/" className={buttonVariants()}>
            Voltar para Hoje <ArrowRight size={18} aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  if (!item || !entity) return null;

  return (
    <div className="mx-auto w-full max-w-narrow">
      <div className="grid gap-[18px]">
        {/* Em coluna única a barra empilha: lado a lado, os pips e o "Encerrar"
            não cabem numa Pixel 7. */}
        <div className="flex items-center justify-between gap-5 max-md:flex-col max-md:items-start">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-ink-soft">
              {history.length === 1
                ? "1 respondida nesta sessão"
                : `${history.length} respondidas nesta sessão`}
              {", "}
              {dueCount(skills) === 1
                ? "1 revisão vencida agora"
                : `${dueCount(skills)} revisões vencidas agora`}
            </p>
            <p className="m-0 font-bold">
              {xp.today} XP hoje, {xp.total} no total
            </p>
          </div>
          {/* Com respostas, encerrar mostra o resumo, que só existe aqui:
              a sessão não tem tamanho, e sair direto para a Hoje o perderia.
              Sem respostas não há o que resumir. */}
          {history.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFinished("ended")}
            >
              <Pause size={17} aria-hidden="true" /> Encerrar
            </Button>
          ) : (
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              <Pause size={17} aria-hidden="true" /> Encerrar
            </Link>
          )}
        </div>

        {/* Sem aria-live aqui. Ele desceu para o painel de veredito: com a
            grade permanecendo montada, uma região viva no cartão inteiro faria
            o leitor reler enunciado, bandeira e as quatro alternativas a cada
            passo. */}
        <section className={sessionCard}>
          {step === "teach" ? (
            <>
              {/* A sub-região entra só aqui, onde a bandeira já é mostrada com
                  o nome; numa pergunta ela seria uma dica. */}
              <Eyebrow>
                Bandeira nova, {SUBREGION[entity.subregion].labelPtBr}
              </Eyebrow>
              <h1 className="mt-1.5 mb-[22px] font-title text-prompt tracking-title">
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
              <p className="text-center text-ink-soft">
                Observe a composição antes de tentar recuperar o nome.
              </p>
              <div className="flex justify-end gap-2.5 max-md:flex-col max-md:items-stretch">
                <Button
                  type="button"
                  onClick={() => {
                    const next = nextPosition(position);
                    if (next) advanceTo(next);
                  }}
                >
                  Praticar <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : step === "forwardChoice" ? (
            <>
              <Eyebrow>Reconhecimento com apoio</Eyebrow>
              <h1 className="mt-1.5 mb-[22px] font-title text-prompt tracking-title">
                De onde é esta bandeira?
              </h1>
              <FlagImage
                entity={entity}
                // Respondida, a bandeira passa a ser nomeada: a resposta já
                // está na tela, e descrevê-la pelas cores seria esconder o
                // que acabou de ser revelado.
                alt={{ kind: feedback ? "named" : "unnamed" }}
                eager
                size="hero"
              />
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {choices.map((choice) => (
                  <OptionButton
                    key={choice.id}
                    layout="row"
                    state={optionState(choice.id)}
                    locked={busy || Boolean(feedback)}
                    onClick={() => void answerChoice(choice.id)}
                  >
                    {choice.displayNamePtBr}
                  </OptionButton>
                ))}
              </div>
            </>
          ) : step === "reverseChoice" ? (
            <>
              <Eyebrow>Associação inversa</Eyebrow>
              <h1 className="mt-1.5 mb-[22px] font-title text-prompt tracking-title">
                Qual é a bandeira de {entity.displayNamePtBr}?
              </h1>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
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
                    onClick={() => void answerChoice(choice.id)}
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
              <Eyebrow>
                {step === "firstContact"
                  ? "Bandeira nova"
                  : "Recordação sem pista"}
              </Eyebrow>
              <h1 className="mt-1.5 mb-[22px] font-title text-prompt tracking-title">
                {step === "firstContact"
                  ? "De onde é esta bandeira?"
                  : "Digite o nome desta entidade."}
              </h1>
              <FlagImage
                entity={entity}
                alt={{ kind: feedback ? "named" : "unnamed" }}
                eager
                size="hero"
              />
              {/* O formulário permanece montado depois de respondido, pelo
                  mesmo motivo da grade: o que a pessoa escreveu continua à
                  vista ao lado da correção. */}
              <form
                className="mx-auto grid max-w-copy gap-3"
                onSubmit={submitTyped}
              >
                <label htmlFor="study-answer" className="sr-only">
                  Nome da entidade
                </label>
                <input
                  id="study-answer"
                  className="h-[58px] w-full rounded-[13px] border-2 border-input bg-white px-4 py-[13px] text-lg text-ink"
                  value={answer}
                  onChange={(event) => {
                    if (
                      firstInputAt.current === undefined &&
                      event.target.value !== ""
                    ) {
                      firstInputAt.current = clockNow();
                    }
                    setAnswer(event.target.value);
                  }}
                  placeholder="Digite o nome em português"
                  autoComplete="off"
                  autoFocus
                  disabled={busy}
                  readOnly={Boolean(feedback)}
                />
                {!feedback && (
                  <>
                    <span className="text-sm text-ink-soft">
                      Acentos são opcionais; nomes ambíguos não são aceitos.
                      {step === "firstContact" &&
                        " Se não souber, a bandeira é apresentada com o nome."}
                    </span>
                    <div className="flex justify-end gap-2.5 max-md:flex-col max-md:items-stretch">
                      {step === "firstContact" && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void answerDontKnow()}
                        >
                          <HelpCircle size={18} aria-hidden="true" /> Não sei
                        </Button>
                      )}
                      <Button type="submit" disabled={!answer.trim() || busy}>
                        Responder{" "}
                        <CornerDownLeft size={18} aria-hidden="true" />
                      </Button>
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
                    ? graded?.original.isImmediateCorrection
                      ? "Acertou"
                      : "Acerto de primeira"
                    : feedback.outcome === "partial"
                      ? "Acerto parcial"
                      : "Vamos corrigir"
                }
                answer={entity.displayNamePtBr}
                submitted={
                  feedback.outcome === "correct" ? undefined : feedback.answer
                }
                explanation={verdictExplanation(
                  feedback.outcome,
                  entity,
                  feedback.chosenId
                    ? entityById.get(feedback.chosenId)
                    : undefined,
                  CURRICULUM[entity.continent]?.pairs ?? []
                )}
              />
              <div className="mt-[18px] flex justify-end gap-2.5 max-md:flex-col max-md:items-stretch">
                {/* Só depois de acerto em escolha: é o único caso em que o
                    acerto pode ter vindo da sorte, uma em quatro. */}
                {graded &&
                  feedback.outcome === "correct" &&
                  graded.original.exercise !== "flagToNameInput" && (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-pressed={graded.guessed}
                      disabled={busy}
                      onClick={() => void toggleGuess()}
                    >
                      {graded.guessed && <Check size={18} aria-hidden="true" />}
                      Foi chute
                    </Button>
                  )}
                <Button type="button" onClick={continueAfterFeedback}>
                  {continueLabel(feedback.next)}
                  <ArrowRight size={18} aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
