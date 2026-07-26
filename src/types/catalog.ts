import type { Region } from "@/types/region";

/**
 * Um único valor porque o catálogo tem um único critério de pertencimento.
 *
 * Havia também `"FIFA"`, de quando o recorte era a união ONU + associações da
 * FIFA. `Membership` continua sendo lista, e não um `unStatus` solto, porque é
 * essa a forma que sobrevive caso outro eixo volte a definir elegibilidade.
 */
export type Organization = "UN";
export type MembershipStatus = "member" | "observer";

export interface Membership {
  organization: Organization;
  status: MembershipStatus;
  sourceUrl: string;
  verifiedAt: string;
}

export interface LearningEntity {
  id: string;
  displayNamePtBr: string;
  aliasesPtBr: string[];
  sourceNames: {
    un?: string;
  };
  identifiers: {
    wikidataQid: `Q${number}`;
    isoAlpha2?: string;
    isoAlpha3?: string;
    unM49?: string;
  };
  region: Region;
  memberships: Membership[];
  primaryFlagRevisionId: string;
  editorialNote?: string;
}

export interface FlagRevision {
  id: string;
  entityId: string;
  representationKind: "national" | "territorial" | "commonly-used";
  officialStatus: "official" | "commonly-used" | "sporting";
  side: "obverse" | "reverse" | "same-both-sides";
  filePath: string;
  commons: {
    fileTitle: `File:${string}`;
    descriptionUrl: string;
    originalUrl: string;
    sha1: string;
    mime: "image/svg+xml" | "image/png";
    width: number;
    height: number;
  };
  license: {
    shortName: string;
    url?: string;
    artist?: string;
    credit?: string;
    attributionRequired: boolean;
  };
  reviewedAt: string;
}

export interface Catalog {
  version: string;
  verifiedAt: string;
  entities: LearningEntity[];
  flagRevisions: FlagRevision[];
}
