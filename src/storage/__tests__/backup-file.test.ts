import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadBackupFile } from "../backup-file";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadBackupFile", () => {
  it("nomeia o arquivo com a data e libera a URL temporária", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const anchor = document.createElement("a");
    const click = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadBackupFile(
      '{"format":"brunanki-export"}',
      new Date("2026-07-26T10:00:00Z")
    );

    expect(anchor.download).toBe("brunanki-backup-2026-07-26.json");
    expect(anchor.href).toContain("blob:fake");
    expect(click).toHaveBeenCalledOnce();
    // Sem o revoke, cada backup baixado vazaria um Blob na memória da aba.
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    vi.unstubAllGlobals();
  });
});
