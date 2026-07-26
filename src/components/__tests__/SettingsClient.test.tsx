import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProvider } from "../AppProvider";
import { SettingsClient } from "../SettingsClient";

const { readLearningSnapshot, exportProgress, importProgress, resetAllData } =
  vi.hoisted(() => ({
    readLearningSnapshot: vi.fn(),
    exportProgress: vi.fn(),
    importProgress: vi.fn(),
    resetAllData: vi.fn()
  }));

vi.mock("@/storage", () => ({
  readLearningSnapshot,
  exportProgress,
  importProgress,
  resetAllData
}));

const downloadBackupFile = vi.hoisted(() => vi.fn());
vi.mock("@/storage/backup-file", () => ({ downloadBackupFile }));

/**
 * O jsdom não implementa File.prototype.text, que o SettingsClient usa para
 * ler o backup escolhido; no navegador ela existe.
 */
function backupFile(contents = "{}"): File {
  const file = new File([contents], "backup.json", {
    type: "application/json"
  });
  Object.defineProperty(file, "text", {
    value: async () => contents
  });
  return file;
}

function renderSettings() {
  readLearningSnapshot.mockResolvedValue({
    skills: [],
    attempts: [],
    settings: { desiredRetention: 0.9, timeZone: "America/Sao_Paulo" }
  });
  return render(
    <AppProvider>
      <SettingsClient />
    </AppProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SettingsClient", () => {
  it("permite reescolher o mesmo arquivo após uma restauração cancelada", async () => {
    // `false` é o retorno de importProgress quando a confirmação é recusada.
    importProgress.mockResolvedValue(false);
    const { container } = renderSettings();

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = backupFile();

    // fireEvent, e não userEvent.upload: o input é sr-only e o userEvent
    // recusa interagir com elementos que considera invisíveis.
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(importProgress).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Restauração cancelada"
    );

    // Sem o reset do valor do input, este segundo upload do mesmo arquivo não
    // dispararia `change` e nada aconteceria.
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(importProgress).toHaveBeenCalledTimes(2));
  });

  it("relata a falha quando o backup é incompatível", async () => {
    importProgress.mockRejectedValue(
      new Error("O backup referencia entidades que não existem")
    );
    const { container } = renderSettings();

    fireEvent.change(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      {
        target: { files: [backupFile()] }
      }
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Não foi possível restaurar: O backup referencia entidades que não existem"
      )
    );
  });

  it("baixa o backup ao exportar", async () => {
    const user = userEvent.setup();
    exportProgress.mockResolvedValue('{"format":"ptanki-export"}');
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Baixar backup/ }));

    await waitFor(() =>
      expect(downloadBackupFile).toHaveBeenCalledWith(
        '{"format":"ptanki-export"}'
      )
    );
  });
});
