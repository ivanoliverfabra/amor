import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import localFont from "next/font/local";
import { Navbar } from "~/components/navbar";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { SettingsProvider } from "~/context/settings";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "amor",
  description:
    "Create matching profile pictures for you and your significant others or friends with Amor. Our user-friendly generator offers customizable designs that celebrate your unique connections and bring your profiles to life!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Navbar />
              {children}
              <Toaster />
            </TooltipProvider>
          </SettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
