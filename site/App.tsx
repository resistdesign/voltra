import { FC, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../src/app/utils";
import { TypeInfoForm } from "../src/app/components/TypeInfoForm";
import { TypeInfoMap } from "../src/common/TypeParsing/TypeInfo";
import { getTypeInfoMapFromTypeScript } from "../src/common/TypeParsing";

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

const DEMO_TS = `
export type Person = {
  firstName: string;
  lastName: string;
  age: number;
  phoneNumber: string;
  email: string;
  friends: Person[];
};
`;
const DEMO_TYPE_INFO_MAP: TypeInfoMap = getTypeInfoMapFromTypeScript(DEMO_TS);

export const App: FC = () => {
  const [value, setValue] = useState<Record<any, any>>({});

  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <h1>Demos</h1>
        <a href="https://docs.voltra.app/docs">Docs</a>
        <br />
        <TypeInfoForm
          typeInfoMap={DEMO_TYPE_INFO_MAP}
          typeInfoName={"Person"}
          value={value}
          onChange={setValue}
        />
      </Route>
    </ApplicationStateProvider>
  );
};
