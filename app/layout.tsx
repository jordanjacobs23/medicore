import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navigation/navbar";
import { ThemeProvider } from "@/components/ThemeProvider"
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import { SessionTimeout } from "@/components/session-timeout";
import { Toaster } from "@/components/ui/toast";


const montserrat = localFont({
  src: "./fonts/MontserratVF.ttf",
  variable: "--font-montserrat-local",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MediCore | Connected Practice & Patient Care",
  description: "MediCore brings practice scheduling, patient records, clinical encounters, billing, claims, and patient communication together in one workspace.",
  icons: {
    icon: "/images/site-logo.svg",
  }
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html lang="en" className={montserrat.variable} suppressHydrationWarning>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <SessionTimeout />
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>

    
  );
}
