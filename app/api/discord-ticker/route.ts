import { NextResponse } from 'next/server';

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

let cachedTicker: { ts: number; items: string[] } | null = null;

export async function GET() {
  if (cachedTicker && Date.now() - cachedTicker.ts < 45000 && cachedTicker.items.length > 0) {
    return NextResponse.json({ ok: true, items: cachedTicker.items, cached: true });
  }

  const token = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const guildId = (process.env.DISCORD_GUILD_ID || DEFAULT_GUILD_ID).trim();

  if (!token) {
    return NextResponse.json({ ok: false, items: [] });
  }

  try {
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

    if (!chRes.ok) {
      return NextResponse.json({ ok: false, items: [] });
    }

    const channels = await chRes.json();
    if (!Array.isArray(channels)) {
      return NextResponse.json({ ok: false, items: [] });
    }

    const eventBlurbs: string[] = [];
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
    const commentItems = blurbs.slice(0, 22).map((b) => b.text);

    // Interleave upcoming/live Discord events with live comments so both stay visible in the scroll
    const finalItems: string[] = [];
    let evIdx = 0;
    for (let i = 0; i < commentItems.length; i++) {
      if (i % 4 === 0 && evIdx < eventBlurbs.length) {
        finalItems.push(eventBlurbs[evIdx++]);
      }
      finalItems.push(commentItems[i]);
    }
    while (evIdx < eventBlurbs.length) {
      finalItems.push(eventBlurbs[evIdx++]);
    }

    if (finalItems.length > 0) {
      cachedTicker = { ts: Date.now(), items: finalItems };
    }

    return NextResponse.json({ ok: true, items: finalItems });
  } catch {
    return NextResponse.json({ ok: false, items: [] });
  }
}
