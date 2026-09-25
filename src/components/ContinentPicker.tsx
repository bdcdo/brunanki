"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { useApp } from "@/components/AppProvider";
import { isContinentAvailable } from "@/data/curriculum";
import { cn } from "@/lib/utils";
import {
  CONTINENT_IDS,
  CONTINENT_LABEL_PT_BR,
  type ContinentId
} from "@/types/geography";

/**
 * O continente em estudo, entre os cinco.
 *
 * Os que não têm currículo aparecem desabilitados, e não escondidos: o limite
 * do piloto fica à vista, e a pessoa sabe que eles existem e estão fechados.
 * "Fechado" vai escrito ao lado do cadeado, porque o cadeado sozinho seria a
 * única pista, e ícone não é texto para todo mundo.
 *
 * Trocar de continente muda só de onde vêm as bandeiras novas: as revisões
 * vencidas de outro continente continuam aparecendo.
 */
export function ContinentPicker() {
  const { state, refresh } = useApp();
  const [saving, setSaving] = useState(false);
  if (state.kind !== "ready") return null;
  const { settings } = state.snapshot;

  async function choose(continent: ContinentId) {
    if (continent === settings.activeContinent) return;
    setSaving(true);
    const storage = await import("@/storage");
    await storage.saveAppSettings({ ...settings, activeContinent: continent });
    await refresh();
    setSaving(false);
  }

  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={saving}>
      <legend className="mb-2 p-0 font-bold">Continente em estudo</legend>
      {CONTINENT_IDS.map((continent) => {
        const available = isContinentAvailable(continent);
        return (
          <label
            key={continent}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control border px-3.5",
              available
                ? "cursor-pointer border-input bg-surface"
                : "border-dashed border-input text-ink-soft"
            )}
          >
            <input
              type="radio"
              name="continent"
              value={continent}
              checked={settings.activeContinent === continent}
              disabled={!available}
              onChange={() => void choose(continent)}
              className="size-4 accent-[var(--brand)]"
            />
            <span className="flex-1">{CONTINENT_LABEL_PT_BR[continent]}</span>
            {!available && (
              <span className="flex items-center gap-1.5 text-sm">
                <Lock size={15} aria-hidden="true" /> fechado
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
