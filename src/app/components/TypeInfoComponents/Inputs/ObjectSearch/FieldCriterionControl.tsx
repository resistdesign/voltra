import { FC, useCallback, useMemo } from "react";
import styled from "styled-components";
import { TypeInfoInput } from "../../TypeInfoInput";
import { FieldCriterion } from "../../../../../common/SearchTypes";
import { TypeInfo } from "../../../../../common/TypeParsing/TypeInfo";
import { InputComponent, TypeNavigation } from "../../Types";

const FieldCriterionControlBase = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 1em;
`;

export type FieldCriterionControlProps = {
  index: number;
  fieldCriterion: FieldCriterion;
  typeInfo: TypeInfo;
  onChange: (index: number, fieldCriterion: FieldCriterion) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
  customInputTypeMap?: Record<string, InputComponent<any>>;
};

export const FieldCriterionControl: FC<FieldCriterionControlProps> = ({
  index,
  fieldCriterion,
  typeInfo,
  onChange,
  onNavigateToType,
  customInputTypeMap,
}) => {
  const { fieldName, operator, value: fieldValue } = fieldCriterion;
  const typeInfoField = useMemo(
    () => typeInfo?.fields?.[fieldName],
    [typeInfo, fieldName],
  );
  const onChangeInternal = useCallback(
    (newFieldCriterion: FieldCriterion) => {},
    [],
  );
  const onFieldSelectionChange = useCallback(() => {}, []);
  const onOperatorSelectionChange = useCallback(() => {}, []);
  const onValueChange = useCallback(() => {}, []);

  // TODO: Field selection. DO NOT ALLOW TypeReference fields.
  // TODO: Operator selection.

  return (
    <FieldCriterionControlBase>
      <select>
        <option value="">Field</option>
      </select>
      <select>
        <option value="">Operator</option>
      </select>
      {typeInfoField ? (
        <TypeInfoInput
          typeInfoField={typeInfoField}
          fieldValue={fieldValue}
          nameOrIndex={fieldName}
          onChange={onValueChange}
          onNavigateToType={onNavigateToType}
          customInputTypeMap={customInputTypeMap}
          ignoreTypeReferences
        />
      ) : undefined}
    </FieldCriterionControlBase>
  );
};
