import { FC } from "react";
import styled from "styled-components";
import { makeNativeEasyLayout } from "../../../../src/native/utils";
import { getEasyLayout } from "../../../../src/web/utils";

const TEMPLATE = `
  header header, 64px
  sidebar content, 1fr
  footer footer, 48px
  \\ 220px 1fr
`;

const {
  layout: WebLayout,
  areas: { Header, Sidebar, Content, Footer },
} = getEasyLayout(undefined, undefined, {
  gap: 12,
  padding: 12,
})`${TEMPLATE}`;

const nativeLayout = makeNativeEasyLayout(TEMPLATE);

export const EasyLayoutDemo: FC = () => {
  const nativeCoords = nativeLayout.computeNativeCoords({
    width: 720,
    height: 360,
    padding: 12,
    gap: 12,
  });

  return (
    <Root>
      <DemoPane>
        <h4>Web (CSS Grid)</h4>
        <WebPreview>
          <Header>Header</Header>
          <Sidebar>Sidebar</Sidebar>
          <Content>Main Content</Content>
          <Footer>Footer</Footer>
        </WebPreview>
      </DemoPane>
      <DemoPane>
        <h4>Native (Computed Coords)</h4>
        <CodeBlock>{JSON.stringify(nativeCoords, null, 2)}</CodeBlock>
      </DemoPane>
    </Root>
  );
};

const Root = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DemoPane = styled.article`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.75);
`;

const WebPreview = styled(WebLayout)`
  height: 360px;
  border-radius: 0.5rem;
  background: linear-gradient(140deg, #f4f8ff 0%, #f7fafc 100%);

  & > * {
    border-radius: 0.4rem;
    padding: 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
`;

const CodeBlock = styled.pre`
  margin: 0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.8rem;
  line-height: 1.35;
  overflow-x: auto;
  background: #0f172a;
  color: #e2e8f0;
`;
