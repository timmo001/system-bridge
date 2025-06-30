import { type Metadata } from "next";

import { Data } from "~/app/(websocket)/(client)/data/_components/data";

export const metadata: Metadata = {
  title: "System Dashboard",
  description: "Real-time system monitoring dashboard for System Bridge",
};

export default function DataPage() {
  return <Data />;
}
