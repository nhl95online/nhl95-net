import Navbar from '../components/Navbar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#080b11] text-white">
        {/* The Navbar component now handles the header branding and navigation */}
        <Navbar />
        <main className="max-w-7xl mx-auto py-6">
          {children}
        </main>
      </body>
    </html>
  );
}