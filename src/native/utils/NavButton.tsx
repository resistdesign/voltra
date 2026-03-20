/**
 * @packageDocumentation
 *
 * Native intra-application navigation button.
 */

import type { FC } from "react";
import { createElement } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useRouteContext } from "../../app/utils/Route";

/**
 * Props for {@link NavButton}.
 */
export type NavButtonProps = PressableProps & {
  /** Relative or absolute Voltra route path. */
  path: string;
  /** Use adapter `replace` instead of `push` when true. */
  replace?: boolean;
};

/**
 * Render a pressable control that navigates within the current Voltra app.
 *
 * Relative paths resolve from the route context where this component renders.
 *
 * @param props - Pressable props plus the destination route path.
 * @returns Pressable element wired to the current route adapter.
 */
export const NavButton: FC<NavButtonProps> = ({
  path,
  replace = false,
  onPress,
  disabled,
  children,
  ...other
}) => {
  const { adapter } = useRouteContext();

  const onPressInternal: NonNullable<PressableProps["onPress"]> = (event) => {
    onPress?.(event);

    if (disabled || (event as { defaultPrevented?: boolean } | undefined)?.defaultPrevented) {
      return;
    }

    const navigate = replace ? adapter?.replace : adapter?.push;
    navigate?.(path);
  };

  return createElement(
    Pressable,
    {
      ...other,
      disabled,
      onPress: onPressInternal,
    },
    children as any,
  );
};
