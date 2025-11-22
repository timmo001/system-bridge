import { type Metadata } from "next";

import { Scripts } from "~/app/(websocket)/(client)/scripts/_components/scripts";

export const metadata: Metadata = {
  title: "Scripts",
  description: "Manage and execute custom scripts",
};

export default function ScriptsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Scripts</h1>

      <Scripts />
    </>
  );
}
