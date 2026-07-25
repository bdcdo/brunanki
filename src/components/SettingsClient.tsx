"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { catalog } from "@/data/catalog";

function downloadJson(contents: string) {
  const blob = new Blob([contents], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ptanki-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {refresh} = useApp();
  const [status, setStatus] = useState("");

  async function handleExport() {
    const storage = await import("@/storage");
    downloadJson(await storage.exportProgress(catalog.version));
    setStatus("Backup baixado.");
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const storage = await import("@/storage");
    const restored = await storage.importProgress(await file.text(), catalog.version);
    if (!restored) {
      setStatus("Restauração cancelada. O progresso atual foi mantido.");
      return;
    }
    await refresh();
    setStatus("Backup restaurado. O estado anterior também foi baixado.");
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Apagar diagnóstico, revisões e histórico deste navegador? Um backup será baixado antes."
    );
    if (!confirmed) return;
    const storage = await import("@/storage");
    downloadJson(await storage.exportProgress(catalog.version));
    await storage.resetAllData();
    await refresh();
    setStatus("Progresso apagado. O backup foi baixado.");
  }

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <span className="eyebrow">Controle local</span>
          <h1>Ajustes</h1>
          <p>Seu histórico não sai deste navegador sem uma ação sua.</p>
        </div>
      </header>

      <div className="settings-stack">
        <section className="settings-card">
          <div>
            <h2>Exportar progresso</h2>
            <p>
              Baixe diagnóstico, revisões, preferências e histórico em um
              arquivo JSON versionado.
            </p>
          </div>
          <button className="button" type="button" onClick={handleExport}>
            <Download size={18} aria-hidden="true" /> Baixar backup
          </button>
        </section>

        <section className="settings-card">
          <div>
            <h2>Restaurar backup</h2>
            <p>
              O arquivo será validado antes de substituir o progresso atual.
              Um backup do estado presente será baixado automaticamente.
            </p>
          </div>
          <div>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={18} aria-hidden="true" /> Escolher arquivo
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div>
            <h2>Recomeçar</h2>
            <p>
              Apaga todos os dados locais depois de baixar uma cópia de segurança.
            </p>
          </div>
          <button className="button button-coral" type="button" onClick={handleReset}>
            <RotateCcw size={18} aria-hidden="true" /> Apagar progresso
          </button>
        </section>
      </div>
      <p role="status" aria-live="polite" className="muted">
        {status}
      </p>
    </div>
  );
}
