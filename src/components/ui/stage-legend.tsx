import { cn } from "@/lib/utils";
import type { EntityStage } from "@/domain/mastery";

// Os três estados se separam pela forma, e não pela cor: cheia, meio cheia e
// só o contorno tracejado do espaço do álbum. Um verde claro para "em
// andamento" mediria pouco mais de 1:1 contra o branco e não diria nada.
const HALF_FILLED =
  "border-[1.5px] border-dashed border-input bg-[linear-gradient(to_top,var(--brand)_50%,transparent_50%)]";
export const STAGE_SHAPE: Record<EntityStage, string> = {
  mastered: "bg-brand",
  reviewing: HALF_FILLED,
  acquiring: HALF_FILLED,
  unseen: "border-[1.5px] border-dashed border-input"
};

export interface StageCounts {
  readonly mastered: number;
  readonly inProgress: number;
  readonly unseen: number;
}

export function countStages(stages: readonly EntityStage[]): StageCounts {
  const mastered = stages.filter((stage) => stage === "mastered").length;
  const unseen = stages.filter((stage) => stage === "unseen").length;
  return { mastered, unseen, inProgress: stages.length - mastered - unseen };
}

export function stageSummary({ mastered, inProgress, unseen }: StageCounts) {
  return `${mastered} ${mastered === 1 ? "colada" : "coladas"}, ${inProgress} em andamento, ${unseen} ${unseen === 1 ? "vazia" : "vazias"}`;
}

/**
 * A legenda dos três estados, com a contagem em texto: a forma sozinha seria
 * só forma. Uma só, para que a Hoje e o álbum desenhem o mesmo estado do
 * mesmo jeito.
 */
export function StageLegend({
  counts,
  className
}: {
  counts: StageCounts;
  className?: string;
}) {
  const { mastered, inProgress, unseen } = counts;
  return (
    <ul
      className={cn(
        "m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-base text-ink-soft",
        className
      )}
    >
      <li className="flex items-center gap-2">
        <span className={cn("h-4 w-5 rounded-[4px]", STAGE_SHAPE.mastered)} />
        {mastered} {mastered === 1 ? "colada" : "coladas"}
      </li>
      <li className="flex items-center gap-2">
        <span className={cn("h-4 w-5 rounded-[4px]", STAGE_SHAPE.acquiring)} />
        {inProgress} em andamento
      </li>
      <li className="flex items-center gap-2">
        <span className={cn("h-4 w-5 rounded-[4px]", STAGE_SHAPE.unseen)} />
        {unseen} {unseen === 1 ? "vazia" : "vazias"}
      </li>
    </ul>
  );
}
