import { FC } from "react";
import {
  TypeInfoApplication,
  TypeNavigationMode,
} from "../../../../src/app/components";
import { DEMO_ORM_ROUTE_PATH, DOMAINS } from "../../../common/Constants";
import { TypeOperation } from "../../../../src/common/TypeParsing/TypeInfo";
import { TypeInfoORMClient } from "../../../../src/app/utils";
import { CLIENT_SIDE_DEMO_TYPE_INFO_MAP } from "../../../common/ClientSideTypeConstants";

export const TypeInfoDemo: FC = () => {
  const typeInfoORMClient = new TypeInfoORMClient({
    protocol: "https",
    domain: DOMAINS.API,
    basePath: DEMO_ORM_ROUTE_PATH,
  });

  return (
    <TypeInfoApplication
      typeInfoMap={CLIENT_SIDE_DEMO_TYPE_INFO_MAP}
      baseTypeInfoName="Person"
      baseOperation={TypeOperation.CREATE}
      baseMode={TypeNavigationMode.FORM}
      typeInfoORMAPI={typeInfoORMClient}
    />
  );
};
