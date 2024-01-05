import React, { FC, FormEvent, FormHTMLAttributes } from 'react';
import styled from 'styled-components';

export type FormProps = FormHTMLAttributes<HTMLFormElement>;

const FormBase: FC<FormProps> = ({ onSubmit, ...rest }) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return <form onSubmit={handleSubmit} {...rest} />;
};

export const Form = styled(FormBase).attrs((p) => ({
  className: 'form-normalized-outer-spacing',
}))`
  &.form-normalized-outer-spacing {
    margin-bottom: 0;
  }
`;
