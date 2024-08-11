import { FC, useCallback } from "react";
import {
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "../../../../common/SearchTypes";
import { InputComponent, TypeInfoDataItem, TypeNavigation } from "../Types";
import { TypeInfo } from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectTable";
import styled from "styled-components";
import { FieldCriterionControl } from "./ObjectSearch/FieldCriterionControl";

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
  const onFieldCriterionChange = useCallback(
    (index: number, fieldCriterion: FieldCriterion) => {
      // TODO: Implement field change.
    },
    [],
  );

  // TODO: Add/remove criterion.

  return (
    <BaseObjectSearch>
      <Controls>
        {fieldCriteria.map((fieldCriterionItem, index) => (
          <FieldCriterionControl
            key={`TypeInfoInput:${index}`}
            index={index}
            fieldCriterion={fieldCriterionItem}
            typeInfo={typeInfo}
            onChange={onFieldCriterionChange}
            onNavigateToType={onNavigateToType}
            customInputTypeMap={customInputTypeMap}
          />
        ))}
      </Controls>
      <ObjectTable typeInfo={typeInfo} objectList={searchResults} />
    </BaseObjectSearch>
  );
};
