import { FC } from "react";
import {LogicalOperators, SearchCriteria} from "../../../../common/SearchTypes";
import { TypeInfoDataItem } from "../Types";
import { TypeInfo } from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectTable";
import styled from "styled-components";
import {Form} from "../../Form";

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
};

export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfo,
  searchCriteria,
  searchResults = [],
}) => {
  const {
    logicalOperator = LogicalOperators.AND,
    fieldCriteria = [],
  } = searchCriteria;
  const {
    fields = {},
  } = typeInfo;

  return <BaseObjectSearch>
    <Controls>
      {fieldCriteria.map((criteria, index) => {
        const {} = criteria;
        const Component

        return return InputComponent ? (
          <label key={fieldName}>
            <LabelText>{label}&nbsp;</LabelText>
            <InputComponent
              nameOrIndex={fieldName}
              typeInfoField={field}
              value={fieldValue}
              onChange={onFieldChange}
              options={tags}
              onNavigateToType={onNavigateToType}
            />
            <LabelText>&nbsp;{label}</LabelText>
          </label>
        ) : undefined;
      })}
    </Controls>
    <ObjectTable typeInfo={typeInfo} objectList={searchResults} />
  </BaseObjectSearch>;
};
