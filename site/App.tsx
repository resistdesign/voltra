import { FC, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../src/app/utils";
import { NumberInput } from "../src/app/components/FormGen/NumberInput";

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

export const App: FC = () => {
  const [val, setVal] = useState<number>(0);

  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <h1>Demos</h1>
        <a href="https://docs.voltra.app/docs">Docs</a>
        <br />
        <NumberInput
          value={val}
          onChange={(v) => {
            setVal(v);
          }}
        />
      </Route>
    </ApplicationStateProvider>
  );
};
