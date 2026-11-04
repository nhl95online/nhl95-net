import { NextRequest, NextResponse } from 'next/server';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DEFAULT_GUILD_ID = '146381349589090305';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leagueType = 'W',
      seasonLabel = 'W19 (2014)',
      teamName = 'Team',
      teamAbbr = 'TM',
      coachName = 'Coach',
      logoUrl = null,
      rebrandName = '',
      brandNotes = '',
      homePalette = {},
      awayPalette = {},
      homeStrip16 = [],
      visitorStrip16 = [],
      homeStripOffsetHex = '001A730C',
      visitorStripOffsetHex = '001A731C',
      startingLineup = {},
      benchPlayers = [],
      cutPlayers = [],
      transactionsSummary = [],
    } = body || {};

    const token = (process.env.DISCORD_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    const guildId = (process.env.DISCORD_GUILD_ID || DEFAULT_GUILD_ID).trim();

    const formatPaletteLine = (
      pal: Record<string, { hex: string; noseHex: string }>,
      strip16?: string[]
    ) => {
      const stripHeader =
        Array.isArray(strip16) && strip16.length === 16
          ? `\`Row 0-7 :\` ${strip16.slice(0, 8).join(' ')}\n\`Row 8-15:\` ${strip16.slice(8, 16).join(' ')}\n`
          : '';
      const order = [
        ['helmet', 'Helmet (#8)'],
        ['jerseyMain', 'Jersey (#4)'],
        ['shoulders', 'Yoke (#9)'],
        ['stripe1', 'Stripes (#13)'],
        ['pants', 'Pants (#9-12)'],
        ['gloves', 'Gloves (#1)'],
      ];
      const rows = order
        .map(([k, label]) => {
          const item = pal?.[k];
          if (!item) return null;
          return `\`${label.padEnd(13, ' ')}\` **${item.noseHex}** (${item.hex.toUpperCase()})`;
        })
        .filter(Boolean)
        .join('\n');
      return `${stripHeader}${rows}`.trim();
    };

    const startersLines = [
      `🏒 **LW:** ${startingLineup.LW || 'TBD'}`,
      `🏒 **C:** ${startingLineup.C || 'TBD'}`,
      `🏒 **RW:** ${startingLineup.RW || 'TBD'}`,
      `🛡️ **LD:** ${startingLineup.LD || 'TBD'}`,
      `🛡️ **RD:** ${startingLineup.RD || 'TBD'}`,
      `🥅 **G1 (Starter):** ${startingLineup.G1 || 'TBD'}`,
      `🥅 **G2 (Backup):** ${startingLineup.G2 || 'TBD'}`,
    ].join('\n');

    const benchLines =
      Array.isArray(benchPlayers) && benchPlayers.length > 0
        ? benchPlayers.map((p: string) => `• ${p}`).join('\n')
        : '• None';

    const cutsLines =
      Array.isArray(cutPlayers) && cutPlayers.length > 0
        ? cutPlayers.map((p: string) => `• ${p}`).join('\n')
        : '• None';

    const txLines =
      Array.isArray(transactionsSummary) && transactionsSummary.length > 0
        ? transactionsSummary.slice(0, 8).map((t: string) => `• ${t}`).join('\n')
        : '• Returning baseline roster';

    const embed: Record<string, any> = {
      color: 0xf59e0b,
      author: {
        name: `NHL95 NOSE "MOD MY TEAM" SUBMISSION • ${seasonLabel}`,
        ...(logoUrl ? { icon_url: logoUrl } : {}),
      },
      title: `🛠️ ${teamName} (${teamAbbr}) — Coach ${coachName}`,
      description: rebrandName
        ? `**Requested Rebrand / Identity:** ${rebrandName}\n${brandNotes ? `*Notes:* ${brandNotes}` : ''}`
        : brandNotes
        ? `*Coach Notes:* ${brandNotes}`
        : `Official offseason NOSE Jersey Palette & Starting Lineup submission for **${seasonLabel}**.`,
      fields: [
        {
          name: `✈️ TEAM 2 / VISITOR STRIP (Offset ${visitorStripOffsetHex})`,
          value: formatPaletteLine(awayPalette, visitorStrip16) || 'Default Visitor Strip',
          inline: true,
        },
        {
          name: `🏠 TEAM 1 / HOME STRIP (Offset ${homeStripOffsetHex})`,
          value: formatPaletteLine(homePalette, homeStrip16) || 'Default Home Strip',
          inline: true,
        },
        {
          name: '⭐ STARTING LINEUP (ROM SLOTS)',
          value: startersLines,
          inline: false,
        },
        {
          name: '🪑 ACTIVE BENCH / ROTATION (5F, 3D, 2G)',
          value: benchLines,
          inline: true,
        },
        {
          name: '✂️ ROSTER CUTS / WAIVED',
          value: cutsLines,
          inline: true,
        },
        {
          name: '🔄 OFFSEASON DRAFTS & TRADES INCLUDED',
          value: txLines,
          inline: false,
        },
      ],
      ...(logoUrl ? { thumbnail: { url: logoUrl } } : {}),
      footer: {
        text: `NHL95.net NOSE Studio • Submitted by ${coachName}`,
      },
      timestamp: new Date().toISOString(),
    };

    const contentHeadline = `🎨 **MOD MY TEAM SUBMISSION [${seasonLabel}]** — **${teamName} (${teamAbbr})** submitted by Coach **${coachName}**!`;

    if (!token) {
      return NextResponse.json({
        ok: false,
        posted: false,
        error: 'DISCORD_BOT_TOKEN not configured on server; use Copy for Discord button.',
      });
    }

    // Find best target channel in Discord guild
    const isO6 = String(leagueType).toUpperCase() === 'O' || String(seasonLabel).toUpperCase().startsWith('O');
    let targetChannelId = isO6
      ? process.env.DISCORD_O6_DRAFT_CHANNEL_ID || '1459581429271892080'
      : process.env.DISCORD_W_DRAFT_CHANNEL_ID || '1484345470158376960';
    let targetChannelName = isO6 ? '#draft (Original 6)' : '#draft-official (The W)';

    try {
      const chRes = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
        },
        cache: 'no-store',
      });
      if (chRes.ok) {
        const channels = await chRes.json();
        if (Array.isArray(channels)) {
          const preferred = channels.find(
            (c: any) =>
              c?.type === 0 &&
              typeof c?.name === 'string' &&
              (c.name.toLowerCase().includes('mod-my-team') ||
                c.name.toLowerCase().includes('team-branding') ||
                c.name.toLowerCase().includes('rom-updates'))
          );
          if (preferred) {
            targetChannelId = preferred.id;
            targetChannelName = `#${preferred.name}`;
          }
        }
      }
    } catch {}

    const sendRes = await fetch(`${DISCORD_API_BASE}/channels/${targetChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://nhl95.net, 1.0)',
      },
      body: JSON.stringify({
        content: contentHeadline,
        embeds: [embed],
      }),
    });

    if (!sendRes.ok) {
      // Fallback to #open-discussion if draft channel restricted
      const errText = await sendRes.text();
      return NextResponse.json({
        ok: false,
        posted: false,
        channelName: targetChannelName,
        error: `Discord API (${sendRes.status}): ${errText.slice(0, 160)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      posted: true,
      channelId: targetChannelId,
      channelName: targetChannelName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, posted: false, error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
