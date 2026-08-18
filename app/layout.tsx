import Navbar from '../components/Navbar';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f4f1ea] text-black font-serif min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}