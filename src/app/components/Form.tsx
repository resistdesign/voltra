import React, { FC, FormEvent, FormHTMLAttributes } from "react";
import styled from "styled-components";

const FormBase = styled.form.attrs((p) => ({
  className: "form-normalized-outer-spacing",
}))`
  &.form-normalized-outer-spacing {
    margin-bottom: 0;
  }
`;

/**
 * The props for the form component.
 * */
export type FormProps = FormHTMLAttributes<HTMLFormElement>;

/**
 * A basic form element wrapper that handles form submission in an expected and normalized way.
 * */
export const Form: FC<FormProps> = ({ onSubmit, ...rest }) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return <FormBase onSubmit={handleSubmit} {...rest} />;
};
