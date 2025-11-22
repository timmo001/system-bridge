import { type Metadata } from "next";

import { Settings } from "~/app/(websocket)/(client)/settings/_components/settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Settings for System Bridge",
};

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>

      <Settings />
    </>
  );
}
