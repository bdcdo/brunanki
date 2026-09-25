import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FlagImage } from "@/components/FlagImage";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { entities, entityById, flagByEntityId } from "@/data/catalog";
// Server Component: consome o catálogo completo para procedência e licença, e
// o de runtime para o que o FlagImage precisa e para a geografia, que só
// existe lá porque vem do snapshot M49 na projeção.
import { entityById as runtimeEntityById } from "@/data/runtime-catalog";
import { CONTINENT_LABEL_PT_BR, SUBREGION } from "@/types/geography";

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
  const runtimeEntity = runtimeEntityById.get(id);

  if (!entity || !flag || !runtimeEntity) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-narrow">
      <Link href="/catalogo" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar ao álbum
      </Link>
      <PageHeader
        className="mt-5"
        eyebrow={`${SUBREGION[runtimeEntity.subregion].labelPtBr}, ${CONTINENT_LABEL_PT_BR[runtimeEntity.continent]}`}
        title={entity.displayNamePtBr}
        description={entity.editorialNote}
      />

      <div className="grid grid-cols-[minmax(300px,1fr)_1fr] gap-[34px] max-md:grid-cols-1">
        <FlagImage
          entity={runtimeEntity}
          alt={{ kind: "named" }}
          eager
          size="fill"
        />
        <div>
          <div className="flex flex-wrap gap-2">
            {entity.memberships.map((membership) => (
              <span
                className="inline-flex min-h-7 items-center gap-[5px] rounded-full border border-line bg-surface px-2.5 py-1 text-xs leading-body font-bold text-ink-soft"
                key={`${membership.organization}-${membership.status}`}
              >
                ONU{membership.status === "observer" ? " · observador" : ""}
              </span>
            ))}
          </div>
          <dl className="m-0 grid gap-0">
            <div className="border-b border-line py-[14px]">
              <dt className="text-sm leading-body font-bold text-ink-soft">
                Nomes aceitos
              </dt>
              <dd className="mt-1 mb-0 font-bold">
                {entity.aliasesPtBr.join(", ") || entity.displayNamePtBr}
              </dd>
            </div>
            <div className="border-b border-line py-[14px]">
              <dt className="text-sm leading-body font-bold text-ink-soft">
                Representação
              </dt>
              <dd className="mt-1 mb-0 font-bold">
                {flag.officialStatus === "official"
                  ? "Oficial"
                  : "Comumente utilizada"}
              </dd>
            </div>
            <div className="border-b border-line py-[14px]">
              <dt className="text-sm leading-body font-bold text-ink-soft">
                Arquivo
              </dt>
              <dd className="mt-1 mb-0 font-bold">
                {flag.commons.fileTitle.replace("File:", "")}
              </dd>
            </div>
            <div className="border-b border-line py-[14px]">
              <dt className="text-sm leading-body font-bold text-ink-soft">
                Licença
              </dt>
              <dd className="mt-1 mb-0 font-bold">{flag.license.shortName}</dd>
            </div>
          </dl>
          <a
            href={flag.commons.descriptionUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary" })}
          >
            Ver no Wikimedia Commons
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
