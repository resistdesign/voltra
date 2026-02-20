import React from "react";

type Listener = () => boolean;

let backListener: Listener | undefined;

export const Platform = {
  OS: "android",
};

export const BackHandler = {
  addEventListener: (_eventName: "hardwareBackPress", listener: Listener) => {
    backListener = listener;
    return {
      remove: () => {
        if (backListener === listener) {
          backListener = undefined;
        }
      },
    };
  },
  removeEventListener: (_eventName: "hardwareBackPress", listener: Listener) => {
    if (backListener === listener) {
      backListener = undefined;
    }
  },
  __triggerHardwareBackPress: () => backListener?.() ?? false,
};

type PrimitiveProps = Record<string, any> & { children?: React.ReactNode };

const createPrimitive = (
  tag: "div" | "span" | "button" | "input",
  displayName: string,
  normalize?: (props: PrimitiveProps) => PrimitiveProps,
) => {
  const Primitive = ({ children, ...props }: PrimitiveProps) => {
    const normalized = normalize ? normalize(props) : props;
    return React.createElement(
      tag,
      { "data-rn": displayName, ...normalized },
      children,
    );
  };
  Primitive.displayName = displayName;
  return Primitive;
};

export const View = createPrimitive("div", "View", (props) => {
  const { style, ...rest } = props;
  return rest;
});

export const Text = createPrimitive("span", "Text", (props) => {
  const { style, ...rest } = props;
  return rest;
});

export const Pressable = createPrimitive("button", "Pressable", (props) => {
  const { onPress, disabled, style, ...rest } = props;
  return {
    ...rest,
    type: "button",
    disabled: !!disabled,
    onClick: onPress,
  };
});

export const Switch = createPrimitive("input", "Switch", (props) => {
  const { onValueChange, value, disabled, style, ...rest } = props;
  return {
    ...rest,
    type: "checkbox",
    checked: !!value,
    disabled: !!disabled,
    onChange: (event: { target: { checked: boolean } }) =>
      onValueChange?.(!!event.target.checked),
  };
});

export const TextInput = createPrimitive("input", "TextInput", (props) => {
  const { onChangeText, value, editable, style, ...rest } = props;
  return {
    ...rest,
    value: value ?? "",
    disabled: editable === false,
    onChange: (event: { target: { value: string } }) =>
      onChangeText?.(event.target.value),
  };
});
