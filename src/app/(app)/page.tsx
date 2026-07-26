"use client";

import { ArrowRight, Brain, CalendarClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AppReady } from "@/components/AppReady";
import { Meter } from "@/components/ui/meter";
import { entities } from "@/data/runtime-catalog";
import type { LearningSnapshot } from "@/types/learning";

export default function HomePage() {
  return (
    <AppReady loadingLabel="Carregando seu progresso.">
      {({ snapshot }) => <HomePageReady snapshot={snapshot} />}
    </AppReady>
  );
}

function HomePageReady({ snapshot }: { snapshot: LearningSnapshot }) {
  const { diagnostic, skills, attempts } = snapshot;
  const completedDiagnostic = Boolean(diagnostic?.completedAt);
  const diagnosed = diagnostic?.currentIndex ?? 0;
  const scheduled = skills.filter(
    (skill) => skill.phase === "scheduled"
  ).length;
  const acquiring = skills.filter(
    (skill) => skill.phase === "acquiring"
  ).length;
  const correct = attempts.filter(
    (attempt) => attempt.outcome === "correct"
  ).length;
  const accuracy =
    attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100);

  return (
    <div className="page">
      {!completedDiagnostic ? (
        <>
          <section className="relative mb-[34px] grid min-h-[430px] items-center overflow-hidden rounded-panel bg-ink p-[clamp(30px,5vw,62px)] text-on-ink shadow-panel max-md:min-h-0 max-md:px-6 max-md:py-[30px] lg:grid-cols-[1.1fr_0.9fr]">
            {/* Era `.hero::after`. Vira elemento porque um pseudo não se
                escreve em utilitário — e o `aria-hidden` explícito diz o que o
                `::after` só implicava. */}
            <span
              aria-hidden="true"
              className="absolute -right-[90px] -bottom-[130px] size-[380px] rounded-full border-[80px] border-highlight/14"
            />
            {/* Sem `z-index` aqui de propósito: o anel decorativo acima é
                posicionado e já pinta sobre conteúdo estático, e promover este
                bloco a camada própria troca o antialiasing subpixel do título
                por grayscale. */}
            <div>
              <span className="eyebrow text-highlight">
                {entities.length} bandeiras · um plano só seu
              </span>
              <h1 className="mt-3 mb-5 max-w-[700px] font-title text-hero font-bold tracking-[-0.045em] max-md:text-[45px]">
                Reconheça o mundo inteiro.
              </h1>
              <p className="mb-7 max-w-[580px] text-lg text-on-ink-soft">
                Descubra o que você já sabe, aprenda no seu ritmo e reveja cada
                bandeira antes de esquecer.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/diagnostico" className="button button-coral">
                  {diagnosed > 0
                    ? "Continuar diagnóstico"
                    : "Começar diagnóstico"}
                  <ArrowRight size={19} aria-hidden="true" />
                </Link>
                <Link href="/catalogo" className="button button-secondary">
                  Explorar bandeiras
                </Link>
              </div>
            </div>
            <div
              className="relative z-[1] grid min-h-[280px] place-items-center max-lg:hidden"
              aria-hidden="true"
            >
              <div className="relative h-[230px] w-[270px]">
                {/* As três são decorativas e não saem do catálogo: são
                    gradientes, não bandeiras de verdade. Por isso o bloco
                    inteiro é `aria-hidden` e as cores ficam literais. */}
                <span className="absolute top-1 left-2 h-32 w-[190px] -rotate-[11deg] rounded-2xl border-[9px] border-white bg-[linear-gradient(#009b3a_0_33%,#fedf00_33%_66%,#002776_66%)] shadow-float" />
                <span className="absolute top-[52px] right-0 h-32 w-[190px] rotate-[8deg] rounded-2xl border-[9px] border-white bg-[linear-gradient(90deg,#002395_0_33%,white_33%_66%,#ed2939_66%)] shadow-float" />
                <span className="absolute bottom-0 left-[30px] h-32 w-[190px] -rotate-2 rounded-2xl border-[9px] border-white bg-[linear-gradient(#000_0_33%,#dd0000_33%_66%,#ffce00_66%)] shadow-float" />
              </div>
            </div>
          </section>

          <div className="stats-grid" aria-label="O que você vai aprender">
            <article className="stat-card">
              <span>Entidades</span>
              <strong>{entities.length}</strong>
              <small className="muted">reconhecidas pela ONU</small>
            </article>
            <article className="stat-card">
              <span>Diagnóstico</span>
              <strong>{diagnosed}</strong>
              <small className="muted">já respondidas</small>
            </article>
            <article className="stat-card">
              <span>Tipos de prática</span>
              <strong>4</strong>
              <small className="muted">dificuldade crescente</small>
            </article>
            <article className="stat-card">
              <span>Conta necessária</span>
              <strong>Não</strong>
              <small className="muted">progresso local</small>
            </article>
          </div>

          {diagnostic && diagnosed > 0 && (
            <section
              className="card"
              aria-labelledby="diagnostic-progress-title"
            >
              <div className="section-heading">
                <h2 id="diagnostic-progress-title">Seu diagnóstico</h2>
                <Link href="/diagnostico">Retomar</Link>
              </div>
              <Meter
                value={diagnosed}
                max={entities.length}
                label="Bandeiras avaliadas"
              />
            </section>
          )}
        </>
      ) : (
        <>
          <header className="page-header">
            <div>
              <span className="eyebrow">Sua sessão</span>
              <h1>Hoje</h1>
              <p>
                Revisões vencidas primeiro. Novas bandeiras entram quando há
                espaço.
              </p>
            </div>
          </header>

          <section className="grid min-h-[200px] grid-cols-[1fr_auto] items-center gap-6 rounded-panel border border-highlight-edge bg-outcome-partial p-[30px] max-md:grid-cols-1">
            <div>
              <span className="eyebrow">Meta adaptativa</span>
              <h2 className="mt-[5px] mb-2 font-title text-4xl leading-body tracking-[-0.04em]">
                Pronto para reforçar a memória?
              </h2>
              <p className="mb-5 max-w-[600px] text-ink-soft">
                A sessão mistura recordação digitada e reconhecimento, com
                alternativas fáceis de confundir com a resposta certa.
              </p>
              <Link href="/estudar" className="button">
                Começar sessão <ArrowRight size={19} aria-hidden="true" />
              </Link>
            </div>
            <div
              className="grid size-[132px] place-items-center rounded-full border-[10px] border-highlight bg-surface text-center max-md:row-start-1 max-md:size-[110px]"
              aria-label={`${Math.max(5, acquiring)} exercícios previstos`}
            >
              <div>
                <strong className="block font-title text-5xl leading-[0.8]">
                  {Math.max(5, acquiring)}
                </strong>
                <span className="text-2xs leading-body">exercícios</span>
              </div>
            </div>
          </section>

          <div className="stats-grid mt-6">
            <article className="stat-card">
              <span>Em revisão</span>
              <strong>{scheduled}</strong>
            </article>
            <article className="stat-card">
              <span>Em aprendizagem</span>
              <strong>{acquiring}</strong>
            </article>
            <article className="stat-card">
              <span>Precisão geral</span>
              <strong>{accuracy}%</strong>
            </article>
            <article className="stat-card">
              <span>Bandeiras no atlas</span>
              <strong>{entities.length}</strong>
            </article>
          </div>
        </>
      )}

      <section className="mt-[34px]" aria-labelledby="method-title">
        <div className="section-heading">
          <h2 id="method-title">Como o Ptanki ensina</h2>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <Brain size={24} aria-hidden="true" />
            <strong className="text-xl leading-body">Tente antes de ver</strong>
            <span>Recuperar a resposta fortalece mais do que reler.</span>
          </article>
          <article className="stat-card">
            <CalendarClock size={24} aria-hidden="true" />
            <strong className="text-xl leading-body">
              Reveja na hora certa
            </strong>
            <span>O intervalo cresce conforme a lembrança se estabiliza.</span>
          </article>
          <article className="stat-card">
            <CheckCircle2 size={24} aria-hidden="true" />
            <strong className="text-xl leading-body">
              Avance com evidência
            </strong>
            <span>Digitar o nome faz parte do domínio, sem atalhos.</span>
          </article>
          <article className="stat-card">
            <ArrowRight size={24} aria-hidden="true" />
            <strong className="text-xl leading-body">
              Alternativas parecidas
            </strong>
            <span>As opções erradas são bandeiras fáceis de confundir.</span>
          </article>
        </div>
      </section>
    </div>
  );
}
