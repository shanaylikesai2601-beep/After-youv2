import type { Metadata } from "next";

import "@/app/workspace.css";

export const metadata: Metadata = { title: "AfterYou — Mission Workspace", description: "Autonomous mission execution workspace." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <html lang="en"><body>{children}</body></html>;
}
