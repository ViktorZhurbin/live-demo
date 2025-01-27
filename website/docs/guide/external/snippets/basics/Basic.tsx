import { Button } from "@live-demo/plugin-rspress/web";
import { useState } from "react";
import { Badge, Card } from "rspress/theme";

export const Basic = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    return setCount(count + 1);
  };

  return (
    <div>
      <Badge type="info">Count is {count}</Badge>
      <Card title={`Count is: ${count}`} />
      <br />
      <Button onClick={increment}>Increment</Button>
    </div>
  );
};
