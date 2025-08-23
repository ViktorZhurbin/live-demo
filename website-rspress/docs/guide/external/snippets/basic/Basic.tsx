import { Button } from "@live-demo/core/web";
import { Badge, Card } from "@rspress/core/theme";
import { useState } from "react";

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
