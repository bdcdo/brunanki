"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
      "Apagar revisões e histórico deste navegador? Um backup será baixado antes."
    );
    if (!confirmed) return;
    const storage = await import("@/storage");
    downloadBackupFile(await storage.exportProgress(runtimeCatalog.version));
    await storage.resetAllData();
    await refresh();
    setStatus("Progresso apagado. O backup foi baixado.");
  }

  return (
    <div className="mx-auto w-full max-w-narrow">
      <PageHeader
        eyebrow="Controle local"
        title="Ajustes"
        description="Seu histórico não sai deste navegador sem uma ação sua."
      />

      <div className="grid gap-[18px]">
        <section className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-card border border-line bg-surface p-6 max-md:grid-cols-1 max-md:items-stretch">
          <div>
            <h2 className="mt-0 mb-[5px] text-xl leading-body">
              Exportar progresso
            </h2>
            <p className="m-0 max-w-[640px] text-ink-soft">
              Baixe revisões, preferências e histórico em um arquivo JSON
              versionado.
            </p>
          </div>
          <Button type="button" onClick={handleExport}>
            <Download size={18} aria-hidden="true" /> Baixar backup
          </Button>
        </section>

        <section className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-card border border-line bg-surface p-6 max-md:grid-cols-1 max-md:items-stretch">
          <div>
            <h2 className="mt-0 mb-[5px] text-xl leading-body">
              Restaurar backup
            </h2>
            <p className="m-0 max-w-[640px] text-ink-soft">
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
            <Button
              variant="secondary"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={18} aria-hidden="true" /> Escolher arquivo
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-card border border-line bg-surface p-6 max-md:grid-cols-1 max-md:items-stretch">
          <div>
            <h2 className="mt-0 mb-[5px] text-xl leading-body">Recomeçar</h2>
            <p className="m-0 max-w-[640px] text-ink-soft">
              Apaga todos os dados locais depois de baixar uma cópia de
              segurança.
            </p>
          </div>
          {/* O único `destructive` do app: a cor de alerta fica no que não tem
              volta. */}
          <Button variant="destructive" type="button" onClick={handleReset}>
            <RotateCcw size={18} aria-hidden="true" /> Apagar progresso
          </Button>
        </section>
      </div>
      <p role="status" aria-live="polite" className="text-ink-soft">
        {status}
      </p>
    </div>
  );
}
