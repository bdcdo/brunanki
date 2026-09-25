import type { Metadata } from "next";
import { StudySession } from "@/components/StudySession";

export const metadata: Metadata = {
  title: "Estudar"
};

/**
 * `?nova=<id>` é a bandeira que a pessoa puxou do álbum para estudar agora.
 * Chega como texto qualquer, e quem decide se vale é `introductionOrder`: ID
 * fora do continente ativo é ignorado.
 */
export default async function StudyPage({
  searchParams
}: {
  searchParams: Promise<{ nova?: string | string[] }>;
}) {
  const { nova } = await searchParams;
  return (
    <StudySession
      priorityEntityId={typeof nova === "string" ? nova : undefined}
    />
  );
}
