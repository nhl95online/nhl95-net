import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import { CoachAuthProvider } from '@/lib/coach-auth';
import CoachAuthModal from '@/components/CoachAuthModal';
import Nhl95Ticker from '@/components/Nhl95Ticker';
import './globals.css';

export const metadata: Metadata = {
  title: 'NHL95 Online League | The Official Record of NHL95 Athletics',
  description: 'The premier online league and digital hockey world for Sega Genesis NHL 95.',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f4f1ea] text-black font-serif min-h-screen w-full overflow-x-hidden antialiased">
        <CoachAuthProvider>
          <Navbar />
          <main className="w-full py-2 sm:py-4 md:py-5 pb-12 sm:pb-12 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10">
            {children}
          </main>
          <Nhl95Ticker className="fixed bottom-0 left-0 right-0 z-40" />
          <CoachAuthModal />
        </CoachAuthProvider>
      </body>
    </html>
  );
}
