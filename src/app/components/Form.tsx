import React, { FC, FormEvent, FormHTMLAttributes } from "react";
import styled from "styled-components";

/**
 * @ignore
 * */
export type FormBaseProps = FormHTMLAttributes<HTMLFormElement>;

const FormBase: FC<FormBaseProps> = ({ onSubmit, ...rest }) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return <form onSubmit={handleSubmit} {...rest} />;
};

/**
 * A basic form element wrapper that handles form submission in an expected and normalized way.
 * */
export const Form = styled(FormBase).attrs((p) => ({
  className: "form-normalized-outer-spacing",
}))`
  &.form-normalized-outer-spacing {
    margin-bottom: 0;
  }
`;
