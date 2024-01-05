import React, { FC, useCallback, useMemo } from "react";
import {
  getTypeStructureByPath,
  getTypeStructureIsPrimitive,
  TypeStructureMap,
} from "./TypeParsing/TypeUtils";
import { TypeStructureComponent } from "./TypeStructureComponent";
import HashMatrix from "./ValueProcessing/HashMatrix";
import { List } from "./List";
import {
  NavigationBreadcrumb,
  NavigationBreadcrumbs,
  useNavigation,
} from "./Navigation";
import styled from "styled-components";

const ApplicationBase = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
  overflow: hidden;
`;
const HeaderBase = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: center;
  gap: 1em;
`;

export type ApplicationProps<TypeStructureMapType extends TypeStructureMap> = {
  typeStructureMap: TypeStructureMapType;
  value: any;
  entryType: keyof TypeStructureMapType;
  onChange: (value: any) => void;
  keepNavigationHistory?: boolean;
};

export const Application: FC<ApplicationProps<any>> = ({
  typeStructureMap,
  value,
  entryType,
  onChange,
  keepNavigationHistory = false,
}) => {
  const typeStructure = useMemo(
    () => typeStructureMap[entryType],
    [typeStructureMap, entryType],
  );
  const { trail, path, onNavigateTo, onNavigateBack, onSetTrail } =
    useNavigation(keepNavigationHistory);
  const hashMatrix = useMemo(
    () =>
      new HashMatrix({
        hashMatrix: value,
      }),
    [value],
  );
  const currentValue = useMemo(
    () => hashMatrix.getPath(path.map((p) => `${p}`)),
    [hashMatrix, path],
  );
  const currentTypeStructure = useMemo(
    () => getTypeStructureByPath(path, typeStructure, typeStructureMap),
    [path, typeStructure, typeStructureMap],
  );
  const tStructIsPrimitive = useMemo(
    () => getTypeStructureIsPrimitive(currentTypeStructure),
    [currentTypeStructure],
  );
  const { multiple: currentTypeIsMultiple = false } = currentTypeStructure;
  const currentValueIsItemInList = useMemo(() => {
    const { isListItem = false }: Partial<NavigationBreadcrumb> =
      trail[trail.length - 1] || {};

    return isListItem;
  }, [trail]);
  const onChangeInternal = useCallback(
    (name: string, value: any) => {
      const stringNav = path.map((p) => `${p}`);
      const targetPath =
        !!name && !tStructIsPrimitive ? [...stringNav, name] : stringNav;

      hashMatrix.setPath(targetPath, value);
      onChange(hashMatrix.getValue());
    },
    [hashMatrix, path, onChange, tStructIsPrimitive],
  );
  const onListChange = useCallback(
    (value: any) => {
      hashMatrix.setPath(
        path.map((p) => `${p}`),
        value,
      );
      onChange(hashMatrix.getValue());
    },
    [hashMatrix, path, onChange],
  );

  return (
    <ApplicationBase>
      {trail.length > 0 ? (
        <HeaderBase>
          <NavigationBreadcrumbs trail={trail} onChange={onSetTrail} />
        </HeaderBase>
      ) : undefined}
      {currentTypeIsMultiple && !currentValueIsItemInList ? (
        <List
          typeStructure={currentTypeStructure}
          typeStructureMap={typeStructureMap}
          items={currentValue}
          onChange={onListChange}
          onNavigateToPath={onNavigateTo}
          onNavigateBack={onNavigateBack}
        />
      ) : (
        <TypeStructureComponent
          typeStructureMap={typeStructureMap}
          typeStructure={currentTypeStructure}
          value={currentValue}
          onChange={onChangeInternal}
          onNavigateToPath={onNavigateTo}
          onNavigateBack={onNavigateBack}
          topLevel
          isEntryPoint={trail.length === 0}
        />
      )}
    </ApplicationBase>
  );
};
