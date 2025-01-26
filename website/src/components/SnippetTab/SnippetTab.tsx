import type React from "react";
import { Tab } from "rspress/theme";

type SnippetTabProps = {
  snippet: string;
  label: string;
  children?: React.ReactNode;
};

export const SnippetTab = ({ snippet, label, children }: SnippetTabProps) => {
  console.log(children);
  return (
    <Tab label={label}>
      <span>This snippet:</span>
      <pre>{snippet}</pre>

      <b>Turns into:</b>
      {children}
    </Tab>
  );
};
