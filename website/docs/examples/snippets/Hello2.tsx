import React, { type FC } from "react";
import { Tab, Tabs } from "rspress/theme";

const Hello2: FC = () => {
  return (
    <div>
      <div>Tabs go here:</div>
      <Tabs>
        <Tab label="Tab 1">Tab 1 content</Tab>
        <Tab label="Tab 2">Tab 2 content</Tab>
      </Tabs>
    </div>
  );
};

export { Hello2 as Hello };
