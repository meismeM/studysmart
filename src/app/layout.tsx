// src/app/layout.tsx

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";      // Import Toaster
import { Analytics } from "@vercel/analytics/react";    // Import Analytics
import { SpeedInsights } from "@vercel/speed-insights/next"; // <-- 1. Import SpeedInsights

// Configure Fonts
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

// Metadata
export const metadata: Metadata = {
  title: 'AI Study Assistant',
  description: 'Generate study notes and practice questions.',
};

// Root Layout Component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistMono.className} antialiased`}>

        {/* Blurred background element */}
        <div className="blurred-logo-background" aria-hidden="true"></div>

        {/* Main Application Content */}
        {children}

        {/* Global Toaster Component */}
        <Toaster />

        {/* Vercel Analytics Component */}
        <Analytics />

        {/* ** 2. Add Vercel Speed Insights Component ** */}
        <SpeedInsights />
      </body>
    </html>
  );
}
