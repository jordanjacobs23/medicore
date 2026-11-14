import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import Navbar from "@/components/navigation/navbar";
import { ThemeProvider } from "@/components/ThemeProvider"
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import { SessionTimeout } from "@/components/session-timeout";


const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const MontserratVF = localFont({
  src: "./fonts/MontserratVF.ttf",
  variable: "--font-montserrat",
  weight: "100 200 300 400 500 700 800 900"
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
      <html lang="en" suppressHydrationWarning>
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
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>

    
  );
}
