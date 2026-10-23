import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dr. Care HMIS",
  description: "Hospital management for every hospital, shaped by its own admin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* One store for the admin and the front desk, so both always see the same demo data. */}
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
