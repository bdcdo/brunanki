import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { entities, flagByEntityId } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Fontes e créditos"
};

export default function CreditsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Transparência editorial</span>
          <h1>Fontes e créditos</h1>
          <p>
            A ONU define quem entra no atlas. Wikidata ajuda a localizar os
            arquivos, e cada imagem preserva a referência ao Wikimedia Commons.
          </p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Fontes institucionais</h2>
        <p>
          O catálogo reúne os 193 Estados-membros da ONU e os dois observadores
          permanentes não membros: a Santa Sé e a Palestina.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <a
            className="button button-secondary"
            href="https://www.un.org/en/about-us/member-states"
            target="_blank"
            rel="noreferrer"
          >
            Membros da ONU <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a
            className="button button-secondary"
            href="https://www.un.org/en/about-us/non-member-states"
            target="_blank"
            rel="noreferrer"
          >
            Observadores da ONU <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Método de aprendizagem</h2>
        <p>
          A progressão adapta ao domínio de fatos os princípios de recuperação
          ativa, feedback imediato, prática intercalada e revisão espaçada
          apresentados pelo Math Academy. Bandeiras são itens em grande parte
          independentes; por isso o Ptanki não presume um grafo de
          pré-requisitos geográficos.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <a
            className="button button-secondary"
            href="https://www.justinmath.com/files/the-math-academy-way.pdf"
            target="_blank"
            rel="noreferrer"
          >
            The Math Academy Way <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a
            className="button button-secondary"
            href="https://mathacademy.com/pedagogy"
            target="_blank"
            rel="noreferrer"
          >
            Pedagogia do Math Academy{" "}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Arquivos de bandeira</h2>
          <span className="pill">{entities.length} imagens</span>
        </div>
        <p className="muted">
          As licenças abaixo pertencem a cada arquivo. Bandeiras podem estar em
          domínio público e ainda sujeitas a regras locais de uso de símbolos.
        </p>
        <div className="credits-list">
          {entities.map((entity) => {
            const flag = flagByEntityId.get(entity.id);
            if (!flag) return null;
            return (
              <div className="credit-row" key={entity.id}>
                <strong>{entity.displayNamePtBr}</strong>
                <span>{flag.commons.fileTitle.replace("File:", "")}</span>
                <a
                  href={flag.commons.descriptionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {flag.license.shortName}{" "}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
