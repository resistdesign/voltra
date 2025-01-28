import { getDACRoleHasAccessToDataItem } from "./DACUtils";
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
  (roleId: string) => {
    console.log("\n\nCALLED GET ROLE BY ID", roleId, "\n\n");

    return {
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
    };
  },
  [],
];
