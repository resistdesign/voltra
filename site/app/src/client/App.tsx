import { FC } from "react";
import styled from "styled-components";
import { ApplicationStateProvider, Route } from "../../../../src/app/utils";

const NavBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1em;

  padding: 1em;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 2em;
  padding: 2em;
`;

const ContentCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2em;

  & > article {
    flex: 1 1 auto;

    & > table > tbody > tr > td {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    }
  }

  @media screen and (max-width: 1280px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media screen and (max-width: 800px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <Route>
        <NavBar>
          <a href="https://docs.voltra.app/docs">Docs</a>
          <a href="type-info">Type Info Demo</a>
        </NavBar>
        <Content>
          <h3>Features</h3>
          <Route exact>
            <ContentCardGrid>
              <article>
                <img src="/images/features/api.png" alt="API Features" />
                <table>
                  <thead>
                    <tr>
                      <th>API</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>RPC</td>
                    </tr>
                    <tr>
                      <td>Auth: Public/Secured/Role Based</td>
                    </tr>
                    <tr>
                      <td>Routing: Nesting/Handlers/Injected Handlers</td>
                    </tr>
                    <tr>
                      <td>
                        ORM: TypeScript Type Driven Auto-generated Data Contexts
                        with Relationships
                      </td>
                    </tr>
                  </tbody>
                </table>
              </article>
              <article>
                <img src="/images/features/app.png" alt="API Features" />
                <table>
                  <thead>
                    <tr>
                      <th>App</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Easy Layout</td>
                    </tr>
                    <tr>
                      <td>State Management</td>
                    </tr>
                    <tr>
                      <td>Routing: Param Handlers/Parallel Routes/Hooks</td>
                    </tr>
                  </tbody>
                </table>
              </article>
              <article>
                <img src="/images/features/iac.png" alt="API Features" />
                <table>
                  <thead>
                    <tr>
                      <th>IaC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Full Parameter Support: Groups/Labels/Types/etc...
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Packs: Easy to add
                        Database/Storage/Auth/Functions/etc...
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Utilities: Patching Stacks/Constants/Standard
                        Includes/etc...
                      </td>
                    </tr>
                    <tr>
                      <td>Typed Build Spec Creation</td>
                    </tr>
                    <tr>
                      <td>Typed Resource Parameters</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </ContentCardGrid>
          </Route>
          <Route path="type-info">Coming Soon.</Route>
        </Content>
      </Route>
    </ApplicationStateProvider>
  );
};
