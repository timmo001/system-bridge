"use client";
import { useEffect, useState } from "react";

import { SetupConnection } from "~/components/setup-connection";

export function Connection() {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <>
      {!isHydrated ? (
        <div>Loading...</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Connection Settings</h1>
          <SetupConnection />
        </>
      )}
    </>
  );
}
