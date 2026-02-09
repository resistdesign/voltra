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
 *   useApplicationStateLoader,
 *   useApplicationStateValueStructure,
 *   type RemoteProcedureCall,
 * } from "@resistdesign/voltra/app";
 * ```
 *
 * @see {@link useApplicationStateValueStructure} and
 * {@link useApplicationStateLoader} for good starting points.
 *
 * @example
 * ```tsx
 * import {
 *   useApplicationStateLoader,
 *   useApplicationStateValueStructure,
 *   type RemoteProcedureCall,
 * } from "@resistdesign/voltra/app";
 * import { useCallback } from "react";
 *
 * const APP_STATE_IDENTIFIERS = {
 *   LOGIN: {
 *     USERNAME: {},
 *     PASSWORD: {},
 *     LOGGED_IN: {},
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
 *     valueStructure: {
 *       username: username = "",
 *       password: password = "",
 *       loggedIn: loggedIn = false,
 *     },
 *     onChangeStructure: {
 *       username: setUsername,
 *       password: setPassword,
 *       loggedIn: setLoggedIn,
 *     },
 *   } = useApplicationStateValueStructure<{
 *     username: string;
 *     password: string;
 *     loggedIn: boolean;
 *   }>({
 *     username: APP_STATE_IDENTIFIERS.LOGIN.USERNAME,
 *     password: APP_STATE_IDENTIFIERS.LOGIN.PASSWORD,
 *     loggedIn: APP_STATE_IDENTIFIERS.LOGIN.LOGGED_IN,
 *   });
 *
 *   const { loading: loadingLogin, makeRemoteProcedureCall } =
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
 *   return { username, password, loggedIn, setUsername, setPassword, onSubmit, loadingLogin };
 * };
 * ```
 *
 * See also: `@resistdesign/voltra/web` and `@resistdesign/voltra/native` for
 * runtime-specific UI helpers.
 */

/**
 * @deprecated Prefer domain-flat imports such as
 * `import { parseTemplate } from "@resistdesign/voltra/app"`.
 */
export * as Utils from "./utils";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { createFormRenderer } from "@resistdesign/voltra/app"`.
 */
export * as Forms from "./forms";

export * from "./utils";
export * from "./forms";
