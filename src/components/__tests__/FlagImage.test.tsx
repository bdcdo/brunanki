import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { RuntimeEntity } from "@/types/runtime-catalog";

import { FlagImage } from "../FlagImage";

const irlanda: RuntimeEntity = {
  id: "irl",
  displayNamePtBr: "Irlanda",
  aliasesPtBr: [],
  region: "Europa",
  organizations: ["UN"],
  flagPath: "/flags/irl.svg",
  palette: ["laranja", "verde", "branco"]
};

const costaDoMarfim: RuntimeEntity = {
  ...irlanda,
  id: "civ",
  displayNamePtBr: "Costa do Marfim",
  flagPath: "/flags/civ.svg"
};

afterEach(cleanup);

describe("FlagImage", () => {
  it("nomeia a entidade quando ela já está revelada", () => {
    render(<FlagImage entity={irlanda} alt={{ kind: "named" }} />);
    expect(
      screen.getByRole("img", { name: "Bandeira de Irlanda" })
    ).toBeVisible();
  });

  it("descreve pelas cores sem entregar a resposta", () => {
    render(<FlagImage entity={irlanda} alt={{ kind: "unnamed" }} />);
    const image = screen.getByRole("img", {
      name: "Bandeira com laranja, verde e branco"
    });
    expect(image).toBeVisible();
    expect(image.getAttribute("alt")).not.toContain("Irlanda");
  });

  it("some da árvore de acessibilidade quando é decorativa", () => {
    // Usada dentro de um botão que já carrega o rótulo; anunciar de novo
    // duplicaria a informação.
    render(<FlagImage entity={irlanda} alt={{ kind: "decorative" }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("dá a mesma descrição a bandeiras de paleta idêntica", () => {
    // Irlanda e Costa do Marfim são a mesma bandeira em ordem invertida: é
    // por isso que o ordinal precisa permanecer no rótulo do botão.
    render(
      <>
        <FlagImage entity={irlanda} alt={{ kind: "unnamed" }} />
        <FlagImage entity={costaDoMarfim} alt={{ kind: "unnamed" }} />
      </>
    );
    expect(
      screen.getAllByRole("img", {
        name: "Bandeira com laranja, verde e branco"
      })
    ).toHaveLength(2);
  });
});
