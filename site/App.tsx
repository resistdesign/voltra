import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useState,
} from "react";
import { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../src/app/utils";
import { NumberInput } from "../src/app/components/FormGen/NumberInput";
import { BooleanInput } from "../src/app/components/FormGen/BooleanInput";

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
  const [val, setVal] = useState<number>(1e86);
  const [boolVal, setBoolVal] = useState<boolean>(false);
  const onNumberInputChange = useCallback((value: any) => {
    setVal(value as number);
  }, []);
  const onBasicInputChange = useCallback(
    ({
      target: { value: newValue = "0" },
    }: ReactChangeEvent<HTMLInputElement>) => {
      setVal(Number(newValue));
    },
    [],
  );
  const onBooleanInputChange = useCallback((newValue: any) => {
    setBoolVal(newValue as boolean);
  }, []);

  console.log(val, typeof val, boolVal);

  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <h1>Demos</h1>
        <a href="https://docs.voltra.app/docs">Docs</a>
        <br />
        <NumberInput value={val} onChange={onNumberInputChange} type="number" />
        <br />
        <input type="number" value={val} onChange={onBasicInputChange} />
        <br />
        <BooleanInput value={boolVal as any} onChange={onBooleanInputChange} />
      </Route>
    </ApplicationStateProvider>
  );
};
