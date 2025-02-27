import { FC, useState } from "react";
import {
  TypeInfoApplication,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "../../../../src/app/components";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../../src/common/TypeParsing/TypeInfo";
import { getTypeInfoMapFromTypeScript } from "../../../../src/common/TypeParsing";

const DEMO_TS = `
export type PersistableItem = {
  /**
  * @label ID
  * @primaryField
  * @hidden
  */
  readonly id?: string;
};

export type Car = PersistableItem & {
  /**
  * @label Make
  */
  make: string;
  /**
  * @label Model
  */
  model: string;
  /**
  * @label Year
  * @constraints.min 1900
  * @constraints.max 2022
  * @constraints.step 1
  */
  year: number;
};

export type Person = PersistableItem & {
  /**
  * @label First Name
  */
  firstName: string;
  /**
  * @label Last Name
  */
  lastName: string;
  /**
  * @label Age
  * @format number 
  * @constraints.defaultValue "18.0"
  * @constraints.step 0.5
  * @constraints.min 18.0
  * @constraints.max 150.0
  * @constraints.pattern \\d+
  */
  age: number;
  /**
  * @label Phone Number (+### (###) ###-####)
  * @format tel
  * @constraints.pattern ^\\+\\d+(-\\d+)? \\(\\d{3}\\) \\d{3}-\\d{4}$
  */
  phoneNumber: string;
  /**
  * @label Email
  * @format email
  */
  email: string;
  /**
  * @label Car
  */
  car: Car;
  /**
  * @label Likes Cheese
  * @constraints.defaultValue
  */
  readonly likesCheese: boolean;
  /**
  * @label Dietary Restrictions
  */
  dietaryRestrictions: "Vegan" | "Vegetarian" | "Pescatarian" | "Keto" | "Paleo" | "None";
};
`;
const DEMO_TYPE_INFO_MAP: TypeInfoMap = getTypeInfoMapFromTypeScript(DEMO_TS);

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
          car: {
            id: "first_car",
          },
          likesCheese: true,
          dietaryRestrictions: "Keto",
        },
      },
      DELETE: {},
    },
  });
  // const [relationshipInfo, setRelationshipInfo] = useState<ItemRelationshipInfoStructure>({});

  console.log("Structure:", value);

  return (
    <TypeInfoApplication
      typeInfoMap={DEMO_TYPE_INFO_MAP}
      typeInfoName="Person"
      value={value}
      onChange={setValue}
      mode={TypeNavigationMode.FORM}
      operation={TypeOperation.UPDATE}
      primaryKeyValue={"first_item"}
    />
  );
};
