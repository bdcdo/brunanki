import { describe, expect, it } from "vitest";
import {
  unMembership,
  UN_OBSERVER_ENTITY_IDS
} from "../../scripts/catalog-rules";
import { catalog, entities, entityById, flagByEntityId } from "./catalog";

/** Censo da ONU em 26/07/2026, o mesmo que `validate-catalog.ts` cobra. */
const UN_MEMBER_COUNT = 193;
const CATALOG_SIZE = UN_MEMBER_COUNT + UN_OBSERVER_ENTITY_IDS.length;

describe("flag catalog", () => {
  // A regra de pertencimento mora em `scripts/`, fora do alcance da cobertura
  // (`vitest.config.ts` inclui só `src/**`). Exercitá-la aqui, contra o
  // artefato commitado, é o que impede que ela fique sem teste por morar lá.
  it("contains exactly the UN members and permanent observers", () => {
    expect(entities).toHaveLength(CATALOG_SIZE);
    expect(entities.filter((e) => unMembership(e) === undefined)).toEqual([]);
    expect(
      entities.filter((e) => unMembership(e)?.status === "member")
    ).toHaveLength(UN_MEMBER_COUNT);
    expect(
      entities
        .filter((e) => unMembership(e)?.status === "observer")
        .map(({ id }) => id)
        .sort()
    ).toEqual([...UN_OBSERVER_ENTITY_IDS].sort());
  });

  it("indexes every entity and its local flag revision", () => {
    expect(entityById.size).toBe(CATALOG_SIZE);
    expect(flagByEntityId.size).toBe(CATALOG_SIZE);
    for (const entity of entities) {
      expect(entityById.get(entity.id)).toBe(entity);
      const flag = flagByEntityId.get(entity.id);
      expect(flag?.id).toBe(entity.primaryFlagRevisionId);
      expect(flag?.filePath).toMatch(/^\/flags\/.+\.(svg|png)$/);
      expect(flag?.commons.descriptionUrl).toMatch(
        /^https:\/\/commons\.wikimedia\.org\//
      );
    }
  });

  it("records the editorial decisions explicitly", () => {
    // O anverso do Paraguai é o único desvio de `side` que sobrou: as demais
    // exceções editoriais eram de entidades fora da ONU (o Ulster Banner da
    // Irlanda do Norte, a bandeira da República da China para Taiwan).
    expect(flagByEntityId.get("pry")?.side).toBe("obverse");
    expect(entityById.get("pry")?.editorialNote).toBeTruthy();

    expect(entityById.get("vat")?.sourceNames.un).toBe("Holy See");
    expect(entityById.get("vat")?.displayNamePtBr).toBe("Vaticano");
    expect(entityById.get("vat")?.aliasesPtBr).toContain("Santa Sé");
    expect(entityById.get("pse")?.displayNamePtBr).toBe("Palestina");
    expect(entityById.get("pse")?.sourceNames.un).toBe("State of Palestine");
  });

  it("carries no flag that is not the entity's own official one", () => {
    // Vale como invariante e não como lista porque um Estado reconhecido pela
    // ONU hasteia a própria bandeira oficial — não há mais entidade
    // territorial nem bandeira de uso corrente no catálogo.
    for (const flag of catalog.flagRevisions) {
      expect(flag.representationKind).toBe("national");
      expect(flag.officialStatus).toBe("official");
    }
  });

  it("keeps catalog relationships internally consistent", () => {
    expect(catalog.flagRevisions).toHaveLength(catalog.entities.length);
    expect(new Set(catalog.entities.map(({ id }) => id)).size).toBe(
      catalog.entities.length
    );
    expect(new Set(catalog.flagRevisions.map(({ id }) => id)).size).toBe(
      catalog.flagRevisions.length
    );
  });
});
