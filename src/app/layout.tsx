import { type Metadata } from "next";

import { MuiProvider } from "@/providers/mui-provider";
import { SettingsProvider } from "@/components/contexts/settings";

export const metadata: Metadata = {
  title: "System Bridge",
  description: "System Bridge - A bridge for your systems",
  keywords: ["system-bridge", "system", "bridge", "frontend", "typescript"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <MuiProvider>
        <body>
          <SettingsProvider>
            <main>{children}</main>
          </SettingsProvider>
        </body>
      </MuiProvider>
    </html>
  );
}
