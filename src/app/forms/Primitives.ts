/**
 * @packageDocumentation
 *
 * Tier 1 primitives for the form generation system.
 */

import styled from "../helpers/styled";

/**
 * Wrapper for grouped field content.
 */
export const FieldWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

/**
 * Label element for form controls.
 */
export const Label = styled("label")`
  font-weight: 500;
  font-size: 0.875rem;
`;

/**
 * Base input styling for text, number, and checkbox controls.
 */
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

/**
 * Select dropdown styling.
 */
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

/**
 * Wrapper for checkbox input and label alignment.
 */
export const CheckboxWrapper = styled("div")`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/**
 * Inline error message styling.
 */
export const ErrorMessage = styled("span")`
  color: #dc3545;
  font-size: 0.875rem;
`;

/**
 * Button styling for form actions.
 */
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

/**
 * Container for array field items.
 */
export const ArrayContainer = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1rem;
  border-left: 2px solid #eee;
`;

/**
 * Wrapper for an individual array item row.
 */
export const ArrayItemWrapper = styled("div")`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;
