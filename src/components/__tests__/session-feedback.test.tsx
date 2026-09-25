import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { feedbackTone } from "@/components/ui/feedback-panel";
import { InkBubble } from "@/components/ui/ink-bubble";
import { amendedPipState, pipStateFor } from "@/components/ui/pips";
import { entities } from "@/data/runtime-catalog";

afterEach(cleanup);

describe("pipStateFor", () => {
  it("distingue acerto de acerto parcial", () => {
    expect(pipStateFor("correct")).toBe("correct");
    expect(pipStateFor("partial")).toBe("partial");
  });

  it("trata pulado como perdido", () => {
    // Nenhum exercício atual produz "pulado", mas o tipo o inclui e o
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
    // A nota existe em uma fração mínima das entidades. Reservar altura
    // deixaria quase toda tela com um buraco, então a ausência precisa
    // render nada.
    const { container } = render(<InkBubble />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a nota inteira, sem truncar", () => {
    // A nota vem do catálogo, e não colada aqui: a versão anterior deste teste
    // fixava a de Taiwan e um comentário sobre a da Irlanda do Norte, e as
    // duas entidades saíram do catálogo sem que o teste acusasse — ele
    // continuou verde asserindo sobre texto que não existe mais. Ler a mais
    // longa é o pior caso real, seja ela qual for.
    const nota = entities
      .map(({ editorialNote }) => editorialNote)
      .filter((note) => note !== undefined)
      .reduce((longest, note) =>
        note.length > longest.length ? note : longest
      );
    expect(nota.length).toBeGreaterThan(40);

    render(<InkBubble>{nota}</InkBubble>);
    expect(screen.getByText(nota)).toBeVisible();
  });
});
