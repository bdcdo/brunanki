export type Organization = "UN" | "FIFA";
export type MembershipStatus = "member" | "observer";
export type Confederation =
  | "AFC"
  | "CAF"
  | "CONCACAF"
  | "CONMEBOL"
  | "OFC"
  | "UEFA";

export interface Membership {
  organization: Organization;
  status: MembershipStatus;
  confederation?: Confederation;
  sourceUrl: string;
  verifiedAt: string;
}

export interface LearningEntity {
  id: string;
  displayNamePtBr: string;
  aliasesPtBr: string[];
  sourceNames: {
    un?: string;
    fifa?: string;
  };
  identifiers: {
    wikidataQid: `Q${number}`;
    fifaCode?: string;
    isoAlpha2?: string;
    isoAlpha3?: string;
    unM49?: string;
  };
  region: string;
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
