import { FC, useState } from "react";
import {
  TypeInfoApplication,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "../../../../src/app/components";
import { DEMO_TYPE_INFO_MAP } from "../../../common/Constants";

export const TypeInfoDemo: FC = () => {
  const [value, setValue] = useState<TypeInfoDataStructure>({});

  return (
    <TypeInfoApplication
      typeInfoMap={DEMO_TYPE_INFO_MAP}
      baseTypeInfoName="Person"
      baseValue={value}
      onBaseValueChange={setValue}
      baseMode={TypeNavigationMode.FORM}
    />
  );
};
