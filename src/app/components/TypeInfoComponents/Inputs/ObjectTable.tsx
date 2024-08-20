import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation } from "../Types";
import { transformValueToString } from "../../../../common/StringTransformers";
import { ItemButton } from "../../Basic/ItemButton";

export type ObjectTableProps = {
  typeInfo: TypeInfo;
  objectList: object[];
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const ObjectTable: FC<ObjectTableProps> = ({
  typeInfo,
  objectList = [],
  onNavigateToType,
}) => {
  const { primaryField } = typeInfo;
  const typeInfoFields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: tIF = {} } = typeInfo;

    return tIF;
  }, [typeInfo]);
  const fieldNames = useMemo<string[]>(
    () => Object.keys(typeInfoFields),
    [typeInfoFields],
  );
  const fieldHeaderLabels = useMemo<string[]>(
    () =>
      fieldNames
        .map((f) => {
          const { tags = {} } = typeInfoFields[f];
          const { label = f, hidden } = tags as SupportedFieldTags;

          return hidden ? undefined : label;
        })
        .filter((f) => f !== undefined) as string[],
    [fieldNames, typeInfoFields],
  );

  return (
    <table>
      <thead>
        <tr>
          {fieldHeaderLabels.map((fieldLabel, index) => (
            <th key={`FieldLabel:${fieldLabel}:${index}`}>{fieldLabel}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {objectList.map((item = {}, index) => {
          const { [primaryField as keyof object]: primaryKeyValue } = item;

          return (
            <tr key={index}>
              {fieldNames.map((fieldName, fieldIndex) => {
                const {
                  type,
                  typeReference,
                  tags = {},
                } = typeInfoFields[fieldName];
                const { hidden, customType } = tags as SupportedFieldTags;

                if (typeReference) {
                  const typeNavigation: TypeNavigation = {

                  };

                  return (
                    <td key={`Field:${fieldName}:${fieldIndex}`}>
                      <ItemButton
                        item={typeNavigation}
                        onClick={onNavigateToType}
                      >
                        Explore{/* TODO: i18n. */}
                      </ItemButton>
                    </td>
                  );
                } else if (!hidden) {
                  const stringValueForDisplay = transformValueToString(
                    item[fieldName as keyof typeof item],
                    type,
                    customType,
                  );

                  return (
                    <td key={`Field:${fieldName}:${fieldIndex}`}>
                      {stringValueForDisplay}
                    </td>
                  );
                } else {
                  return undefined;
                }
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
