import { Button } from "@live-demo/rspress/web";
import { useState } from "react";
import { Imported } from "./Imported"; // local import (editable)

export const MultiFile = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Imported count={count} />
      <br />
      <br />
      <Button onClick={() => setCount(count + 3)}>Increment</Button>
    </div>
  );
};
