import {describe, expect, it} from "vitest";
import {
  catalog,
  entities,
  entityById,
  flagByEntityId,
} from "./catalog";

describe("flag catalog", () => {
  it("contains the intended UN/FIFA union", () => {
    expect(entities).toHaveLength(220);
    expect(
      entities.filter(({memberships}) =>
        memberships.some(
          ({organization, status}) =>
            organization === "UN" && status === "member",
        ),
      ),
    ).toHaveLength(193);
    expect(
      entities.filter(({memberships}) =>
        memberships.some(({organization}) => organization === "FIFA"),
      ),
    ).toHaveLength(211);
  });

  it("indexes every entity and its local flag revision", () => {
    expect(entityById.size).toBe(220);
    expect(flagByEntityId.size).toBe(220);
    for (const entity of entities) {
      expect(entityById.get(entity.id)).toBe(entity);
      const flag = flagByEntityId.get(entity.id);
      expect(flag?.id).toBe(entity.primaryFlagRevisionId);
      expect(flag?.filePath).toMatch(/^\/flags\/.+\.(svg|png)$/);
      expect(flag?.commons.descriptionUrl).toMatch(
        /^https:\/\/commons\.wikimedia\.org\//,
      );
    }
  });

  it("records the four editorial decisions explicitly", () => {
    const taiwan = entityById.get("twn");
    expect(taiwan?.displayNamePtBr).toBe("Taiwan");
    expect(taiwan?.aliasesPtBr).toContain("Chinese Taipei");
    expect(flagByEntityId.get("twn")?.commons.fileTitle).toBe(
      "File:Flag of the Republic of China.svg",
    );

    expect(
      flagByEntityId.get("northern-ireland")?.commons.fileTitle,
    ).toBe("File:Ulster Banner.svg");
    expect(flagByEntityId.get("northern-ireland")?.officialStatus).toBe(
      "commonly-used",
    );

    expect(flagByEntityId.get("pry")?.side).toBe("obverse");
    expect(entityById.get("vat")?.sourceNames.un).toBe("Holy See");
    expect(entityById.get("vat")?.displayNamePtBr).toBe("Vaticano");
    expect(entityById.get("pse")?.memberships).toContainEqual(
      expect.objectContaining({organization: "UN", status: "observer"}),
    );
  });

  it("keeps catalog relationships internally consistent", () => {
    expect(catalog.flagRevisions).toHaveLength(catalog.entities.length);
    expect(
      new Set(catalog.entities.map(({id}) => id)).size,
    ).toBe(catalog.entities.length);
    expect(
      new Set(catalog.flagRevisions.map(({id}) => id)).size,
    ).toBe(catalog.flagRevisions.length);
  });
});
