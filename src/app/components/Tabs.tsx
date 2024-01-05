import { FC } from 'react';
import styled from 'styled-components';

const TabsBase = styled.div`
  margin-bottom: 0;
`;
const TabButton = styled.button.attrs((p) => ({
  className: 'tab-button',
}))`
  &.tab-button {
    flex: 1 0 auto;
    margin-bottom: 0;
  }
`;

export type TabItem = {
  label: string;
  onClick?: () => void;
};

export type TabsProps = {
  tabItems: TabItem[];
};

export const Tabs: FC<TabsProps> = ({ tabItems = [] }) => {
  return (
    <TabsBase role="group">
      {tabItems.map((t, index) => {
        const { label = '', onClick = () => {} } = t;

        return (
          <TabButton key={`TabButton:${index}`} onClick={onClick}>
            {label}
          </TabButton>
        );
      })}
    </TabsBase>
  );
};
