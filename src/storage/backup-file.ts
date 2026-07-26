"use client";

/**
 * Dispara o download de um backup como arquivo JSON.
 *
 * Estava duplicado em SettingsClient e em progress.ts — mesmo Blob, mesma
 * âncora, mesmo padrão de nome —, o que deixava dois lugares para manter em
 * sincronia a convenção do nome do arquivo.
 */
export function downloadBackupFile(json: string, now: Date = new Date()): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `brunanki-backup-${now.toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
