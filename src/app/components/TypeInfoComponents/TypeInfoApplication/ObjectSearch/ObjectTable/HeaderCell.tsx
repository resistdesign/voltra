import { FC, HTMLAttributes, useCallback, useMemo } from "react";
import styled from "styled-components";
import { TypeInfoField } from "../../../../../../common/TypeParsing/TypeInfo";
import { MaterialSymbol } from "../../../../MaterialSymbol";

const HeaderCellBase = styled.th`
  cursor: pointer;
`;

export type HeaderCellProps = Omit<
  HTMLAttributes<HTMLTableCellElement>,
  "children" | "onClick"
> & {
  sortedState: boolean | undefined;
  fieldName: string;
  typeInfoField?: TypeInfoField;
  onClick?: (fieldName: string) => void;
};

export const HeaderCell: FC<HeaderCellProps> = ({
  sortedState,
  fieldName,
  typeInfoField,
  onClick,
  ...otherProps
}) => {
  const fieldLabel = useMemo(() => {
    const { tags = {} } = typeInfoField || {};
    const { label = fieldName } = tags;

    return label;
  }, [fieldName, typeInfoField]);
  const onClickInternal = useCallback(() => {
    if (onClick) {
      onClick(fieldName);
    }
  }, [fieldName, onClick]);

  return (
    <HeaderCellBase onClick={onClickInternal} {...otherProps}>
      {fieldLabel}&nbsp;
      <MaterialSymbol>
        {sortedState === false
          ? "arrow_drop_down"
          : sortedState === true
            ? "arrow_drop_up"
            : undefined}
      </MaterialSymbol>
    </HeaderCellBase>
  );
};
