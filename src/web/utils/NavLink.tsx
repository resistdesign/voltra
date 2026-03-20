/**
 * @packageDocumentation
 *
 * Web intra-application navigation link.
 */

import type { AnchorHTMLAttributes, FC, MouseEvent } from "react";
import { createElement } from "react";
import { resolveRouteAdapterPath } from "../../common/Routing";
import { useRouteContext } from "../../app/utils/Route";

/**
 * Props for {@link NavLink}.
 */
export type NavLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  /** Relative or absolute Voltra route path. */
  path: string;
  /** Use adapter `replace` instead of `push` when true. */
  replace?: boolean;
};

/**
 * Render an anchor-like control that navigates within the current Voltra app.
 *
 * Relative paths resolve from the route context where this component renders.
 *
 * @param props - Anchor props plus the destination route path.
 * @returns Anchor element wired to the current route adapter.
 */
export const NavLink: FC<NavLinkProps> = ({
  path,
  replace = false,
  onClick,
  title,
  children,
  ...other
}) => {
  const { adapter, adapterBasePath } = useRouteContext();
  const href = resolveRouteAdapterPath(adapterBasePath, path);

  const onClickInternal = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    const navigate = replace ? adapter?.replace : adapter?.push;
    if (!navigate) {
      return;
    }

    event.preventDefault();
    navigate(path, title);
  };

  return createElement(
    "a",
    {
      ...other,
      href,
      title,
      onClick: onClickInternal,
    },
    children,
  );
};
