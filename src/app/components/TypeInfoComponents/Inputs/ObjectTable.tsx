import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import { transformValueToString } from "../../../../common/StringTransformers";
import { ItemButton } from "../../Basic/ItemButton";

export type ObjectTableProps = {
  typeInfoName: string;
  typeInfo: TypeInfo;
  objectList: object[];
  operation?: TypeOperation;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const ObjectTable: FC<ObjectTableProps> = ({
  typeInfoName,
  typeInfo,
  objectList = [],
  operation = TypeOperation.READ,
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
  const typeNavigationMap = useMemo<
    Record<number, Record<string, TypeNavigation>>
  >(() => {
    const tNM: Record<string, Record<string, TypeNavigation>> = {};

    for (let i = 0; i < objectList.length; i++) {
      const item = objectList[i];
      const fromTypePrimaryFieldValue =
        typeof item === "object" && item !== null
          ? item[primaryField as keyof object]
          : undefined;

      if (typeof fromTypePrimaryFieldValue !== "undefined") {
        for (const fN of fieldNames) {
          const { typeReference } = typeInfoFields[fN];

          if (typeReference) {
            const newTypeNavigation: TypeNavigation = {
              fromTypeName: typeInfoName,
              fromTypePrimaryFieldValue,
              fromTypeFieldName: fN,
              mode: TypeNavigationMode.FORM,
              operation,
            };

            tNM[i][fN] = newTypeNavigation;
          }
        }
      }
    }

    return tNM;
  }, [
    objectList,
    primaryField,
    typeInfoName,
    fieldNames,
    typeInfoFields,
    operation,
  ]);

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
                  const typeNavigation: TypeNavigation =
                    typeNavigationMap[index][fieldName];

                  return typeNavigation ? (
                    <td key={`Field:${fieldName}:${fieldIndex}`}>
                      <ItemButton
                        item={typeNavigation}
                        onClick={onNavigateToType}
                      >
                        Explore{/* TODO: i18n. */}
                      </ItemButton>
                    </td>
                  ) : undefined;
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
