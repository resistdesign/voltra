import { FC, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../src/app/utils";
import { TypeInfoForm } from "../src/app/components/TypeInfoForm";
import { TypeInfoMap } from "../src/common/TypeParsing/TypeInfo";
import { getTypeInfoMapFromTypeScript } from "../src/common/TypeParsing";

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
`;

const DEMO_TS = `
export type Person = {
  /**
  * @label First Name
  */
  firstName: string;
  /**
  * @label Last Name
  */
  lastName: string;
  /**
  * @label Age
  * @format number
  * @constraints_defaultValue "18.0"
  * @constraints_step 0.5
  * @constraints_min 18.0
  * @constraints_max 150.0
  */
  age: number;
  /**
  * @label Phone Number (+### (###) ###-####)
  * @format tel
  * @constraints_pattern ^\+\d+(-\d+)? \(\d{3}\) \d{3}-\d{4}$
  */
  phoneNumber: string;
  /**
  * @label Email
  * @format email
  */
  email: string;
  /**
  * @label Friends
  */
  friends: Person[];
  /**
  * @label Likes Cheese
  * @constraints_defaultValue true
  */
  likesCheese: boolean;
};
`;
const DEMO_TYPE_INFO_MAP: TypeInfoMap = getTypeInfoMapFromTypeScript(DEMO_TS);

export const App: FC = () => {
  const [value, setValue] = useState<Record<any, any>>({});

  console.log("Person:", value);

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
          onNavigateToType={undefined /* TODO: Implement. */}
        />
      </Route>
    </ApplicationStateProvider>
  );
};
