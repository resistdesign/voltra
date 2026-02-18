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

const createPrimitive = (name: string) => {
  return ({ children, ...props }: Record<string, any>) =>
    React.createElement(name, props, children);
};

export const View = createPrimitive("View");
export const Text = createPrimitive("Text");
export const Pressable = createPrimitive("Pressable");
export const Switch = createPrimitive("Switch");
export const TextInput = createPrimitive("TextInput");
