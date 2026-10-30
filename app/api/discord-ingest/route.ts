import { NextRequest, NextResponse } from 'next/server';
import { parseSaveStateBuffer } from '@/lib/parsers/savestate';
import { getSeasonConfig, getLeagueCode } from '@/lib/seasons';
import { POST as saveGamePost } from '@/app/api/save-game/route';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SAVESTATE_EXT_REGEX = /\.(state\d*|sav|srm|gp\d*|bin|gz)$/i;

function isSaveStateAttachment(att: { filename?: string; size?: number }): boolean {
  const fname = (att.filename || '').toLowerCase();
  if (SAVESTATE_EXT_REGEX.test(fname)) return true;
  const size = Number(att.size || 0);
  if (size >= 52000 && size <= 260000) {
    const badExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.mp3', '.wav', '.pdf', '.txt', '.json', '.csv', '.zip'];
    if (!badExts.some(ext => fname.endsWith(ext))) {
      return true;
    }
  }
  return false;
}

function detectDiscordContext(
  rawBytes: Uint8Array,
  channelName: string,
  messageText: string,
  filename: string
): { seasonId: number; gameMode: 'Season' | 'Playoffs'; allowOverwrite: boolean } {
  const combined = `${channelName} ${messageText} ${filename}`.toLowerCase();
  const allowOverwrite = /\b(overwrite|resubmit|replace|force)\b/.test(combined);
  const isPlayoffsHint = /\b(playoff|playoffs|po|qf|sf|cf|final|finals|series|bracket)\b/.test(combined) || /\b[wo]\d{1,2}p\b/.test(combined);

  // Check for {year}-save-states channel naming convention (e.g. 2013-save-states, 2014-save-states, 1927-save-states)
  const yearMatch = channelName.toLowerCase().match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    const yr = parseInt(yearMatch[1], 10);
    const yearMap: Record<number, number> = {
      1995: 1, 1996: 2, 1997: 3, 1998: 4, 1999: 6, 2000: 9, 2001: 11, 2002: 14,
      2003: 18, 2004: 22, 2005: 24, 2006: 28, 2007: 31, 2008: 33, 2009: 35, 2010: 37,
      2011: 38, 2012: 38, 2013: 40, 2014: 41, 2015: 42, 2016: 43, 2017: 44, 2018: 45,
      2019: 46, 2020: 47, 2021: 48, 2022: 49, 2023: 50, 2024: 51, 2025: 52, 2026: 53,
      1927: 39, 1928: 54, 1929: 55, 1930: 56, 1931: 57, 1932: 58
    };
    const resolvedSeasonId = yearMap[yr] ?? (yr >= 2013 ? 40 + (yr - 2013) : yr >= 1927 ? (yr === 1927 ? 39 : 54 + (yr - 1928)) : 40);
    return { seasonId: resolvedSeasonId, gameMode: isPlayoffsHint ? 'Playoffs' : 'Season', allowOverwrite };
  }

  if (/\b(o01|o-league|o_league|oleague|original[\s_-]*6|s39|season[\s_-]*39)\b/.test(combined)) {
    return { seasonId: 39, gameMode: isPlayoffsHint ? 'Playoffs' : 'Season', allowOverwrite };
  }

  if (/\b(w17|s38|season[\s_-]*38|season[\s_-]*17)\b/.test(combined)) {
    return { seasonId: 38, gameMode: 'Playoffs', allowOverwrite };
  }

  if (/\b(w18|s40|season[\s_-]*40|w-league|w_league|wleague)\b/.test(combined)) {
    return { seasonId: 40, gameMode: isPlayoffsHint ? 'Playoffs' : 'Season', allowOverwrite };
  }

  return {
    seasonId: 40,
    gameMode: isPlayoffsHint ? 'Playoffs' : 'Season',
    allowOverwrite
  };
}

async function discordApiFetch(path: string, botToken: string, options: RequestInit = {}) {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return res;
}

