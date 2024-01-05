import React, { FC, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { getLocalJSON, LocalJSON } from './Storage/LocalJSON';

const TRAIL_PREFIX = 'Trail';
const MAIN_TRAIL = 'Default';
const TRAIL_SERVICE: LocalJSON = getLocalJSON(TRAIL_PREFIX);
const DEFAULT_TRAIL: NavigationTrail = (TRAIL_SERVICE.read(MAIN_TRAIL) || []) as any;

export type NavigationPath = (string | number)[];

export type NavigationBreadcrumb = {
  label: string;
  path: NavigationPath;
  isListItem?: boolean;
};

export type NavigationTrail = NavigationBreadcrumb[];

export const navigateTo = (breadcrumb: NavigationBreadcrumb, trail: NavigationTrail = []): NavigationTrail => [
  ...trail,
  breadcrumb,
];

export const navigateBack = (trail: NavigationTrail = []): NavigationTrail => {
  const [_lastBreadCrumb, ...newTrail] = [...trail].reverse();

  return newTrail.reverse();
};

export const getNavigationPath = (trail: NavigationTrail = []): NavigationPath => {
  return (
    trail
      .map(({ path }) => path)
      // @ts-ignore
      .flat()
  );
};

export type NavigateToHandler = (breadcrumb: NavigationBreadcrumb) => void;

export type NavigateBackHandler = () => void;

export type NavigationTrailSetter = (newTrail: NavigationTrail) => void;

export type Navigation = {
  trail: NavigationTrail;
  path: NavigationPath;
  onNavigateTo: NavigateToHandler;
  onNavigateBack: NavigateBackHandler;
  onSetTrail: NavigationTrailSetter;
};

export const useNavigation = (storeTrail: boolean = false): Navigation => {
  const [trail, setTrail] = useState<NavigationTrail>(storeTrail ? DEFAULT_TRAIL : []);
  const path = useMemo(() => getNavigationPath(trail), [trail]);
  const onNavigateTo = useCallback(
    (breadcrumb: NavigationBreadcrumb) => setTrail(navigateTo(breadcrumb, trail)),
    [trail, setTrail]
  );
  const onNavigateBack = useCallback(() => setTrail(navigateBack(trail)), [trail, setTrail]);
  const navigation = useMemo(
    () => ({
      trail,
      path,
      onNavigateTo,
      onNavigateBack,
      onSetTrail: setTrail,
    }),
    [trail, path, onNavigateTo, onNavigateBack]
  );

  useEffect(() => {
    if (storeTrail) {
      TRAIL_SERVICE.update(MAIN_TRAIL, trail);
    }
  }, [trail, storeTrail]);

  return navigation;
};

const BreadcrumbBox = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 1em;
  overflow: auto;
  width: 100%;
`;
const BreadcrumbButton = styled.button`
  flex: 1 0 auto;
  text-wrap: none;
  width: auto;
`;

export type NavigationBreadcrumbsProps = {
  trail: NavigationTrail;
  onChange: (newTrail: NavigationTrail) => void;
};

export const NavigationBreadcrumbs: FC<NavigationBreadcrumbsProps> = ({ trail, onChange }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const onGoToBreadcrumb = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const {
        target: { value },
      } = event as any;
      const index = parseInt(value, 10);
      const newTrail = [...trail].slice(0, index + 1);

      onChange(newTrail);
    },
    [trail, onChange]
  );

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView();
  }, [trail]);

  return (
    <BreadcrumbBox ref={listRef}>
      {trail.length > 0 ? (
        <BreadcrumbButton type="button" value={-1} onClick={onGoToBreadcrumb}>
          Home
        </BreadcrumbButton>
      ) : undefined}
      {trail.map((bc, index) => {
        const { label } = bc;

        return (
          <BreadcrumbButton
            disabled={index === trail.length - 1}
            type="button"
            key={index}
            value={index}
            onClick={onGoToBreadcrumb}
          >
            {label}
          </BreadcrumbButton>
        );
      })}
    </BreadcrumbBox>
  );
};
