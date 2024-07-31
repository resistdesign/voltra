export type DACConstraint = {
  id: string;
};

export type DACRole = {
  id: string;
  constraints: DACConstraint[];
};

export type DACUser = {
  id: string;
  roles: DACRole[];
  constraints: DACConstraint[];
};
