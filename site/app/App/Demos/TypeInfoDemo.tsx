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
    <>
      <p>
        Navigate to a related field (for example, click the add icon next to a
        relationship column) to open the related search view. The Add related
        control only appears in that relationship context.
      </p>
      <TypeInfoApplication
        typeInfoMap={CLIENT_SIDE_DEMO_TYPE_INFO_MAP}
        baseTypeInfoName="Person"
        baseOperation={TypeOperation.CREATE}
        baseMode={TypeNavigationMode.SEARCH_ITEMS}
        typeInfoORMAPI={typeInfoORMClient}
      />
    </>
  );
};
