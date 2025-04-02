import "~/styles/globals.css";

import { type Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";

import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/theme-provider";
import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: {
    default: "System Bridge Client",
    template: "%s | System Bridge Client",
  },
  description: "System Bridge Client",
  icons: [{ rel: "icon", url: "/icon" }],
  robots: {
    index: false,
    follow: false,
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="bg-background fixed top-0 flex w-full items-center justify-center border-b p-2">
            <div className="container flex justify-between">
              <Link href="/">
                <h1 className="text-2xl font-bold">System Bridge</h1>
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="mt-14 flex min-h-screen flex-col items-center justify-start gap-8 p-8">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
