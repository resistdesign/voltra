import { FC } from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../../src/app/utils";

const GlobalStyle = createGlobalStyle`
    html,
    body,
    #app-root {
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

    #app-root {
        overflow: auto;
    }
`;

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <Route exact>
          <h1>Voltra</h1>
          <h3>Info</h3>
          <a href="https://docs.voltra.app/docs">Docs</a>
          <br />
          <h3>Demos</h3>
          <a href="type-info">Type Info</a>
          <br />
        </Route>
        <Route path="type-info">Coming Soon.</Route>
      </Route>
    </ApplicationStateProvider>
  );
};
