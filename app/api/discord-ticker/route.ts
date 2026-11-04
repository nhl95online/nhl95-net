import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DEFAULT_GUILD_ID = '146381349589090305';

const GIF_TAGLINES = [
  'SECRET CODE FOR CHAOS',
  'LOCKER ROOM ERUPTS',
  'PURE CINEMA IN THE CHAT',
  'SCOUTS LEFT SPEECHLESS',
  'MIND GAMES AT AN ALL-TIME HIGH',
  'COMMISSIONER TAKING NOTES',
  'INSTANT HALL OF FAME REACTION',
  'NO FURTHER QUESTIONS',
];

const STATEMENT_SUFFIXES = [
  'GENIUS',
  'BOLD STRATEGY',
  'LOCKER ROOM ON NOTICE',
  'RUMOR MILL SPINNING',
  'LEAGUE SOURCES CONFIRM',
  'CHAOS ENSUES',
  'SHOTS FIRED',
  'PURE AURA',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function formatMessageToTickerBlurb(authorRaw: string, textRaw: string, channelName: string): string | null {
  const author = String(authorRaw || 'COACH')
    .replace(/[_.-]+/g, ' ')
    .trim()
    .toUpperCase();
  let text = String(textRaw || '').trim();
  if (!text) return null;

  // Replace Discord user/role/channel mentions with clean text
  text = text
    .replace(/<@!?\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/<#\d+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return null;

  const h = hashStr(`${author}:${text}`);

  // 1. GIF links (klipy, tenor, giphy)
  const gifMatch =
    text.match(/https?:\/\/(?:www\.)?(?:klipy\.com\/gifs|tenor\.com\/view|giphy\.com\/gifs)\/([a-zA-Z0-9_-]+)/i) ||
    text.match(/https?:\/\/[^\s]+\.gif/i);
  if (gifMatch) {
    const slug = (gifMatch[1] || 'MYSTERY')
      .replace(/-\d+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim()
      .toUpperCase()
      .split(' ')
      .slice(0, 5)
      .join(' ');
    const tag = GIF_TAGLINES[h % GIF_TAGLINES.length];
    return `${author} SHARES ${slug || 'REACTION'} GIF, ${tag}`;
  }

  // 2. Twitch / YouTube / Instagram / Web links
  const urlMatch = text.match(/https?:\/\/(?:www\.)?([^\s/]+)([^\s]*)/i);
  if (urlMatch) {
    const domain = urlMatch[1].toLowerCase();
    if (domain.includes('twitch.tv')) {
      return `${author} DROPS NEW TWITCH HIGHLIGHT REEL IN #${channelName.toUpperCase()}, GOALIES IN SHAMBLES`;
    }
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return `${author} DROPS YOUTUBE TAPE IN #${channelName.toUpperCase()}, MUST-WATCH FILM`;
    }
    if (domain.includes('instagram.com')) {
      return `${author} SHARES INSTAGRAM REEL IN #${channelName.toUpperCase()}, LOCKER ROOM VIBES`;
    }
    const restText = text.replace(/https?:\/\/[^\s]+/gi, '').trim();
    if (!restText) {
      return `${author} PROMOTES ${domain.toUpperCase()} IN #${channelName.toUpperCase()}, SCOUTS INVESTIGATING`;
    }
    text = restText;
  }

  // Clean quotes and excessive punctuation
  const cleaned = text
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 4) return null;

  // Summarize or truncate into a punchy 1-line blurb
  const firstSentence = cleaned.split(/(?<=[.!?])\s+|\n+/)[0].trim();
  const base = (firstSentence.length >= 6 ? firstSentence : cleaned).slice(0, 78).replace(/[,;:.!?]+$/, '').toUpperCase();
  const suffix = STATEMENT_SUFFIXES[h % STATEMENT_SUFFIXES.length];

  if (/^(WILL TRADE|TRADING|OFFERING)/i.test(base)) {
    return `${author} ON THE TRADE BLOCK: ${base}`;
  }
  if (/\?$/.test(firstSentence)) {
    return `${author} ASKS THE HARD QUESTIONS: ${base}?`;
  }
  return `${author} SUGGESTS ${base}, ${suffix}`;
}

async function fetchScoresSeriesAndTradesBlurbs(): Promise<{
  scoreAndSeriesBlurbs: string[];
  bigTradeBlurbs: string[];
}> {
  const scoreAndSeriesBlurbs: string[] = [];
  const bigTradeBlurbs: string[] = [];

  try {
    const [teamsRes, coachesRes, gamesRes, tradesRes] = await Promise.all([
      supabase.from('league_teams').select('*'),
      supabase.from('league_coaches').select('*'),
      supabase
        .from('league_gamestats')
        .select('*')
        .order('id', { ascending: false })
        .limit(45),
      supabase
        .from('league_trades')
        .select('*')
        .order('trade id', { ascending: false })
        .limit(12),
    ]);

    const coachMap = new Map<number, string>();
    (coachesRes.data || []).forEach((c: any) => {
      const cid = Number(c.coach_id ?? c.id ?? 0);
      if (cid > 0 && c.coach_name) {
        coachMap.set(cid, String(c.coach_name).trim().toUpperCase());
      }
    });

    const teamMap = new Map<
      number,
      { name: string; abbr: string; coach: string }
    >();
    const abbrMap = new Map<
      string,
      { name: string; abbr: string; coach: string }
    >();

    (teamsRes.data || []).forEach((t: any) => {
      const tid = Number(t.team_id || 0);
      const name = String(t.team_name || `TEAM ${tid}`).trim().toUpperCase();
      const abbr = String(t.abbreviation || `TM${tid}`).trim().toUpperCase();
      const cid = Number(t.coach_id || 0);
      const coach =
        (cid && coachMap.get(cid)) ||
        String(t.coach_name || 'COACH').trim().toUpperCase();
      if (tid > 0) {
        teamMap.set(tid, { name, abbr, coach });
      }
      if (abbr) {
        abbrMap.set(abbr, { name, abbr, coach });
      }
    });

    const recentGames = gamesRes.data || [];

    // 1. Track recent head-to-head series tallies across the latest games to detect Series Wins / Sweeps
    const seriesMap = new Map<
      string,
      {
        t1Id: number;
        t2Id: number;
        t1Wins: number;
        t2Wins: number;
        totalGames: number;
        isPlayoff: boolean;
      }
    >();

    recentGames.forEach((g: any) => {
      const hId = Number(g.home_team_id || 0);
      const aId = Number(g.away_team_id || 0);
      const hScore = Number(g.home_score ?? 0);
      const aScore = Number(g.away_score ?? 0);
      if (!hId || !aId || (hScore === 0 && aScore === 0)) return;

      const minId = Math.min(hId, aId);
      const maxId = Math.max(hId, aId);
      const key = `${g.season_id || 'S'}-${minId}-${maxId}`;
      const existing = seriesMap.get(key) || {
        t1Id: minId,
        t2Id: maxId,
        t1Wins: 0,
        t2Wins: 0,
        totalGames: 0,
        isPlayoff: Boolean(g.is_playoff || Number(g.round) > 0),
      };

      existing.totalGames += 1;
      if (g.is_playoff || Number(g.round) > 0) existing.isPlayoff = true;
      if (hScore > aScore) {
        if (hId === minId) existing.t1Wins += 1;
        else existing.t2Wins += 1;
      } else if (aScore > hScore) {
        if (aId === minId) existing.t1Wins += 1;
        else existing.t2Wins += 1;
      }
      seriesMap.set(key, existing);
    });

    // Add Series Win / Sweep headlines first
    for (const s of seriesMap.values()) {
      const t1 = teamMap.get(s.t1Id);
      const t2 = teamMap.get(s.t2Id);
      if (!t1 || !t2) continue;

      if (s.t1Wins >= 2 && s.t1Wins > s.t2Wins) {
        const label =
          s.isPlayoff && s.t1Wins >= 3
            ? `🏆 PLAYOFF SERIES WIN`
            : s.t2Wins === 0
            ? `🧹 SERIES SWEEP (${s.t1Wins}-0)`
            : `🔥 SERIES WIN (${s.t1Wins}-${s.t2Wins})`;
        scoreAndSeriesBlurbs.push(
          `${label}: ${t1.name} (${t1.abbr}) TAKES THE SERIES ${s.t1Wins}-${s.t2Wins} OVER ${t2.name} (${t2.abbr}) — COACH ${t1.coach} STATEMENT SERIES`
        );
      } else if (s.t2Wins >= 2 && s.t2Wins > s.t1Wins) {
        const label =
          s.isPlayoff && s.t2Wins >= 3
            ? `🏆 PLAYOFF SERIES WIN`
            : s.t1Wins === 0
            ? `🧹 SERIES SWEEP (${s.t2Wins}-0)`
            : `🔥 SERIES WIN (${s.t2Wins}-${s.t1Wins})`;
        scoreAndSeriesBlurbs.push(
          `${label}: ${t2.name} (${t2.abbr}) TAKES THE SERIES ${s.t2Wins}-${s.t1Wins} OVER ${t1.name} (${t1.abbr}) — COACH ${t2.coach} STATEMENT SERIES`
        );
      }
      if (scoreAndSeriesBlurbs.length >= 4) break;
    }

    // 2. Add Updated Final Game Scores from the latest logged games
    for (const g of recentGames.slice(0, 10)) {
      const hId = Number(g.home_team_id || 0);
      const aId = Number(g.away_team_id || 0);
      const hScore = Number(g.home_score ?? 0);
      const aScore = Number(g.away_score ?? 0);
      if (!hId || !aId || (hScore === 0 && aScore === 0)) continue;

      const hTeam = teamMap.get(hId) || {
        name: `TEAM ${hId}`,
        abbr: `TM${hId}`,
        coach: 'COACH',
      };
      const aTeam = teamMap.get(aId) || {
        name: `TEAM ${aId}`,
        abbr: `TM${aId}`,
        coach: 'COACH',
      };

      let isOT = false;
      try {
        const meta =
          typeof g.game_meta === 'string' ? JSON.parse(g.game_meta) : g.game_meta;
        const hS =
          typeof g.home_stats === 'string' ? JSON.parse(g.home_stats) : g.home_stats;
        const aS =
          typeof g.away_stats === 'string' ? JSON.parse(g.away_stats) : g.away_stats;
        if (
          meta?.overtime ||
          meta?.is_ot ||
          Number(hS?.home_ot_goals) > 0 ||
          Number(aS?.away_ot_goals) > 0 ||
          Number(hS?.home_ot_shots) > 0 ||
          Number(aS?.away_ot_shots) > 0
        ) {
          isOT = true;
        }
      } catch {}

      const winner = hScore >= aScore ? hTeam : aTeam;
      const loser = hScore >= aScore ? aTeam : hTeam;
      const winScore = Math.max(hScore, aScore);
      const loseScore = Math.min(hScore, aScore);

      if (hScore === aScore) {
        scoreAndSeriesBlurbs.push(
          `🏒 FINAL SCORE (OT TIE): ${aTeam.abbr} ${aScore}, ${hTeam.abbr} ${hScore} — NEITHER ${aTeam.coach} NOR ${hTeam.coach} BLINKS`
        );
      } else if (isOT) {
        scoreAndSeriesBlurbs.push(
          `🚨 FINAL SCORE (OT): ${winner.name} (${winner.abbr}) ${winScore}, ${loser.name} (${loser.abbr}) ${loseScore} — COACH ${winner.coach} WALKS IT OFF IN OVERTIME!`
        );
      } else if (loseScore === 0) {
        scoreAndSeriesBlurbs.push(
          `🥅 SHUTOUT FINAL: ${winner.name} (${winner.abbr}) ${winScore}, ${loser.name} (${loser.abbr}) 0 — COACH ${winner.coach} LOCKS DOWN THE CREASE!`
        );
      } else if (winScore - loseScore >= 4) {
        scoreAndSeriesBlurbs.push(
          `💥 FINAL SCORE: ${winner.name} (${winner.abbr}) ${winScore}, ${loser.name} (${loser.abbr}) ${loseScore} — COACH ${winner.coach} LIGHTS THE LAMP ${winScore} TIMES!`
        );
      } else {
        scoreAndSeriesBlurbs.push(
          `🏒 FINAL SCORE: ${winner.name} (${winner.abbr}) ${winScore}, ${loser.name} (${loser.abbr}) ${loseScore} — ${winner.coach} OUTDUELS ${loser.coach}`
        );
      }
    }

    // 3. Add Big Trades & Blockbuster Deals from league_trades
    const recentTrades = tradesRes.data || [];
    for (const tr of recentTrades) {
      const lg = String(tr.lg || 'W18').trim().toUpperCase();
      const t1Abbr = String(tr.team || '').trim().toUpperCase();
      const t2Abbr = String(tr.team_1 || '').trim().toUpperCase();
      const t1Assets = String(tr.trade || '').replace(/\s+/g, ' ').trim().toUpperCase();
      const t2Assets = String(tr.trade_1 || '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (!t1Abbr || !t2Abbr || !t1Assets || !t2Assets) continue;

      const t1Meta = abbrMap.get(t1Abbr);
      const t2Meta = abbrMap.get(t2Abbr);
      const t1Label = t1Meta ? `${t1Meta.name} (${t1Abbr})` : t1Abbr;
      const t2Label = t2Meta ? `${t2Meta.name} (${t2Abbr})` : t2Abbr;

      const assetCount =
        t1Assets.split(',').length + t2Assets.split(',').length;
      const hasFirstRoundPick = /1ST/i.test(t1Assets) || /1ST/i.test(t2Assets);
      const prefix =
        assetCount >= 3 || hasFirstRoundPick
          ? `🚨 BLOCKBUSTER TRADE [${lg}]`
          : `🔄 OFFICIAL TRADE [${lg}]`;

      bigTradeBlurbs.push(
        `${prefix}: ${t1Label} SENDS ${t1Assets.slice(0, 58)} TO ${t2Label} FOR ${t2Assets.slice(0, 58)}!`
      );
      if (bigTradeBlurbs.length >= 6) break;
    }
  } catch {}

  return { scoreAndSeriesBlurbs, bigTradeBlurbs };
}

let cachedTicker: { ts: number; items: string[] } | null = null;

export async function GET() {
  if (cachedTicker && Date.now() - cachedTicker.ts < 45000 && cachedTicker.items.length > 0) {
    return NextResponse.json({ ok: true, items: cachedTicker.items, cached: true });
  }

  const token = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const guildId = (process.env.DISCORD_GUILD_ID || DEFAULT_GUILD_ID).trim();

  try {
    const dbTickerPromise = fetchScoresSeriesAndTradesBlurbs();

    let eventBlurbs: string[] = [];
    let commentItems: string[] = [];

    if (token) {
      const [chRes, evRes] = await Promise.all([
        fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
          headers: {
            Authorization: `Bot ${token}`,
            'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
          },
          cache: 'no-store',
        }),
        fetch(`${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events?with_user_count=true`, {
          headers: {
            Authorization: `Bot ${token}`,
            'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
          },
          cache: 'no-store',
        }),
      ]);

      if (evRes.ok) {
        const rawEvents = await evRes.json();
        if (Array.isArray(rawEvents)) {
          const nowMs = Date.now() - 2 * 60 * 60 * 1000;
          const activeEvents = rawEvents
            .filter((ev: any) => {
              if (ev?.status === 3 || ev?.status === 4) return false;
              const startMs = ev?.scheduled_start_time ? Date.parse(ev.scheduled_start_time) : 0;
              return ev?.status === 2 || startMs >= nowMs;
            })
            .sort(
              (a: any, b: any) =>
                Date.parse(a.scheduled_start_time || '') - Date.parse(b.scheduled_start_time || '')
            );

          for (const ev of activeEvents.slice(0, 6)) {
            const dt = new Date(ev.scheduled_start_time);
            const dateLabel = dt
              .toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                timeZone: 'America/New_York',
              })
              .toUpperCase();
            const timeLabel = dt
              .toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/New_York',
              })
              .toUpperCase();
            const nameUpper = String(ev.name || 'LEAGUE EVENT').trim().toUpperCase();
            const descSnippet = ev.description
              ? ` (${String(ev.description).replace(/\s+/g, ' ').trim().slice(0, 55).toUpperCase()})`
              : '';
            const livePrefix = ev.status === 2 ? '🔴 LIVE NOW ON DISCORD' : `📅 UPCOMING [${dateLabel} ${timeLabel} ET]`;
            eventBlurbs.push(`${livePrefix}: ${nameUpper}${descSnippet}`);
          }
        }
      }

      if (chRes.ok) {
        const channels = await chRes.json();
        if (Array.isArray(channels)) {
          const targetNames = [
            'bell-n-bell',
            'open-discussion',
            'trade-discussion',
            'shitty-bill',
            'season-games',
            'welcome-to-the-darkside',
            'highlights',
            'cooking-with-puss',
            'exis-only',
            'announcements',
            'playoffs',
          ];

          const matchedChannels = channels.filter(
            (c: any) =>
              (c?.type === 0 || c?.type === 5) &&
              typeof c?.name === 'string' &&
              targetNames.some((tn) => c.name.toLowerCase().includes(tn))
          );

          const blurbs: { id: string; text: string }[] = [];
          const seenTexts = new Set<string>();

          await Promise.all(
            matchedChannels.slice(0, 9).map(async (ch: any) => {
              try {
                const msgRes = await fetch(`${DISCORD_API_BASE}/channels/${ch.id}/messages?limit=8`, {
                  headers: {
                    Authorization: `Bot ${token}`,
                    'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
                  },
                  cache: 'no-store',
                });
                if (!msgRes.ok) return;
                const msgs = await msgRes.json();
                if (!Array.isArray(msgs)) return;

                for (const m of msgs) {
                  if (m?.author?.bot) continue;
                  const authorName =
                    m?.member?.nick || m?.author?.global_name || m?.author?.username || 'Coach';
                  const blurb = formatMessageToTickerBlurb(authorName, m?.content || '', ch.name);
                  if (blurb && !seenTexts.has(blurb)) {
                    seenTexts.add(blurb);
                    blurbs.push({ id: String(m.id || Math.random()), text: blurb });
                  }
                }
              } catch {}
            })
          );

          blurbs.sort((a, b) => b.id.localeCompare(a.id));
          commentItems = blurbs.slice(0, 18).map((b) => b.text);
        }
      }
    }

    const { scoreAndSeriesBlurbs, bigTradeBlurbs } = await dbTickerPromise;

    // Interleave Updated Scores & Series Wins, Big Trades, Upcoming Events, and Discord Banter
    const finalItems: string[] = [];
    const maxLen = Math.max(
      scoreAndSeriesBlurbs.length,
      bigTradeBlurbs.length,
      eventBlurbs.length,
      commentItems.length,
      1
    );

    let sIdx = 0;
    let tIdx = 0;
    let eIdx = 0;
    let cIdx = 0;

    for (let step = 0; step < maxLen * 2; step++) {
      if (sIdx < scoreAndSeriesBlurbs.length) {
        finalItems.push(scoreAndSeriesBlurbs[sIdx++]);
      }
      if (cIdx < commentItems.length) {
        finalItems.push(commentItems[cIdx++]);
      }
      if (tIdx < bigTradeBlurbs.length) {
        finalItems.push(bigTradeBlurbs[tIdx++]);
      }
      if (cIdx < commentItems.length) {
        finalItems.push(commentItems[cIdx++]);
      }
      if (eIdx < eventBlurbs.length) {
        finalItems.push(eventBlurbs[eIdx++]);
      }
    }

    if (finalItems.length > 0) {
      cachedTicker = { ts: Date.now(), items: finalItems };
    }

    return NextResponse.json({ ok: true, items: finalItems });
  } catch {
    return NextResponse.json({ ok: false, items: [] });
  }
}
