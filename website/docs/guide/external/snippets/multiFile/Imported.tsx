import { Badge } from "@rspress/core/theme";

export const Imported = (props: { count: number }) => {
  return <Badge type="info">Count is {props.count}</Badge>;
};
