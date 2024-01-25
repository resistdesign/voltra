import React, { FC, FormEvent, FormHTMLAttributes } from "react";
import styled from "styled-components";

export type BaseFormProps = FormHTMLAttributes<HTMLFormElement>;

const FormBase: FC<BaseFormProps> = ({ onSubmit, ...rest }) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return <form onSubmit={handleSubmit} {...rest} />;
};

export const BaseForm = styled(FormBase).attrs((p) => ({
  className: "form-normalized-outer-spacing",
}))`
  &.form-normalized-outer-spacing {
    margin-bottom: 0;
  }
`;
