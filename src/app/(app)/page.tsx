"use client";

import { ArrowRight, Brain, CalendarClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AppReady } from "@/components/AppReady";
import { buttonVariants } from "@/components/ui/button";
import { CardHeader, CardTitle, cardVariants } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Meter } from "@/components/ui/meter";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { entities } from "@/data/runtime-catalog";
import type { LearningSnapshot } from "@/types/learning";

const METHOD = [
  {
    icon: Brain,
    claim: "Tente antes de ver",
    detail: "Recuperar a resposta fortalece mais do que reler."
  },
  {
    icon: CalendarClock,
    claim: "Reveja na hora certa",
    detail: "O intervalo cresce conforme a lembrança se estabiliza."
  },
  {
    icon: CheckCircle2,
    claim: "Avance com evidência",
    detail: "Digitar o nome faz parte do domínio, sem atalhos."
  },
  {
    icon: ArrowRight,
    claim: "Alternativas parecidas",
    detail: "As opções erradas são bandeiras fáceis de confundir."
  }
];

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
    <div className="mx-auto w-full max-w-page">
      {!completedDiagnostic ? (
        <>
          <section className="relative mb-[34px] grid min-h-[430px] items-center overflow-hidden on-ink rounded-panel bg-ink p-[clamp(30px,5vw,62px)] text-on-ink shadow-panel max-md:min-h-0 max-md:px-6 max-md:py-[30px] lg:grid-cols-[1.1fr_0.9fr]">
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
              <Eyebrow className="text-highlight">
                {entities.length} bandeiras · um plano só seu
              </Eyebrow>
              <h1 className="mt-3 mb-5 max-w-[700px] font-title text-hero font-bold tracking-title max-md:text-[45px]">
                Reconheça o mundo inteiro.
              </h1>
              <p className="mb-7 max-w-[580px] text-lg text-on-ink-soft">
                Descubra o que você já sabe, aprenda no seu ritmo e reveja cada
                bandeira antes de esquecer.
              </p>
              <div className="flex flex-wrap gap-3">
                {/* `highlight` porque o painel é de tinta, e o `default`, que
                    também é tinta, sumiria contra ele. A cor de alerta fica
                    no que não tem volta: hoje, só "Apagar progresso". */}
                <Link
                  href="/diagnostico"
                  className={buttonVariants({ variant: "highlight" })}
                >
                  {diagnosed > 0
                    ? "Continuar diagnóstico"
                    : "Começar diagnóstico"}
                  <ArrowRight size={19} aria-hidden="true" />
                </Link>
                <Link
                  href="/catalogo"
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Abrir o álbum
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

          <div
            className="mb-[34px] grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-md:grid-cols-1"
            aria-label="O que você vai aprender"
          >
            <StatCard
              label="Entidades"
              value={entities.length}
              note="reconhecidas pela ONU"
            />
            <StatCard
              label="Diagnóstico"
              value={diagnosed}
              note="já respondidas"
            />
            <StatCard
              label="Tipos de prática"
              value={4}
              note="dificuldade crescente"
            />
            <StatCard
              label="Conta necessária"
              value="Não"
              note="progresso local"
            />
          </div>

          {diagnostic && diagnosed > 0 && (
            <section
              className={cardVariants()}
              aria-labelledby="diagnostic-progress-title"
            >
              <CardHeader>
                <CardTitle id="diagnostic-progress-title">
                  Seu diagnóstico
                </CardTitle>
                <Link href="/diagnostico" className="font-bold text-brand-deep">
                  Retomar
                </Link>
              </CardHeader>
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
          <PageHeader
            eyebrow="Sua sessão"
            title="Hoje"
            description="Revisões vencidas primeiro. Novas bandeiras entram quando há espaço."
          />

          <section className="grid min-h-[200px] grid-cols-[1fr_auto] items-center gap-6 rounded-panel border border-highlight-edge bg-outcome-partial p-[30px] max-md:grid-cols-1">
            <div>
              <Eyebrow>Meta adaptativa</Eyebrow>
              <h2 className="mt-[5px] mb-2 font-title text-4xl leading-body tracking-title">
                Pronto para reforçar a memória?
              </h2>
              <p className="mb-5 max-w-[600px] text-ink-soft">
                A sessão mistura recordação digitada e reconhecimento, com
                alternativas fáceis de confundir com a resposta certa.
              </p>
              <Link href="/estudar" className={buttonVariants()}>
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

          <div className="mt-6 mb-[34px] grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-md:grid-cols-1">
            <StatCard label="Em revisão" value={scheduled} />
            <StatCard label="Em aprendizagem" value={acquiring} />
            <StatCard label="Precisão geral" value={`${accuracy}%`} />
            <StatCard label="Bandeiras no atlas" value={entities.length} />
          </div>
        </>
      )}

      <section className="mt-[34px]" aria-labelledby="method-title">
        <CardHeader>
          <CardTitle id="method-title">Como o Brunanki ensina</CardTitle>
        </CardHeader>
        {/* Não são `StatCard`: aqui o cartão não tem número, e a ordem é
            ícone → afirmação → explicação, não rótulo → valor → nota. Mesma
            moldura, papéis diferentes. */}
        <div className="mb-[34px] grid grid-cols-4 gap-[15px] max-lg:grid-cols-2 max-md:grid-cols-1">
          {METHOD.map(({ icon: Icon, claim, detail }) => (
            <article key={claim} className={cardVariants({ padding: "sm" })}>
              <Icon size={24} aria-hidden="true" />
              <strong className="mt-1 block font-title text-xl leading-body tracking-title">
                {claim}
              </strong>
              <span className="text-sm text-ink-soft">{detail}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
