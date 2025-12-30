/**
 * @packageDocumentation
 *
 * Application-level state container built on React context and maps. Use
 * {@link ApplicationStateProvider} to host state, then access values with
 * {@link useApplicationStateValue} or {@link useApplicationStateValueStructure}.
 */
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

/**
 * The stored value type for application state entries.
 * */
export type ApplicationStateValue = any;

/**
 * Map of state identifiers to a "modified" boolean.
 * */
export type ApplicationStateModificationState = Map<
  ApplicationStateIdentifier,
  boolean
>;

/**
 * Map of state identifiers to stored values.
 * */
export type ApplicationState = Map<
  ApplicationStateIdentifier,
  ApplicationStateValue
>;

/**
 * Determines the identifier shape for a specific sub-state.
 *
 * @typeParam SpecificType - The identifier shape, if provided.
 * */
export type ApplicationStateIdentifierSubStateType<SpecificType> =
  SpecificType extends undefined
    ? ApplicationStateIdentifier
    : SpecificType extends ApplicationStateIdentifier
      ? SpecificType
      : never;

/**
 * Normalize a sub-state identifier map to an ApplicationStateIdentifier.
 *
 * @param subStateIdMap - Optional sub-state identifier map.
 * @returns The identifier map or an empty identifier object.
 * */
export const getApplicationStateIdentifier = <
  SubStateIdStructure extends ApplicationStateIdentifier,
>(
  subStateIdMap?: SubStateIdStructure,
): ApplicationStateIdentifierSubStateType<SubStateIdStructure> =>
  (subStateIdMap ? subStateIdMap : {}) as any;

/**
 * Read the modification status for a specific identifier.
 *
 * @param identifier - The identifier to look up.
 * @param modificationState - The modification map to read from.
 * @returns Whether the identifier is marked as modified.
 * */
export const getApplicationStateModified = (
  identifier: ApplicationStateIdentifier,
  modificationState: ApplicationStateModificationState,
): boolean => !!modificationState.get(identifier);

/**
 * Read the stored value for an identifier.
 *
 * @param identifier - The identifier to look up.
 * @param applicationState - The application state map.
 * @returns The stored value, if any.
 * */
export const getApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  applicationState: ApplicationState,
): ApplicationStateValue => applicationState.get(identifier);

/**
 * Set the modification status for an identifier.
 *
 * @param identifier - The identifier to update.
 * @param value - The new modified flag.
 * @param modificationState - The current modification map.
 * @returns A new modification map with the updated flag.
 * */
export const setApplicationStateModified = (
  identifier: ApplicationStateIdentifier,
  value: boolean,
  modificationState: ApplicationState,
): ApplicationStateModificationState =>
  new Map(modificationState).set(identifier, value);

/**
 * Set the stored value for an identifier.
 *
 * @param identifier - The identifier to update.
 * @param value - The new value to store.
 * @param applicationState - The current application state map.
 * @returns A new application state map with the updated value.
 * */
export const setApplicationStateValue = (
  identifier: ApplicationStateIdentifier,
  value: ApplicationStateValue,
  applicationState: ApplicationState,
): ApplicationState => new Map(applicationState).set(identifier, value);

/**
 * Resolve a structured map of identifiers into their current values.
 *
 * @param idStructure - Map of structure keys to identifiers.
 * @param applicationState - The application state map.
 * @returns An object of the same shape containing resolved values.
 * */
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

/**
 * Context state and updater hooks for application state.
 * */
export type ApplicationStateContextType = {
  /**
   * Map of identifiers to modified flags.
   * */
  modified: ApplicationStateModificationState;
  /**
   * Map of identifiers to stored values.
   * */
  value: ApplicationState;
  /**
   * Replace the current application state map.
   * */
  onChange: (newValue: ApplicationState) => void;
  /**
   * Replace the current modification state map.
   * */
  setModified: (newValue: ApplicationStateModificationState) => void;
};

/**
 * React context for application state and modification tracking.
 * */
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
  /**
   * Whether the value is marked as modified.
   * */
  modified: boolean;
  /**
   * The current value for the identifier.
   * */
  value: ApplicationStateValue;
  /**
   * Update the current value.
   *
   * @param value - The new value to store.
   * */
  onChange: (value: ApplicationStateValue) => void;
  /**
   * Update the modified flag.
   *
   * @param value - The new modified flag.
   * */
  setModified: (value: boolean) => void;
};

/**
 * Get and set an application state value by identifier.
 *
 * @param identifier - Identifier to read and update.
 * @returns Controller for the identifier value and modified flag.
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
  /**
   * The resolved value structure.
   * */
  valueStructure: StructureType;
  /**
   * Per-field change handlers for the structure.
   * */
  onChangeStructure: Record<keyof StructureType, (newValue: any) => void>;
};
/**
 * Use an object that is a collection of application state value controllers.
 *
 * @param idStructure - Map of structure keys to identifiers.
 * @returns Controller with the resolved values and per-field change handlers.
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

/**
 * Props for ApplicationStateProvider.
 * */
export type ApplicationStateProviderProps = PropsWithChildren<{}>;

/**
 * Provide a context container for application state.
 *
 * @param children - React children to render in the provider.
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
