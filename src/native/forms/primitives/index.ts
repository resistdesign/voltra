/**
 * @packageDocumentation
 *
 * React Native primitives for the form generation system.
 */

import { createElement } from "react";

const getNative = () => require("react-native") as any;

/**
 * Wrapper for grouped field content.
 */
export const FieldWrapper = (props: { children?: React.ReactNode }) => {
  const { View } = getNative();
  return createElement(View, null, props.children);
};

/**
 * Inline error message renderer.
 */
export const ErrorMessage = ({ children }: { children: React.ReactNode }) => {
  const { Text } = getNative();
  return createElement(Text, { style: { color: "#AA0000" } }, children);
};

/**
 * Container for array field items.
 */
export const ArrayContainer = (props: { children?: React.ReactNode }) => {
  const { View } = getNative();
  return createElement(View, null, props.children);
};

/**
 * Wrapper for an individual array item row.
 */
export const ArrayItemWrapper = (props: { children?: React.ReactNode }) => {
  const { View } = getNative();
  return createElement(View, null, props.children);
};

/**
 * Minimal button primitive.
 */
export const Button = ({
  children,
  disabled,
  onPress,
}: {
  children?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) => {
  const { Pressable, Text } = getNative();
  return createElement(
    Pressable,
    { onPress, disabled },
    createElement(Text, null, children),
  );
};
