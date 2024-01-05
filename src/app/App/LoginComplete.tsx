import { FC, useEffect } from 'react';
import { useAuth } from 'oidc-react';
import { USER_MANAGEMENT_ASSET_NAMES } from '../../iac/constants';
import { getEasyLayout } from '../utils/EasyLayout';
import styled from 'styled-components';

const {
  GROUPS: { ADMIN: USER_MANAGEMENT_ADMIN_GROUP },
} = USER_MANAGEMENT_ASSET_NAMES;

const LayoutBase = styled.div`
  width: 100vw;
  height: 100vh;
`;
const AreaBase = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
const {
  layout: Layout,
  areas: { CenterContent },
} = getEasyLayout(LayoutBase, AreaBase)`
  center-content, 1fr
  \\ 1fr
`;

export type LoginCompleteProps = {};

export const LoginComplete: FC<LoginCompleteProps> = () => {
  const { userData } = useAuth();
  const { profile } = userData || {};
  const {
    // @ts-ignore
    'cognito:groups': authGroups = [],
  } = profile || {};
  const isAdmin = authGroups.includes(USER_MANAGEMENT_ADMIN_GROUP);

  useEffect(() => {
    if (userData) {
      if (isAdmin) {
        history.pushState({}, '', '/admin');
      } else {
        history.pushState({}, '', '/interview');
      }
    }
  }, [userData, isAdmin]);

  return (
    <Layout>
      <CenterContent>
        <h3>Login Complete...</h3>
      </CenterContent>
    </Layout>
  );
};
