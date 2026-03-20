# Feature: Client-side Routing Relative Path Navigation Refinement

## Problem:

Take exhibit `A` for example. In this scenario, when we navigate from the path in the *current routing context*, we do
NOT
navigate relative to that parent path. Rather, we navigate relative to the *full* path that we are now at.

Exhibit `A`:

```tsx
import React, {FC, useCallback} from 'react';
import {Route} from '@resistdesign/voltra/native';
import {ItemList} from './Screens/ItemList/ItemList';
import {ItemListDetails} from './Screens/ItemList/ItemListDetails';
import {ItemListReview} from './Screens/ItemList/ItemListReview';
import {useRouteContext} from '@resistdesign/voltra/app';
import {ItemListEntry} from '../common/Types';

export type ItemListRoutesProps = {
  authorization?: string;
};

export const ItemListRoutes: FC<ItemListRoutesProps> = ({authorization}) => {
  const {adapter, parentPath} = useRouteContext();
  const onItemListEntrySelected = useCallback(
    (entry: ItemListEntry) => {
      if (entry) {
        const {remoteId, remoteSystem} = entry;
        const cleanRemoteId = encodeURIComponent(remoteId);
        const cleanRemoteSystem = encodeURIComponent(remoteSystem);

        adapter?.push?.(`/${parentPath}/details/${cleanRemoteId}/${cleanRemoteSystem}`);
      }
    },
    [adapter, parentPath],
  );
  const onGotoItemListReview = useCallback(() => {
    adapter?.push?.(`/${parentPath}/review`);
  }, [adapter, parentPath]);

  return (
    <>
      <Route exact>
        <ItemList authorization={authorization} onEntrySelected={onItemListEntrySelected}/>
      </Route>
      <Route path="details/:remoteId/:remoteSystem">
        <ItemListDetails authorization={authorization} onGoToReview={onGotoItemListReview}/>
      </Route>
      <Route path="review">
        <ItemListReview authorization={authorization}/>
      </Route>
    </>
  );
};
```

So, for instance, if we are currently at the `details/:remoteId/:remoteSystem` Route and we want to navigate to the
`review` Route, we need to `push` a slash, meaning root, then the parent path from "this" route context, and then the
"relative" destination path. Even though, the `adapter` is *from* the route context at this current route level.

What one might expect to happen, is that we can simply `push` the relative path. The `adapter` knowing what parent path
it is at, and we will navigate relative to the parent path at this context level.

Then... if an `adapter` is used from within a child Route, for instance, the "details" Route, then a relative path
push/replace/etc would navigate relative to the "details" path.

Overall, meaning that *relative* path navigation should be relative to the value of the `parentPath` from the context
where the `adapter`, that's used, is accquired. And not *relative* to the current *full path* that the application is
at, overall.

## Considerations:

For Routes on the web or native web target, the history might need to be wrapped to provide this functionality.
Although, the history might already be wrapped. That will need to be checked.

## Additional Goal:

Voltra doesn't have a built-in navigation link component yet. And that seems like a shortcoming.

Not a URL link, an intra-application navigational link.

There will likely need to be one for the `web` barrel and one for the `native` barrel.

A native example might look something like this:

```tsx
import {Pressable, PressableProps} from 'react-native';
import React, {FC, useCallback} from 'react';
import {useRouteContext} from '@resistdesign/voltra/app';

export type NavButtonProps = PressableProps & {
  path: string;
};

export const NavButton: FC<NavButtonProps> = ({path, children, ...other}) => {
  const {adapter} = useRouteContext();
  const onPressInternal = useCallback(() => adapter?.push?.(path), [adapter, path]);

  return (
    <Pressable {...other} onPress={onPressInternal}>
      {children}
    </Pressable>
  );
};
```

They will need the following:

1. Full pass-through props for complete consumer control.
2. Tests
3. Doc-comments
4. Possible examples, samples or appearances in the demo site.

## Final Notes:

Be thorough, make sure everything around *all* of this is updated and properly tested and functioning.

Not that this should cause any breaking changes per se, but if it does, this project is still in alpha and we do not
need or want to use deprication for anything at all. Just make the changes, nice clean and new.
