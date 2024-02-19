/**
 * Route RPC back-end API requests to the appropriate functions with context about authentication, the request itself and more.
 * */
export * as API from "./api";

/**
 * Build front-end applications with React/TypeScript, layout systems, form generation, RPC requests, easy state management and more.
 *
 * @see {@link getEasyLayout}, {@link TypeStructureComponent} and {@link useApplicationStateLoader} for some great starting points.
 *
 * @example
 * ```tsx
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
 * const LOGIN_RPC: RemoteProcedureCall = {
 *   serviceConfig: LOGIN_SERVICE_CONFIG,
 *   path: "/login",
 *   args: [],
 * };
 *
 * const {
 *   layout: LoginLayout,
 *   areas: { Header, Side, Main },
 * } = getEasyLayout()`
 *   header header, 1fr
 *   side main, 3fr
 *   // 1fr 3fr
 * `;
 *
 * export const Login: FC = () => {
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
 *   const onUsernameChange = useCallback(
 *     (event: ReactChangeEvent<HTMLInputElement>) => {
 *       setUsername(event.target.value);
 *     },
 *     [setUsername],
 *   );
 *   const onPasswordChange = useCallback(
 *     (event: ReactChangeEvent<HTMLInputElement>) => {
 *       setPassword(event.target.value);
 *     },
 *     [setPassword],
 *   );
 *   const { loading: loadingLogin, makeRemoteProcedureCall } =
 *     useApplicationStateLoader({
 *       identifier: APP_STATE_IDENTIFIERS.LOGIN.LOGGED_IN,
 *       remoteProcedureCall: LOGIN_RPC,
 *       manual: true,
 *     });
 *   const onSubmit = useCallback(() => {
 *     makeRemoteProcedureCall(username, password);
 *   }, [username, password, makeRemoteProcedureCall]);
 *
 *   return (
 *     <LoginLayout>
 *       <Header>
 *         <h1>Login</h1>
 *       </Header>
 *       <Side>
 *         <h5>Login here:</h5>
 *       </Side>
 *       <Main>
 *         {loadingLogin ? (
 *           <>Loading...</>
 *         ) : loggedIn ? (
 *           <>Logged In!</>
 *         ) : (
 *           <BaseForm onSubmit={onSubmit}>
 *             <input
 *               type="text"
 *               placeholder="Username"
 *               value={username}
 *               onChange={onUsernameChange}
 *             />
 *             <br />
 *             <input
 *               type="password"
 *               placeholder="Password"
 *               value={password}
 *               onChange={onPasswordChange}
 *             />
 *             <br />
 *             <br />
 *             <button type="submit">Log In</button>
 *           </BaseForm>
 *         )}
 *       </Main>
 *     </LoginLayout>
 *   );
 * };
 * ```
 * */
export * as App from "./app";

/**
 * Build infrastructure as code with reusable components and utilities.
 *
 * @usage Start with `SimpleCTF`, add packs and use utilities as needed.
 *
 * @example
 * ```typescript
 * const ctf = new SimpleCTF()
 *   .applyPack(
 *     addDNS,
 *     {
 *       hostedZoneIdParameterName: "<YOUR_INFO_HERE>"
 *       domainNameParameterName: "<YOUR_INFO_HERE>"
 *       localUIDevelopmentDomainName: "<YOUR_INFO_HERE>"
 *       localUIDevelopmentIPAddress: "<YOUR_INFO_HERE>"
 *     }
 *   );
 *
 * console.log(cft.template);
 *  ```
 * */
export * as IaC from "./iac";
