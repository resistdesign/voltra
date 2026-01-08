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
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.25em;
`;

/**
 * Inline error message styling.
 */
export const ErrorMessage = styled("span")`
  color: #AA0000;
`;

/**
 * Container for array field items.
 */
export const ArrayContainer = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.5em;
`;

/**
 * Wrapper for an individual array item row.
 */
export const ArrayItemWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5em;
`;
