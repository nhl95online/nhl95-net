import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

const KNOWN_LEAGUE_LEVELS: Record<number, { level: string; year: number }> = {
  39: { level: 'O01', year: 1927 },
  40: { level: 'W18', year: 2013 },
  41: { level: 'W19', year: 2014 },
  42: { level: 'W20', year: 2015 },
  43: { level: 'W21', year: 2016 },
  44: { level: 'W22', year: 2017 },
  45: { level: 'W23', year: 2018 },
  46: { level: 'W24', year: 2019 },
  47: { level: 'W25', year: 2020 },
  48: { level: 'W26', year: 2021 },
  49: { level: 'W27', year: 2022 },
  50: { level: 'W28', year: 2023 },
  51: { level: 'W29', year: 2024 },
  52: { level: 'W30', year: 2025 },
  53: { level: 'W31', year: 2026 },
  54: { level: 'O02', year: 1928 },
  55: { level: 'O03', year: 1929 },
  56: { level: 'O04', year: 1930 }
};

async function ensureLeagueExists(supabase: any, leagueId: number, rows?: any[]) {
  const numId = Number(leagueId);
  if (!numId || isNaN(numId)) return;
  const known = KNOWN_LEAGUE_LEVELS[numId];
  const sampleYear = rows?.[0]?.year ? Number(rows[0].year) : (known?.year || (numId >= 41 ? 2014 + (numId - 41) : 2013));
  let leagueLevel = known?.level;
  if (!leagueLevel) {
    if (sampleYear >= 1927 && sampleYear <= 1945) {
      const oNum = Math.max(1, sampleYear - 1926);
      leagueLevel = `O${String(oNum).padStart(2, '0')}`;
    } else {
      const wNum = numId >= 41 ? 19 + (numId - 41) : 18;
      leagueLevel = `W${String(wNum).padStart(2, '0')}`;
    }
  }
  const isO6 = leagueLevel.startsWith('O');
  await supabase.from('leagues').upsert(
    [
      {
        league_id: numId,
        league_name: leagueLevel,
        nhl_year: sampleYear,
        status: 'Upcoming',
        playoff_teams: isO6 ? 6 : 16,
        playoff_config: isO6 ? { format: '5,5,7', rounds: 3 } : { format: '7,7,7,7', rounds: 4 },
        rules_json: isO6
          ? { icing: 'Y', teams: '6', layout: '4x Opps', offside: 'N', penalties: 'N', roster_size: '5F, 3D, 2G', game_per_team: '20', manual_goalie: 'Y', period_length: 5, draft_started: false }
          : { icing: 'Y', teams: '29', layout: '2x Opps', offside: 'N', penalties: 'Y', roster_size: '5F, 3D, 2G', game_per_team: '56', manual_goalie: 'Y', period_length: 5, draft_started: false }
      }
    ],
    { onConflict: 'league_id', ignoreDuplicates: true }
  );
}

interface DraftDiscordNotification {
  playerName: string;
  pos?: string | null;
  ovr?: number | null;
  teamName: string;
  coachName?: string | null;
  logoUrl?: string | null;
  round: number;
  pickNumber: number;
  seasonBadge?: string;
  leagueType?: string;
  leagueId?: number;
  transactionType?: string;
  nextOnClock?: {
    team: string;
    teamId?: number | string;
    coachId?: number | string | null;
    coachName?: string | null;
    discordHandle?: string | null;
    rd: number;
    pk: number;
    clockWindowMinutes?: number;
  } | null;
}

