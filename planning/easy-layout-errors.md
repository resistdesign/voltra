# EasyLayout Errors

We have a problem in `src/web/utils/EasyLayout.tsx`.

The function `styledFactory` has the totally wrong approach.

What we need instead are base styled components that already exist, but that have props where the dynamic layout values can be passed in.

We CANNOT use `styled` inside a `render` method.

Here are the runtime errors/warnings from running the EasyLayoutDemo, from the demo site, in the browser:

```
installHook.js:1 Warning: Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://reactjs.org/link/rules-of-hooks Error Component Stack
    at EasyLayoutDemo (EasyLayoutDemo.tsx:32:35)
    at Route (Route.tsx:264:3)
    at Route (Route.tsx:151:24)
    at div (<anonymous>)
    at Route (Route.tsx:264:3)
    at RouteProvider (Route.tsx:202:3)
    at RouteProvider (Route.tsx:129:33)
    at Route (Route.tsx:151:24)
    at ApplicationStateProvider (ApplicationState.tsx:339:3)
    at App (<anonymous>)

installHook.js:1 The component styled.div with the id of "sc-kUouGy" has been created dynamically.
You may see this warning because you've called styled inside another component.
To resolve this only create new StyledComponents outside of any render method and function component.
See https://styled-components.com/docs/basics#define-styled-components-outside-of-the-render-method for more info.
 Error Component Stack
    at EasyLayoutDemo (EasyLayoutDemo.tsx:32:35)
    at Route (Route.tsx:264:3)
    at Route (Route.tsx:151:24)
    at div (<anonymous>)
    at Route (Route.tsx:264:3)
    at RouteProvider (Route.tsx:202:3)
    at RouteProvider (Route.tsx:129:33)
    at Route (Route.tsx:151:24)
    at ApplicationStateProvider (ApplicationState.tsx:339:3)
    at App (<anonymous>)
```
