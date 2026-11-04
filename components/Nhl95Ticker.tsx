"use client";

import React, { useEffect, useState } from 'react';

const FALLBACK_TICKER_ITEMS: string[] = [
  '🏆 SERIES WIN (3-1): SUMTER TRASH (SUM) TAKES THE SERIES 3-1 OVER BARRIE DOLTS (BAR) — COACH PINK ELEPHANTS STATEMENT SERIES',
  'LLOYD10XMAS SUGGESTS IRRATIONAL KRAV SHOULD BE THE FACE OF THE LEAGUE, GENIUS',
  '🚨 BLOCKBUSTER TRADE [W18]: AUTOBAHN (AUT) SENDS F MARTIN ST. LOUIS, F BRAD RICHARDS TO BARRIE DOLTS (BAR) FOR F JAMES NEAL, F GABRIEL LANDESKOG!',
  'PINK ELEPHANTS OFFERS BLIND PICK SWAP TO END TANKING DEBATE, BOLD STRATEGY',
  '🥅 SHUTOUT FINAL: TAIPEI TYPHOONS (TAI) 4, ROCKFORD VILLAINS (ROC) 0 — COACH NATHANMB LOCKS DOWN THE CREASE!',
  'SEGATHON SHARES WE GOT ONE ANNIE POTTS GIF, SECRET CODE FOR CHAOS',
  '🚨 FINAL SCORE (OT): ITALY EBC (ITA) 4, THUNDER BAY PIKE (TBP) 3 — COACH MARCUS VICK EBC WALKS IT OFF IN OVERTIME!',
  'GAELICGOPHER TRADES GETZLAF FOR BOTH SEDINS, $97, AND A SLICE OF BLUEBERRY PIE, PURE AURA',
  '🧹 SERIES SWEEP (2-0): GRAND RIVER HERONS (GRH) TAKES THE SERIES 2-0 OVER HAMILTON MUSTANGS (HAM) — COACH MOSES BOGART STATEMENT SERIES',
  'ULTRAMAGNUS DECLARES BRING BACK THE OLD SHITTY BILL, WIN THE SHITTY WIN THE TOP PICK',
  'TICKLEPUSS SHARES JIM HALPERT FACE GIF, LOCKER ROOM ERUPTS',
  'MARCUSVICKEBC ON THE TRADE BLOCK: WILL TRADE KAR 1ST ROUND FOR OVECHKIN & ITA 1ST FOR CROSBY',
];

function formatBriefingToTickerItems(briefingData: any): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const sections = briefingData?.sections || [];

  for (const sec of sections) {
    const chName = String(sec?.channel || 'discord').toUpperCase();
    for (const m of sec?.messages || []) {
      const author = String(m?.author || 'COACH').toUpperCase();
      const raw = String(m?.text || '').trim();
      if (!raw) continue;

      let item = '';
      const gifMatch = raw.match(/klipy\.com\/gifs\/([a-zA-Z0-9_-]+)/i);
      if (gifMatch) {
        const slug = gifMatch[1].replace(/-\d+$/, '').replace(/[-_]+/g, ' ').toUpperCase();
        item = `${author} SHARES ${slug} GIF, SECRET CODE FOR CHAOS`;
      } else if (/^https?:\/\//i.test(raw)) {
        const dom = raw.replace(/^https?:\/\/(?:www\.)?/i, '').split('/')[0].toUpperCase();
        item = `${author} PROMOTES ${dom} IN #${chName}, SCOUTS INVESTIGATING`;
      } else {
        const clean = raw.replace(/\s+/g, ' ').slice(0, 74).replace(/[,;:.!?]+$/, '').toUpperCase();
        if (clean.length > 5) {
          item = `${author} SUGGESTS ${clean}, GENIUS`;
        }
      }

      if (item && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

export default function Nhl95Ticker({ className = '' }: { className?: string }) {
  const [items, setItems] = useState<string[]>(FALLBACK_TICKER_ITEMS);
  const [clockText, setClockText] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date());
        setClockText(str);
      } catch {
        setClockText('LIVE');
      }
    };
    updateClock();
    const t = setInterval(updateClock, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTicker = async () => {
      try {
        const res = await fetch(`/api/discord-ticker?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data?.items) && data.items.length > 0) {
            setItems(data.items);
            return;
          }
        }
      } catch {}

      try {
        const bRes = await fetch(`/daily_briefing.json?t=${Date.now()}`, { cache: 'no-store' });
        if (bRes.ok) {
          const bData = await bRes.json();
          const parsed = formatBriefingToTickerItems(bData);
          if (mounted && parsed.length > 0) {
            setItems(parsed.slice(0, 20));
          }
        }
      } catch {}
    };

    loadTicker();
    const poll = setInterval(loadTicker, 60000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, []);

  const loopItems = [...items, ...items];

  return (
    <div
      className={`w-full bg-[#0b0e14] text-white border-t-2 border-orange-500 border-b border-black flex items-stretch overflow-hidden select-none font-sans h-9 shadow-md ${className}`}
    >
      <style jsx>{`
        @keyframes nhl95Marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .nhl95-ticker-track {
          display: flex;
          width: max-content;
          animation: nhl95Marquee 190s linear infinite;
        }
        .nhl95-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Left NHL95 LIVE Badge */}
      <div className="bg-gradient-to-b from-[#990d0d] to-[#540505] border-r border-red-900/80 px-3 flex flex-col items-center justify-center shrink-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.6)]">
        <span className="font-mono font-black text-[11px] tracking-wider text-white leading-none">
          NHL95
        </span>
        <div className="flex items-center gap-1 mt-0.5 leading-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="font-mono font-bold text-[8px] tracking-[0.18em] text-red-100 uppercase">
            LIVE
          </span>
        </div>
      </div>

      {/* Center Scrolling Ticker Track */}
      <div className="flex-1 overflow-hidden flex items-center relative bg-[#0b0e14]">
        <div className="nhl95-ticker-track items-center whitespace-nowrap">
          {loopItems.map((text, idx) => {
            const isSeries = /SERIES WIN|SERIES SWEEP/i.test(text);
            const isTrade = /BLOCKBUSTER TRADE|OFFICIAL TRADE/i.test(text);
            const isScore = /FINAL SCORE|SHUTOUT FINAL/i.test(text);
            const colorClass = isSeries
              ? 'text-emerald-400 font-black'
              : isTrade
                ? 'text-amber-400 font-black'
                : isScore
                  ? 'text-sky-300 font-black'
                  : idx % 3 === 0
                    ? 'text-white font-black'
                    : idx % 3 === 1
                      ? 'text-amber-400 font-black'
                      : 'text-slate-300 font-bold';
            return (
              <div key={idx} className="inline-flex items-center">
                <span className={`text-[11px] uppercase tracking-wide px-2 ${colorClass}`}>
                  {text}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 text-orange-500 text-[10px] font-mono">
                  <span className="w-3 h-[1px] bg-orange-500/70 inline-block" />
                  <span>&#9830;</span>
                  <span className="w-3 h-[1px] bg-orange-500/70 inline-block" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right ET Clock */}
      <div className="bg-[#0d1119] border-l border-slate-800 px-3 flex flex-col items-center justify-center shrink-0 z-10 font-mono shadow-[-4px_0_10px_rgba(0,0,0,0.6)]">
        <span className="text-[11px] font-black text-white leading-none whitespace-nowrap">
          {clockText || 'LIVE'}
        </span>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">
          ET
        </span>
      </div>
    </div>
  );
}