async function addDiscordReaction(channelId: string, messageId: string, emoji: string, botToken: string) {
  try {
    const encoded = encodeURIComponent(emoji);
    await discordApiFetch(`/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`, botToken, {
      method: 'PUT'
    });
  } catch {
    // Non-fatal if bot lacks reaction permissions
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const botToken = body.botToken || process.env.DISCORD_BOT_TOKEN || '';
    const hoursBack = Number(body.hoursBack ?? 48);
    const targetChannelIds: string[] = Array.isArray(body.channelIds)
      ? body.channelIds.map(String)
      : (process.env.DISCORD_SAVESTATE_CHANNELS || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

    if (!botToken) {
      return NextResponse.json(
        {
          error: 'DISCORD_BOT_TOKEN is not configured in .env.local or environment variables.'
        },
        { status: 400 }
      );
    }

    // 1. Get bot user identity so we can check if a message already has our ✅ or ⚠️ reaction
    const meRes = await discordApiFetch('/users/@me', botToken);
    if (!meRes.ok) {
      const errText = await meRes.text();
      return NextResponse.json(
        { error: `Discord Bot authentication failed (${meRes.status}): ${errText}` },
        { status: 401 }
      );
    }
    const botUser = await meRes.json();
    const botUserId = botUser.id;

    // 2. Discover channels to scan (either explicit targetChannelIds or all guild text channels)
    const channelsToScan: Array<{ id: string; name: string }> = [];

    if (targetChannelIds.length > 0) {
      for (const cId of targetChannelIds) {
        const cRes = await discordApiFetch(`/channels/${cId}`, botToken);
        if (cRes.ok) {
          const cData = await cRes.json();
          channelsToScan.push({ id: String(cData.id), name: String(cData.name || cId) });
        }
      }
    } else {
      const guildsRes = await discordApiFetch('/users/@me/guilds', botToken);
      if (guildsRes.ok) {
        const guilds = await guildsRes.json();
        for (const g of guilds || []) {
          const chansRes = await discordApiFetch(`/guilds/${g.id}/channels`, botToken);
          if (chansRes.ok) {
            const chans = await chansRes.json();
            for (const ch of chans || []) {
              // Type 0 = GUILD_TEXT
              if (ch.type === 0 && !String(ch.name || '').toLowerCase().includes('boxscore')) {
                channelsToScan.push({ id: String(ch.id), name: String(ch.name || ch.id) });
              }
            }
          }
        }
      }
    }

    const cutoffMs = Date.now() - hoursBack * 3600 * 1000;
    const processedResults: any[] = [];
    let scannedAttachmentsCount = 0;

    for (const channel of channelsToScan) {
      const msgsRes = await discordApiFetch(`/channels/${channel.id}/messages?limit=50`, botToken);
      if (!msgsRes.ok) continue;
      const messages = await msgsRes.json();
      if (!Array.isArray(messages)) continue;

      // Process oldest first
      const sortedMsgs = [...messages].reverse();

      for (const msg of sortedMsgs) {
        if (msg.author?.bot) continue;
        const msgTimeMs = new Date(msg.timestamp).getTime();
        if (msgTimeMs < cutoffMs) continue;

        const saveAttachments = (msg.attachments || []).filter(isSaveStateAttachment);
        if (saveAttachments.length === 0) continue;

        // Check if already reacted with ✅ or ⚠️ by the bot
        const alreadyReacted = (msg.reactions || []).some(
          (r: any) => r.me === true && (r.emoji?.name === '✅' || r.emoji?.name === '⚠️')
        );
        if (alreadyReacted && !body.forceRescan) {
          continue;
        }

        for (const att of saveAttachments) {
          scannedAttachmentsCount++;
          try {
            const fileRes = await fetch(att.url);
            if (!fileRes.ok) {
              throw new Error(`Could not download attachment ${att.filename} (${fileRes.status})`);
            }
            const arrayBuf = await fileRes.arrayBuffer();
            const buffer = new Uint8Array(arrayBuf);

            const { seasonId, gameMode, allowOverwrite } = detectDiscordContext(
              buffer,
              channel.name,
              msg.content || '',
              att.filename || ''
            );

            const seasonConfig = getSeasonConfig(seasonId);
            const parsedGame = parseSaveStateBuffer(buffer, seasonConfig);

            // Call the internal save-game POST handler directly
            const internalReq = new NextRequest(new URL('/api/save-game', req.url), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                game: parsedGame,
                seasonId,
                gameMode,
                allowOverwrite: Boolean(allowOverwrite || body.allowOverwrite)
              })
            });

            const saveRes = await saveGamePost(internalReq);
            const saveJson = await saveRes.json();

            if (saveRes.ok && saveJson.success) {
              await addDiscordReaction(channel.id, msg.id, '✅', botToken);
              await discordApiFetch(`/channels/${channel.id}/messages`, botToken, {
                method: 'POST',
                body: JSON.stringify({
                  content: `✅ **Save State Recorded to Database!** (\`${att.filename}\`)\n🏒 **${parsedGame.awayTeam.teamCode} ${parsedGame.awayTeam.goals} - ${parsedGame.homeTeam.goals} ${parsedGame.homeTeam.teamCode}** • Game **#${saveJson.gameId}** • Season **${seasonId} (${getLeagueCode(seasonId)})** (${saveJson.gameMode})`,
                  message_reference: { message_id: msg.id, channel_id: channel.id }
                })
              });

              processedResults.push({
                status: 'saved',
                channel: `#${channel.name}`,
                filename: att.filename,
                author: msg.author?.global_name || msg.author?.username || 'Coach',
                matchup: parsedGame.matchup,
                score: `${parsedGame.awayTeam.teamCode} ${parsedGame.awayTeam.goals} - ${parsedGame.homeTeam.goals} ${parsedGame.homeTeam.teamCode}`,
                gameId: saveJson.gameId,
                seasonId,
                gameMode: saveJson.gameMode
              });
            } else if (saveRes.status === 409 || saveJson.alreadyPlayed) {
              await addDiscordReaction(channel.id, msg.id, '⚠️', botToken);
              processedResults.push({
                status: 'skipped_duplicate',
                channel: `#${channel.name}`,
                filename: att.filename,
                author: msg.author?.global_name || msg.author?.username || 'Coach',
                matchup: parsedGame.matchup,
                score: `${parsedGame.awayTeam.teamCode} ${parsedGame.awayTeam.goals} - ${parsedGame.homeTeam.goals} ${parsedGame.homeTeam.teamCode}`,
                error: saveJson.error
              });
            } else {
              await addDiscordReaction(channel.id, msg.id, '❌', botToken);
              processedResults.push({
                status: 'error',
                channel: `#${channel.name}`,
                filename: att.filename,
                error: saveJson.error || 'Failed to save game'
              });
            }
          } catch (attErr: any) {
            processedResults.push({
              status: 'error',
              channel: `#${channel.name}`,
              filename: att.filename,
              error: attErr.message || 'Failed to parse save state'
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      botUser: `${botUser.username}`,
      botUserId,
      channelsScanned: channelsToScan.length,
      attachmentsProcessed: scannedAttachmentsCount,
      results: processedResults
    });
  } catch (error: any) {
    console.error('Error in /api/discord-ingest:', error);
    return NextResponse.json(
      { error: error.message || 'Discord save state ingestion failed' },
      { status: 500 }
    );
  }
}
