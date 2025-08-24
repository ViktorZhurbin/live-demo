import { IconBrandVscode, IconCode, IconEye } from "@tabler/icons-react";
import { PanelsView } from "web/constants/settings";

export const getPanelViewsValues = (showIcons?: boolean) => [
  {
    value: PanelsView.Split,
    label: showIcons ? <IconBrandVscode /> : PanelsView.Split,
  },
  {
    value: PanelsView.Preview,
    label: showIcons ? <IconEye /> : PanelsView.Preview,
  },
  {
    value: PanelsView.Editor,
    label: showIcons ? <IconCode /> : PanelsView.Editor,
  },
];
