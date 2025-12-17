import { Badge } from "@rspress/core/theme";

type ImportedProps = {
  count: number;
};

export const Imported = ({ count }: ImportedProps) => {
  return (
    <div>
      <Badge type="info">Count is {count}</Badge>
    </div>
  );
};
