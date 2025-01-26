import { Tab, Tabs } from "rspress/theme";

export function Hello3() {
  return (
    <div>
      <div>Tabs go here:</div>
      <Tabs>
        <Tab label="Tab 1">Tab 1 content</Tab>
        <Tab label="Tab 2">Tab 2 content</Tab>
      </Tabs>
    </div>
  );
}
