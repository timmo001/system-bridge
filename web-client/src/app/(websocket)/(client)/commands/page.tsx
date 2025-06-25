import { type Metadata } from "next";

import { Commands } from "~/app/(websocket)/(client)/commands/_components/commands";

export const metadata: Metadata = {
  title: "Commands",
  description: "Execute commands through System Bridge",
};

export default function CommandsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Commands</h1>

      <Commands />
    </>
  );
}