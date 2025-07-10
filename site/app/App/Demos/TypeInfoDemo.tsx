import { FC } from "react";
import {
  TypeInfoApplication,
  TypeNavigationMode,
} from "../../../../src/app/components";
import {
  DEMO_ORM_ROUTE_PATH,
  DEMO_TYPE_INFO_MAP,
  DOMAINS,
} from "../../../common/Constants";
import { TypeOperation } from "../../../../src/common/TypeParsing/TypeInfo";
import { TypeInfoORMClient } from "../../../../src/app/utils";

const DEMO_PERSON_ID = "1234567";

export const TypeInfoDemo: FC = () => {
  const typeInfoORMClient = new TypeInfoORMClient({
    protocol: "https",
    domain: DOMAINS.API,
    basePath: DEMO_ORM_ROUTE_PATH,
  });

  return (
    <TypeInfoApplication
      typeInfoMap={DEMO_TYPE_INFO_MAP}
      baseTypeInfoName="Person"
      baseOperation={TypeOperation.UPDATE}
      baseMode={TypeNavigationMode.FORM}
      basePrimaryFieldValue={DEMO_PERSON_ID}
      typeInfoORMAPI={typeInfoORMClient}
    />
  );
};
