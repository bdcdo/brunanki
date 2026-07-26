"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { downloadBackupFile } from "@/storage/backup-file";
import { runtimeCatalog, entityById } from "@/data/runtime-catalog";

const importTarget = {
  catalogVersion: runtimeCatalog.version,
  knownEntityIds: new Set(entityById.keys())
};

export function SettingsClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useApp();
  const [status, setStatus] = useState("");

  async function handleExport() {
    const storage = await import("@/storage");
    downloadBackupFile(await storage.exportProgress(runtimeCatalog.version));
    setStatus("Backup baixado.");
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const storage = await import("@/storage");
    let restored: boolean;
    try {
      restored = await storage.importProgress(await file.text(), importTarget);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Não foi possível restaurar: ${error.message}`
          : "Não foi possível restaurar o backup."
      );
      return;
    }
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
    downloadBackupFile(await storage.exportProgress(runtimeCatalog.version));
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
              O arquivo será validado antes de substituir o progresso atual. Um
              backup do estado presente será baixado automaticamente.
            </p>
          </div>
          <div>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              // O input fica fora da tela e é acionado pelo botão ao lado, mas
              // continua no formulário: sem rótulo próprio, o leitor de tela o
              // anuncia como campo sem nome.
              aria-label="Arquivo de backup em JSON"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Zerar o valor antes de tratar o arquivo: sem isso, escolher
                // o mesmo arquivo de novo depois de cancelar a confirmação não
                // dispara `change`, e o botão parece morto.
                event.target.value = "";
                void handleImport(file);
              }}
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
              Apaga todos os dados locais depois de baixar uma cópia de
              segurança.
            </p>
          </div>
          <button
            className="button button-coral"
            type="button"
            onClick={handleReset}
          >
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
