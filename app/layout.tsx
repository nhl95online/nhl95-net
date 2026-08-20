import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'NHL95 Online League | The Official Record of NHL95 Athletics',
  description: 'The premier online league and digital hockey world for Sega Genesis NHL 95.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f4f1ea] text-black font-serif min-h-screen overflow-x-hidden antialiased">
        {/* The Navbar component now handles the header branding and responsive mobile navigation */}
        <Navbar />
        <main className="max-w-7xl mx-auto py-3 sm:py-6 px-2 sm:px-4 md:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}