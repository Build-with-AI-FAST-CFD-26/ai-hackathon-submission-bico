import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ChatBubble } from "@/components/chat-bubble";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "StackPulse — AI Stack Intelligence",
  description:
    "Monitor your AI stack for breaking changes, cost optimizations, and emerging alternatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#0a0a0a] text-white min-h-screen antialiased`}
      >
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
