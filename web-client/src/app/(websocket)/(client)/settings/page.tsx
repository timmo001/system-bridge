import { type Metadata } from "next";

import { Settings } from "~/app/(websocket)/(client)/settings/_components/settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure System Bridge preferences and behavior",
};

export default function SettingsPage() {
  return <Settings />;
}
