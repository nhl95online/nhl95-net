"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronDown, Search, User, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const [isRostersOpen, setIsRostersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileRostersOpen, setIsMobileRostersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { user, profile, isLoggedIn, signOut } = useAuth();

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
  };

  const handleSignOut = async () => {
    closeMobileMenu();
    await signOut();
    router.push('/');
  };

  return (
    <nav className="bg-[#f4f1ea] text-black font-serif border-b-2 border-black sticky top-0 z-50 shadow-xs">
      {/* Top Banner with Search, Discord & Auth Status */}
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
          {/* Top Bar Auth Chip */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 text-[10px] font-sans font-bold bg-neutral-900 border border-neutral-700 px-2 py-0.5">
              <span className="text-green-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{profile?.coach_name || 'Coach'}</span>
              </span>
              <button
                onClick={handleSignOut}
                className="text-neutral-400 hover:text-red-400 uppercase tracking-normal underline cursor-pointer ml-1"
                title="Sign out of league"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-[10px] font-sans font-bold text-amber-300 hover:text-white uppercase transition-colors px-1.5 py-0.5 border border-amber-500/50 hover:border-white"
            >
              <LogIn className="w-3 h-3" />
              <span>Player Login</span>
            </Link>
          )}

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
        <Link href="/team" className="hover:underline transition text-red-700">Teams</Link>
        <Link href="/standings" className="hover:underline transition">Standings</Link>
        <Link href="/playoffs" className="hover:underline transition">Playoffs</Link>
        <Link href="/schedule" className="hover:underline transition">Schedule & Scores</Link>

        {/* Desktop Dropdown for Rosters & Trades */}
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
              <Link href="/trades" className="px-4 py-2 hover:bg-black hover:text-white font-bold transition-colors">Trade Machine</Link>
              <Link href="/draft" className="px-4 py-2 hover:bg-black hover:text-white transition-colors">Draft Central</Link>
              <Link href="/players" className="px-4 py-2 hover:bg-black hover:text-white transition-colors">Player Database</Link>
            </div>
          )}
        </div>

        <Link href="/stats" className="hover:underline transition">Stats</Link>
        <Link href="/awards" className="hover:underline transition">Awards</Link>
        <Link href="/managers" className="hover:underline transition">Managers</Link>
        <Link href="/records" className="hover:underline transition">Records</Link>

        {/* Upload Action Button */}
        <Link 
          href="/upload" 
          className={`hover:underline transition px-2.5 py-1 text-xs font-bold rounded-xs shadow-2xs flex items-center gap-1.5 ${
            isLoggedIn 
              ? 'bg-red-700 text-white hover:bg-black' 
              : 'bg-black text-white hover:bg-neutral-800'
          }`}
          title={isLoggedIn ? `Logged in as ${profile?.coach_name || 'Coach'}` : 'Upload Game Stats (Login Required)'}
        >
          {isLoggedIn && <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />}
          <span>Upload</span>
        </Link>

        {/* Desktop Login / Admin Button */}
        {!isLoggedIn ? (
          <Link
            href="/login"
            className="hover:bg-amber-400 bg-amber-300 text-black border border-black px-2.5 py-1 text-xs font-black rounded-xs shadow-2xs flex items-center gap-1 transition-colors"
            title="Log in as Coach or Commissioner"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="hover:bg-neutral-200 bg-white text-black border border-black px-2 py-1 text-[11px] font-bold rounded-xs flex items-center gap-1 transition-colors"
            title="View Account / Profile"
          >
            <span className="max-w-[100px] truncate">{profile?.coach_name || 'Coach'}</span>
          </Link>
        )}
      </div>


      {/* Mobile Drawer (Visible on screens < md when toggled) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#fdfaf5] border-t border-black px-4 py-3 flex flex-col gap-2 font-sans font-bold text-xs uppercase tracking-wider shadow-lg max-h-[80vh] overflow-y-auto">
          {/* Mobile Auth Bar */}
          <div className="p-2.5 bg-black text-white flex items-center justify-between rounded-xs mb-1">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <span className="text-xs truncate">{profile?.coach_name || 'Coach'}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[10px] text-neutral-300 hover:text-red-400 underline font-normal uppercase"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="w-full text-center text-xs text-amber-300 hover:text-white flex items-center justify-center gap-1.5 font-bold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Coach / Player Login</span>
              </Link>
            )}
          </div>

          <Link 
            href="/team" 
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 text-red-800 font-black flex items-center justify-between"
          >
            Teams <span>→</span>
          </Link>
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
              <span>Rosters & Trades</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileRostersOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMobileRostersOpen && (
              <div className="pl-4 pb-2 flex flex-col gap-1 bg-black/5 pt-1 rounded-xs">
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

          <Link 
            href="/stats" 
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Player Stats <span>→</span>
          </Link>
          <Link 
            href="/awards" 
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Awards <span>→</span>
          </Link>
          <Link 
            href="/managers" 
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            Managers <span>→</span>
          </Link>
          <Link 
            href="/records" 
            onClick={closeMobileMenu}
            className="py-2 px-3 hover:bg-black/5 border-b border-black/10 flex items-center justify-between"
          >
            League Records <span>→</span>
          </Link>
          <Link 
            href="/upload" 
            onClick={closeMobileMenu}
            className="py-2.5 px-3 bg-black text-white text-center rounded-xs font-black hover:bg-red-700 transition-colors mt-2 flex items-center justify-center gap-2"
          >
            <span>Upload Game File</span>
            {isLoggedIn && <ShieldCheck className="w-4 h-4 text-green-400" />}
          </Link>
        </div>
      )}
    </nav>
  );
}