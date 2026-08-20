"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface SeasonOption {
  id: number;
  label: string;
  league: 'W' | 'O' | 'V' | 'G' | 'Q';
}

// All defined seasons with their ID, code label, and league type
const ALL_SEASONS: SeasonOption[] = [
  { id: 40, label: 'W18', league: 'W' },
  { id: 39, label: 'O01', league: 'O' },
  { id: 38, label: 'W17', league: 'W' },
  { id: 37, label: 'W16', league: 'W' },
  { id: 36, label: 'Q19', league: 'Q' },
  { id: 35, label: 'W15', league: 'W' },
  { id: 34, label: 'Q18', league: 'Q' },
  { id: 33, label: 'W14', league: 'W' },
  { id: 32, label: 'Q17', league: 'Q' },
  { id: 31, label: 'W13', league: 'W' },
  { id: 30, label: 'Q16', league: 'Q' },
  { id: 29, label: 'Q15', league: 'Q' },
  { id: 28, label: 'W12', league: 'W' },
  { id: 27, label: 'Q14', league: 'Q' },
  { id: 26, label: 'Q13', league: 'Q' },
  { id: 25, label: 'Q12', league: 'Q' },
  { id: 24, label: 'W11', league: 'W' },
  { id: 23, label: 'Q11', league: 'Q' },
  { id: 22, label: 'W10', league: 'W' },
  { id: 21, label: 'Q10', league: 'Q' },
  { id: 20, label: 'V01', league: 'V' },
  { id: 19, label: 'Q09', league: 'Q' },
  { id: 18, label: 'W09', league: 'W' },
  { id: 17, label: 'Q08', league: 'Q' },
  { id: 16, label: 'G01', league: 'G' },
  { id: 15, label: 'Q07', league: 'Q' },
  { id: 14, label: 'W08', league: 'W' },
  { id: 13, label: 'Q06', league: 'Q' },
  { id: 12, label: 'Q05', league: 'Q' },
  { id: 11, label: 'W07', league: 'W' },
  { id: 10, label: 'Q04', league: 'Q' },
  { id: 9, label: 'W06', league: 'W' },
  { id: 8, label: 'Q03', league: 'Q' },
  { id: 7, label: 'Q02', league: 'Q' },
  { id: 6, label: 'W05', league: 'W' },
  { id: 5, label: 'Q01', league: 'Q' },
  { id: 4, label: 'W04', league: 'W' },
  { id: 3, label: 'W03', league: 'W' },
  { id: 2, label: 'W02', league: 'W' },
  { id: 1, label: 'W01', league: 'W' }
];

// Mapping season IDs to their prefix type for trophy logic
const SEASON_TYPES: Record<number, string> = {
  1: 'W', 2: 'W', 3: 'W', 4: 'W', 5: 'Q', 6: 'W', 7: 'Q', 8: 'Q', 9: 'W', 10: 'Q',
  11: 'W', 12: 'Q', 13: 'Q', 14: 'W', 15: 'Q', 16: 'G', 17: 'Q', 18: 'W', 19: 'Q', 20: 'V',
  21: 'Q', 22: 'W', 23: 'Q', 24: 'W', 25: 'Q', 26: 'Q', 27: 'Q', 28: 'W', 29: 'Q', 30: 'Q',
  31: 'W', 32: 'Q', 33: 'W', 34: 'Q', 35: 'W', 36: 'Q', 37: 'W', 38: 'W', 39: 'O', 40: 'W'
};

const getTrophyUrl = (seasonId: number) => {
  const type = SEASON_TYPES[seasonId];
  if (type === 'W') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png';
  if (type === 'Q') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/q_cup.png';
  if (type === 'V') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/grail_cup.png';
  if (type === 'O') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Original%206.png';
  if (type === 'G') return 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/Golden%20Era.png';
  return null;
};

