import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roll & Play",
  description: "A cozy board game picker for game night.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Nav />
        {children}
        <footer className="border-t border-[#d7c5ad] bg-[#e8d8c3] px-4 py-3 text-center text-xs text-[#6e5a45]">
          Data powered by{" "}
          <a href="https://boardgamegeek.com" target="_blank" rel="noreferrer" className="underline">
            BoardGameGeek
          </a>
        </footer>
      </body>
    </html>
  );
}
