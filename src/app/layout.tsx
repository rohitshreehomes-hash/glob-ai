import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";

export const metadata: Metadata = {
  title: "BharatTrade — Paper Trading for NSE & BSE",
  description: "Free paper-trading simulator and live dashboard for Indian stocks (NSE/BSE).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <TickerTape />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-800 py-6">
          <p className="mx-auto max-w-7xl px-4 text-center text-xs leading-relaxed text-slate-500">
            BharatTrade is a paper-trading simulator for education. No real money is involved.
            Market data: Yahoo Finance (may be delayed ~15 min) with simulated fallback. Not investment advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
