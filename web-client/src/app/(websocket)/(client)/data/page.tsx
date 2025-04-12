import { type Metadata } from "next";

import { Data } from "~/app/(websocket)/(client)/data/_components/data";

export const metadata: Metadata = {
  title: "Data",
  description: "Data for System Bridge",
};

export default function DataPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Data</h1>

      <Data />
    </>
  );
}
