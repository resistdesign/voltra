import { FC } from "react";
import styled from "styled-components";
import { ApplicationStateProvider } from "../../../../src/app/utils";
import { Route } from "../../../../src/web";
import { AdvancedDemo } from "./AdvancedDemo";
import { EasyLayoutDemo } from "./EasyLayoutDemo";
import { EndToEndDemo } from "./EndToEndDemo";

const NavBar = styled.nav`
  & > ul {
    gap: 1em;

    &:last-of-type {
      margin-right: 0;
    }

    & > li {
      & > a {
        background: var(--pico-primary-nav-background);
        color: var(--pico-primary-nav-color);

        transition: background 0.2s ease-in-out;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }

  @media screen and (max-width: 800px) {
    margin-bottom: 2em;

    & > ul:first-child {
      display: none;
    }

    & > ul {
      flex: 1 0 auto;
      gap: 1em;
      flex-direction: column;
      align-items: stretch;

      & > li {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        justify-content: stretch;
        padding: 0;
        margin: 0;

        & > a {
          flex: 1 0 auto;
          padding: 1em;
          margin: 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
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
`;

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <Route>
        <NavBar>
          <ul>
            <li></li>
          </ul>
          <ul>
            <li>
              <a href="https://docs.voltra.app/docs">Docs</a>
            </li>
            <li>
              <a href="/form-generation">Form Generation Demo</a>
            </li>
            <li>
              <a href="/end-to-end-demo">End-to-End Demo</a>
            </li>
            <li>
              <a href="/easy-layout-demo">EasyLayout Demo</a>
            </li>
          </ul>
        </NavBar>
        <Content>
          <h3>
            <Route exact>Features</Route>
            <Route path="form-generation" exact>
              Form Generation Demo
            </Route>
            <Route path="end-to-end-demo" exact>
              End-to-End Demo
            </Route>
            <Route path="easy-layout-demo" exact>
              EasyLayout Demo
            </Route>
          </h3>
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

          <Route path="form-generation" exact>
            <AdvancedDemo />
          </Route>
          <Route path="end-to-end-demo" exact>
            <EndToEndDemo />
          </Route>
          <Route path="easy-layout-demo" exact>
            <EasyLayoutDemo />
          </Route>
        </Content>
      </Route>
    </ApplicationStateProvider>
  );
};
