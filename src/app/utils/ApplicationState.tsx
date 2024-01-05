import { createContext, FC, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';

export interface ApplicationStateIdentifier extends Record<string, ApplicationStateIdentifier | {}> {}

export type ApplicationStateValue = any;

export type ApplicationState = Map<ApplicationStateIdentifier, ApplicationStateValue>;

export type ApplicationStateIdentifierSubStateType<SpecificType> = SpecificType extends undefined
  ? ApplicationStateIdentifier
  : SpecificType extends ApplicationStateIdentifier
  ? SpecificType
  : never;

export const getApplicationStateIdentifier = <SubStateIdStructure extends ApplicationStateIdentifier>(
  subStateIdMap?: SubStateIdStructure
): ApplicationStateIdentifierSubStateType<SubStateIdStructure> => (subStateIdMap ? subStateIdMap : {}) as any;

export const getApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  applicationState: ApplicationState
): ApplicationStateValue => applicationState.get(identifier);

export const setApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  value: ApplicationStateValue,
  applicationState: ApplicationState
): ApplicationState => new Map(applicationState).set(identifier, value);

export const getApplicationStateValueStructure = <ReturnStructureType extends Record<string, any>>(
  idStructure: Record<keyof ReturnStructureType, ApplicationStateIdentifier>,
  applicationState: ApplicationState
): ReturnStructureType =>
  Object.keys(idStructure).reduce(
    (acc, k) => ({
      ...acc,
      [k]: getApplicationStateValue(idStructure[k], applicationState),
    }),
    {} as any
  );

export type ApplicationStateContextType = {
  value: ApplicationState;
  onChange: (newValue: ApplicationState) => void;
};

export const ApplicationStateContext = createContext<ApplicationStateContextType>({
  value: new Map(),
  onChange: () => {},
});

const { Provider } = ApplicationStateContext;

export type ApplicationStateValueController = {
  value: ApplicationStateValue;
  onChange: (value: ApplicationStateValue) => void;
};

export const useApplicationStateValue = (identifier: ApplicationStateIdentifier): ApplicationStateValueController => {
  const { value: applicationState, onChange: setApplicationState } = useContext(ApplicationStateContext);
  const appStateRef = useRef(applicationState);
  appStateRef.current = applicationState;
  const value = useMemo(() => getApplicationStateValue(identifier, applicationState), [identifier, applicationState]);
  const onChange = useCallback(
    (newValue: ApplicationStateValue) => {
      setApplicationState(setApplicationStateValue(identifier, newValue, appStateRef.current));
    },
    [identifier, setApplicationState]
  );
  const controller = useMemo<ApplicationStateValueController>(
    () => ({
      value,
      onChange,
    }),
    [onChange, value]
  );

  return controller;
};

export type ApplicationStateValueStructureController<StructureType extends Record<string, any>> = {
  valueStructure: StructureType;
  onChangeStructure: Record<keyof StructureType, (newValue: any) => void>;
};

export const useApplicationStateValueStructure = <StructureType extends Record<string, any>>(
  idStructure: Record<keyof StructureType, ApplicationStateIdentifier>
): ApplicationStateValueStructureController<StructureType> => {
  const { value: applicationState, onChange: setApplicationState } = useContext(ApplicationStateContext);
  const valueStructure = useMemo(
    () => getApplicationStateValueStructure(idStructure, applicationState),
    [applicationState, idStructure]
  );
  const onChangeStructure = useMemo(
    () =>
      Object.keys(idStructure).reduce(
        (acc, k) => ({
          ...acc,
          [k]: (newValue: any) => {
            setApplicationState(setApplicationStateValue(idStructure[k], newValue, applicationState));
          },
        }),
        {} as any
      ),
    [applicationState, idStructure, setApplicationState]
  );
  const controller = useMemo<ApplicationStateValueStructureController<StructureType>>(
    () => ({
      valueStructure,
      onChangeStructure,
    }),
    [onChangeStructure, valueStructure]
  );

  return controller;
};

export type ApplicationStateProvider = PropsWithChildren<{}>;

export const ApplicationStateProvider: FC<ApplicationStateProvider> = ({ children }) => {
  const [value, setValue] = useState<ApplicationState>(new Map());
  const controller = useMemo<ApplicationStateContextType>(
    () => ({
      value,
      onChange: setValue,
    }),
    [value]
  );

  return <Provider value={controller}>{children}</Provider>;
};
