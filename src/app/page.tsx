"use client";

import { ArrowRight, Brain, CalendarClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { ProgressBar } from "@/components/ProgressBar";
import {
  LoadingScreen,
  StorageUnavailableScreen
} from "@/components/SystemScreens";
import { entities } from "@/data/catalog";

export default function HomePage() {
  const { state } = useApp();
  if (state.kind === "loading") {
    return <LoadingScreen label="Carregando seu progresso." />;
  }
  if (state.kind === "unavailable") {
    return <StorageUnavailableScreen error={state.error} />;
  }

  const { diagnostic, skills, attempts } = state.snapshot;
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
          <section className="hero">
            <div>
              <span className="eyebrow">220 bandeiras · um plano só seu</span>
              <h1>Reconheça o mundo inteiro.</h1>
              <p>
                Descubra o que você já sabe, aprenda no seu ritmo e reveja cada
                bandeira antes de esquecer.
              </p>
              <div className="hero-actions">
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
            <div className="hero-visual" aria-hidden="true">
              <div className="hero-stack">
                <span className="mini-flag" />
                <span className="mini-flag" />
                <span className="mini-flag" />
              </div>
            </div>
          </section>

          <div className="stats-grid" aria-label="O que você vai aprender">
            <article className="stat-card">
              <span>Entidades</span>
              <strong>220</strong>
              <small className="muted">ONU e FIFA</small>
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
              <ProgressBar
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

          <section className="daily-card">
            <div>
              <span className="eyebrow">Meta adaptativa</span>
              <h2>Pronto para reforçar a memória?</h2>
              <p>
                A sessão mistura recordação digitada e reconhecimento, com
                alternativas fáceis de confundir com a resposta certa.
              </p>
              <Link href="/estudar" className="button">
                Começar sessão <ArrowRight size={19} aria-hidden="true" />
              </Link>
            </div>
            <div
              className="daily-number"
              aria-label={`${Math.max(5, acquiring)} exercícios previstos`}
            >
              <div>
                <strong>{Math.max(5, acquiring)}</strong>
                <span>exercícios</span>
              </div>
            </div>
          </section>

          <div className="stats-grid" style={{ marginTop: 24 }}>
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

      <section style={{ marginTop: 34 }} aria-labelledby="method-title">
        <div className="section-heading">
          <h2 id="method-title">Como o Ptanki ensina</h2>
        </div>
        <div className="stats-grid">
          <article className="stat-card">
            <Brain size={24} aria-hidden="true" />
            <strong style={{ fontSize: 22 }}>Tente antes de ver</strong>
            <span>Recuperar a resposta fortalece mais do que reler.</span>
          </article>
          <article className="stat-card">
            <CalendarClock size={24} aria-hidden="true" />
            <strong style={{ fontSize: 22 }}>Reveja na hora certa</strong>
            <span>O intervalo cresce conforme a lembrança se estabiliza.</span>
          </article>
          <article className="stat-card">
            <CheckCircle2 size={24} aria-hidden="true" />
            <strong style={{ fontSize: 22 }}>Avance com evidência</strong>
            <span>Digitar o nome faz parte do domínio, sem atalhos.</span>
          </article>
          <article className="stat-card">
            <ArrowRight size={24} aria-hidden="true" />
            <strong style={{ fontSize: 22 }}>Alternativas parecidas</strong>
            <span>As opções erradas são bandeiras fáceis de confundir.</span>
          </article>
        </div>
      </section>
    </div>
  );
}