const DEFAULT_BRIEFING = {
  updated_at: "Today • Late Edition",
  headline: "GAELICGOPHER CLAIMS TO HATE CHINESE BUFFET VLOGGER (CONFESSES TO BINGING EVERY EPISODE)",
  subheadline: "Unholy Blindly Confirms Sabres Identity; Segathon Floods the Tape Room With High-Stakes Twitch Reels",
  quote_of_the_day: {
    quote: "I can't view it, but yes that's me.",
    author: "Unholy",
    context: "Confirming archival Sabres footage through pure aura"
  },
  bulletin: {
    title: "COMMISSIONER'S DESK: SEASON 40 PUCK DROP",
    text: "All team managers are instructed to confirm their active rosters and check emulator netplay configs. Rulebook updates regarding manual goalies and crease violations are now in full effect.",
    author: "League HQ",
    date: "Today"
  },
  nhl_wire: [
    {
      title: "NHL Offseason: Trade Buzz Intensifies as Training Camps Near",
      link: "https://www.nhl.com/news",
      date: "Today"
    },
    {
      title: "Scouting Reports: Top Prospects Gear Up for Rookie Showcases",
      link: "https://www.nhl.com/news",
      date: "Today"
    },
    {
      title: "Free Agency Rewind: Big Summer Moves That Shifted Division Balance",
      link: "https://www.nhl.com/news",
      date: "Today"
    }
  ],
  events: [
    {
      date: "LIVE NOW",
      time: "",
      title: "W18 Exhibition Series: Segathon vs Unholy",
      description: "Genesis Netplay showdown streaming live in #highlights.",
      url: "https://www.twitch.tv/segathonsow",
      is_live: true,
      interested: 8
    },
    {
      date: "June 28",
      time: "8:00 PM",
      title: "Trade Deadline",
      description: "Rosters lock for playoffs. Final buzzer on all blockbuster trades.",
      is_live: false,
      interested: 14
    },
    {
      date: "July 01",
      time: "7:00 PM",
      title: "Draft Lottery",
      description: "Ping pong balls decide franchise future.",
      is_live: false,
      interested: 18
    },
    {
      date: "July 05",
      time: "12:00 PM",
      title: "Free Agency Opens",
      description: "High-stakes contract negotiations begin on the wire.",
      is_live: false,
      interested: 12
    }
  ],
  sections: [
    {
      channel: "cooking-with-puss",
      badge: "CULINARY CONTROVERSY",
      title: "Late Night Buffet Rants",
      commentary: "At 2:43 AM, GaelicGopher called out an anonymous Chinese buffet influencer as 'horrible' before immediately admitting to hate-watching the entire filmography.",
      messages: [
        {
          time: "02:43",
          author: "GaelicGopher",
          text: "@segathon FYI, that Chinese buffet loser....he's horrible (and I've somehow watched every single episode)"
        }
      ]
    },
    {
      channel: "knightsvision",
      badge: "HOT SCOOP",
      title: "Sabres Classics Identification Incident",
      commentary: "Segathon uncovered mystery vintage tape. Unholy confirmed it was 100% him on the ice without even loading the link.",
      messages: [
        {
          time: "16:04",
          author: "segathon",
          text: "is this you @Unholy (https://x.com/SabresClassics/...)"
        },
        {
          time: "16:32",
          author: "Unholy",
          text: "I can't view it, but yes that's me."
        }
      ]
    },
    {
      channel: "highlights",
      badge: "TAPE ROOM",
      title: "Segathon Drops Triple Twitch Bombshell",
      commentary: "Three high-octane clips dropped in rapid succession featuring textbook manual goalie saves and cross-crease snipes.",
      clips: [
        {
          name: "HilariousHumbleCake",
          url: "https://www.twitch.tv/segathonsow/clip/HilariousHumbleCakeOptimizePrime-jXgK-FCJEkSEPWRN"
        },
        {
          name: "ProtectiveTangibleLlama",
          url: "https://www.twitch.tv/segathonsow/clip/ProtectiveTangibleLlamaDoubleRainbow-SheU_4EQkkT-SvHC"
        },
        {
          name: "CrepuscularAltruisticSandwich",
          url: "https://www.twitch.tv/segathonsow/clip/CrepuscularAltruisticSandwichAMPEnergyCherry-qp00z_PkiDpFAEEZ"
        }
      ],
      messages: [
        {
          time: "13:15 - 13:23",
          author: "segathon",
          text: "Posted 3 Twitch highlight reels"
        }
      ]
    },
    {
      channel: "crib-notes-with-pinot-and-gummies",
      badge: "LATE NIGHT INTEL",
      title: "The Monday Night Detour",
      commentary: "Under the influence of premium pinot and gummies, GaelicGopher declared 'Monday night de tour'. Scouts are analyzing the playbook.",
      messages: [
        {
          time: "02:14",
          author: "GaelicGopher",
          text: "Monday night de tour"
        }
      ]
    }
  ]
};

