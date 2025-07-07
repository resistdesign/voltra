import { FC, useState } from "react";
import {
  TypeInfoApplication,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "../../../../src/app/components";
import {
  DEMO_ORM_ROUTE_PATH,
  DEMO_TYPE_INFO_MAP,
} from "../../../common/Constants";
import { TypeOperation } from "../../../../src/common/TypeParsing/TypeInfo";
import { TypeInfoORMClient } from "../../../../src/app/utils";
import { DOMAINS } from "../../../iac";

const DEMO_PERSON_ID = "1234567";

export const TypeInfoDemo: FC = () => {
  const typeInfoORMClient = new TypeInfoORMClient({
    protocol: "https",
    domain: DOMAINS.API,
    basePath: DEMO_ORM_ROUTE_PATH,
  });
  const [value, setValue] = useState<TypeInfoDataStructure>({
    Person: {
      [TypeOperation.UPDATE]: {
        [DEMO_PERSON_ID]: {},
      },
    },
  });

  return (
    <TypeInfoApplication
      typeInfoMap={DEMO_TYPE_INFO_MAP}
      baseTypeInfoName="Person"
      baseValue={value}
      onBaseValueChange={setValue}
      baseOperation={TypeOperation.UPDATE}
      baseMode={TypeNavigationMode.FORM}
      basePrimaryKeyValue={DEMO_PERSON_ID}
      typeInfoORMClient={typeInfoORMClient}
    />
  );
};
