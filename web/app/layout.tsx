import type { Metadata } from "next";
import { Montserrat, Poppins, Lato } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/toast";

// 1. Configure Montserrat (we don't even need the 'variable' property anymore)
const montserrat = Montserrat({
  subsets: ["latin"],
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "400", "300", "900", "700"],
});

export const metadata: Metadata = {
  title: "Decision Layer",
  description: "Decision intelligence and analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 2. Force Next.js to apply the font directly to the body! */}
      {/* We removed 'font-sans' because montserrat.className handles it directly */}
      <body
        className={`${lato.className} antialiased bg-brand-light text-brand-dark`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
