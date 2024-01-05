import { UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';

export type AppEnvConfig = {
  api: {
    baseUrl: string;
    domain: string;
  };
  oauth: {
    clientId: string;
    domain: string;
    scope: string;
    redirectSignIn: string;
    redirectSignOut: string;
    responseType: string;
  };
  cookies: {
    domain: string;
    path: string;
    expires: number;
    secure: boolean;
    httpOnly: boolean;
  };
};

export const APP_ENV_CONFIG: AppEnvConfig = {
  api: {
    baseUrl: `https://${process.env.API_DOMAIN}`,
    domain: process.env.API_DOMAIN as string,
  },
  oauth: {
    clientId: process.env.USER_POOL_CLIENT_ID as string,
    domain: process.env.OAUTH_CONFIG_DOMAIN as string,
    scope: ['phone', 'email', 'profile', 'openid'].join(' '),
    redirectSignIn: process.env.USER_POOL_CLIENT_CALLBACK_URL as string,
    redirectSignOut: process.env.USER_POOL_CLIENT_LOGOUT_URL as string,
    responseType: 'code',
  },
  cookies: {
    domain: process.env.USER_POOL_CLIENT_COOKIE_DOMAIN as string,
    path: '/',
    expires: 1,
    secure: true,
    httpOnly: true,
  },
};

export const USER_MANAGER_CONFIG: UserManagerSettings = {
  loadUserInfo: true,
  authority: APP_ENV_CONFIG.oauth.domain,
  client_id: APP_ENV_CONFIG.oauth.clientId,
  redirect_uri: APP_ENV_CONFIG.oauth.redirectSignIn,
  response_type: APP_ENV_CONFIG.oauth.responseType,
  scope: APP_ENV_CONFIG.oauth.scope,
  automaticSilentRenew: true,
  revokeTokensOnSignout: true,
  post_logout_redirect_uri: `https://${process.env.USER_POOL_CLIENT_DOMAIN}/logout?client_id=${
    process.env.USER_POOL_CLIENT_ID
  }&logout_uri=${encodeURIComponent(process.env.USER_POOL_CLIENT_LOGOUT_URL as string)}`,
  userStore: new WebStorageStateStore({
    store: localStorage,
    prefix: 'APP_USER_AUTH:',
  }),
};
