import { FC, useCallback, useMemo } from 'react';
import { Route, useRouteContext } from './utils/Route';
import { AuthProvider, useAuth, UserManager } from 'oidc-react';
import { USER_MANAGER_CONFIG } from './config';
import { LoginComplete } from './App/LoginComplete';
import styled, { createGlobalStyle } from 'styled-components';
import { ApplicationStateProvider } from './utils/ApplicationState';
import { Interview } from './App/Interview';
import { getEasyLayout } from './utils/EasyLayout';
import { TabItem, Tabs } from './components/Tabs';
import { USER_MANAGEMENT_ASSET_NAMES } from '../iac/constants';
import { SYM } from './components/MaterialSymbol';

const { post_logout_redirect_uri: SIGNOUT_URL } = USER_MANAGER_CONFIG;
const USER_MANAGER = new UserManager(USER_MANAGER_CONFIG as any);
const HEADER_TAB_ITEMS: TabItem[] = [
  {
    label: 'Interview',
    onClick: () => history.pushState({}, '', '/interview'),
  },
  {
    label: 'Admin',
    onClick: () => history.pushState({}, '', '/admin'),
  },
];

const GlobalStyle = createGlobalStyle`
  html,
  body,
  #app-root {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`;
const LayoutBase = styled.div`
  width: 100vw;
  height: 100vh;
  padding: 1em;
  gap: 1em;
`;
const {
  layout: Layout,
  areas: { Header, Main },
} = getEasyLayout(
  LayoutBase,
  styled.div`
    overflow: hidden;
  `
)`
  header, 1fr
  main, 12fr
  \\ 1fr
`;
const {
  layout: HeaderControls,
  areas: { Title, Controls, User },
} = getEasyLayout(
  styled(Header)`
    gap: 1em;
  `,
  styled.div`
    flex: 1 0 auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
  `
)`
  title controls user, 1fr
  \\ 10fr 2fr 1fr
`;
const UserControls = styled(User)`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 1em;
`;

const InnerApp: FC = () => {
  const { userData, signOut } = useAuth();
  const userGroups = useMemo<string[]>(() => {
    const { profile = {} } = userData || {};
    const { ['cognito:groups']: groups = [] } = profile as any;

    return groups;
  }, [userData]);
  const isAdmin = useMemo(() => userGroups.includes(USER_MANAGEMENT_ASSET_NAMES.GROUPS.ADMIN), [userGroups]);
  const { access_token } = userData || {};
  const { currentWindowPath = '' } = useRouteContext();
  const isAdminPath = currentWindowPath.startsWith('/admin');
  const onLogout = useCallback(async () => {
    await signOut();
    window.location.href = SIGNOUT_URL as string;
  }, [signOut]);

  return (
    <Layout>
      <HeaderControls>
        <Title>
          <h2>{isAdminPath ? 'Admin' : 'Interview'}</h2>
        </Title>
        <Controls>{isAdmin ? <Tabs tabItems={HEADER_TAB_ITEMS} /> : undefined}</Controls>
        <UserControls>
          <SYM title="Logout" style={{ cursor: 'pointer' }} onClick={onLogout}>
            logout
          </SYM>
        </UserControls>
      </HeaderControls>
      <Main>
        <Route path="/login-complete">
          <LoginComplete />
        </Route>
        <Route path="/interview" exact>
          {access_token ? <Interview authorization={access_token} /> : undefined}
        </Route>
        <Route path="/admin">
          <h1>Admin</h1>
        </Route>
      </Main>
    </Layout>
  );
};

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <AuthProvider userManager={USER_MANAGER} autoSignIn>
        <GlobalStyle />
        <Route>
          <InnerApp />
        </Route>
      </AuthProvider>
    </ApplicationStateProvider>
  );
};