// Known Discord User IDs for NHL95 coaches (by handle, coach_name, or franchise keyword)
const COACH_DISCORD_ID_MAP: Record<string, string> = {
  // By coach_name / discord_handle (lowercase)
  'autobahn': '692039117499793469',
  'dasri': '882284979441258567',
  'jer_33': '241253413722128385',
  'jer 33': '241253413722128385',
  'krav1': '1211045587483623484',
  'krav': '1211045587483623484',
  'vancecookcobxin': '378302345894821909',
  'lhx': '873331397782294569',
  'moses bogart': '692183787509121046',
  'derek sutton': '932744327191490651',
  'gmds': '932744327191490651',
  'wolf': '694697891733831761',
  'highland wolf': '694697891733831761',
  'don don': '939897819681161296',
  'dondon': '939897819681161296',
  'marcusvickebc': '373576219129806859',
  'mattya': '918583918838546443',
  'matty a': '918583918838546443',
  'gaelicgopher': '691684263698890878',
  'gaelic gopher': '691684263698890878',
  'red': '1049531278531252224',
  'segathon': '144973906070077440',
  'unholy grail': '897864347764789290',
  'mnyoda84': '1009697012737921055',
  'mnyoda': '1009697012737921055',
  'adolf oliver nipples': '874726051790594051',
  'lloyd10xmas': '904808850681638923',
  'bclinton_666': '691747327261671534',
  'bclinton': '691747327261671534',
  'the villain ctj': '291228680825470978',
  'ctj': '291228680825470978',
  'marylandmike': '1042251245609549824',
  'maryland mike': '1042251245609549824',
  'pink elephants': '874999566200635393',
  'chalky': '628241421781958684',
  'sugar valley firebirds': '628241421781958684',
  'nathanmb': '802225742523531325',
  'shawnbell_': '694688440440193186',
  'shawnbell': '694688440440193186',
  'shawn bell': '694688440440193186',
  'puss': '582240735793774618',
  'ticklepuss': '582240735793774618',
  'ultramagnus': '869668599550332958',
  'newjerseykiller': '204681486484373505',
  'new jersey killer': '204681486484373505'
};

const TEAM_KEYWORD_DISCORD_ID: Record<string, string> = {
  'AUTOBAHN': '692039117499793469',
  'BARRIE': '882284979441258567',
  'BAYTOWN': '241253413722128385',
  'BETTY FORD': '1211045587483623484',
  'DEVIL HILL': '378302345894821909',
  'DEVIN HILL': '378302345894821909',
  'EASTER ISLAND': '873331397782294569',
  'GRAND RIVER': '692183787509121046',
  'HAMILTON': '932744327191490651',
  'HIGHLAND': '694697891733831761',
  'INGLEWOOD': '939897819681161296',
  'ITALY': '373576219129806859',
  'KAROLINA': '918583918838546443',
  'MINNESOTA': '691684263698890878',
  'MARYHILL': '1049531278531252224',
  'MINHATTRICK': '144973906070077440',
  'NORTH BAY': '897864347764789290',
  'ORANGE COUNTY': '1009697012737921055',
  'PITT': '874726051790594051',
  'PROVIDENCE': '904808850681638923',
  'RICHFIELD': '691747327261671534',
  'ROCKFORD': '291228680825470978',
  'SOUTH HILLS': '1042251245609549824',
  'SUMTER': '874999566200635393',
  'SUGAR VALLEY': '628241421781958684',
  'TAIPEI': '802225742523531325',
  'THUNDER BAY': '694688440440193186',
  'TEGUCIGALPA': '582240735793774618',
  'VALHALLA': '869668599550332958',
  'WOODLYNNE': '204681486484373505',
  'BOSTON': '378302345894821909',
  'CHICAGO': '939897819681161296',
  'DETROIT': '918583918838546443',
  'MONTREAL': '869668599550332958',
  'NEW YORK': '291228680825470978',
  'TORONTO': '932744327191490651'
};

function extractDiscordMentionFromValue(raw?: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  // Direct Discord snowflake ID (17-20 digits) or <@123456789012345678>
  const idMatch = str.match(/\b(\d{17,20})\b/);
  if (idMatch) {
    return `<@${idMatch[1]}>`;
  }
  const lower = str.toLowerCase().replace(/^@/, '').trim();
  if (COACH_DISCORD_ID_MAP[lower]) {
    return `<@${COACH_DISCORD_ID_MAP[lower]}>`;
  }
  return null;
}

