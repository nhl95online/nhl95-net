"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const Matchup = ({ match = {}, label }) => {
  const parentHomeId = match.home_team_id;
  const parentAwayId = match.away_team_id;

  const homeName = match.home_team?.team_name || "TBD";
  const awayName = match.away_team?.team_name || "TBD";

  const homeAbbr = match.home_team?.abbreviation || "TBD";
  const awayAbbr = match.away_team?.abbreviation || "TBD";

  const homeBanner = match.home_team?.banner_url;
  const awayBanner = match.away_team?.banner_url;

  const seriesLength = match.series_length || 5;

  const homeSeed = match.home_team_seed !== null && match.home_team_seed !== undefined ? match.home_team_seed : "";
  const awaySeed = match.away_team_seed !== null && match.away_team_seed !== undefined ? match.away_team_seed : "";

  const games = match.results || [];

  const [homeImgFailed, setHomeImgFailed] = React.useState(false);
  const [awayImgFailed, setAwayImgFailed] = React.useState(false);

  return (
    <div className="border-2 border-black p-1 bg-[#fdfaf5] w-[165px] font-serif shadow-[2px_2px_0px_rgba(0,0,0,0.2)] select-none shrink-0 mx-auto">
      {/* Match Label Header */}
      <div className="text-[7px] font-black border-b border-black mb-1.5 text-center uppercase tracking-widest flex justify-between px-1 items-center">
        <span className="truncate max-w-[110px]">{label}</span>
        <span className="text-[6px] italic opacity-60 font-sans">BO{seriesLength}</span>
      </div>

      <div className="flex flex-col items-center w-full">
        {/* 1. HOME TEAM LINE (TOP) */}
        <div className="w-full flex flex-col items-center justify-center min-h-[22px] mb-1 px-0.5">
          <div className="flex items-center justify-center gap-1 w-full">
            {homeSeed && <span className="opacity-60 text-[8px] font-sans shrink-0">({homeSeed})</span>}
            {homeBanner && !homeImgFailed ? (
              <img
                src={homeBanner}
                alt={homeName}
                className="h-[20px] max-w-[110px] object-contain block filter contrast-125"
                onError={() => setHomeImgFailed(true)}
              />
            ) : (
              <span className="text-[10px] font-black truncate uppercase tracking-tight text-center w-full">{homeName}</span>
            )}
          </div>
        </div>

        {/* 2. THE SCOREBOARD SANDWICH */}
        <div className="flex flex-col gap-0.5 border-y border-black/20 py-1 w-full bg-black/[0.01]">
          {/* Top Team Row */}
          <div className="flex items-center w-full px-1">
            <span className="text-[9px] font-sans font-black tracking-tight w-[32px] text-left shrink-0 opacity-75 uppercase">
              {homeAbbr}
            </span>
            <div className="flex gap-0.5 justify-center flex-1">
              {Array.from({ length: seriesLength }).map((_, index) => {
                const targetGameNumber = index + 1;
                const gameResult = games.find(g => g.game_number === targetGameNumber);

                if (!gameResult) {
                  return (
                    <div key={`home-g-${index}`} className="text-[8px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-sm text-black">
                      -
                    </div>
                  );
                }

                const topTeamScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
                const bottomTeamScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;

                const hasScore = topTeamScore !== undefined && topTeamScore !== null;
                const isWinner = hasScore && topTeamScore > (bottomTeamScore || 0);

                return (
                  <div
                    key={`home-g-${index}`}
                    className={`text-[8px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-sm ${isWinner ? 'text-emerald-600 font-extrabold' : 'text-black'
                      }`}
                  >
                    {hasScore ? topTeamScore : '-'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Team Row */}
          <div className="flex items-center w-full px-1 mt-0.5">
            <span className="text-[9px] font-sans font-black tracking-tight w-[32px] text-left shrink-0 opacity-75 uppercase">
              {awayAbbr}
            </span>
            <div className="flex gap-0.5 justify-center flex-1">
              {Array.from({ length: seriesLength }).map((_, index) => {
                const targetGameNumber = index + 1;
                const gameResult = games.find(g => g.game_number === targetGameNumber);

                if (!gameResult) {
                  return (
                    <div key={`away-g-${index}`} className="text-[8px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-sm text-black">
                      -
                    </div>
                  );
                }

                const topTeamScore = gameResult.home_team_id === parentHomeId ? gameResult.home_score : gameResult.away_score;
                const bottomTeamScore = gameResult.away_team_id === parentAwayId ? gameResult.away_score : gameResult.home_score;

                const hasScore = bottomTeamScore !== undefined && bottomTeamScore !== null;
                const isWinner = hasScore && bottomTeamScore > (topTeamScore || 0);

                return (
                  <div
                    key={`away-g-${index}`}
                    className={`text-[8px] font-mono font-bold w-[13px] h-[13px] flex items-center justify-center border border-black/30 bg-white rounded-sm ${isWinner ? 'text-emerald-600 font-extrabold' : 'text-black'
                      }`}
                  >
                    {hasScore ? bottomTeamScore : '-'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. AWAY TEAM LINE (BOTTOM) */}
        <div className="w-full flex flex-col items-center justify-center min-h-[22px] mt-1 px-0.5">
          <div className="flex items-center justify-center gap-1 w-full">
            {awaySeed && <span className="opacity-60 text-[8px] font-sans shrink-0">({awaySeed})</span>}
            {awayBanner && !awayImgFailed ? (
              <img
                src={awayBanner}
                alt={awayName}
                className="h-[20px] max-w-[110px] object-contain block filter contrast-125"
                onError={() => setAwayImgFailed(true)}
              />
            ) : (
              <span className="text-[10px] font-black truncate uppercase tracking-tight text-center w-full">{awayName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PlayoffBracket() {
  const [matches, setMatches] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | string>('');

  // 1. Fetch available leagues directly through the playoff entries to find valid active options
  useEffect(() => {
    const fetchSeasons = async () => {
      // FIX: Query both singular 'leagues' and an alternate table name alias hook just in case
      const { data, error } = await supabase
        .from('league_playoffs')
        .select(`
          league_id,
          leagues:league_id (
            league_name
          )
        `);

      if (error) {
        console.error("⛔ Error fetching bracket configurations:", error.message);
        return;
      }

      if (data) {
        const uniqueMap = new Map();
        data.forEach((row: any) => {
          if (row.league_id) {
            // Unpack dynamic table response objects or arrays cleanly
            const rawLeagues = row.leagues;
            const targetName = Array.isArray(rawLeagues)
              ? rawLeagues[0]?.league_name
              : rawLeagues?.league_name;

            // If targetName is still completely missing, default to displaying the raw league ID
            const labelName = targetName || `W0${row.league_id}`;
            uniqueMap.set(row.league_id, labelName);
          }
        });

        const list = Array.from(uniqueMap.entries()).map(([id, name]: any) => ({
          league_id: id,
          league_name: name
        }));

        setSeasons(list);
        if (list.length > 0) {
          setSelectedLeagueId(list[0].league_id);
        }
      }
    };

    fetchSeasons();
  }, []);

  // 2. Refresh bracket whenever selector shifts options
  useEffect(() => {
    if (selectedLeagueId) {
      fetchPlayoffs(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const fetchPlayoffs = async (leagueId: number | string) => {
    const { data, error } = await supabase
      .from('league_playoffs')
      .select(`
        *, 
        home_team:league_teams!league_playoffs_home_team_id_fkey(team_id, team_name, abbreviation, banner_filename),
        away_team:league_teams!league_playoffs_away_team_id_fkey(team_id, team_name, abbreviation, banner_filename),
        results:league_playoff_results(game_number, home_score, away_score, home_team_id, away_team_id)
      `)
      .eq('league_id', leagueId);

    if (error) {
      console.error("⛔ Supabase Playoff Query Error:", error.message, error.details);
      return;
    }

    if (data) {
      const matchesWithBanners = data.map(match => {
        const homeFile = match.home_team?.banner_filename?.trim();
        const awayFile = match.away_team?.banner_filename?.trim();

        const homeBannerUrl = homeFile ? supabase.storage.from('banners').getPublicUrl(homeFile).data.publicUrl : null;
        const awayBannerUrl = awayFile ? supabase.storage.from('banners').getPublicUrl(awayFile).data.publicUrl : null;

        return {
          ...match,
          home_team: match.home_team ? { ...match.home_team, banner_url: homeBannerUrl } : null,
          away_team: match.away_team ? { ...match.away_team, banner_url: awayBannerUrl } : null
        };
      });
      setMatches(matchesWithBanners);
    }
  };

  const getMatch = (label: string) => matches.find(m => m.match_label === label) || {};

  // Helper function to extract and calculate the champion details
  const getChampionDetails = () => {
    const finalsMatch = getMatch('Finals');
    if (!finalsMatch || !finalsMatch.results || finalsMatch.results.length === 0) return null;

    const parentHomeId = finalsMatch.home_team_id;
    const parentAwayId = finalsMatch.away_team_id;
    const seriesLength = finalsMatch.series_length || 5;
    const winsNeeded = Math.ceil(seriesLength / 2);

    let homeWins = 0;
    let awayWins = 0;

    finalsMatch.results.forEach((game: any) => {
      const topTeamScore = game.home_team_id === parentHomeId ? game.home_score : game.away_score;
      const bottomTeamScore = game.away_team_id === parentAwayId ? game.away_score : game.home_score;

      if (topTeamScore !== undefined && bottomTeamScore !== undefined) {
        if (topTeamScore > bottomTeamScore) homeWins++;
        if (bottomTeamScore > topTeamScore) awayWins++;
      }
    });

    if (homeWins >= winsNeeded) {
      return finalsMatch.home_team;
    } else if (awayWins >= winsNeeded) {
      return finalsMatch.away_team;
    }

    return null;
  };

  // 3. Inspects the league_name prefix to correctly map the award image and trophy titles
  const getCupMetadata = () => {
    const currentLeague = seasons.find(s => String(s.league_id) === String(selectedLeagueId));
    const databaseLeagueName = currentLeague?.league_name || "";
    const firstLetter = databaseLeagueName.trim().toUpperCase()[0];

    let filename = "default_trophy.png";
    let title = "CHAMPIONSHIP";

    if (firstLetter === 'W') {
      filename = "brule_cup.png";
      title = "BRULE CUP";
    } else if (firstLetter === 'Q') {
      filename = "q_cup.png";
      title = "Q CUP";
    } else if (firstLetter === 'V') {
      filename = "grail_cup.png";
      title = "GRAIL CUP";
    }

    const { data } = supabase.storage.from('awards').getPublicUrl(filename);

    return {
      title,
      trophyUrl: data?.publicUrl || null
    };
  };

  const champion = getChampionDetails();
  const cupMeta = getCupMetadata();

  return (
    <div className="min-h-screen w-full bg-[#eaddcc] p-4 md:p-8 text-black font-serif overflow-x-hidden">
      <header className="border-b-4 border-black pb-4 mb-6 text-center">
        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter">The Playoff Magic</h1>
      </header>

      {/* Main scrolling viewport container */}
      <div className="w-full overflow-x-auto pb-8 scrollbar-thin px-2">

        {/* Dropdown Box Container placed directly above the bracket content table layout */}
        {seasons.length > 0 && (
          <div className="min-w-[1260px] max-w-[1440px] mx-auto grid grid-cols-7 mb-3 px-1 items-center">
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60 font-sans">Edition:</span>
              <select
                value={selectedLeagueId}
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="border-2 border-black bg-[#fdfaf5] font-sans font-black text-xs px-3 py-1.5 uppercase tracking-wide cursor-pointer focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-none"
              >
                {seasons.map((s) => (
                  <option key={s.league_id} value={s.league_id} className="bg-[#fdfaf5] font-black text-black">
                    {s.league_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Uniform row canvas to enforce explicit baseline mapping across columns */}
        <div className="min-w-[1260px] max-w-[1440px] mx-auto grid grid-cols-7 bg-[#fbf7f0] py-8 px-2 border-y-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.15)] items-stretch">

          {/* ==================== LEFT BRACKET SIDE ==================== */}

          {/* 1. LEFT QUARTER FINALS */}
          <div className="grid grid-rows-4 h-[580px] text-center">
            {['Quarter Finals - 1', 'Quarter Finals - 2', 'Quarter Finals - 3', 'Quarter Finals - 4'].map(l => (
              <div key={l} className="flex items-center justify-center">
                <Matchup match={getMatch(l)} label={l} />
              </div>
            ))}
          </div>

          {/* 2. LEFT SEMI FINALS */}
          <div className="grid grid-rows-2 h-[580px] text-center">
            <div className="flex items-center justify-center h-full">
              <Matchup match={getMatch('Semi Finals - 1')} label="Semi Finals - 1" />
            </div>
            <div className="flex items-center justify-center h-full">
              <Matchup match={getMatch('Semi Finals - 2')} label="Semi Finals - 2" />
            </div>
          </div>

          {/* 3. LEFT CONFERENCE FINALS */}
          <div className="flex flex-col justify-center h-[580px] text-center">
            <Matchup match={getMatch('Conference Finals - 1')} label="Conference Finals - 1" />
          </div>

          {/* ==================== THE MAIN EVENT ==================== */}

          {/* 4. CHAMPIONSHIP TITLE MATCH & DYNAMIC SUPABASE TROPHY */}
          <div className="relative flex flex-col justify-center items-center h-[580px] bg-black/[0.015] px-2 text-center">

            {/* Trophy Section - Absolute positioned at the top to keep Title Match perfectly centered */}
            <div className="absolute top-6 left-0 right-0 flex flex-col items-center pointer-events-none">
              {champion ? (
                <div className="flex flex-col items-center animate-fade-in transition-all duration-300 max-w-[165px]">
                  {/* Supabase Bucket Trophy Image */}
                  {cupMeta.trophyUrl && (
                    <div className="relative overflow-hidden mb-1 group">
                      <img
                        src={cupMeta.trophyUrl}
                        alt={cupMeta.title}
                        className="h-[105px] w-auto object-contain block filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]"
                      />
                      {/* Shining sweep overlay */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] skew-x-12" />
                    </div>
                  )}
                  <div className="text-[9px] font-sans font-black tracking-widest uppercase text-emerald-700 mb-1">
                    {cupMeta.title} WINNER
                  </div>
                  {champion.banner_url ? (
                    <img
                      src={champion.banner_url}
                      alt={champion.team_name}
                      className="h-[24px] max-w-[130px] object-contain block filter contrast-125 border border-black/10 p-0.5 bg-white shadow-sm"
                    />
                  ) : (
                    <span className="text-xs font-black uppercase tracking-tight">{champion.team_name}</span>
                  )}
                </div>
              ) : (
                /* Silhouette Placeholder before final champion is declared */
                <div className="flex flex-col items-center opacity-25 max-w-[165px]">
                  {cupMeta.trophyUrl && (
                    <img
                      src={cupMeta.trophyUrl}
                      alt={cupMeta.title}
                      className="h-[105px] w-auto object-contain block grayscale brightness-50 mb-1"
                    />
                  )}
                  <div className="text-[9px] font-sans font-black tracking-widest uppercase mb-1">{cupMeta.title}</div>
                  <div className="h-[24px] w-[80px] border border-dashed border-black/40 rounded bg-black/[0.02]" />
                </div>
              )}
            </div>

            {/* Title Match Box - Now perfectly centered with the rest of the bracket row layout */}
            <div className="z-10">
              <Matchup match={getMatch('Finals')} label="TITLE MATCH" />
            </div>
          </div>

          {/* ==================== RIGHT BRACKET SIDE ==================== */}

          {/* 5. RIGHT CONFERENCE FINALS */}
          <div className="flex flex-col justify-center h-[580px] text-center">
            <Matchup match={getMatch('Conference Finals - 2')} label="Conference Finals - 2" />
          </div>

          {/* 6. RIGHT SEMI FINALS */}
          <div className="grid grid-rows-2 h-[580px] text-center">
            <div className="flex items-center justify-center h-full">
              <Matchup match={getMatch('Semi Finals - 3')} block label="Semi Finals - 3" />
            </div>
            <div className="flex items-center justify-center h-full">
              <Matchup match={getMatch('Semi Finals - 4')} label="Semi Finals - 4" />
            </div>
          </div>

          {/* 7. RIGHT QUARTER FINALS */}
          <div className="grid grid-rows-4 h-[580px] text-center">
            {['Quarter Finals - 5', 'Quarter Finals - 6', 'Quarter Finals - 7', 'Quarter Finals - 8'].map(l => (
              <div key={l} className="flex items-center justify-center">
                <Matchup match={getMatch(l)} label={l} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}