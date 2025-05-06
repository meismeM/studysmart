// src/app/layout.tsx

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { Analytics } from "@vercel/analytics/react"; // <-- Import Analytics

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap', // Good practice
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap', // Good practice
});

export const metadata: Metadata = {
  // Consider updating title/description
  title: 'AI Study Assistant',
  description: 'Generate study notes and practice questions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning if using next-themes elsewhere
    <html lang="en" suppressHydrationWarning>
      {/* Fix: Use .className for fonts, not .variable */}
      <body className={`${geistSans.className} ${geistMono.className} antialiased`}>

        {/* Optional: Blurred background */}
        <div className="blurred-logo-background" aria-hidden="true"></div>

        {/* Main App Content */}
        {children}

        {/* Global Toaster Component */}
        <Toaster />

        {/* Vercel Analytics Component */}
        <Analytics /> {/* <-- Add this component */}

      </body>
    </html>
  );
}
