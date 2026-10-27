import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const MontserratVF = localFont({
  src: "./fonts/MontserratVF.ttf",
  variable: "--font-montserrat",
  weight: "100 200 300 400 500 700 800 900"
});

export const metadata: Metadata = {
  title: "MediCore",
  description: "A complete healthcare platform with appointment booking, electronic health records, telehealth, AI-powered clinical notes, e-prescriptions, medical-aid billing, and a patient portal — all built with POPIA-compliant privacy and security in mind.",
  icons: {
    icon: "/images/site-logo.svg",
  }
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.className, MontserratVF.variable, "font-sans",)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
