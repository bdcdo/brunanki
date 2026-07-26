import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { RuntimeEntity } from "@/types/runtime-catalog";

import { FlagImage } from "../FlagImage";

const irlanda: RuntimeEntity = {
  id: "irl",
  displayNamePtBr: "Irlanda",
  aliasesPtBr: [],
  region: "Europa",
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
    render(<FlagImage entity={irlanda} alt={{ kind: "named" }} size="fill" />);
    expect(
      screen.getByRole("img", { name: "Bandeira de Irlanda" })
    ).toBeVisible();
  });

  it("descreve pelas cores sem entregar a resposta", () => {
    render(
      <FlagImage entity={irlanda} alt={{ kind: "unnamed" }} size="fill" />
    );
    const image = screen.getByRole("img", {
      name: "Bandeira com laranja, verde e branco"
    });
    expect(image).toBeVisible();
    expect(image.getAttribute("alt")).not.toContain("Irlanda");
  });

  it("some da árvore de acessibilidade quando é decorativa", () => {
    // Usada dentro de um botão que já carrega o rótulo; anunciar de novo
    // duplicaria a informação.
    render(
      <FlagImage entity={irlanda} alt={{ kind: "decorative" }} size="fill" />
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("preserva o quadro em todos os tamanhos", () => {
    // O quadro é o que dá altura à imagem: ela é `position: absolute`, então
    // sem ele não sobra filho em fluxo e a caixa desaba para os 2px da borda.
    // Foi assim que as três bandeiras da abertura do diagnóstico sumiram. Um
    // tamanho que substituísse a classe em vez de somar a ela traria o defeito
    // de volta, agora em três lugares.
    for (const size of ["hero", "card", "fill"] as const) {
      const { container } = render(
        <FlagImage entity={irlanda} alt={{ kind: "decorative" }} size={size} />
      );
      expect(container.querySelector("span")).toHaveClass("flag-frame");
      cleanup();
    }
  });

  it("dá a mesma descrição a bandeiras de paleta idêntica", () => {
    // Irlanda e Costa do Marfim são a mesma bandeira em ordem invertida: é
    // por isso que o ordinal precisa permanecer no rótulo do botão.
    render(
      <>
        <FlagImage entity={irlanda} alt={{ kind: "unnamed" }} size="fill" />
        <FlagImage
          entity={costaDoMarfim}
          alt={{ kind: "unnamed" }}
          size="fill"
        />
      </>
    );
    expect(
      screen.getAllByRole("img", {
        name: "Bandeira com laranja, verde e branco"
      })
    ).toHaveLength(2);
  });
});
