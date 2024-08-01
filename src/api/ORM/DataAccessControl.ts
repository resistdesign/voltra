export type DACConstraint = {
  id: string;
  allow: boolean;
  resourcePath: string;
  pathIsPrefix: boolean;
};

export type DACRole = {
  id: string;
  parentRoleIds: string[];
  constraints: DACConstraint[];
};
