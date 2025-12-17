import React, { useEffect, useState } from "react";

export default function WithExternalImports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData("loaded");
  }, []);

  return <div>{data}</div>;
}