async function resolveNextCoachDiscordMention(
  nextOnClock?: DraftDiscordNotification['nextOnClock']
): Promise<{ mention: string | null; handle: string | null; coachName: string | null }> {
  if (!nextOnClock) return { mention: null, handle: null, coachName: null };

  let dbCoachRow: any = null;
  try {
    if (nextOnClock.coachId) {
      const { data } = await supabase
        .from('league_coaches')
        .select('*')
        .eq('coach_id', Number(nextOnClock.coachId))
        .limit(1);
      if (data && data.length > 0) dbCoachRow = data[0];
    }
    if (!dbCoachRow && nextOnClock.coachName) {
      const { data } = await supabase
        .from('league_coaches')
        .select('*')
        .ilike('coach_name', nextOnClock.coachName.trim())
        .limit(1);
      if (data && data.length > 0) dbCoachRow = data[0];
    }
    if (!dbCoachRow && (nextOnClock.teamId || nextOnClock.team)) {
      let teamQuery = supabase.from('league_teams').select('coach_id, coach_name, team_name');
      if (nextOnClock.teamId) {
        teamQuery = teamQuery.eq('team_id', Number(nextOnClock.teamId));
      } else {
        teamQuery = teamQuery.ilike('team_name', nextOnClock.team.trim());
      }
      const { data: tRows } = await teamQuery.limit(1);
      const cId = tRows?.[0]?.coach_id;
      if (cId) {
        const { data } = await supabase
          .from('league_coaches')
          .select('*')
          .eq('coach_id', Number(cId))
          .limit(1);
        if (data && data.length > 0) dbCoachRow = data[0];
      }
    }
  } catch (e) {
    console.error('Coach Discord lookup error:', e);
  }

  const resolvedCoachName = dbCoachRow?.coach_name || nextOnClock.coachName || null;
  const resolvedHandle = dbCoachRow?.discord_handle || nextOnClock.discordHandle || null;

  // 1. Check any explicit Discord ID column or snowflake in discord_handle on league_coaches
  const candidates = [
    dbCoachRow?.discord_id,
    dbCoachRow?.discord_user_id,
    dbCoachRow?.discord_handle,
    nextOnClock.discordHandle,
    resolvedCoachName
  ];
  for (const cand of candidates) {
    const m = extractDiscordMentionFromValue(cand);
    if (m) return { mention: m, handle: resolvedHandle, coachName: resolvedCoachName };
  }

  // 2. Fallback to team keyword mapping
  const upperTeam = (nextOnClock.team || '').toUpperCase();
  for (const [kw, uid] of Object.entries(TEAM_KEYWORD_DISCORD_ID)) {
    if (upperTeam.includes(kw)) {
      return { mention: `<@${uid}>`, handle: resolvedHandle, coachName: resolvedCoachName };
    }
  }

  // 3. Final fallback to @handle text if handle exists in league_coaches
  if (resolvedHandle) {
    return {
      mention: resolvedHandle.startsWith('@') ? resolvedHandle : `@${resolvedHandle}`,
      handle: resolvedHandle,
      coachName: resolvedCoachName
    };
  }

  return { mention: null, handle: null, coachName: resolvedCoachName };
}

function encodeStorageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  try {
    return encodeURI(decodeURI(rawUrl));
  } catch {
    return rawUrl.replace(/ /g, '%20');
  }
}

