import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DEFAULT_GUILD_ID = '146381349589090305';

function formatEventDateAndTime(isoString?: string | null): { date: string; time: string } {
  if (!isoString) return { date: 'TBD', time: '' };
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return { date: 'TBD', time: '' };

  try {
    const dateStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: '2-digit',
    }).format(dt);

    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dt);

    return { date: dateStr, time: `${timeStr} ET` };
  } catch {
    return {
      date: dt.toISOString().slice(5, 10),
      time: dt.toISOString().slice(11, 16),
    };
  }
}

export async function GET() {
  const token = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  const guildId = (process.env.DISCORD_GUILD_ID || DEFAULT_GUILD_ID).trim();

  if (!token) {
    return NextResponse.json({ ok: false, error: 'DISCORD_BOT_TOKEN not configured', events: [] }, { status: 200 });
  }

  try {
    const resp = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/scheduled-events?with_user_count=true`, {
      headers: {
        Authorization: `Bot ${token}`,
        'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: `Discord API returned ${resp.status}`, events: [] },
        { status: 200 }
      );
    }

    const discordDateHeader = resp.headers.get('date');
    const nowMs = discordDateHeader ? new Date(discordDateHeader).getTime() : Date.now();
    const rawEvents = await resp.json();

    if (!Array.isArray(rawEvents)) {
      return NextResponse.json({ ok: true, events: [] });
    }

    // Status: 1 = SCHEDULED, 2 = ACTIVE, 3 = COMPLETED, 4 = CANCELED
    const currentEvents = rawEvents
      .filter((evt: any) => {
        const status = Number(evt?.status);
        if (status === 2) return true; // Currently LIVE
        if (status !== 1) return false; // Ignore completed/canceled

        const startMs = evt?.scheduled_start_time ? new Date(evt.scheduled_start_time).getTime() : 0;
        const endMs = evt?.scheduled_end_time ? new Date(evt.scheduled_end_time).getTime() : 0;

        if (endMs && endMs >= nowMs) return true;
        // Allow a 2-hour grace window after scheduled start if not yet marked completed
        if (startMs && startMs >= nowMs - 2 * 60 * 60 * 1000) return true;
        return false;
      })
      .sort((a: any, b: any) => {
        const aLive = Number(a?.status) === 2 ? 0 : 1;
        const bLive = Number(b?.status) === 2 ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;

        const aStart = a?.scheduled_start_time ? new Date(a.scheduled_start_time).getTime() : Number.MAX_SAFE_INTEGER;
        const bStart = b?.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      })
      .map((evt: any) => {
        const isLive = Number(evt?.status) === 2;
        const { date, time } = isLive
          ? { date: 'LIVE NOW', time: '' }
          : formatEventDateAndTime(evt?.scheduled_start_time);

        const location = String(evt?.entity_metadata?.location || '').trim();
        const rawDesc = String(evt?.description || '').trim();
        const url = /^https?:\/\//i.test(location)
          ? location
          : `https://discord.com/events/${evt.guild_id || guildId}/${evt.id}`;

        return {
          id: String(evt.id),
          date,
          time,
          start_time: evt?.scheduled_start_time || null,
          end_time: evt?.scheduled_end_time || null,
          title: String(evt?.name || 'League Event'),
          description: rawDesc,
          location: location && !/^https?:\/\//i.test(location) ? location : '',
          url,
          interested: Number(evt?.user_count || 0),
          is_live: isLive,
        };
      });

    return NextResponse.json({
      ok: true,
      server_time_utc: new Date(nowMs).toISOString(),
      events: currentEvents,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Failed to fetch Discord events', events: [] },
      { status: 200 }
    );
  }
}
