import { NextRequest, NextResponse } from 'next/server';

const SEASON_ID_TO_YEAR: Record<number, number> = {
  1: 1995, 2: 1996, 3: 1997, 4: 1998, 6: 1999, 9: 2000, 11: 2001, 14: 2002,
  18: 2003, 22: 2004, 24: 2005, 28: 2006, 31: 2007, 33: 2008, 35: 2009, 37: 2010,
  38: 2012, 39: 1927, 40: 2013, 41: 2014, 42: 2015, 43: 2016, 44: 2017, 45: 2018,
  46: 2019, 47: 2020, 48: 2021, 49: 2022, 50: 2023, 51: 2024, 52: 2025, 53: 2026
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileName = ((formData.get('fileName') as string) || file?.name || 'arena_game.state').trim();
    const coachName = ((formData.get('coachName') as string) || 'Arena Coach').trim();
    const romLabel = ((formData.get('romLabel') as string) || 'NHL 95').trim();
    const scoreSummary = ((formData.get('scoreSummary') as string) || '').trim();
    const seasonId = Number(formData.get('seasonId') || 40);

    if (!file) {
      return NextResponse.json({ error: 'Missing save state file' }, { status: 400 });
    }

    const stateBytes = Buffer.from(await file.arrayBuffer());
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const webhookUrl = process.env.DISCORD_SAVESTATE_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    const explicitChannelId = process.env.DISCORD_SAVESTATE_CHANNEL_ID;

    const messageContent = scoreSummary
      ? `🏒 **Arena Save State** from **${coachName}** (${romLabel}) — **${scoreSummary}** (\`${fileName}\`)`
      : `🏒 **Arena Save State** from **${coachName}** (${romLabel}) — \`${fileName}\``;

    // Helper to build a Discord multipart/form-data request body with a binary file attachment
    const postMultipartToDiscord = async (url: string, authHeaders: Record<string, string>) => {
      const outForm = new FormData();
      outForm.append(
        'payload_json',
        JSON.stringify({
          content: messageContent,
          attachments: [{ id: 0, filename: fileName }]
        })
      );
      outForm.append('files[0]', new Blob([stateBytes], { type: 'application/octet-stream' }), fileName);

      return fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: outForm
      });
    };

    // 1. If an explicit save-state channel ID is configured, post directly there via Bot Token
    if (botToken && explicitChannelId) {
      const res = await postMultipartToDiscord(
        `https://discord.com/api/v10/channels/${explicitChannelId}/messages`,
        { Authorization: `Bot ${botToken}` }
      );
      if (res.ok) {
        return NextResponse.json({
          success: true,
          channelName: `channel #${explicitChannelId}`,
          fileName
        });
      }
    }

    // 2. Discover the server's save-state channel via DISCORD_BOT_TOKEN
    if (botToken) {
      try {
        const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bot ${botToken}` }
        });

        if (guildsRes.ok) {
          const guilds = await guildsRes.json();
          const yearStr = String(SEASON_ID_TO_YEAR[seasonId] || '2013');

          for (const g of guilds) {
            const chRes = await fetch(`https://discord.com/api/v10/guilds/${g.id}/channels`, {
              headers: { Authorization: `Bot ${botToken}` }
            });
            if (!chRes.ok) continue;

            const channels: any[] = await chRes.json();
            const textChannels = channels.filter(c => c.type === 0);

            // Priority 1: Exact matching year save-state channel (e.g. 2013-saves, 2013-save-states, 2014-save-states)
            const yearSaveCh = textChannels.find(c => {
              const n = (c.name || '').toLowerCase();
              return n.includes(yearStr) && (n.includes('save') || n.includes('state'));
            });

            // Priority 2: Any channel named save-states, save-state, saves, savestates
            const genericSaveCh = textChannels.find(c => {
              const n = (c.name || '').toLowerCase();
              return (
                n === 'save-states' ||
                n === 'save-state' ||
                n === 'savestates' ||
                n === 'saves' ||
                n.includes('save-state') ||
                n.includes('saves')
              );
            });

            const targetCh = yearSaveCh || genericSaveCh;
            if (targetCh) {
              const postRes = await postMultipartToDiscord(
                `https://discord.com/api/v10/channels/${targetCh.id}/messages`,
                { Authorization: `Bot ${botToken}` }
              );
              if (postRes.ok) {
                return NextResponse.json({
                  success: true,
                  channelName: `#${targetCh.name}`,
                  fileName
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Discord bot channel discovery fallback:', err);
      }
    }

    // 3. Fallback to Webhook URL if configured
    if (webhookUrl) {
      const whRes = await postMultipartToDiscord(`${webhookUrl}?wait=true`, {});
      if (whRes.ok) {
        return NextResponse.json({
          success: true,
          channelName: 'Discord Save State Webhook',
          fileName
        });
      }
    }

    return NextResponse.json(
      { error: 'Could not reach Discord save-state channel. Check DISCORD_BOT_TOKEN or DISCORD_WEBHOOK_URL.' },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to send save state to Discord' },
      { status: 500 }
    );
  }
}
