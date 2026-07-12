"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const LOGO_URL = "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/NHL95.net_banner.png";
  const DISCORD_URL = "https://discord.gg/Rp3An7Hx2f";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/team?q=${encodeURIComponent(search)}`);
    }
  };

  return (
    <nav className="bg-[#f4f1ea] text-black font-serif border-b-2 border-black">
      {/* Top Banner with Search & Discord */}
      <div className="bg-black text-white px-6 py-1 flex justify-between items-center text-xs uppercase tracking-widest">
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400">
          Join the NHL95 Digital Hockey World Now!
        </a>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH TEAMS..."
            className="text-black px-2 py-0.5 outline-none"
          />
          <button type="submit" className="hover:text-cyan-400">Search</button>
        </form>
      </div>

      {/* Primary Row - Logo Centered */}
      <div className="py-6 flex justify-center items-center border-b border-black">
        <Link href="/">
          <img src={LOGO_URL} alt="NHL95 Online League" className="h-16 object-contain" />
        </Link>
      </div>

      {/* Navigation Links Row */}
      <div className="flex justify-center items-center gap-8 px-6 py-3 text-sm text-black uppercase font-bold tracking-widest bg-[#f4f1ea] border-b border-black">
        <Link href="/team" className="hover:underline transition text-red-700">Teams</Link>

        {['STANDINGS', 'PLAYOFFS', 'SCORES', 'SCHEDULE'].map((link) => (
          <Link key={link} href={`/${link.toLowerCase()}`} className="hover:underline transition">
            {link}
          </Link>
        ))}

        {/* Dropdown for Rosters */}
        <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
          <button className="hover:underline transition cursor-pointer uppercase">Rosters</button>
          {isOpen && (
            <div className="absolute top-full left-0 bg-[#f4f1ea] border border-black py-2 w-40 flex flex-col z-50 shadow-lg">
              <Link href="/draft" className="px-4 py-2 hover:bg-black hover:text-white">Draft</Link>
              <Link href="/trades" className="px-4 py-2 hover:bg-black hover:text-white">Trades</Link>
              <Link href="/players" className="px-4 py-2 hover:bg-black hover:text-white">Player Database</Link>
            </div>
          )}
        </div>

        {['STATS', 'AWARDS', 'MANAGERS', 'RECORDS'].map((link) => (
          <Link key={link} href={`/${link.toLowerCase()}`} className="hover:underline transition">
            {link}
          </Link>
        ))}
      </div>
    </nav>
  );
}