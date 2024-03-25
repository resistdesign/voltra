import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * An object, nested or not, used as the identifier or identifier path for a state value.
 * */
export interface ApplicationStateIdentifier
  extends Record<string, ApplicationStateIdentifier | {}> {}

export type ApplicationStateValue = any;

export type ApplicationStateModificationState = Map<
  ApplicationStateIdentifier,
  boolean
>;

export type ApplicationState = Map<
  ApplicationStateIdentifier,
  ApplicationStateValue
>;

export type ApplicationStateIdentifierSubStateType<SpecificType> =
  SpecificType extends undefined
    ? ApplicationStateIdentifier
    : SpecificType extends ApplicationStateIdentifier
      ? SpecificType
      : never;

export const getApplicationStateIdentifier = <
  SubStateIdStructure extends ApplicationStateIdentifier,
>(
  subStateIdMap?: SubStateIdStructure,
): ApplicationStateIdentifierSubStateType<SubStateIdStructure> =>
  (subStateIdMap ? subStateIdMap : {}) as any;

export const getApplicationStateModified = (
  identifier: ApplicationStateIdentifier,
  modificationState: ApplicationStateModificationState,
): boolean => !!modificationState.get(identifier);

export const getApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  applicationState: ApplicationState,
): ApplicationStateValue => applicationState.get(identifier);

export const setApplicationStateModified = (
  identifier: ApplicationStateIdentifier,
  value: boolean,
  modificationState: ApplicationState,
): ApplicationStateModificationState =>
  new Map(modificationState).set(identifier, value);

export const setApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  value: ApplicationStateValue,
  applicationState: ApplicationState,
): ApplicationState => new Map(applicationState).set(identifier, value);

export const getApplicationStateValueStructure = <
  ReturnStructureType extends Record<string, any>,
>(
  idStructure: Record<keyof ReturnStructureType, ApplicationStateIdentifier>,
  applicationState: ApplicationState,
): ReturnStructureType =>
  Object.keys(idStructure).reduce(
    (acc, k) => ({
      ...acc,
      [k]: getApplicationStateValue(idStructure[k], applicationState),
    }),
    {} as any,
  );

export type ApplicationStateContextType = {
  modified: ApplicationStateModificationState;
  value: ApplicationState;
  onChange: (newValue: ApplicationState) => void;
  setModified: (newValue: ApplicationStateModificationState) => void;
};

export const ApplicationStateContext =
  createContext<ApplicationStateContextType>({
    modified: new Map(),
    value: new Map(),
    onChange: () => {},
    setModified: () => {},
  });

const { Provider } = ApplicationStateContext;

/**
 * Used to access and update application state values.
 * */
export type ApplicationStateValueController = {
  modified: boolean;
  value: ApplicationStateValue;
  onChange: (value: ApplicationStateValue) => void;
  setModified: (value: boolean) => void;
};

/**
 * Get and set an application state value by identifier.
 * */
export const useApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
): ApplicationStateValueController => {
  const {
    modified: modificationState,
    value: applicationState,
    onChange: setApplicationState,
    setModified: setModificationState,
  } = useContext(ApplicationStateContext);
  const appStateRef = useRef(applicationState);
  appStateRef.current = applicationState;
  const modified = useMemo(
    () => getApplicationStateModified(identifier, modificationState),
    [identifier, modificationState],
  );
  const value = useMemo(
    () => getApplicationStateValue(identifier, applicationState),
    [identifier, applicationState],
  );
  const setModified = useCallback(
    (isModified: boolean) => {
      setModificationState(
        setApplicationStateModified(identifier, isModified, modificationState),
      );
    },
    [identifier, setModificationState],
  );
  const onChange = useCallback(
    (newValue: ApplicationStateValue) => {
      setApplicationState(
        setApplicationStateValue(identifier, newValue, appStateRef.current),
      );
      setModified(true);
    },
    [identifier, setApplicationState],
  );
  const controller = useMemo<ApplicationStateValueController>(
    () => ({
      modified,
      value,
      onChange,
      setModified,
    }),
    [modified, onChange, setModified, value],
  );

  return controller;
};

/**
 * A mapped structure of application state value controllers.
 * */
export type ApplicationStateValueStructureController<
  StructureType extends Record<string, any>,
> = {
  valueStructure: StructureType;
  onChangeStructure: Record<keyof StructureType, (newValue: any) => void>;
};
/**
 * Use an object that is a collection of application state value controllers.
 * */
export const useApplicationStateValueStructure = <
  StructureType extends Record<string, any>,
>(
  idStructure: Record<keyof StructureType, ApplicationStateIdentifier>,
): ApplicationStateValueStructureController<StructureType> => {
  const { value: applicationState, onChange: setApplicationState } = useContext(
    ApplicationStateContext,
  );
  const valueStructure = useMemo(
    () => getApplicationStateValueStructure(idStructure, applicationState),
    [applicationState, idStructure],
  );
  const onChangeStructure = useMemo(
    () =>
      Object.keys(idStructure).reduce(
        (acc, k) => ({
          ...acc,
          [k]: (newValue: any) => {
            setApplicationState(
              setApplicationStateValue(
                idStructure[k],
                newValue,
                applicationState,
              ),
            );
          },
        }),
        {} as any,
      ),
    [applicationState, idStructure, setApplicationState],
  );
  const controller = useMemo<
    ApplicationStateValueStructureController<StructureType>
  >(
    () => ({
      valueStructure,
      onChangeStructure,
    }),
    [onChangeStructure, valueStructure],
  );

  return controller;
};

export type ApplicationStateProviderProps = PropsWithChildren<{}>;

/**
 * Provide a context container for application state.
 * */
export const ApplicationStateProvider: FC<ApplicationStateProviderProps> = ({
  children,
}) => {
  const [modified, setModified] = useState<ApplicationStateModificationState>(
    new Map(),
  );
  const [value, setValue] = useState<ApplicationState>(new Map());
  const controller = useMemo<ApplicationStateContextType>(
    () => ({
      modified,
      value,
      onChange: setValue,
      setModified,
    }),
    [modified, value],
  );

  return <Provider value={controller}>{children}</Provider>;
};
