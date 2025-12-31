import {
  getDACRoleHasAccessToDataItem,
  mergeDACDataItemResourceAccessResultMaps,
} from "./DACUtils";
import { OperationGroup } from "../../common/TypeInfoORM";
import { DACConstraintType } from "../DataAccessControl";

export const getDACRoleHasAccessToDataItemConditions: Parameters<
  typeof getDACRoleHasAccessToDataItem
> = [
  ["DEMO", "APP"],
  OperationGroup.ALL_OPERATIONS,
  "Contact",
  {
    id: "a38bc40e-052d-47e2-89c5-6a1e5593bc7f",
  },
  {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
  {
    id: "5fbf571d-ea6b-4008-b40f-706dfd430236",
    childRoleIds: ["ec14ac8f-6fda-458c-b2df-e431dced0947"],
    constraints: [],
  },
  async (roleId: string) => ({
    id: roleId,
    childRoleIds: [],
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "DEMO",
          "APP",
          OperationGroup.ALL_OPERATIONS,
          "Contact",
          "a38bc40e-052d-47e2-89c5-6a1e5593bc7f",
        ],
      },
    ],
  }),
  {},
];

export const mergeDACDataItemResourceAccessResultMapsConditions: Parameters<
  typeof mergeDACDataItemResourceAccessResultMaps
> = [
  {
    allowed: true,
    denied: false,
    fieldsResources: {
      id: {
        allowed: true,
        denied: false,
      },
      name: {
        allowed: true,
        denied: false,
      },
    },
  },
  {
    allowed: false,
    denied: true,
    fieldsResources: {
      dateOfBirth: {
        allowed: true,
        denied: false,
      },
    },
  },
];
