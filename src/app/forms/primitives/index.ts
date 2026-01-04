/**
 * @packageDocumentation
 *
 * Tier 1 primitives for the form generation system.
 */

import styled from "styled-components";

export const FieldWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

export const Label = styled("label")`
  font-weight: 500;
  font-size: 0.875rem;
  color: #333;
`;

export const Input = styled("input")`
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

export const Select = styled("select")`
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

export const CheckboxWrapper = styled("div")`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ErrorMessage = styled("span")`
  color: #dc3545;
  font-size: 0.875rem;
`;

export const Button = styled("button")`
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
      background-color: #e0e0e0;
  }
`;

export const ArrayContainer = styled("div")`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1rem;
    border-left: 2px solid #eee;
`;

export const ArrayItemWrapper = styled("div")`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;
