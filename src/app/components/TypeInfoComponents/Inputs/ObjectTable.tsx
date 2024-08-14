import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
} from "../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation } from "../Types";
import { transformValueToString } from "../../../../common/StringTransformers";

export type ObjectTableProps = {
  typeInfo: TypeInfo;
  objectList: object[];
  // TODO: Does this work?
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const ObjectTable: FC<ObjectTableProps> = ({
  typeInfo,
  objectList = [],
}) => {
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
        {objectList.map((item = {}, index) => (
          <tr key={index}>
            {fieldNames.map((fieldName, fieldIndex) => {
              const {
                type,
                // TODO: Need to navigate.
                typeReference,
                tags = {},
              } = typeInfoFields[fieldName];
              const { hidden, customType } = tags as SupportedFieldTags;
              const stringValueForDisplay = transformValueToString(
                item[fieldName as keyof typeof item],
                type,
                customType,
              );

              if (!hidden) {
                // TODO: Handle navigation for viewing type references???
                return (
                  <td key={`Field:${fieldName}:${fieldIndex}`}>
                    {stringValueForDisplay}
                  </td>
                );
              }
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
