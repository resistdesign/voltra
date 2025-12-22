import { FC } from "react";
import styled from "styled-components";
import { ApplicationStateProvider, Route } from "../../../../src/app/utils";

const NavBar = styled.nav`
  & > ul {
    gap: 1em;

    &:last-of-type {
      margin-right: 0;
    }

    & > li {
      & > a {
        background: rgba(255, 255, 255, 0.1);
        color: var(--pico-primary-inverse);

        transition: background 0.2s ease-in-out;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 2em;
  padding: 0 2em 2em 2em;
`;

const ContentCardGrid = styled.div`
  columns: 3;
  gap: 2em;

  @media screen and (max-width: 1280px) {
    columns: 2;
  }

  @media screen and (max-width: 800px) {
    columns: 1;
  }
`;

const GridCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;

  break-inside: avoid-column;
  -webkit-column-break-inside: avoid; /* For older Chrome, Safari, Opera */
  page-break-inside: avoid; /* For older Firefox */

  & > article {
    flex: 1 1 auto;
    margin-bottom: 0;

    & > table > tbody > tr > td {
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      font-size: 0.75em;
    }
  }

  & > img.fall-off-fx {
  }
`;

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <Route>
        <Content>
          <NavBar>
            <ul>
              <li></li>
            </ul>
            <ul>
              <li>
                <a href="https://docs.voltra.app/docs">Docs</a>
              </li>
              <li>
                <a href="type-info">Type Info Demo</a>
              </li>
            </ul>
          </NavBar>
          <h3>Features</h3>
          <Route exact>
            <ContentCardGrid>
              <GridCard>
                <img src="/images/features/api.png" alt="API Features" />
                <article>
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
                          ORM: TypeScript Type Driven Auto-generated Data
                          Contexts with Relationships
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </article>
                <img
                  className="fall-off-fx"
                  src="/images/fall-off-fx/fall-off-1.png"
                  alt="Digital Drip Fall Off FX"
                />
              </GridCard>
              <GridCard>
                <img src="/images/features/app.png" alt="App Features" />
                <article>
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
                <img
                  className="fall-off-fx"
                  src="/images/fall-off-fx/fall-off-2.png"
                  alt="Digital Drip Fall Off FX"
                />
              </GridCard>
              <GridCard>
                <img src="/images/features/iac.png" alt="IaC Features" />
                <article>
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
                <img
                  className="fall-off-fx"
                  src="/images/fall-off-fx/fall-off-3.png"
                  alt="Digital Drip Fall Off FX"
                />
              </GridCard>
            </ContentCardGrid>
          </Route>
          <Route path="type-info">Coming Soon.</Route>
        </Content>
      </Route>
    </ApplicationStateProvider>
  );
};
