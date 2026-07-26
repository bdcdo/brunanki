import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { feedbackTone } from "@/components/ui/feedback-panel";
import { InkBubble } from "@/components/ui/ink-bubble";
import { amendedPipState, pipStateFor } from "@/components/ui/pips";

afterEach(cleanup);

describe("pipStateFor", () => {
  it("distingue acerto de acerto parcial", () => {
    expect(pipStateFor("correct")).toBe("correct");
    expect(pipStateFor("partial")).toBe("partial");
  });

  it("trata pulado como perdido", () => {
    // "Pular" só existe no diagnóstico, mas o tipo inclui o desfecho e o
    // compilador exige tratá-lo. Um item pulado é um item que não se sabe.
    expect(pipStateFor("incorrect")).toBe("missed");
    expect(pipStateFor("skipped")).toBe("missed");
  });
});

describe("amendedPipState", () => {
  it("marca como corrigido o que a repetição imediata recuperou", () => {
    expect(amendedPipState("correct")).toBe("amended");
    expect(amendedPipState("partial")).toBe("amended");
  });

  it("mantém perdido o que errou de novo", () => {
    // Sem isto, uma segunda tentativa fracassada apagaria o registro do erro:
    // a bolinha voltaria a parecer resolvida.
    expect(amendedPipState("incorrect")).toBe("missed");
    expect(amendedPipState("skipped")).toBe("missed");
  });
});

describe("feedbackTone", () => {
  it("colapsa erro e pulo no mesmo tom", () => {
    expect(feedbackTone("correct")).toBe("correct");
    expect(feedbackTone("partial")).toBe("partial");
    expect(feedbackTone("incorrect")).toBe("incorrect");
    expect(feedbackTone("skipped")).toBe("incorrect");
  });
});

describe("InkBubble", () => {
  it("não ocupa espaço quando não há nota", () => {
    // A nota existe em 4 das 220 entidades. Reservar altura deixaria 98% das
    // telas com um buraco, então a ausência precisa render nada.
    const { container } = render(<InkBubble />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a nota inteira, sem truncar", () => {
    // Truncar a nota que desfaz a ambiguidade institucional de uma entidade
    // anularia a razão de ela existir. A mais longa tem 183 caracteres.
    const nota =
      "A entidade aparece como Taiwan; Chinese Taipei é preservado como nome institucional da FIFA e alias aceito.";
    render(<InkBubble>{nota}</InkBubble>);
    expect(screen.getByText(nota)).toBeVisible();
  });
});
