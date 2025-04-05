import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Settings for System Bridge",
};
export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
    </>
  );
}
