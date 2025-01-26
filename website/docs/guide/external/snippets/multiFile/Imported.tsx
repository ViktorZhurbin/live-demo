import { Badge, Card } from "rspress/theme";

type ImportedProps = {
  count: number;
};

export const Imported = ({ count }: ImportedProps) => {
  return (
    <div>
      <Badge type="info">Count is {count}</Badge>
      <Card title={`Count is: ${count}`} />
    </div>
  );
};
