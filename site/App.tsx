import { FC } from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../src/app/utils";

const GlobalStyle = createGlobalStyle`
    html,
    body {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        width: 100vw;
        height: 100vh;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
`;

// TODO: Input types:
//  string
//  number
//  boolean
//  option selector
//  option selector w/ custom value
//  custom (i.e. date picker)
//  existing object
//  sub form/object
//  array of all of the above

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <h1>Demos</h1>
        <a href="https://docs.voltra.app/docs">Docs</a>
        <br/>
        <input />
      </Route>
    </ApplicationStateProvider>
  );
};
