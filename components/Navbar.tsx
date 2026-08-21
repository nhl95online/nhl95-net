"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const [isRostersOpen, setIsRostersOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isExtrasOpen, setIsExtrasOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRostersOpen, setIsMobileRostersOpen] = useState(false);
  const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);
  const [isMobileExtrasOpen, setIsMobileExtrasOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const LOGO_URL = "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/NHL95.net_banner.png";
  const DISCORD_URL = "https://discord.gg/Rp3An7Hx2f";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setIsMobileMenuOpen(false);
      router.push(`/team?q=${encodeURIComponent(search)}`);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileRostersOpen(false);
    setIsMobileStatsOpen(false);
    setIsMobileExtrasOpen(false);
  };

  return (
    <nav className="bg-[#f4f1ea] text-black font-serif border-b-2 border-black sticky top-0 z-50 shadow-xs">
      {/* Top Banner with Search & Discord */}
      <div className="bg-black text-white px-3 sm:px-6 py-1.5 flex flex-col sm:flex-row justify-between items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-widest">
        <div className="flex items-center gap-3">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 text-center transition-colors truncate max-w-full"
          >
            Join the NHL95 Digital Hockey World!
          </a>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-center w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex gap-1.5 items-center w-full sm:w-auto justify-center">
            <div className="relative flex-1 sm:w-44">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH TEAMS..."
                className="text-black bg-white px-2 py-0.5 text-xs outline-none w-full border border-black/20 font-sans"
              />
            </div>
            <button
              type="submit"
              className="hover:text-cyan-400 bg-neutral-800 sm:bg-transparent px-2 py-0.5 rounded-none font-bold text-xs uppercase cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Primary Header Row - Logo & Mobile Hamburger */}
      <div className="py-3 sm:py-5 px-4 flex justify-between sm:justify-center items-center border-b border-black relative">
        <Link href="/" onClick={closeMobileMenu} className="flex items-center justify-center">
          <img
            src={LOGO_URL}
            alt="NHL95 Online League"
            className="h-10 sm:h-14 md:h-16 max-w-[220px] sm:max-w-none object-contain"
          />
        </Link>

        {/* Mobile Hamburger Toggle (Visible on screens < md) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-black hover:bg-black/5 border border-black/30 rounded-xs focus:outline-none transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Navigation Links Row (Visible on screens >= md) */}
      <div className="hidden md:flex justify-center items-center flex-wrap gap-4 lg:gap-8 px-4 py-2.5 text-xs lg:text-sm text-black uppercase font-bold tracking-wider lg:tracking-widest bg-[#f4f1ea]">
        <Link href="/standings" className="hover:underline transition">Standings</Link>
        <Link href="/playoffs" className="hover:underline transition">Playoffs</Link>
        <Link href="/schedule" className="hover:underline transition">Schedule & Scores</Link>

        {/* Desktop Dropdown for Rosters & Teams */}
        <div
          className="relative"
          onMouseEnter={() => setIsRostersOpen(true)}
          onMouseLeave={() => setIsRostersOpen(false)}
        >
          <button className="hover:underline transition cursor-pointer uppercase flex items-center gap-1 font-bold">
            Rosters <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {isRostersOpen && (
            <div className="absolute top-full left-0 bg-[#f4f1ea] border-2 border-black py-1 w-48 flex flex-col z-50 shadow-lg">
              <Link href="/team" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors text-red-800">Teams</Link>
              <Link href="/trades" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">Trade Machine</Link>
              <Link href="/draft" className="px-4 py-2 hover:bg-black hover:text-white transition-colors">Draft Central</Link>
              <Link href="/players" className="px-4 py-2 hover:bg-black hover:text-white transition-colors">Player Database</Link>
            </div>
          )}
        </div>

        {/* Desktop Dropdown for Stats */}
        <div
          className="relative"
          onMouseEnter={() => setIsStatsOpen(true)}
          onMouseLeave={() => setIsStatsOpen(false)}
        >
          <button className="hover:underline transition cursor-pointer uppercase flex items-center gap-1 font-bold">
            Stats <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {isStatsOpen && (
            <div className="absolute top-full left-0 bg-[#f4f1ea] border-2 border-black py-1 w-48 flex flex-col z-50 shadow-lg">
              <Link href="/stats" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">Players</Link>
              <Link href="/stats/team" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">Teams</Link>
            </div>
          )}
        </div>

        <Link href="/awards" className="hover:underline transition">Awards</Link>
        <Link href="/records" className="hover:underline transition">Records</Link>

        {/* Setup Guide tab (to the left of Extras) */}
        <Link href="/setup-guide" className="hover:underline transition text-amber-900 font-black">
          Setup Guide
        </Link>

        {/* Desktop Dropdown for Extras (3 subgroups: ROMs, Managers, Stream Overlays) */}
        <div
          className="relative"
          onMouseEnter={() => setIsExtrasOpen(true)}
          onMouseLeave={() => setIsExtrasOpen(false)}
        >
          <button className="hover:underline transition cursor-pointer uppercase flex items-center gap-1 font-bold">
            Extras <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {isExtrasOpen && (
            <div className="absolute top-full left-0 bg-[#f4f1ea] border-2 border-black py-1 w-56 flex flex-col z-50 shadow-lg">
              <Link href="/roms" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">
                ROMs & Files
              </Link>
              <Link href="/managers" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">
                Managers Directory
              </Link>
              <Link href="/setup-guide?tab=overlays" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">
                Stream Overlays & Tools
              </Link>
            </div>
          )}
        </div>

        {/* Upload Action Button */}
        <Link
          href="/upload"
          className="hover:underline transition px-2.5 py-1 text-xs font-bold rounded-xs shadow-2xs flex items-center gap-1.5 bg-black text-white hover:bg-neutral-800"
          title="Upload Game Stats"
        >
          <span>Upload</span>
        </Link>
      </div>

      {/* Mobile Drawer (Visible on screens < md when toggled) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#fdfaf5] border-t border-black px-4 py-3 flex flex-col gap-2 font-sans font-bold text-xs uppercase tracking-wider shadow-lg max-h-[80vh] overflow-y-auto">

          <Link
            href="/standings"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Standings <span>→</span>
          </Link>
          <Link
            href="/playoffs"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Playoffs <span>→</span>
          </Link>
          <Link
            href="/schedule"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Schedule & Scores <span>→</span>
          </Link>

          {/* Mobile Collapsible Rosters Section */}
          <div className="border-b border-black/10">
            <button
              onClick={() => setIsMobileRostersOpen(!isMobileRostersOpen)}
              className="w-full py-2 px-3 hover:bg-black/5 flex items-center justify-between uppercase font-bold text-xs"
            >
              <span>Rosters & Teams</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileRostersOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileRostersOpen && (
              <div className="pl-4 pb-2 flex flex-col gap-1 bg-black/5 pt-1 rounded-xs">
                <Link
                  href="/team"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold text-red-800"
                >
                  • Teams
                </Link>
                <Link
                  href="/trades"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Trade Machine
                </Link>
                <Link
                  href="/draft"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Draft Central
                </Link>
                <Link
                  href="/players"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Player Database
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Collapsible Stats Section */}
          <div className="border-b border-black/10">
            <button
              onClick={() => setIsMobileStatsOpen(!isMobileStatsOpen)}
              className="w-full py-2 px-3 hover:bg-black/5 flex items-center justify-between uppercase font-bold text-xs"
            >
              <span>Stats</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileStatsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileStatsOpen && (
              <div className="pl-4 pb-2 flex flex-col gap-1 bg-black/5 pt-1 rounded-xs">
                <Link
                  href="/stats"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Players
                </Link>
                <Link
                  href="/stats/team"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Teams
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/awards"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Awards <span>→</span>
          </Link>
          <Link
            href="/records"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            League Records <span>→</span>
          </Link>

          <Link
            href="/setup-guide"
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between text-amber-900 font-black"
          >
            Setup Guide <span>→</span>
          </Link>

          {/* Mobile Collapsible Extras Section */}
          <div className="border-b border-black/10">
            <button
              onClick={() => setIsMobileExtrasOpen(!isMobileExtrasOpen)}
              className="w-full py-2 px-3 hover:bg-black/5 flex items-center justify-between uppercase font-bold text-xs"
            >
              <span>Extras</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileExtrasOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileExtrasOpen && (
              <div className="pl-4 pb-2 flex flex-col gap-1 bg-black/5 pt-1 rounded-xs">
                <Link
                  href="/roms"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • ROMs & Files
                </Link>
                <Link
                  href="/managers"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Managers Directory
                </Link>
                <Link
                  href="/setup-guide?tab=overlays"
                  onClick={closeMobileMenu}
                  className="py-1.5 px-3 hover:bg-black hover:text-white rounded-xs font-semibold"
                >
                  • Stream Overlays & Tools
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/upload"
            onClick={closeMobileMenu}
            className="py-2.5 px-3 bg-black text-white text-center rounded-xs font-black hover:bg-red-700 transition-colors mt-2 flex items-center justify-center gap-2"
          >
            <span>Upload Game File</span>
          </Link>
        </div>
      )}
    </nav>
  );
}