/**
 * @packageDocumentation
 *
 * Build front-end applications with React and TypeScript utilities, including
 * layout/state helpers and form generation support.
 *
 * Import from the app subpath only:
 * ```ts
 * import {
 *   createFormRenderer,
 *   getApplicationStateIdentifier,
 *   useApplicationStateLoader,
 *   useApplicationStateValue,
 *   type RemoteProcedureCall,
 * } from "@resistdesign/voltra/app";
 * ```
 *
 * @see {@link useApplicationStateValue} and {@link useApplicationStateLoader}
 * for good starting points.
 *
 * Reference examples:
 * - `examples/README.md`
 * - `examples/routing/app-routing.ts`
 *
 * @example
 * ```tsx
 * import {
 *   getApplicationStateIdentifier,
 *   useApplicationStateLoader,
 *   useApplicationStateValue,
 *   type RemoteProcedureCall,
 * } from "@resistdesign/voltra/app";
 * import { useCallback } from "react";
 *
 * const loginUsernameId = getApplicationStateIdentifier<string>();
 * const loginPasswordId = getApplicationStateIdentifier<string>();
 * const loginLoggedInId = getApplicationStateIdentifier<boolean>();
 *
 * const APP_STATE_IDENTIFIERS = {
 *   LOGIN: {
 *     USERNAME: loginUsernameId,
 *     PASSWORD: loginPasswordId,
 *     LOGGED_IN: loginLoggedInId,
 *   },
 * };
 *
 * const LOGIN_SERVICE_CONFIG = {
 *   protocol: "https",
 *   domain: "example.com",
 *   basePath: "/api",
 * };
 *
 * const LOGIN_RPC: RemoteProcedureCall = {
 *   serviceConfig: LOGIN_SERVICE_CONFIG,
 *   path: "/login",
 *   args: [],
 * };
 *
 * export const LoginController = () => {
 *   const {
 *     value: username = "",
 *     onChange: setUsername,
 *   } = useApplicationStateValue(APP_STATE_IDENTIFIERS.LOGIN.USERNAME);
 *   const {
 *     value: password = "",
 *     onChange: setPassword,
 *   } = useApplicationStateValue(APP_STATE_IDENTIFIERS.LOGIN.PASSWORD);
 *   const {
 *     value: loggedIn = false,
 *     onChange: setLoggedIn,
 *   } = useApplicationStateValue(APP_STATE_IDENTIFIERS.LOGIN.LOGGED_IN);
 *
 *   const {
 *     value: latestLoginState,
 *     modified: loginStateModified,
 *     loading: loadingLogin,
 *     makeRemoteProcedureCall,
 *   } =
 *     useApplicationStateLoader({
 *       identifier: APP_STATE_IDENTIFIERS.LOGIN.LOGGED_IN,
 *       remoteProcedureCall: LOGIN_RPC,
 *       manual: true,
 *     });
 *
 *   const onSubmit = useCallback(() => {
 *     makeRemoteProcedureCall(username, password);
 *   }, [username, password, makeRemoteProcedureCall]);
 *
 *   return {
 *     username,
 *     password,
 *     loggedIn,
 *     latestLoginState,
 *     loginStateModified,
 *     setUsername,
 *     setPassword,
 *     setLoggedIn,
 *     onSubmit,
 *     loadingLogin,
 *   };
 * };
 * ```
 *
 * See also: `@resistdesign/voltra/web` and `@resistdesign/voltra/native` for
 * runtime-specific UI helpers.
 */

/**
 * @category app
 * @group State and Services
 */
export * from "./utils";
/**
 * @category app
 * @group Forms
 */
export * from "./forms";
