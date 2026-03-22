/**
 * @packageDocumentation
 *
 * Application-level state container built on React context and maps. Use
 * {@link ApplicationStateProvider} to host state, then access values with
 * {@link useApplicationStateValue}.
 */
import {
  createContext,
  FC,
  PropsWithChildren,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * An object, nested or not, used as the identifier or identifier path for a
 * state value.
 *
 * The generic parameter exists purely for TypeScript. It lets a consumer make
 * the identifier itself the source of truth for what value type lives at that
 * location in application state, without changing the runtime shape.
 * */
declare const applicationStateIdentifierValueTypeSymbol: unique symbol;

export interface ApplicationStateIdentifier<ValueType = unknown>
  extends Record<string, ApplicationStateIdentifier<any> | {}> {
  readonly [applicationStateIdentifierValueTypeSymbol]?: ValueType;
}

/**
 * The stored value type for application state entries.
 * */
export type ApplicationStateValue = unknown;

/**
 * React-style state action for a specific application-state value.
 *
 * Passing a function follows the same contract as React `useState`: the
 * function receives the previous value and returns the next value.
 * */
export type ApplicationStateSetAction<ValueType> =
  | ValueType
  | ((previousValue: ValueType) => ValueType);

/**
 * React-style stable setter for a specific application-state value.
 * */
export type ApplicationStateSetter<ValueType> = (
  value: ApplicationStateSetAction<ValueType>,
) => void;

/**
 * Map of state identifiers to a "modified" boolean.
 * */
export type ApplicationStateModificationState = Map<
  ApplicationStateIdentifier<any>,
  boolean
>;

/**
 * Map of state identifiers to stored values.
 * */
export type ApplicationState = Map<
  ApplicationStateIdentifier<any>,
  ApplicationStateValue
>;

/**
 * Create or forward an application-state identifier.
 *
 * Call with no argument to create a new identifier object and attach a value
 * type at the type level:
 * `const profileId = getApplicationStateIdentifier<UserProfile>()`
 *
 * Call with an existing identifier object to preserve that exact object
 * reference while keeping its type information intact.
 * */
export function getApplicationStateIdentifier<
  ValueType = ApplicationStateValue,
>(): ApplicationStateIdentifier<ValueType>;
export function getApplicationStateIdentifier<
  IdentifierType extends ApplicationStateIdentifier<any>,
>(subStateIdMap: IdentifierType): IdentifierType;

/**
 * @param subStateIdMap - Optional sub-state identifier map.
 * @returns The identifier map or an empty identifier object.
 * */
export function getApplicationStateIdentifier<
  ValueType = ApplicationStateValue,
  IdentifierType extends ApplicationStateIdentifier<any> | undefined =
    | ApplicationStateIdentifier<ValueType>
    | undefined,
>(
  subStateIdMap?: IdentifierType,
): IdentifierType extends ApplicationStateIdentifier<any>
  ? IdentifierType
  : ApplicationStateIdentifier<ValueType> {
  return (subStateIdMap ? subStateIdMap : {}) as any;
}

/**
 * Read the modification status for a specific identifier.
 *
 * @param identifier - The identifier to look up.
 * @param modificationState - The modification map to read from.
 * @returns Whether the identifier is marked as modified.
 * */
export const getApplicationStateModified = (
  identifier: ApplicationStateIdentifier<any>,
  modificationState: ApplicationStateModificationState,
): boolean => !!modificationState.get(identifier);

/**
 * Read the stored value for an identifier.
 *
 * @param identifier - The identifier to look up.
 * @param applicationState - The application state map.
 * @returns The stored value, if any.
 * */
export const getApplicationStateValue = <ValueType = ApplicationStateValue>(
  identifier: ApplicationStateIdentifier<ValueType>,
  applicationState: ApplicationState,
): ValueType | undefined => applicationState.get(identifier) as
  | ValueType
  | undefined;

/**
 * Set the modification status for an identifier.
 *
 * @param identifier - The identifier to update.
 * @param value - The new modified flag.
 * @param modificationState - The current modification map.
 * @returns A new modification map with the updated flag.
 * */
export const setApplicationStateModified = (
  identifier: ApplicationStateIdentifier<any>,
  value: boolean,
  modificationState: ApplicationStateModificationState,
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
export const setApplicationStateValue = <ValueType = ApplicationStateValue>(
  identifier: ApplicationStateIdentifier<ValueType>,
  value: ValueType,
  applicationState: ApplicationState,
): ApplicationState => new Map(applicationState).set(identifier, value);

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
  onChange: Dispatch<SetStateAction<ApplicationState>>;
  /**
   * Replace the current modification state map.
   * */
  setModified: Dispatch<SetStateAction<ApplicationStateModificationState>>;
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
export type ApplicationStateValueController<
  ValueType = ApplicationStateValue,
> = {
  /**
   * Whether the value is marked as modified.
   * */
  modified: boolean;
  /**
   * The current value for the identifier.
   * */
  value: ValueType | undefined;
  /**
   * Update the current value with React `useState` semantics.
   *
   * The setter is intentionally stable so consumers can safely depend on it
   * like a normal React state setter.
   *
   * @param value - The next value, or a function that derives it from the
   * previous value.
   * */
  onChange: ApplicationStateSetter<ValueType | undefined>;
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
export const useApplicationStateValue = <
  ValueType = ApplicationStateValue,
>(
  identifier: ApplicationStateIdentifier<ValueType>,
): ApplicationStateValueController<ValueType> => {
  const {
    modified: modificationState,
    value: applicationState,
    onChange: setApplicationState,
    setModified: setModificationState,
  } = useContext(ApplicationStateContext);
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
      setModificationState((previousModified) =>
        setApplicationStateModified(identifier, isModified, previousModified),
      );
    },
    [identifier, setModificationState],
  );
  const onChange = useCallback(
    (newValue: ApplicationStateSetAction<ValueType | undefined>) => {
      setApplicationState((previousState) => {
        const previousValue = getApplicationStateValue(
          identifier,
          previousState,
        ) as ValueType | undefined;
        const resolvedValue =
          typeof newValue === "function"
            ? (
                newValue as (value: ValueType | undefined) => ValueType | undefined
              )(previousValue)
            : newValue;

        return setApplicationStateValue<ValueType | undefined>(
          identifier,
          resolvedValue,
          previousState,
        );
      });
      setModificationState((previousModified) =>
        setApplicationStateModified(identifier, true, previousModified),
      );
    },
    [identifier, setApplicationState, setModificationState],
  );
  const controller = useMemo<ApplicationStateValueController<ValueType>>(
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
