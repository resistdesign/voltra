export enum DACResourceType {
  PREFIX = "PREFIX",
  SUFFIX = "SUFFIX",
  EQUALS = "EQUALS",
  CONTAINS = "CONTAINS",
}

export type DACConstraint = {
  id: string;
  allow: boolean;
  resource: string;
  type: DACResourceType;
};

export type DACContainer = {
  id: string;
  parentIds: string[];
  constraints: DACConstraint[];
};

export type DACUser = DACContainer;
