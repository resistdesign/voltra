import { FC, useState } from "react";
import styled from "styled-components";
import { ApplicationStateProvider } from "../../../../src/app/utils";
import { Route } from "../../../../src/web";
import { AdvancedDemo } from "./AdvancedDemo";
import { EasyLayoutDemo } from "./EasyLayoutDemo";
import { EndToEndDemo } from "./EndToEndDemo";

const MenuToggle = styled.button<{ $isOpen: boolean }>`
  display: none;
  position: fixed;
  top: 1em;
  right: 1em;
  width: 3.5em;
  height: 3.5em;
  border-radius: 50%;
  background: var(--pico-primary-nav-background);
  border: none;
  cursor: pointer;
  z-index: 1000;
  padding: 0;
  transition: all 0.3s ease-in-out;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  & > span {
    display: block;
    width: 1.5em;
    height: 2px;
    background: var(--pico-primary-nav-color);
    margin: 0.35em auto;
    transition: all 0.3s ease-in-out;
    border-radius: 2px;

    &:nth-child(1) {
      transform: ${(props: { $isOpen: boolean }) =>
        props.$isOpen ? "rotate(45deg) translate(0.5em, 0.5em)" : "none"};
    }

    &:nth-child(2) {
      opacity: ${(props: { $isOpen: boolean }) => (props.$isOpen ? "0" : "1")};
    }

    &:nth-child(3) {
      transform: ${(props: { $isOpen: boolean }) =>
        props.$isOpen ? "rotate(-45deg) translate(0.5em, -0.5em)" : "none"};
    }
  }

  @media screen and (max-width: 800px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

const NavBar = styled.nav<{ $isOpen: boolean }>`
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
      display: ${(props: { $isOpen: boolean }) =>
        props.$isOpen ? "flex" : "none"};
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: var(--pico-background-color);
      padding: 5em 1em 1em 1em;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 999;
      flex: 1 0 auto;
      gap: 0.5em;
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

  table {
    margin: 0;
  }
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <ApplicationStateProvider>
      <Route>
        <MenuToggle $isOpen={isMenuOpen} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </MenuToggle>
        <NavBar $isOpen={isMenuOpen}>
          <ul>
            <li></li>
          </ul>
          <ul>
            <li>
              <a
                href="https://docs.voltra.app/docs"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </a>
            </li>
            <li>
              <a href="/form-generation" onClick={() => setIsMenuOpen(false)}>
                Form Generation Demo
              </a>
            </li>
            <li>
              <a href="/end-to-end-demo" onClick={() => setIsMenuOpen(false)}>
                End-to-End Demo
              </a>
            </li>
            <li>
              <a href="/easy-layout-demo" onClick={() => setIsMenuOpen(false)}>
                EasyLayout Demo
              </a>
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
