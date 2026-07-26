import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FlagImage } from "@/components/FlagImage";
import { entities, entityById, flagByEntityId } from "@/data/catalog";
// Server Component: consome o catálogo completo para procedência e licença, e
// o de runtime só para o que o FlagImage precisa.
import { entityById as runtimeEntityById } from "@/data/runtime-catalog";

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return entities.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params
}: DetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const entity = entityById.get(id);
  return { title: entity?.displayNamePtBr ?? "Bandeira" };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const entity = entityById.get(id);
  const flag = flagByEntityId.get(id);

  if (!entity || !flag) {
    notFound();
  }

  return (
    <div className="page page-narrow">
      <Link href="/catalogo" className="button button-ghost">
        <ArrowLeft size={18} aria-hidden="true" /> Voltar ao atlas
      </Link>
      <header className="page-header" style={{ marginTop: 20 }}>
        <div>
          <span className="eyebrow">{entity.region}</span>
          <h1>{entity.displayNamePtBr}</h1>
          {entity.editorialNote && <p>{entity.editorialNote}</p>}
        </div>
      </header>

      <div className="detail-grid">
        <FlagImage
          entity={runtimeEntityById.get(entity.id)!}
          alt={{ kind: "named" }}
          eager
          size="fill"
        />
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {entity.memberships.map((membership) => (
              <span
                className="pill"
                key={`${membership.organization}-${membership.status}`}
              >
                {membership.organization === "UN" ? "ONU" : "FIFA"}
                {membership.status === "observer" ? " · observador" : ""}
              </span>
            ))}
          </div>
          <dl className="detail-meta">
            <div>
              <dt>Nomes aceitos</dt>
              <dd>{entity.aliasesPtBr.join(", ") || entity.displayNamePtBr}</dd>
            </div>
            <div>
              <dt>Representação</dt>
              <dd>
                {flag.officialStatus === "official"
                  ? "Oficial"
                  : "Comumente utilizada"}
              </dd>
            </div>
            <div>
              <dt>Arquivo</dt>
              <dd>{flag.commons.fileTitle.replace("File:", "")}</dd>
            </div>
            <div>
              <dt>Licença</dt>
              <dd>{flag.license.shortName}</dd>
            </div>
          </dl>
          <a
            href={flag.commons.descriptionUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-secondary"
          >
            Ver no Wikimedia Commons
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
