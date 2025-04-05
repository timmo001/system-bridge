import { type Metadata } from "next";

import { Connection } from "~/app/connection/_components/connection";

export const metadata: Metadata = {
  title: "Connection",
  description: "Connection settings for System Bridge",
};

export default function ConnectionPage() {
  return <Connection />;
}
