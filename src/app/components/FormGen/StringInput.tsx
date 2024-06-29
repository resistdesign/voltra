import {InputHTMLAttributes} from "react";

export type StringInputProps = InputHTMLAttributes<HTMLInputElement>;

export const StringInput: FC = () => {
  return (
    <input type="text" />
  );
};