const TEAM_FALLBACK_LOGOS: Record<string, string> = {
  'AUTOBAHN': `${supabaseUrl}/storage/v1/object/public/teams/Autobahn%20Autobahn%20Logo.png`,
  'BARRIE': `${supabaseUrl}/storage/v1/object/public/teams/Barrie%20Dolts%20Logo.png`,
  'BAYTOWN': `${supabaseUrl}/storage/v1/object/public/teams/Baytown%20Thunder%20Logo.png`,
  'BETTY FORD': `${supabaseUrl}/storage/v1/object/public/teams/Betty%20Ford%20Clinic%20Logo.png`,
  'DEVIL HILL': `${supabaseUrl}/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png`,
  'DEVIN HILL': `${supabaseUrl}/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png`,
  'EASTER ISLAND': `${supabaseUrl}/storage/v1/object/public/teams/Easter%20Island%20Stone%20Heads%20Logo.png`,
  'GRAND RIVER': `${supabaseUrl}/storage/v1/object/public/teams/Grand%20River%20Herons%20Logo.png`,
  'HAMILTON': `${supabaseUrl}/storage/v1/object/public/teams/hamilton_mustangs.png`,
  'HIGHLAND': `${supabaseUrl}/storage/v1/object/public/teams/Highland%20Wolf%20Logo.png`,
  'INGLEWOOD': `${supabaseUrl}/storage/v1/object/public/teams/Inglewood%20Monstars%20Logo%20S3.png`,
  'ITALY': `${supabaseUrl}/storage/v1/object/public/teams/Italy%20EBC%20Logo%20S12.png`,
  'KAROLINA': `${supabaseUrl}/storage/v1/object/public/teams/Karolina%20Kaos%20Logo.png`,
  'MINNESOTA': `${supabaseUrl}/storage/v1/object/public/teams/Minnesota%20Golden%20Gophers%20Logo.png`,
  'MARYHILL': `${supabaseUrl}/storage/v1/object/public/teams/Maryhill%20Alumni%20Logo.png`,
  'MINHATTRICK': `${supabaseUrl}/storage/v1/object/public/teams/Minhattrick%20Swayzes%20Logo%20S13.png`,
  'NORTH BAY': `${supabaseUrl}/storage/v1/object/public/teams/North%20Bay%20Knights%20Logo.png`,
  'ORANGE COUNTY': `${supabaseUrl}/storage/v1/object/public/teams/Orange%20County%20Weststars%20Logo.png`,
  'PITT': `${supabaseUrl}/storage/v1/object/public/teams/Pitt%20Intramurals%20Logo.png`,
  'PROVIDENCE': `${supabaseUrl}/storage/v1/object/public/teams/Providence%20Sea%20Bass%20Logo.png`,
  'RICHFIELD': `${supabaseUrl}/storage/v1/object/public/teams/Richfield%20Oracles%20Logo.png`,
  'ROCKFORD': `${supabaseUrl}/storage/v1/object/public/teams/Rockford%20Villains%20Logo.png`,
  'SOUTH HILLS': `${supabaseUrl}/storage/v1/object/public/teams/South%20Hills%20Shindigaz%20Logo.png`,
  'SUMTER': `${supabaseUrl}/storage/v1/object/public/teams/Sumter%20Trash%20Logo.png`,
  'SUGAR VALLEY': `${supabaseUrl}/storage/v1/object/public/teams/Sugar%20Valley%20Firebirds%20Logo%20S3.png`,
  'TAIPEI': `${supabaseUrl}/storage/v1/object/public/teams/Taipei%20Typhoons%20Logo.png`,
  'THUNDER BAY': `${supabaseUrl}/storage/v1/object/public/teams/Thunder%20Bay%20Pike%20Logo.png`,
  'TEGUCIGALPA': `${supabaseUrl}/storage/v1/object/public/teams/Tegucigalpa%20Ticklepuss%20Logo.png`,
  'VALHALLA': `${supabaseUrl}/storage/v1/object/public/teams/Valhalla%20Vikings%20Logo.png`,
  'WOODLYNNE': `${supabaseUrl}/storage/v1/object/public/teams/Woodlynne%20Rats%20Logo.png`,
  'BOSTON': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/boston_bruins%201927.png`,
  'CHICAGO': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/chicago_black_hawks%201927.png`,
  'DETROIT': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png`,
  'MONTREAL': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/montreal_canadiens%201927.png`,
  'NEW YORK': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/new_york_rangers%201927.png`,
  'TORONTO': `${supabaseUrl}/storage/v1/object/public/nhl%20logo/toronto_maple_leafs%201927.png`,
};

function resolveTeamLogoUrl(teamName?: string | null, rawLogoUrl?: string | null): string | undefined {
  const encoded = encodeStorageUrl(rawLogoUrl);
  if (encoded) return encoded;
  const upper = (teamName || '').toUpperCase();
  for (const [key, url] of Object.entries(TEAM_FALLBACK_LOGOS)) {
    if (upper.includes(key)) return url;
  }
  return undefined;
}

async function resolvePlayerPortraitUrl(playerName: string): Promise<string | undefined> {
  if (!playerName || playerName === 'N/A') return undefined;
  const slug = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const base = `${supabaseUrl}/storage/v1/object/public/nhl%20players/${slug}`;
  for (const ext of ['png', 'jpg']) {
    const candidate = `${base}.${ext}`;
    try {
      const res = await fetch(candidate, { method: 'HEAD' });
      if (res.ok) return candidate;
    } catch {
      // ignore
    }
  }
  return undefined;
}

async function postDraftPickToDiscord(notif?: DraftDiscordNotification): Promise<{
  posted: boolean;
  channelId: string;
  channelLabel: string;
  error?: string;
}> {
  if (!notif || !notif.playerName) {
    return { posted: false, channelId: '', channelLabel: '', error: 'Missing notification payload' };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN || '';

  // Strictly route Original 6 drafts to Original 6 - Golden Era -> #draft (1459581429271892080)
  // and W League drafts to The W -> #draft-official (1484345470158376960)
  const badgeUpper = (notif.seasonBadge || '').toUpperCase();
  const isOriginal6 =
    (notif.leagueType || '').toUpperCase() === 'O' ||
    badgeUpper.startsWith('O') ||
    badgeUpper.includes('ORIGINAL') ||
    notif.leagueId === 39 ||
    (Number(notif.leagueId) >= 54 && Number(notif.leagueId) <= 70);

  const targetChannelId = isOriginal6
    ? process.env.DISCORD_O6_DRAFT_CHANNEL_ID || '1459581429271892080'
    : process.env.DISCORD_W_DRAFT_CHANNEL_ID || '1484345470158376960';

  const channelLabel = isOriginal6 ? 'Original 6 - Draft (#draft)' : 'The W - Draft (#draft-official)';

  const leagueWebhookUrl = isOriginal6
    ? process.env.DISCORD_O6_DRAFT_WEBHOOK_URL || ''
    : process.env.DISCORD_W_DRAFT_WEBHOOK_URL || process.env.DISCORD_DRAFT_WEBHOOK_URL || '';

  const teamLogoUrl = resolveTeamLogoUrl(notif.teamName, notif.logoUrl);
  const portraitUrl = await resolvePlayerPortraitUrl(notif.playerName);
  const isWaiver = (notif.transactionType || '').toLowerCase().includes('waiver');
  const pickTypeLabel = isWaiver ? 'WAIVER SELECTION' : 'OFFICIAL DRAFT SELECTION';
  const posOvr = [notif.pos, notif.ovr ? `OVR ${notif.ovr}` : null].filter(Boolean).join(' • ');

  const nextCoachInfo = await resolveNextCoachDiscordMention(notif.nextOnClock);
  const nextWindowMins =
    notif.nextOnClock?.clockWindowMinutes ??
    (notif.nextOnClock ? (Number(notif.nextOnClock.rd) === 1 ? 10 : 5) : 10);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (notif.nextOnClock && notif.nextOnClock.team) {
    const nextCoachLabel = nextCoachInfo.coachName || notif.nextOnClock.coachName;
    const mentionTag = nextCoachInfo.mention;
    const coachDisplay = [
      nextCoachLabel ? `Coach **${nextCoachLabel}**` : null,
      mentionTag || null
    ]
      .filter(Boolean)
      .join(' • ');

    fields.push({
      name: `⏱️ On The Clock Next (${nextWindowMins}:00 Window)`,
      value: `Pick **#${notif.nextOnClock.pk}** (Rd ${notif.nextOnClock.rd}) — **${notif.nextOnClock.team}**${
        coachDisplay ? ` (${coachDisplay})` : ''
      }`,
      inline: false
    });
  }

  const rightThumbnailUrl = portraitUrl || teamLogoUrl;

  const embed: Record<string, any> = {
    color: isWaiver ? 0x0284c7 : 0xf59e0b,
    author: {
      name: `${notif.seasonBadge || 'WN95HL'} • ${pickTypeLabel} — ${notif.teamName}${
        notif.coachName ? ` (${notif.coachName})` : ''
      }`,
      ...(teamLogoUrl ? { icon_url: teamLogoUrl } : {})
    },
    title: `Round ${notif.round} • Pick #${notif.pickNumber} — ${notif.playerName}${posOvr ? ` (${posOvr})` : ''}`,
    description: `With Pick **#${notif.pickNumber}** (Round ${notif.round}), **${notif.teamName}**${
      notif.coachName ? ` (Coach **${notif.coachName}**)` : ''
    } selects **${notif.playerName}**${posOvr ? ` (**${posOvr}**)` : ''}!`,
    ...(fields.length > 0 ? { fields } : {}),
    ...(rightThumbnailUrl ? { thumbnail: { url: rightThumbnailUrl } } : {}),
    footer: {
      text: `NHL95.net Draft War Room • ${notif.seasonBadge || ''} • ${channelLabel} • Rd 1: 10m | Rd 2: 5m`,
      ...(teamLogoUrl ? { icon_url: teamLogoUrl } : {})
    },
    timestamp: new Date().toISOString()
  };

  let headline = `🚨 **PICK IS IN! (${notif.seasonBadge || (isOriginal6 ? 'Original 6' : 'W League')})** **${notif.teamName}**${
    notif.coachName ? ` (${notif.coachName})` : ''
  } selects **${notif.playerName}** with Pick **#${notif.pickNumber}** (Rd ${notif.round})!`;

  if (notif.nextOnClock && notif.nextOnClock.team) {
    const nextCoachLabel = nextCoachInfo.coachName || notif.nextOnClock.coachName;
    const pingPart = nextCoachInfo.mention
      ? `${nextCoachInfo.mention}${nextCoachLabel ? ` (${nextCoachLabel})` : ''}`
      : nextCoachLabel
        ? `Coach **${nextCoachLabel}**`
        : '';
    headline += `\n⏱️ **On The Clock Next (${nextWindowMins}:00 Window):** Pick **#${notif.nextOnClock.pk}** (Rd ${notif.nextOnClock.rd}) — **${notif.nextOnClock.team}**${
      pingPart ? ` — ${pingPart}` : ''
    }`;
  }

  const payload = {
    content: headline,
    embeds: [embed]
  };

  if (leagueWebhookUrl) {
    try {
      const whRes = await fetch(leagueWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (whRes.ok) {
        return { posted: true, channelId: targetChannelId, channelLabel };
      }
    } catch (e) {
      console.error('Draft webhook post error:', e);
    }
  }

  let lastError = '';
  if (botToken) {
    try {
      const botRes = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (botRes.ok) {
        return { posted: true, channelId: targetChannelId, channelLabel };
      }
      const errText = await botRes.text();
      lastError = `Discord API ${botRes.status} on ${channelLabel} (${targetChannelId}): ${errText}`;
      console.error(lastError);
    } catch (e: any) {
      lastError = e?.message || 'Bot request failed';
      console.error(`Draft bot post to channel ${targetChannelId} failed:`, e);
    }
  } else {
    lastError = 'Queued for 24/7 Discord Draft Bot daemon';
  }

  return {
    posted: false,
    channelId: targetChannelId,
    channelLabel,
    error: lastError || 'Queued for 24/7 Discord Draft Bot daemon'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate_order') {
      const { leagueId, rows, hasExisting } = body as {
        leagueId: number;
        rows: any[];
        hasExisting?: boolean;
      };

      if (!leagueId || !Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'Missing leagueId or draft order rows' }, { status: 400 });
      }

      await ensureLeagueExists(supabase, Number(leagueId), rows);

      if (hasExisting) {
        const { error: delErr } = await supabase
          .from('league_drafts')
          .delete()
          .eq('league_id', Number(leagueId))
          .is('player_id', null);
        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('league_drafts')
        .insert(rows)
        .select();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      return NextResponse.json({ data: inserted || [] });
    }

    if (action === 'submit_pick') {
      const { draftId, updatePayload, rowsToInsert, discordNotification } = body as {
        draftId?: number;
        updatePayload?: Record<string, any>;
        rowsToInsert?: any[];
        discordNotification?: DraftDiscordNotification;
      };

      if (draftId && updatePayload) {
        const { data: updated, error: updateErr } = await supabase
          .from('league_drafts')
          .update(updatePayload)
          .eq('draft_id', Number(draftId))
          .select();

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }

        let discordResult = null;
        if (updated && updated.length > 0 && discordNotification) {
          discordResult = await postDraftPickToDiscord(discordNotification);
        }

        return NextResponse.json({ data: updated || [], discordResult });
      }

      if (Array.isArray(rowsToInsert) && rowsToInsert.length > 0) {
        if (rowsToInsert[0]?.league_id) {
          await ensureLeagueExists(supabase, Number(rowsToInsert[0].league_id), rowsToInsert);
        }
        const { data: insertedAll, error: insErr } = await supabase
          .from('league_drafts')
          .insert(rowsToInsert)
          .select();

        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 400 });
        }

        let discordResult = null;
        if (insertedAll && insertedAll.length > 0 && discordNotification) {
          discordResult = await postDraftPickToDiscord(discordNotification);
        }

        return NextResponse.json({ data: insertedAll || [], discordResult });
      }

      return NextResponse.json({ error: 'Missing draftId or rowsToInsert' }, { status: 400 });
    }

    if (action === 'announce_pick') {
      const { discordNotification } = body as { discordNotification: DraftDiscordNotification };
      if (!discordNotification) {
        return NextResponse.json({ error: 'Missing discordNotification' }, { status: 400 });
      }
      const discordResult = await postDraftPickToDiscord(discordNotification);
      return NextResponse.json({ discordResult });
    }

    if (action === 'upload_capital') {
      const { batches } = body as {
        batches: Array<{ leagueId: number; rows: any[]; hasExisting?: boolean }>;
      };

      if (!Array.isArray(batches) || batches.length === 0) {
        return NextResponse.json({ error: 'No draft capital batches provided' }, { status: 400 });
      }

      const results: Record<string, any[]> = {};

      for (const batch of batches) {
        const lId = Number(batch.leagueId);
        if (!lId || !Array.isArray(batch.rows) || batch.rows.length === 0) continue;

        await ensureLeagueExists(supabase, lId, batch.rows);

        if (batch.hasExisting) {
          const { error: delErr } = await supabase
            .from('league_drafts')
            .delete()
            .eq('league_id', lId)
            .is('player_id', null);
          if (delErr) {
            return NextResponse.json({ error: delErr.message }, { status: 400 });
          }
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('league_drafts')
          .insert(batch.rows)
          .select();

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 400 });
        }

        results[String(lId)] = inserted || [];
      }

      return NextResponse.json({ results });
    }

    if (action === 'confirm_trade') {
      const { tradePayload, pickTransfers } = body as {
        tradePayload: Record<string, any>;
        pickTransfers?: Array<{
          fromTeamId: number;
          toTeamId: number;
          year: number;
          round: number;
          transactionType: string;
        }>;
      };

      if (!tradePayload) {
        return NextResponse.json({ error: 'Missing tradePayload' }, { status: 400 });
      }

      const { data: insertedRows, error } = await supabase
        .from('league_trades')
        .insert([tradePayload])
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (Array.isArray(pickTransfers)) {
        for (const pt of pickTransfers) {
          await supabase
            .from('league_drafts')
            .update({
              team_id: Number(pt.toTeamId),
              transaction_type: pt.transactionType
            })
            .eq('team_id', Number(pt.fromTeamId))
            .eq('year', Number(pt.year))
            .eq('round', Number(pt.round))
            .is('player_id', null);
        }
      }

      return NextResponse.json({ data: insertedRows || [tradePayload] });
    }

    if (action === 'set_draft_status') {
      const { leagueId, draftStarted } = body as {
        leagueId: number;
        draftStarted: boolean;
      };
      const numId = Number(leagueId);
      if (!numId || isNaN(numId)) {
        return NextResponse.json({ error: 'Invalid leagueId' }, { status: 400 });
      }

      await ensureLeagueExists(supabase, numId);

      const { data: existingLeague } = await supabase
        .from('leagues')
        .select('rules_json')
        .eq('league_id', numId)
        .maybeSingle();

      let currentRules: Record<string, any> = {};
      if (existingLeague?.rules_json) {
        try {
          currentRules =
            typeof existingLeague.rules_json === 'string'
              ? JSON.parse(existingLeague.rules_json)
              : { ...existingLeague.rules_json };
        } catch {}
      }

      const updatedRules = {
        ...currentRules,
        draft_started: Boolean(draftStarted),
        draft_started_at: draftStarted ? new Date().toISOString() : null
      };

      const { error: updErr } = await supabase
        .from('leagues')
        .update({ rules_json: updatedRules })
        .eq('league_id', numId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 400 });
      }

      return NextResponse.json({
        leagueId: numId,
        draftStarted: Boolean(draftStarted),
        rules_json: updatedRules
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('/api/draft error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
