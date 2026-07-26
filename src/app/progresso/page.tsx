"use client";

import type { Card } from "ts-fsrs";
import { CheckCircle2, Clock3, Layers3, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ProgressBar } from "@/components/ProgressBar";
import { entities } from "@/data/catalog";

function stability(card?: Card) {
  return card?.stability ?? 0;
}

export default function ProgressPage() {
  const { skills, attempts } = useApp();
  const perEntity = new Map<string, typeof skills>();
  for (const skill of skills) {
    perEntity.set(skill.entityId, [
      ...(perEntity.get(skill.entityId) ?? []),
      skill
    ]);
  }

  const mastered = [...perEntity.values()].filter(
    (entitySkills) =>
      entitySkills.length === 2 &&
      entitySkills.every(
        (skill) =>
          skill.phase === "scheduled" &&
          skill.distinctSuccessDays.length >= 2 &&
          stability(skill.card) >= 30
      )
  ).length;
  const learning = [...perEntity.values()].filter((entitySkills) =>
    entitySkills.some((skill) => skill.phase === "acquiring")
  ).length;
  const reviewing = [...perEntity.values()].filter((entitySkills) =>
    entitySkills.some((skill) => skill.phase === "scheduled")
  ).length;
  const firstTry = attempts.filter(
    (attempt) => attempt.outcome === "correct"
  ).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Evidência, não sequência</span>
          <h1>Progresso</h1>
          <p>
            Domínio exige recordar o nome e reconhecer a bandeira em dias
            diferentes, com estabilidade de pelo menos 30 dias.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <article className="stat-card">
          <CheckCircle2 size={23} aria-hidden="true" />
          <span>Dominadas</span>
          <strong>{mastered}</strong>
        </article>
        <article className="stat-card">
          <Clock3 size={23} aria-hidden="true" />
          <span>Em revisão</span>
          <strong>{reviewing}</strong>
        </article>
        <article className="stat-card">
          <Layers3 size={23} aria-hidden="true" />
          <span>Em aprendizagem</span>
          <strong>{learning}</strong>
        </article>
        <article className="stat-card">
          <Sparkles size={23} aria-hidden="true" />
          <span>Acertos de primeira</span>
          <strong>{firstTry}</strong>
        </article>
      </div>

      <section className="card">
        <div className="section-heading">
          <h2>Atlas dominado</h2>
          <span className="pill">
            {Math.round((mastered / entities.length) * 100)}%
          </span>
        </div>
        <ProgressBar
          value={mastered}
          max={entities.length}
          label="Entidades dominadas"
        />
      </section>

      <section className="two-column" style={{ marginTop: 18 }}>
        <article className="card">
          <span className="eyebrow">Como ler</span>
          <h2>Uma bandeira passa por três estados</h2>
          <p className="muted">
            Nova quando ainda não foi apresentada; em aprendizagem enquanto
            precisa de apoio; em revisão quando já pode ser recuperada sem
            pista. “Dominada” é um marco dentro da revisão, nunca o fim das
            práticas.
          </p>
        </article>
        <article className="card">
          <span className="eyebrow">Histórico local</span>
          <h2>{attempts.length} tentativas</h2>
          <p className="muted">
            O histórico fica neste navegador. Faça um backup em Ajustes para
            levá-lo a outro dispositivo.
          </p>
        </article>
      </section>
    </div>
  );
}
