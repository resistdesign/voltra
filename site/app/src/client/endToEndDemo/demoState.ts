export type DemoActiveType = "Person" | "Car";

export type DemoMode = "list" | "create" | "detail" | "relate";

export type DemoRelateState = {
  fromType: "Person";
  fromId: string;
} | null;

export type DemoAppState = {
  activeType: DemoActiveType;
  activeId: string | null;
  mode: DemoMode;
  relate: DemoRelateState;
};

export type DemoAppAction =
  | { type: "goToPeopleList" }
  | { type: "startCreatePerson" }
  | { type: "selectPerson"; personId: string }
  | { type: "enterPersonDetail"; personId: string }
  | { type: "startRelateCar"; personId: string }
  | { type: "selectCarForRelate"; carId: string }
  | { type: "confirmRelateCar"; carId: string }
  | { type: "exitRelateBackToPerson" }
  | { type: "clearSelection" };

export type DemoScreen =
  | "PeopleHome"
  | "CreatePerson"
  | "PersonDetail"
  | "CarRelate";

export const demoInitialState: DemoAppState = {
  activeType: "Person",
  activeId: null,
  mode: "list",
  relate: null,
};

export const demoAppReducer = (
  state: DemoAppState,
  action: DemoAppAction,
): DemoAppState => {
  switch (action.type) {
    case "goToPeopleList":
      return {
        activeType: "Person",
        activeId: null,
        mode: "list",
        relate: null,
      };
    case "startCreatePerson":
      return {
        ...state,
        activeType: "Person",
        activeId: null,
        mode: "create",
        relate: null,
      };
    case "selectPerson":
    case "enterPersonDetail":
      return {
        ...state,
        activeType: "Person",
        activeId: action.personId,
        mode: "detail",
        relate: null,
      };
    case "startRelateCar":
      return {
        ...state,
        activeType: "Car",
        activeId: null,
        mode: "relate",
        relate: {
          fromType: "Person",
          fromId: action.personId,
        },
      };
    case "selectCarForRelate":
      return {
        ...state,
        activeType: "Car",
        activeId: action.carId,
        mode: "relate",
      };
    case "confirmRelateCar":
      return {
        ...state,
        activeType: "Person",
        activeId: state.relate?.fromId ?? state.activeId,
        mode: "detail",
      };
    case "exitRelateBackToPerson":
      return {
        ...state,
        activeType: "Person",
        activeId: state.relate?.fromId ?? state.activeId,
        mode: "detail",
        relate: null,
      };
    case "clearSelection":
      return {
        ...state,
        activeId: null,
        mode: "list",
        relate: null,
      };
    default:
      return state;
  }
};

export const getActiveScreen = (state: DemoAppState): DemoScreen => {
  if (state.mode === "relate") {
    return "CarRelate";
  }

  if (state.mode === "create") {
    return "CreatePerson";
  }

  if (state.mode === "detail" && state.activeId) {
    return "PersonDetail";
  }

  return "PeopleHome";
};
