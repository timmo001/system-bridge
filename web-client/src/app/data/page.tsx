import { type Metadata } from "next";

import { ConnectionProvider } from "~/components/provider/connection";
import { Data } from "~/app/data/_components/data";

export const metadata: Metadata = {
  title: "Data",
  description: "Data for System Bridge",
};

export default function DataPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Data</h1>

      <ConnectionProvider>
        <Data />
      </ConnectionProvider>
    </>
  );
}
