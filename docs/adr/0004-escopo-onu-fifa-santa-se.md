# ADR-0004 — Escopo da coleção: ONU, FIFA e a Santa Sé

**Estado:** aceita
**Data:** 2026-07-26

## Contexto

"Todas as bandeiras do mundo" não é um recorte: é uma discussão. Quantos países existem depende de quem responde, e qualquer linha traçada desagrada alguém. A spec exige que a lista seja editorialmente definida, versionada e documentada, e que a interface não apresente decisão editorial controversa como verdade incontestável.

O produto precisa de um critério que seja ao mesmo tempo defensável, verificável e legível para quem estuda.

## Decisão

A coleção é a união dos 193 Estados-membros da ONU, das 211 associações da FIFA e da Santa Sé — 220 entidades, número fixado como invariante no pipeline e reverificado na validação.

O critério é **filiação institucional declarada**, não soberania. As regras completas, as fontes e os casos particulares estão em [`CONTENT-FLAGS.md`](../CONTENT-FLAGS.md).

## Alternativas descartadas

**Somente os 193 membros da ONU.** É o recorte mais defensável do ponto de vista de direito internacional e o mais fácil de explicar. Descartado por ser pedagogicamente pobre: deixaria de fora Inglaterra, Escócia, País de Gales e Irlanda do Norte — bandeiras que qualquer pessoa reconhece e espera encontrar — além de Taiwan, e do próprio Vaticano.

**A norma ISO 3166.** Cobertura ampla e fonte única. Descartado porque inclui territórios sem bandeira distinta e sem existência reconhecível para quem estuda, engordando a coleção com itens que ninguém quer conquistar e diluindo a sensação de completude, que é o produto.

**Curadoria puramente própria** — uma lista escolhida a dedo. Descartada por não ser auditável: sem critério externo, cada inclusão e cada exclusão vira opinião do autor, e não há como responder a quem discordar senão com gosto pessoal.

## Consequências

Entidades não soberanas convivem com Estados na mesma coleção, e a interface não pode fingir que a lista é de países. A FIFA é a razão de estarem ali, e isso é dizível.

Casos que exigiram decisão explícita — Taiwan e Chinese Taipei, o Ulster Banner da Irlanda do Norte, a Santa Sé, o anverso do Paraguai — estão registrados no dado, fixados em teste e conferidos pela validação, e três deles aparecem como nota editorial na tela de ensino. Trocá-los por acidente de pipeline é impossível: só por edição deliberada do teste e do validador.

A união depende de duas fontes que mudam por motivos alheios ao projeto. Uma associação admitida ou suspensa pela FIFA altera a coleção, e as invariantes de cardinalidade farão a validação falhar — o que é o comportamento desejado, porque força uma decisão editorial consciente em vez de um número que se move sozinho.

Uma consequência técnica em aberto: a distinção entre membro e observador existe no catálogo completo e **não sobrevive à projeção para o navegador**. Vaticano e Palestina chegam à interface apenas como "ONU". Enquanto for assim, a interface não pode afirmar nada sobre estatuto de filiação.
