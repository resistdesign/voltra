import { FC, useCallback } from "react";
import {
  LogicalOperators,
  SearchCriteria,
} from "../../../../common/SearchTypes";
import {
  InputComponent,
  NameOrIndex,
  TypeInfoDataItem,
  TypeNavigation,
} from "../Types";
import { TypeInfo } from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectTable";
import styled from "styled-components";
import { TypeInfoInput } from "../TypeInfoInput";

// TODO: Search criteria interface.
const BaseObjectSearch = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const Controls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const FieldControl = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 1em;
`;

export type ObjectSearchProps = {
  typeInfo: TypeInfo;
  searchCriteria: SearchCriteria;
  searchResults: TypeInfoDataItem[];
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfo,
  searchCriteria,
  searchResults = [],
  onNavigateToType,
  customInputTypeMap,
}) => {
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const { fields = {} } = typeInfo;
  const onFieldChange = useCallback((nameOrIndex: NameOrIndex, value: any) => {
    // TODO: Implement field change.
  }, []);

  // TODO: Add and remove search fields.

  return (
    <BaseObjectSearch>
      <Controls>
        {fieldCriteria.map((fieldCriterionItem, index) => {
          const { fieldName, value } = fieldCriterionItem;
          const typeInfoField = fields[fieldName];

          // TODO: Field selection. DO NOT ALLOW TypeReference fields.
          // TODO: Operator selection.
          // TODO: Add/remove criterion.

          return (
            <FieldControl key={`TypeInfoInput:${fieldName}:${index}`}>
              <TypeInfoInput
                typeInfoField={typeInfoField}
                fieldValue={value}
                nameOrIndex={fieldName}
                onChange={onFieldChange}
                onNavigateToType={onNavigateToType}
                customInputTypeMap={customInputTypeMap}
                ignoreTypeReferences
              />
            </FieldControl>
          );
        })}
      </Controls>
      <ObjectTable typeInfo={typeInfo} objectList={searchResults} />
    </BaseObjectSearch>
  );
};
