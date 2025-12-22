import { FC } from "react";
import styled, { createGlobalStyle } from "styled-components";
import { ApplicationStateProvider, Route } from "../../../../src/app/utils";

const NavBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1em;
`;

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

    #app-root {
        overflow: auto;
    }
`;

export const App: FC = () => {
  return (
    <ApplicationStateProvider>
      <GlobalStyle />
      <Route>
        <Route exact>
          <NavBar>
            <a href="https://docs.voltra.app/docs">
              <button>Docs</button>
            </a>
            <a href="type-info">
              <button>Type Info Demo</button>
            </a>
          </NavBar>
          <div>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident, sunt in culpa qui officia deserunt mollit
              anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem
              accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
              quae ab illo inventore veritatis et quasi architecto beatae vitae
              dicta sunt explicabo.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
              aut fugit, sed quia consequuntur magni dolores eos qui ratione
              voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem
              ipsum quia dolor sit amet, consectetur, adipisci velit.
            </p>
          </div>
        </Route>
        <Route path="type-info">Coming Soon.</Route>
      </Route>
    </ApplicationStateProvider>
  );
};
