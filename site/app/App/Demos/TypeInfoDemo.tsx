import { FC, useState } from "react";
import {
  TypeInfoApplication,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "../../../../src/app/components";
import { TypeOperation } from "../../../../src/common/TypeParsing/TypeInfo";
import { DEMO_TYPE_INFO_MAP } from "../../../common/Constants";

export const TypeInfoDemo: FC = () => {
  const [value, setValue] = useState<TypeInfoDataStructure>({
    Car: {
      CREATE: {},
      READ: {},
      UPDATE: {
        first_car: {
          id: "first_car",
          make: "Voxel",
          model: "Vibrant",
          year: "2100",
        },
      },
      DELETE: {},
    },
    Person: {
      CREATE: {},
      READ: {},
      UPDATE: {
        first_item: {
          id: "first_item",
          firstName: "Velma",
          lastName: "Vortex",
          age: 27,
          phoneNumber: "+1 (987) 654-3210",
          email: "velma.v@vexington.view",
          likesCheese: true,
          dietaryRestrictions: "Keto",
        },
      },
      DELETE: {},
    },
  });

  console.log("Structure:", value);

  return (
    <TypeInfoApplication
      typeInfoMap={DEMO_TYPE_INFO_MAP}
      baseTypeInfoName="Person"
      baseValue={value}
      onBaseValueChange={setValue}
      baseMode={TypeNavigationMode.FORM}
      baseOperation={TypeOperation.UPDATE}
      basePrimaryKeyValue="first_item"
    />
  );
};
