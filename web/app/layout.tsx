import type { Metadata } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased`}>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(()=>{let theme;try{theme=localStorage.getItem("smartagri-theme")}catch{console.warn("Theme preference storage is unavailable.")}if(theme!=="light"&&theme!=="dark"){theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=theme})()`,
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
