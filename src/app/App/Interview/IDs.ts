import { getApplicationStateIdentifier } from '../../utils/ApplicationState';

const ADD_MESSAGE = getApplicationStateIdentifier();
const MESSAGES = getApplicationStateIdentifier();

export const INTERVIEW = getApplicationStateIdentifier({
  ADD_MESSAGE,
  MESSAGES,
});