export default function HomePage() {
  // Defaulting to 40 (W18)
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [selectedSeason, setSelectedSeason] = useState<number>(40);
  const [standings, setStandings] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(DEFAULT_BRIEFING);

  // Filter seasons based on selected league
  const filteredSeasons = useMemo(() => {
    if (selectedLeague === 'ALL') return ALL_SEASONS;
    return ALL_SEASONS.filter((s) => s.league === selectedLeague);
  }, [selectedLeague]);

  // Handle switching league filter buttons
  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league);
    const available = league === 'ALL'
      ? ALL_SEASONS
      : ALL_SEASONS.filter((s) => s.league === league);

    if (available.length > 0 && !available.some((s) => s.id === selectedSeason)) {
      setSelectedSeason(available[0].id);
    }
  };

  useEffect(() => {
    fetch('/daily_briefing.json')
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setBriefing(data))
      .catch((err) => {
        // Fallback to default briefing
        console.log("Using cached Gazette briefing");
      });
  }, []);

  useEffect(() => {
    async function loadStandings() {
      const { data, error } = await supabase
        .from('league_standings')
        .select(`
          gp, w, l, t, otl, pts, is_champion,
          league_teams(abbreviation, logo_url)
        `)
        .eq('season_id', Number(selectedSeason))
        .order('pts', { ascending: false });

      if (error) {
        console.error("DEBUG - Supabase Error:", JSON.stringify(error, null, 2));
      } else {
        setStandings(data || []);
      }
    }
    loadStandings();
  }, [selectedSeason]);

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-2 sm:p-4 md:p-6">
      <header className="border-b-4 border-black pb-3 sm:pb-4 mb-4 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter">NHL95 Gazette</h1>
        <p className="text-xs sm:text-sm italic">"Welcome to the Darkside of NHL95"</p>
      </header>

      {/* Real-World NHL Current News Wire Bar */}
      {briefing?.nhl_wire && briefing.nhl_wire.length > 0 && (
        <div className="border-y-2 border-black py-1.5 px-3 mb-6 bg-neutral-100 flex items-center gap-3 overflow-hidden text-xs">
          <span className="bg-black text-white font-mono uppercase font-black px-1.5 py-0.5 text-[10px] tracking-wider shrink-0">
            AP NHL WIRE
          </span>
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap no-scrollbar text-neutral-800">
            {briefing.nhl_wire.map((story: any, sIdx: number) => (
              <a
                key={sIdx}
                href={story.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:text-blue-800 hover:underline flex items-center gap-1.5"
              >
                <span>•</span>
                <span>{story.title}</span>
                <span className="text-[10px] text-neutral-500 font-normal">({story.date})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 sm:gap-6 md:gap-8">
        <section className="col-span-12 md:col-span-3 border-r-0 md:border-r border-black pr-0 md:pr-2 pb-4 md:pb-0 border-b md:border-b-0 space-y-4 sm:space-y-6">
          {/* 1. Live Now Section (if any live events) */}
          {briefing?.events?.some((e: any) => e.is_live) && (
            <div className="border-2 border-red-700 bg-red-50 p-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-900 font-mono">
                  HAPPENING NOW
                </span>
              </div>
              {briefing.events
                .filter((e: any) => e.is_live)
                .map((liveEvt: any, lIdx: number) => (
                  <div key={lIdx} className="space-y-1">
                    <h3 className="font-black text-xs text-neutral-900 leading-snug">{liveEvt.title}</h3>
                    {liveEvt.description && (
                      <p className="text-[11px] text-neutral-700 italic">{liveEvt.description}</p>
                    )}
                    {liveEvt.url && (
                      <a
                        href={liveEvt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-[10px] font-bold font-mono bg-red-600 hover:bg-red-700 text-white px-2 py-0.5"
                      >
                        Watch Live Stream →
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 2. Upcoming Discord Events */}
          <div>
            <div className="flex items-center justify-between border-b border-black mb-3 pb-1">
              <h2 className="font-bold uppercase tracking-tight text-sm">Upcoming Events</h2>
              <span className="text-[9px] font-mono uppercase bg-neutral-200 px-1 py-0.5">
                DISCORD
              </span>
            </div>

            <div className="space-y-3">
              {briefing?.events && briefing.events.filter((e: any) => !e.is_live).length > 0 ? (
                briefing.events
                  .filter((e: any) => !e.is_live)
                  .map((evt: any, idx: number) => (
                    <div key={idx} className="border border-neutral-300 bg-white/60 p-2.5 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="bg-black text-white text-center px-1.5 py-1 min-w-[48px] shrink-0 font-mono rounded-none">
                          <div className="text-[10px] font-black uppercase leading-none">{evt.date}</div>
                          {evt.time && <div className="text-[8px] opacity-75 mt-0.5 leading-none">{evt.time}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs leading-snug text-neutral-900">{evt.title}</h3>
                          {evt.description && (
                            <p className="text-[10px] text-neutral-600 italic mt-0.5 leading-tight">{evt.description}</p>
                          )}
                          {evt.url ? (
                            <a
                              href={evt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-1 text-[9px] font-mono font-bold text-blue-800 hover:underline"
                            >
                              Join in Discord →
                            </a>
                          ) : evt.interested ? (
                            <span className="inline-block mt-1 text-[8px] font-mono text-neutral-500">
                              ★ {evt.interested} interested
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-xs italic text-neutral-500">No scheduled events on the wire.</p>
              )}
            </div>
          </div>

          {/* 3. League Special Bulletin / Announcements */}
          {briefing?.bulletin && (
            <div className="border border-black bg-amber-50/50 p-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-black/20 pb-1 mb-1.5">
                <span className="text-[9px] font-black uppercase font-mono tracking-wider text-neutral-800">
                  SPECIAL BULLETIN
                </span>
                <span className="text-[9px] font-mono text-neutral-500">{briefing.bulletin.date}</span>
              </div>
              <h3 className="font-bold text-xs leading-snug text-neutral-900 mb-1">
                {briefing.bulletin.title}
              </h3>
              <p className="text-[11px] text-neutral-700 leading-relaxed font-serif">
                {briefing.bulletin.text}
              </p>
              <div className="text-[9px] font-mono text-right text-neutral-500 mt-1.5">
                — {briefing.bulletin.author}
              </div>
            </div>
          )}
        </section>

        <main className="col-span-12 md:col-span-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-3">
            <h2 className="font-black uppercase tracking-tight text-lg">Daily Discord Gazette Briefing</h2>
            <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 tracking-wider">
              {briefing?.updated_at || 'LIVE WIRE'}
            </span>
          </div>

          {briefing ? (
            <div className="space-y-4">
              {/* Main Tabloid Headline */}
              <div className="border-b border-black pb-3">
                <h3 className="text-2xl font-black uppercase leading-tight tracking-tight mb-1">
                  {briefing.headline}
                </h3>
                <p className="text-xs italic text-neutral-700">
                  {briefing.subheadline}
                </p>
              </div>

              {/* Quote of the Day Box */}
              {briefing.quote_of_the_day && (
                <div className="bg-amber-50/70 border-l-4 border-black p-3 my-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                    ★ Quote of the Day ★
                  </div>
                  <blockquote className="text-sm font-bold italic">
                    "{briefing.quote_of_the_day.quote}"
                  </blockquote>
                  <div className="text-[11px] text-right mt-1 font-semibold text-neutral-700">
                    — {briefing.quote_of_the_day.author} <span className="text-[10px] font-normal italic text-neutral-500">({briefing.quote_of_the_day.context})</span>
                  </div>
                </div>
              )}

              {/* Channel Breakdown Columns / Cards */}
              <div className="space-y-4 mt-2">
                {briefing.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="border border-neutral-300 bg-white/60 p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
                        {sec.badge}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        #{sec.channel}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-neutral-900 leading-snug mb-1">
                      {sec.title}
                    </h4>

                    <p className="text-xs text-neutral-800 leading-relaxed mb-2 font-serif">
                      {sec.commentary}
                    </p>

                    {/* Twitch Highlight Clips */}
                    {sec.clips && sec.clips.length > 0 && (
                      <div className="my-2 p-2 bg-purple-50 border border-purple-200">
                        <div className="text-[10px] font-bold uppercase text-purple-900 mb-1.5 flex items-center gap-1">
                          <span>📼</span> Tape Room Video Reels:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sec.clips.map((clip: any, cIdx: number) => (
                            <a
                              key={cIdx}
                              href={clip.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono font-bold bg-purple-700 hover:bg-purple-900 text-white px-2 py-1 transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <span>▶</span> {clip.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soundbites / Raw Messages */}
                    {sec.messages && sec.messages.length > 0 && (
                      <div className="bg-neutral-100/80 border-t border-neutral-200 pt-2 mt-2 space-y-1 font-mono text-[11px] text-neutral-700">
                        <div className="text-[9px] uppercase font-bold tracking-wider text-neutral-400">
                          Intercepted Audio Log:
                        </div>
                        {sec.messages.map((m: any, mIdx: number) => (
                          <div key={mIdx} className="leading-tight">
                            <span className="text-neutral-400">[{m.time}]</span>{" "}
                            <span className="font-bold text-neutral-900">{m.author}:</span>{" "}
                            <span className="italic">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 p-4 border border-slate-300 italic text-sm text-neutral-600">
              Fetching daily intelligence from the wire...
            </div>
          )}
        </main>

        <aside className="col-span-12 md:col-span-3 border-l-0 md:border-l border-black pl-0 md:pl-4 pt-4 md:pt-0 border-t md:border-t-0">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold uppercase text-sm">STANDINGS</h2>
            <select
              className="text-[10px] border border-black p-1 bg-transparent font-bold cursor-pointer"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              {filteredSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* League Filter / Sort Buttons */}
          <div className="flex items-center gap-1 mb-3 overflow-x-auto no-scrollbar max-w-full pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 mr-0.5 shrink-0">League:</span>
            {(['ALL', 'W', 'Q', 'O', 'V', 'G'] as const).map((league) => (
              <button
                key={league}
                type="button"
                onClick={() => handleLeagueChange(league)}
                className={`text-[10px] font-bold px-1.5 py-0.5 border border-black transition-colors shrink-0 ${selectedLeague === league
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-200'
                  }`}
              >
                {league}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse min-w-[240px]">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="pb-1 font-bold">RK</th>
                  <th className="pb-1 font-bold">TM</th>
                  <th className="pb-1 font-bold text-center">REC</th>
                  <th className="pb-1 font-bold text-center">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s: any, index: number) => (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="py-1 font-bold">{index + 1}</td>
                    <td className="py-1 font-bold flex items-center gap-1.5">
                      {s.league_teams?.logo_url && (
                        <img
                          src={s.league_teams.logo_url}
                          alt={s.league_teams.abbreviation}
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span>{s.league_teams?.abbreviation || 'N/A'}</span>

                      {s.is_champion && getTrophyUrl(selectedSeason) && (
                        <img
                          src={getTrophyUrl(selectedSeason)!}
                          alt="Championship Winner"
                          className="w-4 h-4 ml-1 object-contain shrink-0"
                          title="Championship Winner"
                        />
                      )}
                    </td>
                    <td className="py-1 text-center font-mono">
                      {s.w}-{s.l}{s.t ? `-${s.t}` : ''}{s.otl ? `-${s.otl}` : ''}
                    </td>
                    <td className="py-1 font-bold text-center">{s.pts}</td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-slate-500 italic">
                      No standings available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <a href="/standings" className="block mt-4 text-[9px] underline italic text-slate-600 hover:text-black">
            View full standings →
          </a>
        </aside>
      </div>
    </div>
  );
}