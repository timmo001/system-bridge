import { type Metadata } from "next";

import { ConnectionProvider } from "~/components/provider/connection";
import { Settings } from "~/app/settings/_components/settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Settings for System Bridge",
};

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>

      <ConnectionProvider>
        <Settings />
      </ConnectionProvider>
    </>
  );
}
