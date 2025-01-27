import { Button } from "@live-demo/plugin-rspress/web";
import { useState } from "react";

// local import
import { Imported } from "./Imported";

export const MultiFile = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    return setCount(count + 1);
  };

  return (
    <div>
      <Imported count={count} />
      <br />
      <Button onClick={increment}>Increment</Button>
    </div>
  );
};
