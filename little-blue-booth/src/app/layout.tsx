import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConversationProvider } from "~/lib/context/ConversationContext";

export const metadata: Metadata = {
  title: "Little Blue Booth - Health Kiosk",
  description: "Your personal health consultation kiosk",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
    <html lang="en" className={`${GeistSans.variable} dark`}>
      <body className="min-h-screen bg-[#020817] text-white antialiased">
        <TRPCReactProvider>
          <ConversationProvider>{children}</ConversationProvider>
        </TRPCReactProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
